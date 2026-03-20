const ROLE_ALIASES = {
  admin: "admin",
  farmer: "farmer",
  buyer: "buyer",
  fieldagent: "field_agent",
  field_agent: "field_agent",
  "field agent": "field_agent",
  deliverypartner: "delivery_partner",
  delivery_partner: "delivery_partner",
  "delivery partner": "delivery_partner",
  delivery: "delivery_partner",
};

const ALLOWED_ROLES = ["admin", "farmer", "buyer", "field_agent", "delivery_partner"];

const normalizeRole = (role) => {
  if (role === undefined || role === null) {
    return "";
  }

  const normalized = String(role).trim();

  if (!normalized) {
    return "";
  }

  const key = normalized.toLowerCase().replace(/[\s-]+/g, "_");
  return ROLE_ALIASES[key] || key;
};

const isAllowedRole = (role) => {
  return ALLOWED_ROLES.includes(normalizeRole(role));
};

module.exports = {
  ALLOWED_ROLES,
  isAllowedRole,
  normalizeRole,
};
