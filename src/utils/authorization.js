const { pool } = require("../config/db");
const { normalizeRole } = require("./roles");

const isValidId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const isAgentAssignedToFarmer = async (agentId, farmerId) => {
  if (!isValidId(agentId) || !isValidId(farmerId)) {
    return false;
  }

  try {
    const result = await pool.query(
      `
        SELECT 1
        FROM agent_farmers
        WHERE agent_id = $1 AND farmer_id = $2
        LIMIT 1
      `,
      [Number(agentId), Number(farmerId)]
    );

    return result.rows.length > 0;
  } catch (error) {
    const wrappedError = new Error("Failed to verify agent assignment");
    wrappedError.cause = error;
    throw wrappedError;
  }
};

const canManageProduct = async (user, product) => {
  if (!user || !product || !isValidId(user.id) || !isValidId(product.farmer_id)) {
    return false;
  }

  const role = normalizeRole(user.role);

  if (role === "farmer") {
    return Number(user.id) === Number(product.farmer_id);
  }

  if (role === "field_agent") {
    return isAgentAssignedToFarmer(user.id, product.farmer_id);
  }

  return false;
};

module.exports = {
  canManageProduct,
  isAgentAssignedToFarmer,
};