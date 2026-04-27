const { pool } = require("../config/db");

let agentFarmersEnsured = false;

const ensureAgentFarmersTable = async () => {
	if (agentFarmersEnsured) {
		return;
	}

	await pool.query(
		`
			CREATE TABLE IF NOT EXISTS agent_farmers (
				id BIGSERIAL PRIMARY KEY,
				agent_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
				farmer_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
				assigned_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				CONSTRAINT unique_agent_farmer_assignment UNIQUE (agent_id, farmer_id)
			)
		`
	);

	await pool.query(
		`CREATE INDEX IF NOT EXISTS idx_agent_farmers_agent_id ON agent_farmers(agent_id)`
	);
	await pool.query(
		`CREATE INDEX IF NOT EXISTS idx_agent_farmers_farmer_id ON agent_farmers(farmer_id)`
	);

	agentFarmersEnsured = true;
};

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
	await ensureAgentFarmersTable();

	try {
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
	} catch (error) {
		throw error;
	}
};

const isAgentAssignedToFarmer = async ({ agent_id, farmer_id }) => {
	await ensureAgentFarmersTable();

	try {
		const result = await pool.query(
			`
				SELECT EXISTS (
					SELECT 1
					FROM agent_farmers
					WHERE agent_id = $1 AND farmer_id = $2
				) AS is_assigned
			`,
			[agent_id, farmer_id]
		);

		return Boolean(result.rows[0] && result.rows[0].is_assigned);
	} catch (error) {
		throw error;
	}
};

const getFarmersByAgent = async (agent_id) => {
	await ensureAgentFarmersTable();

	try {
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
	} catch (error) {
		throw error;
	}
};

module.exports = {
	assignFarmer,
	findUserById,
	getFarmersByAgent,
	isAgentAssignedToFarmer,
};