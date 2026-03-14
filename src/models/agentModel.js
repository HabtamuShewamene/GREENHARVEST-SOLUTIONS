const { pool } = require("../config/db");

const findUserById = async (user_id) => {
	const result = await pool.query(
		`
			SELECT u.user_id AS id, u.name, u.email, r.role_name AS role, r.role_name
			FROM users u
			LEFT JOIN roles r ON r.role_id = u.role_id
			WHERE u.user_id = $1
		`,
		[user_id]
	);

	return result.rows[0] || null;
};

const assignFarmer = async ({ agent_id, farmer_id, assigned_by }) => {
	const result = await pool.query(
		`
			INSERT INTO agent_farmers (agent_id, farmer_id, assigned_by)
			VALUES ($1, $2, $3)
			ON CONFLICT (agent_id, farmer_id)
			DO UPDATE SET assigned_by = EXCLUDED.assigned_by
			RETURNING id, agent_id, farmer_id, assigned_by, created_at
		`,
		[agent_id, farmer_id, assigned_by]
	);

	return result.rows[0];
};

const isAgentAssignedToFarmer = async ({ agent_id, farmer_id }) => {
	const result = await pool.query(
		`SELECT id FROM agent_farmers WHERE agent_id = $1 AND farmer_id = $2`,
		[agent_id, farmer_id]
	);

	return result.rows.length > 0;
};

const getFarmersByAgent = async (agent_id) => {
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
				NULL::text AS farmer_address
			FROM agent_farmers af
			JOIN users u ON u.user_id = af.farmer_id
			WHERE af.agent_id = $1
			ORDER BY af.created_at DESC
		`,
		[agent_id]
	);

	return result.rows;
};

module.exports = {
	assignFarmer,
	findUserById,
	getFarmersByAgent,
	isAgentAssignedToFarmer,
};