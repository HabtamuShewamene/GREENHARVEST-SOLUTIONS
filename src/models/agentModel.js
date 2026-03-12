const { pool } = require("../config/db");

const findUserById = async (userId) => {
	const result = await pool.query(
		`SELECT id, name, email, role FROM users WHERE id = $1`,
		[userId]
	);

	return result.rows[0] || null;
};

const assignFarmer = async ({ agentId, farmerId, assignedBy }) => {
	const result = await pool.query(
		`
			INSERT INTO agent_farmers (agent_id, farmer_id, assigned_by)
			VALUES ($1, $2, $3)
			ON CONFLICT (agent_id, farmer_id)
			DO UPDATE SET assigned_by = EXCLUDED.assigned_by
			RETURNING id, agent_id, farmer_id, assigned_by, created_at
		`,
		[agentId, farmerId, assignedBy]
	);

	return result.rows[0];
};

const isAgentAssignedToFarmer = async ({ agentId, farmerId }) => {
	const result = await pool.query(
		`SELECT id FROM agent_farmers WHERE agent_id = $1 AND farmer_id = $2`,
		[agentId, farmerId]
	);

	return result.rows.length > 0;
};

const getFarmersByAgent = async (agentId) => {
	const result = await pool.query(
		`
			SELECT
				af.id AS assignment_id,
				af.agent_id,
				af.farmer_id,
				af.assigned_by,
				af.created_at,
				u.name AS farmer_name,
				u.email AS farmer_email,
				u.phone AS farmer_phone,
				u.address AS farmer_address
			FROM agent_farmers af
			JOIN users u ON u.id = af.farmer_id
			WHERE af.agent_id = $1
			ORDER BY af.created_at DESC
		`,
		[agentId]
	);

	return result.rows;
};

module.exports = {
	assignFarmer,
	findUserById,
	getFarmersByAgent,
	isAgentAssignedToFarmer,
};