const ROLE_ALIASES = {
  admin: "admin",
  farmer: "farmer",
  buyer: "buyer",
  fieldagent: "fieldAgent",
  field_agent: "fieldAgent",
  deliverypartner: "deliveryPartner",
  delivery_partner: "deliveryPartner",
  delivery: "deliveryPartner",
};

const ALLOWED_ROLES = ["admin", "farmer", "buyer", "fieldAgent", "deliveryPartner"];

const normalizeRole = (role) => {
  if (role === undefined || role === null) {
    return "";
  }

  const normalized = String(role).trim();

  if (!normalized) {
    return "";
  }

  const key = normalized.toLowerCase();
  return ROLE_ALIASES[key] || normalized;
};

const isAllowedRole = (role) => {
  return ALLOWED_ROLES.includes(normalizeRole(role));
};

module.exports = {
  ALLOWED_ROLES,
  isAllowedRole,
  normalizeRole,
};