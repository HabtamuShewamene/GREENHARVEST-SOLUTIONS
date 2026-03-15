const { spawn } = require("child_process");

const testPort = Number(process.env.TEST_PORT || 5055);
const host = process.env.TEST_HOST || `http://localhost:${testPort}`;
const runs = Number(process.env.CHECKLIST_RUNS || 3);
const pauseMs = Number(process.env.CHECKLIST_PAUSE_MS || 1000);
const startupTimeoutMs = Number(process.env.SERVER_START_TIMEOUT_MS || 45000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForServer = async () => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < startupTimeoutMs) {
    try {
      const response = await fetch(`${host}/`);
      if (response.status === 200) {
        return;
      }
    } catch {
      // Server is not ready yet.
    }

    await sleep(500);
  }

  throw new Error(`Server did not become ready within ${startupTimeoutMs} ms`);
};

const runCommand = (command, options = {}) => {
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      stdio: "inherit",
      ...options,
    });

    child.on("close", (code) => {
      resolve(code || 0);
    });
  });
};

const stopServer = (serverProcess) => {
  if (!serverProcess || serverProcess.killed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => resolve();

    serverProcess.once("close", done);
    serverProcess.kill("SIGTERM");

    setTimeout(() => {
      if (!serverProcess.killed) {
        serverProcess.kill("SIGKILL");
      }
      resolve();
    }, 5000);
  });
};

const main = async () => {
  console.log(`[full-check] Starting backend server in test mode on port ${testPort}...`);

  const serverEnv = {
    ...process.env,
    NODE_ENV: "test",
    DISABLE_RATE_LIMIT: "true",
    PORT: String(testPort),
  };

  const serverProcess = spawn("npm start", {
    shell: true,
    stdio: "inherit",
    env: serverEnv,
  });

  let failed = false;

  try {
    await waitForServer();
    console.log("[full-check] Server is ready.");

    for (let runNumber = 1; runNumber <= runs; runNumber += 1) {
      console.log(`[full-check] Checklist run ${runNumber}/${runs}...`);
      const exitCode = await runCommand(`"${process.execPath}" tmp-api-checklist-runner.js`, {
        env: {
          ...process.env,
          CHECKLIST_BASE_URL: host,
        },
      });

      if (exitCode !== 0) {
        failed = true;
        console.error(`[full-check] Checklist failed on run ${runNumber} with exit code ${exitCode}.`);
        break;
      }

      if (runNumber < runs && pauseMs > 0) {
        await sleep(pauseMs);
      }
    }
  } catch (error) {
    failed = true;
    console.error("[full-check] Fatal error:", error.message);
  } finally {
    console.log("[full-check] Stopping backend server...");
    await stopServer(serverProcess);
  }

  if (failed) {
    process.exit(1);
  }

  console.log("[full-check] All checklist runs passed.");
  process.exit(0);
};

main();