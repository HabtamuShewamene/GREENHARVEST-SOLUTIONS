#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

try {
  require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
  if (process.env.NODE_ENV === "test") {
    require("dotenv").config({
      path: path.join(__dirname, ".env.test"),
      override: true,
      quiet: true,
    });
  }
} catch (_) {}

const DEFAULT_MODELS_DIR = path.join(__dirname, "src", "models");
const DEFAULT_REPORT_PATH = path.join(__dirname, "schema_report.json");
const RESERVED = new Set([
  "on", "where", "set", "values", "returning", "order", "group", "limit",
  "offset", "join", "left", "right", "inner", "outer", "full", "cross", "using",
]);

function parseArgs(argv) {
  const args = {
    fix: false,
    help: false,
    modelsDir: DEFAULT_MODELS_DIR,
    reportPath: DEFAULT_REPORT_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--fix") args.fix = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--models-dir" && argv[i + 1]) {
      args.modelsDir = path.resolve(__dirname, argv[i + 1]);
      i += 1;
    } else if (arg === "--report" && argv[i + 1]) {
      args.reportPath = path.resolve(__dirname, argv[i + 1]);
      i += 1;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node check-schema.js
  node check-schema.js --fix
  node check-schema.js --models-dir ./src/models --report ./schema_report.json

Environment:
  DATABASE_URL
  TEST_DB_URL
  or DB_USER / DB_HOST / DB_NAME / DB_PASSWORD / DB_PORT

Notes:
  - Reads SQL usage from /src/models
  - Compares model expectations with live PostgreSQL metadata
  - Writes a JSON report
  - --fix only applies safe ADD COLUMN / ADD FOREIGN KEY statements
`.trim());
}

function createSchema(kind) {
  return { kind, tables: new Map() };
}

function createTable(name) {
  return {
    name,
    sources: new Set(),
    columns: new Map(),
    foreignKeys: new Map(),
    primaryKeys: new Set(),
    explicitCreateSql: null,
  };
}

function createColumn(name) {
  return {
    name,
    expectedTypes: new Set(),
    inferredTypes: new Set(),
    typeSources: new Set(),
    required: null,
    nullable: null,
    sources: new Set(),
    confidence: "low",
  };
}

function ensureTable(schema, name, sourcePath) {
  if (!schema.tables.has(name)) schema.tables.set(name, createTable(name));
  const table = schema.tables.get(name);
  if (sourcePath) table.sources.add(sourcePath);
  return table;
}

function ensureColumn(table, name, sourcePath) {
  if (!table.columns.has(name)) table.columns.set(name, createColumn(name));
  const column = table.columns.get(name);
  if (sourcePath) column.sources.add(sourcePath);
  return column;
}

function normalizeId(value) {
  return value.replace(/^["'`]+|["'`]+$/g, "").split(".").pop().trim().toLowerCase();
}

function singularize(name) {
  if (name.endsWith("ies")) return `${name.slice(0, -3)}y`;
  if (name.endsWith("s")) return name.slice(0, -1);
  return name;
}

function pickConfidence(current, next) {
  const rank = { low: 1, medium: 2, high: 3, explicit: 4 };
  return rank[next] > rank[current] ? next : current;
}

function addType(column, typeName, source, confidence) {
  if (!typeName) return;
  if (confidence === "high" || confidence === "explicit") column.expectedTypes.add(typeName);
  else column.inferredTypes.add(typeName);
  column.typeSources.add(source);
  column.confidence = pickConfidence(column.confidence, confidence);
}

function addForeignKey(table, column, refTable, refColumn, source, confidence = "medium") {
  if (!column || !refTable || !refColumn) return;
  const key = `${column}->${refTable}.${refColumn}`;
  const existing = table.foreignKeys.get(key);
  if (existing) {
    existing.sources.add(source);
    existing.confidence = pickConfidence(existing.confidence, confidence);
    return;
  }
  table.foreignKeys.set(key, {
    key,
    column,
    referencedTable: refTable,
    referencedColumn: refColumn,
    sources: new Set([source]),
    confidence,
  });
}

function splitCommaAware(input) {
  const parts = [];
  let current = "";
  let depth = 0;
  let quote = null;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const prev = input[i - 1];

    if ((ch === "'" || ch === '"' || ch === "`") && prev !== "\\") {
      quote = quote === ch ? null : quote || ch;
      current += ch;
      continue;
    }

    if (quote) {
      current += ch;
      continue;
    }

    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;

    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function inferTypeFromName(name) {
  const column = name.toLowerCase();
  if (column === "id" || column.endsWith("_id")) return { type: "bigint", confidence: "medium", source: "naming:_id" };
  if (column.startsWith("is_") || column.startsWith("has_") || column.endsWith("_enabled") || column.endsWith("_verified") || column.endsWith("_read")) {
    return { type: "boolean", confidence: "medium", source: "naming:boolean" };
  }
  if (column.endsWith("_at") || column.endsWith("_time") || column.endsWith("_date")) {
    return { type: "timestamptz", confidence: "medium", source: "naming:timestamp" };
  }
  if (column.includes("price") || column.includes("amount") || column.includes("total")) {
    return { type: "numeric", confidence: "medium", source: "naming:numeric" };
  }
  if (column.includes("quantity") || column.includes("stock") || column.includes("count") || column.includes("attempts")) {
    return { type: "integer", confidence: "medium", source: "naming:integer" };
  }
  if (/(name|email|phone|message|description|status|hash|token|url|address|role|purpose)/.test(column)) {
    return { type: "text", confidence: "low", source: "naming:text" };
  }
  return null;
}

function extractSqlSnippets(source) {
  const snippets = [];
  const regex = /`([\s\S]*?)`|'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    const raw = match[1] ?? match[2] ?? match[3] ?? "";
    const cleaned = raw.replace(/\$\{[^}]+\}/g, " ");
    if (/\b(select|insert\s+into|update|delete\s+from|create\s+table|join|references)\b/i.test(cleaned)) {
      snippets.push(cleaned);
    }
  }
  return snippets;
}

function guessPrimaryKey(table) {
  if (!table) return null;
  if (table.primaryKeys.size > 0) return Array.from(table.primaryKeys)[0];
  const singular = singularize(table.name);
  const candidates = [`${singular}_id`, `${table.name}_id`, "id"];
  for (const candidate of candidates) {
    if (table.columns.has(candidate)) return candidate;
  }
  return null;
}

function parseColumnType(definitionTail) {
  const index = definitionTail.search(/\s+(not\s+null|default|references|primary\s+key|unique|check|constraint)\b/i);
  return index === -1 ? definitionTail.trim() : definitionTail.slice(0, index).trim();
}

function parseCreateTable(sql, schema, sourcePath) {
  const tableMatch = sql.match(/create\s+table(?:\s+if\s+not\s+exists)?\s+([a-z_][a-z0-9_\.]*)\s*\(/i);
  if (!tableMatch) return;

  const tableName = normalizeId(tableMatch[1]);
  const openParen = sql.indexOf("(", tableMatch.index);
  let depth = 0;
  let closeParen = -1;

  for (let i = openParen; i < sql.length; i += 1) {
    if (sql[i] === "(") depth += 1;
    if (sql[i] === ")") {
      depth -= 1;
      if (depth === 0) {
        closeParen = i;
        break;
      }
    }
  }

  if (closeParen === -1) return;

  const table = ensureTable(schema, tableName, sourcePath);
  table.explicitCreateSql = sql.replace(/\s+/g, " ").trim();
  const body = sql.slice(openParen + 1, closeParen);

  for (const definition of splitCommaAware(body)) {
    if (/^\s*constraint\b/i.test(definition) || /^\s*(unique|check)\b/i.test(definition)) {
      continue;
    }

    const fkConstraint = definition.match(/(?:constraint\s+[a-z_][a-z0-9_]*\s+)?foreign\s+key\s*\(([^)]+)\)\s+references\s+([a-z_][a-z0-9_\.]*)\s*\(([^)]+)\)/i);
    if (fkConstraint) {
      const locals = splitCommaAware(fkConstraint[1]).map(normalizeId);
      const refs = splitCommaAware(fkConstraint[3]).map(normalizeId);
      const refTable = normalizeId(fkConstraint[2]);
      for (let i = 0; i < locals.length; i += 1) {
        addForeignKey(table, locals[i], refTable, refs[i] || refs[0], sourcePath, "explicit");
      }
      continue;
    }

    const pkConstraint = definition.match(/(?:constraint\s+[a-z_][a-z0-9_]*\s+)?primary\s+key\s*\(([^)]+)\)/i);
    if (pkConstraint) {
      for (const pk of splitCommaAware(pkConstraint[1]).map(normalizeId)) {
        table.primaryKeys.add(pk);
        const column = ensureColumn(table, pk, sourcePath);
        column.required = true;
        column.nullable = false;
      }
      continue;
    }

    const columnMatch = definition.match(/^([a-z_][a-z0-9_]*)\s+(.+)$/i);
    if (!columnMatch) continue;

    const columnName = normalizeId(columnMatch[1]);
    const columnTail = columnMatch[2].trim();
    const column = ensureColumn(table, columnName, sourcePath);
    addType(column, parseColumnType(columnTail), "create_table", "explicit");

    if (/\bnot\s+null\b/i.test(columnTail) || /\bprimary\s+key\b/i.test(columnTail)) {
      column.required = true;
      column.nullable = false;
    } else if (column.nullable === null) {
      column.nullable = true;
    }

    if (/\bprimary\s+key\b/i.test(columnTail)) table.primaryKeys.add(columnName);

    const refMatch = columnTail.match(/references\s+([a-z_][a-z0-9_\.]*)\s*\(([^)]+)\)/i);
    if (refMatch) addForeignKey(table, columnName, normalizeId(refMatch[1]), normalizeId(refMatch[2]), sourcePath, "explicit");
  }
}

function parseInsertStatements(sql, schema, sourcePath) {
  const regex = /insert\s+into\s+([a-z_][a-z0-9_\.]*)\s*\(([\s\S]*?)\)/gi;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const table = ensureTable(schema, normalizeId(match[1]), sourcePath);
    for (const columnName of splitCommaAware(match[2]).map(normalizeId)) {
      const column = ensureColumn(table, columnName, sourcePath);
      const inferred = inferTypeFromName(columnName);
      if (inferred) addType(column, inferred.type, inferred.source, inferred.confidence);
    }
  }
}

function parseUpdateStatements(sql, schema, sourcePath) {
  const regex = /update\s+([a-z_][a-z0-9_\.]*)\s*(?:as\s+)?([a-z_][a-z0-9_]*)?\s+set\s+([\s\S]*?)(?:\bwhere\b|\breturning\b|$)/gi;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const table = ensureTable(schema, normalizeId(match[1]), sourcePath);
    for (const assignment of splitCommaAware(match[3])) {
      const [left] = assignment.split("=");
      if (!left) continue;
      const columnName = normalizeId(left);
      const column = ensureColumn(table, columnName, sourcePath);
      const inferred = inferTypeFromName(columnName);
      if (inferred) addType(column, inferred.type, inferred.source, inferred.confidence);
    }
  }
}

function extractAliasMap(sql) {
  const aliases = new Map();
  const fromJoin = /\b(from|join)\s+([a-z_][a-z0-9_\.]*)\s*(?:as\s+)?([a-z_][a-z0-9_]*)?/gi;
  const update = /\bupdate\s+([a-z_][a-z0-9_\.]*)\s*(?:as\s+)?([a-z_][a-z0-9_]*)?\s+set\b/gi;
  const del = /\bdelete\s+from\s+([a-z_][a-z0-9_\.]*)\s*(?:as\s+)?([a-z_][a-z0-9_]*)?/gi;

  let match;
  while ((match = fromJoin.exec(sql)) !== null) {
    const tableName = normalizeId(match[2]);
    const alias = normalizeId(match[3] || tableName);
    if (!RESERVED.has(alias)) aliases.set(alias, tableName);
    aliases.set(tableName, tableName);
  }

  while ((match = update.exec(sql)) !== null) {
    const tableName = normalizeId(match[1]);
    const alias = normalizeId(match[2] || tableName);
    if (!RESERVED.has(alias)) aliases.set(alias, tableName);
    aliases.set(tableName, tableName);
  }

  while ((match = del.exec(sql)) !== null) {
    const tableName = normalizeId(match[1]);
    const alias = normalizeId(match[2] || tableName);
    if (!RESERVED.has(alias)) aliases.set(alias, tableName);
    aliases.set(tableName, tableName);
  }

  return aliases;
}

function parseQualifiedColumns(sql, schema, sourcePath) {
  const aliases = extractAliasMap(sql);
  const regex = /\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b/gi;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const alias = normalizeId(match[1]);
    const tableName = aliases.get(alias);
    if (!tableName) continue;
    const columnName = normalizeId(match[2]);
    const table = ensureTable(schema, tableName, sourcePath);
    const column = ensureColumn(table, columnName, sourcePath);
    const inferred = inferTypeFromName(columnName);
    if (inferred) addType(column, inferred.type, inferred.source, inferred.confidence);
  }
}

function looksLikeReference(columnName, tableName) {
  const singular = singularize(tableName);
  return columnName === `${singular}_id` || columnName === `${tableName}_id` || columnName.startsWith(`${singular}_`);
}

function inferComparisonRelation(schema, leftTableName, leftColumn, rightTableName, rightColumn, sourcePath) {
  if (!leftTableName || !rightTableName || leftTableName === rightTableName) return;

  const leftTable = ensureTable(schema, leftTableName, sourcePath);
  const rightTable = ensureTable(schema, rightTableName, sourcePath);
  const leftPk = guessPrimaryKey(leftTable);
  const rightPk = guessPrimaryKey(rightTable);

  if (leftColumn.endsWith("_id") && rightPk && rightColumn === rightPk && (looksLikeReference(leftColumn, rightTableName) || leftColumn === rightColumn)) {
    addForeignKey(leftTable, leftColumn, rightTableName, rightColumn, sourcePath, "high");
    return;
  }

  if (rightColumn.endsWith("_id") && leftPk && leftColumn === leftPk && (looksLikeReference(rightColumn, leftTableName) || leftColumn === rightColumn)) {
    addForeignKey(rightTable, rightColumn, leftTableName, leftColumn, sourcePath, "high");
    return;
  }
}

function parseJoinRelationships(sql, schema, sourcePath) {
  const aliases = extractAliasMap(sql);
  const regex = /\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\s*=\s*([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b/gi;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    inferComparisonRelation(
      schema,
      aliases.get(normalizeId(match[1])),
      normalizeId(match[2]),
      aliases.get(normalizeId(match[3])),
      normalizeId(match[4]),
      sourcePath
    );
  }
}

function enrichModelSchema(schema) {
  for (const table of schema.tables.values()) {
    for (const column of table.columns.values()) {
      if (column.expectedTypes.size === 0 && column.inferredTypes.size === 0) {
        const inferred = inferTypeFromName(column.name);
        if (inferred) addType(column, inferred.type, inferred.source, inferred.confidence);
      }
    }
  }
}

async function loadModels(modelsDir = DEFAULT_MODELS_DIR) {
  if (!fs.existsSync(modelsDir)) throw new Error(`Models directory not found: ${modelsDir}`);
  const schema = createSchema("model");
  const files = fs.readdirSync(modelsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of files) {
    const filePath = path.join(modelsDir, entry.name);
    const source = fs.readFileSync(filePath, "utf8");
    for (const snippet of extractSqlSnippets(source)) {
      parseCreateTable(snippet, schema, filePath);
      parseInsertStatements(snippet, schema, filePath);
      parseUpdateStatements(snippet, schema, filePath);
      parseQualifiedColumns(snippet, schema, filePath);
      parseJoinRelationships(snippet, schema, filePath);
    }
  }

  enrichModelSchema(schema);
  return schema;
}

function buildPoolFromEnvironment() {
  const isTest = process.env.NODE_ENV === "test";
  const connectionString = isTest
    ? process.env.TEST_DB_URL || process.env.DATABASE_URL || null
    : process.env.DATABASE_URL || process.env.TEST_DB_URL || null;

  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: process.env.DB_SSL === "true"
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true" }
        : false,
    });
  }

  const missing = ["DB_USER", "DB_HOST", "DB_NAME", "DB_PASSWORD"].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing DATABASE_URL / TEST_DB_URL and DB fallback vars: ${missing.join(", ")}`);
  }

  return new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,
    ssl: process.env.DB_SSL === "true"
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true" }
      : false,
  });
}

async function fetchSchema(pool) {
  const schema = createSchema("database");
  const currentSchemaRow = await pool.query("SELECT CURRENT_SCHEMA() AS schema_name");
  const currentSchema = currentSchemaRow.rows[0]?.schema_name || "public";

  const columnsResult = await pool.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = CURRENT_SCHEMA()
    ORDER BY table_name, ordinal_position
  `);

  for (const row of columnsResult.rows) {
    const table = ensureTable(schema, row.table_name);
    const column = ensureColumn(table, row.column_name);
    column.dataType = row.data_type;
    column.udtName = row.udt_name;
    column.nullable = row.is_nullable === "YES";
    column.defaultValue = row.column_default;
  }

  const pkResult = await pool.query(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.table_schema = CURRENT_SCHEMA()
      AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY tc.table_name, kcu.ordinal_position
  `);

  for (const row of pkResult.rows) ensureTable(schema, row.table_name).primaryKeys.add(row.column_name);

  const fkResult = await pool.query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name,
           ccu.column_name AS foreign_column_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = CURRENT_SCHEMA()
      AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name, kcu.column_name
  `);

  for (const row of fkResult.rows) {
    addForeignKey(
      ensureTable(schema, row.table_name),
      row.column_name,
      row.foreign_table_name,
      row.foreign_column_name,
      row.constraint_name,
      "explicit"
    );
  }

  return { currentSchema, schema };
}

function normalizeType(typeName) {
  if (!typeName) return null;
  const type = typeName.toLowerCase().trim();
  if (["int", "int2", "int4", "int8", "integer", "smallint", "bigint", "serial", "bigserial", "smallserial"].includes(type)) return "integer";
  if (["numeric", "decimal", "real", "double precision", "float4", "float8", "money"].includes(type)) return "numeric";
  if (["varchar", "character varying", "character", "char", "text", "citext"].includes(type)) return "text";
  if (["bool", "boolean"].includes(type)) return "boolean";
  if (["timestamp", "timestamp without time zone", "timestamp with time zone", "timestamptz"].includes(type)) return "timestamp";
  if (["date"].includes(type)) return "date";
  if (["json", "jsonb"].includes(type)) return "json";
  if (["uuid"].includes(type)) return "uuid";
  return type;
}

function chooseExpectedType(modelColumn, dbSchema, foreignKey) {
  if (modelColumn?.expectedTypes?.size) return { type: Array.from(modelColumn.expectedTypes)[0], source: "explicit" };
  if (modelColumn?.inferredTypes?.size) return { type: Array.from(modelColumn.inferredTypes)[0], source: "inferred" };
  if (foreignKey) {
    const refTable = dbSchema.tables.get(foreignKey.referencedTable);
    const refColumn = refTable?.columns.get(foreignKey.referencedColumn);
    if (refColumn?.dataType) return { type: refColumn.dataType, source: "db_reference" };
  }
  return { type: "text", source: "fallback" };
}

function buildConstraintName(tableName, columnName, refTable, refColumn) {
  return `fk_${tableName}_${columnName}__${refTable}_${refColumn}`.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
}

function addColumnSql(tableName, columnName, typeName) {
  return `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${typeName};`;
}

function addForeignKeySql(tableName, columnName, refTable, refColumn) {
  return `ALTER TABLE ${tableName} ADD CONSTRAINT ${buildConstraintName(tableName, columnName, refTable, refColumn)} FOREIGN KEY (${columnName}) REFERENCES ${refTable}(${refColumn});`;
}

function hasReferenceTarget(dbSchema, foreignKey) {
  if (!foreignKey) return false;
  const refTable = dbSchema.tables.get(foreignKey.referencedTable);
  return Boolean(refTable && refTable.columns.has(foreignKey.referencedColumn));
}

function similarityScore(left, right) {
  const a = new Set(left.split("_").filter(Boolean));
  const b = new Set(right.split("_").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}

function inferNameMismatches(missingColumns, extraColumns) {
  const matches = [];
  for (const missing of missingColumns) {
    for (const extra of extraColumns) {
      const score = similarityScore(missing, extra);
      if (score >= 0.5 || missing.includes(extra) || extra.includes(missing)) {
        matches.push({ modelColumn: missing, dbColumn: extra, score });
      }
    }
  }
  return matches.sort((a, b) => b.score - a.score);
}

function compareSchemas(modelSchema, dbSchema) {
  const report = {
    summary: {
      tablesChecked: 0,
      modelTables: modelSchema.tables.size,
      dbTables: dbSchema.tables.size,
      criticalIssues: 0,
      errors: 0,
      warnings: 0,
      safeFixes: 0,
    },
    tables: [],
    fixes: [],
  };

  const allTableNames = new Set([...modelSchema.tables.keys(), ...dbSchema.tables.keys()]);

  for (const tableName of Array.from(allTableNames).sort()) {
    const modelTable = modelSchema.tables.get(tableName) || null;
    const dbTable = dbSchema.tables.get(tableName) || null;
    const tableReport = {
      tableName,
      sources: modelTable ? Array.from(modelTable.sources).sort() : [],
      status: "ok",
      matches: [],
      issues: [],
      expectedPrimaryKeys: modelTable ? Array.from(modelTable.primaryKeys).sort() : [],
      actualPrimaryKeys: dbTable ? Array.from(dbTable.primaryKeys).sort() : [],
    };

    report.summary.tablesChecked += 1;

    if (modelTable && !dbTable) {
      tableReport.status = "critical";
      tableReport.issues.push({
        severity: "critical",
        code: "missing_table",
        message: `Table is referenced by models but missing in DB: ${tableName}`,
        sql: modelTable.explicitCreateSql || null,
        backendSuggestion: `Create ${tableName} in PostgreSQL or update the model queries to use the correct table.`,
        autoFixable: false,
      });
      report.summary.criticalIssues += 1;
      report.tables.push(tableReport);
      continue;
    }

    if (!modelTable && dbTable) {
      tableReport.status = "warning";
      tableReport.issues.push({
        severity: "warning",
        code: "unmodeled_table",
        message: `Table exists in DB but is not referenced by the model layer: ${tableName}`,
        sql: null,
        backendSuggestion: `Confirm whether ${tableName} should be covered by a backend model.`,
        autoFixable: false,
      });
      report.summary.warnings += 1;
      report.tables.push(tableReport);
      continue;
    }

    if (dbTable.primaryKeys.size === 0) {
      tableReport.status = "critical";
      tableReport.issues.push({
        severity: "critical",
        code: "missing_primary_key",
        message: `Critical: ${tableName} has no primary key in the database schema.`,
        sql: null,
        backendSuggestion: `Add a primary key to ${tableName} and align the model with that identifier.`,
        autoFixable: false,
      });
      report.summary.criticalIssues += 1;
    }

    const modelColumns = new Set(modelTable.columns.keys());
    const dbColumns = new Set(dbTable.columns.keys());
    const missingColumns = Array.from(modelColumns).filter((name) => !dbColumns.has(name));
    const extraColumns = Array.from(dbColumns).filter((name) => !modelColumns.has(name));

    for (const columnName of Array.from(modelColumns).sort()) {
      const modelColumn = modelTable.columns.get(columnName);
      const dbColumn = dbTable.columns.get(columnName);

      if (!dbColumn) {
        const fk = Array.from(modelTable.foreignKeys.values()).find((item) => item.column === columnName);
        const expectedType = chooseExpectedType(modelColumn, dbSchema, fk);
        const sql = [addColumnSql(tableName, columnName, expectedType.type)];
        if (fk && hasReferenceTarget(dbSchema, fk)) {
          sql.push(addForeignKeySql(tableName, columnName, fk.referencedTable, fk.referencedColumn));
        }
        tableReport.status = tableReport.status === "critical" ? "critical" : "error";
        tableReport.issues.push({
          severity: "error",
          code: "missing_column",
          column: columnName,
          message: `Missing column in DB: ${columnName}`,
          sql,
          backendSuggestion: `Add ${columnName} to ${tableName} or rename the model field if the live schema uses a different name.`,
          autoFixable: true,
        });
        report.summary.errors += 1;
        report.summary.safeFixes += sql.length;
        report.fixes.push({ kind: "add_column", tableName, columnName, sql: sql[0] });
        if (sql[1]) report.fixes.push({ kind: "add_foreign_key", tableName, columnName, sql: sql[1] });
        continue;
      }

      tableReport.matches.push(`Column match: ${columnName}`);

      const expectedTypes = modelColumn.expectedTypes.size
        ? Array.from(modelColumn.expectedTypes)
        : Array.from(modelColumn.inferredTypes);
      const actualType = normalizeType(dbColumn.dataType || dbColumn.udtName);
      if (expectedTypes.length) {
        const normalizedExpected = expectedTypes.map(normalizeType).filter(Boolean);
        if (normalizedExpected.length && !normalizedExpected.includes(actualType)) {
          const severity = modelColumn.expectedTypes.size ? "error" : "warning";
          tableReport.status = tableReport.status === "critical" ? "critical" : severity === "error" ? "error" : "warning";
          tableReport.issues.push({
            severity,
            code: "type_mismatch",
            column: columnName,
            message: `Type mismatch: ${columnName} (expected ${expectedTypes.join(" | ")}, found ${dbColumn.dataType})`,
            sql: `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE ${expectedTypes[0]} USING ${columnName}::${expectedTypes[0]};`,
            backendSuggestion: `Align ${tableName}.${columnName} in the model layer and database so both use the same type family.`,
            autoFixable: false,
          });
          if (severity === "error") report.summary.errors += 1;
          else report.summary.warnings += 1;
        }
      }

      if (modelColumn.nullable === false && dbColumn.nullable === true) {
        tableReport.status = tableReport.status === "critical" ? "critical" : "warning";
        tableReport.issues.push({
          severity: "warning",
          code: "nullability_mismatch",
          column: columnName,
          message: `Nullability mismatch: ${columnName} is required by model expectations but nullable in DB.`,
          sql: `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL;`,
          backendSuggestion: `Backfill existing NULL values before making ${tableName}.${columnName} NOT NULL.`,
          autoFixable: false,
        });
        report.summary.warnings += 1;
      }
    }

    for (const columnName of extraColumns.sort()) {
      tableReport.status = tableReport.status === "critical" ? "critical" : "warning";
      tableReport.issues.push({
        severity: "warning",
        code: "extra_column",
        column: columnName,
        message: `Extra column in DB: ${columnName}`,
        sql: `-- Review before removal: ALTER TABLE ${tableName} DROP COLUMN ${columnName};`,
        backendSuggestion: `Either add ${columnName} to the model layer or confirm it is intentionally database-only.`,
        autoFixable: false,
      });
      report.summary.warnings += 1;
    }

    for (const mismatch of inferNameMismatches(missingColumns, extraColumns)) {
      tableReport.status = tableReport.status === "critical" ? "critical" : "warning";
      tableReport.issues.push({
        severity: "warning",
        code: "name_mismatch",
        column: mismatch.modelColumn,
        message: `Possible column name mismatch: model expects ${mismatch.modelColumn}, DB has ${mismatch.dbColumn}`,
        sql: `-- Consider renaming one side. Example: ALTER TABLE ${tableName} RENAME COLUMN ${mismatch.dbColumn} TO ${mismatch.modelColumn};`,
        backendSuggestion: `Rename \`${mismatch.dbColumn}\` to \`${mismatch.modelColumn}\` or update the backend model mapping.`,
        autoFixable: false,
      });
      report.summary.warnings += 1;
    }

    for (const expectedFk of modelTable.foreignKeys.values()) {
      const actualFk = Array.from(dbTable.foreignKeys.values()).find((item) => item.column === expectedFk.column);
      if (!actualFk) {
        const sql = addForeignKeySql(tableName, expectedFk.column, expectedFk.referencedTable, expectedFk.referencedColumn);
        const autoFixable = hasReferenceTarget(dbSchema, expectedFk);
        tableReport.status = tableReport.status === "critical" ? "critical" : "error";
        tableReport.issues.push({
          severity: "error",
          code: "missing_foreign_key",
          column: expectedFk.column,
          message: `Missing FK: ${expectedFk.column} -> ${expectedFk.referencedTable}(${expectedFk.referencedColumn})`,
          sql,
          backendSuggestion: `Add the FK in PostgreSQL so ${tableName}.${expectedFk.column} matches the relationship implied by the model.`,
          autoFixable,
        });
        report.summary.errors += 1;
        if (autoFixable) {
          report.summary.safeFixes += 1;
          report.fixes.push({ kind: "add_foreign_key", tableName, columnName: expectedFk.column, sql });
        }
        continue;
      }

      if (actualFk.referencedTable !== expectedFk.referencedTable || actualFk.referencedColumn !== expectedFk.referencedColumn) {
        tableReport.status = tableReport.status === "critical" ? "critical" : "warning";
        tableReport.issues.push({
          severity: "warning",
          code: "incorrect_relationship",
          column: expectedFk.column,
          message: `Incorrect relationship: ${expectedFk.column} expected ${expectedFk.referencedTable}(${expectedFk.referencedColumn}) but found ${actualFk.referencedTable}(${actualFk.referencedColumn})`,
          sql: `-- Review the existing FK before replacing it for ${tableName}.${expectedFk.column}`,
          backendSuggestion: `Update the FK target or revise the model relationship so both sides match.`,
          autoFixable: false,
        });
        report.summary.warnings += 1;
      }
    }

    if (!tableReport.issues.length) tableReport.status = "ok";
    report.tables.push(tableReport);
  }

  return report;
}

function serializeSchema(schema) {
  return {
    kind: schema.kind,
    tables: Array.from(schema.tables.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((table) => ({
        name: table.name,
        sources: Array.from(table.sources).sort(),
        primaryKeys: Array.from(table.primaryKeys).sort(),
        columns: Array.from(table.columns.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((column) => ({
            name: column.name,
            expectedTypes: Array.from(column.expectedTypes).sort(),
            inferredTypes: Array.from(column.inferredTypes).sort(),
            typeSources: Array.from(column.typeSources).sort(),
            required: column.required,
            nullable: column.nullable,
            dataType: column.dataType || null,
            udtName: column.udtName || null,
            defaultValue: column.defaultValue || null,
            confidence: column.confidence,
            sources: Array.from(column.sources).sort(),
          })),
        foreignKeys: Array.from(table.foreignKeys.values())
          .sort((a, b) => a.key.localeCompare(b.key))
          .map((fk) => ({
            column: fk.column,
            referencedTable: fk.referencedTable,
            referencedColumn: fk.referencedColumn,
            confidence: fk.confidence,
            sources: Array.from(fk.sources).sort(),
          })),
        explicitCreateSql: table.explicitCreateSql,
      })),
  };
}

function generateFixes(report) {
  const safeFixes = [];
  const suggestedFixes = [];

  for (const table of report.tables) {
    for (const issue of table.issues) {
      const sqlStatements = Array.isArray(issue.sql) ? issue.sql : issue.sql ? [issue.sql] : [];
      for (const sql of sqlStatements) {
        suggestedFixes.push(sql);
        if (issue.autoFixable) safeFixes.push(sql);
      }
    }
  }

  return {
    safeFixes: Array.from(new Set(safeFixes)),
    suggestedFixes: Array.from(new Set(suggestedFixes)),
  };
}

function generateReport(report, options) {
  const lines = [];
  lines.push("Schema Validation Report");
  lines.push("========================");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push(`Models directory: ${options.modelsDir}`);
  lines.push(`Database schema: ${options.currentSchema}`);
  lines.push(`Fix mode: ${options.fix ? "enabled" : "disabled"}`);
  lines.push("");

  for (const table of report.tables) {
    lines.push(`Table: ${table.tableName}`);

    for (const match of table.matches.sort()) lines.push(`[OK] ${match}`);

    for (const issue of table.issues) {
      const icon = issue.severity === "warning" ? "[WARN]" : "[ERR]";
      lines.push(`${icon} ${issue.message}`);
      if (issue.sql) {
        const sqlStatements = Array.isArray(issue.sql) ? issue.sql : [issue.sql];
        for (const sql of sqlStatements) lines.push(`   SQL: ${sql}`);
      }
      if (issue.backendSuggestion) lines.push(`   Backend: ${issue.backendSuggestion}`);
    }

    if (!table.issues.length) lines.push("[OK] No schema issues detected.");
    lines.push("");
  }

  lines.push("Summary");
  lines.push("-------");
  lines.push(`Tables checked: ${report.summary.tablesChecked}`);
  lines.push(`Critical issues: ${report.summary.criticalIssues}`);
  lines.push(`Errors: ${report.summary.errors}`);
  lines.push(`Warnings: ${report.summary.warnings}`);
  lines.push(`Safe fixes available: ${report.summary.safeFixes}`);

  return lines.join("\n");
}

async function applySafeFixes(pool, safeFixes) {
  const applied = [];
  for (const sql of safeFixes) {
    console.warn(`Applying safe fix: ${sql}`);
    await pool.query(sql);
    applied.push(sql);
  }
  return applied;
}

function buildJsonReport(modelSchema, dbSnapshot, comparisonReport, fixes, appliedFixes, args) {
  return {
    generatedAt: new Date().toISOString(),
    fixMode: args.fix,
    modelsDir: args.modelsDir,
    reportPath: args.reportPath,
    currentSchema: dbSnapshot.currentSchema,
    summary: comparisonReport.summary,
    modelSchema: serializeSchema(modelSchema),
    dbSchema: serializeSchema(dbSnapshot.schema),
    tables: comparisonReport.tables,
    fixes,
    appliedFixes,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  let pool;

  try {
    const modelSchema = await loadModels(args.modelsDir);
    pool = buildPoolFromEnvironment();
    const dbSnapshot = await fetchSchema(pool);
    const comparisonReport = compareSchemas(modelSchema, dbSnapshot.schema);
    const fixes = generateFixes(comparisonReport);

    let appliedFixes = [];
    if (args.fix) {
      console.warn("Warning: --fix only applies non-destructive additions such as ADD COLUMN and ADD FOREIGN KEY.");
      appliedFixes = await applySafeFixes(pool, fixes.safeFixes);
    }

    console.log(generateReport(comparisonReport, {
      modelsDir: args.modelsDir,
      currentSchema: dbSnapshot.currentSchema,
      fix: args.fix,
    }));

    fs.writeFileSync(
      args.reportPath,
      `${JSON.stringify(buildJsonReport(modelSchema, dbSnapshot, comparisonReport, fixes, appliedFixes, args), null, 2)}\n`,
      "utf8"
    );
    console.log(`JSON report written to ${args.reportPath}`);
  } catch (error) {
    console.error("Schema validation failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (pool) await pool.end().catch(() => undefined);
  }
}

main();
