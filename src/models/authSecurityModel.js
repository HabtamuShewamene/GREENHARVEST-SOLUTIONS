const { pool } = require("../config/db");

const createRefreshToken = async ({
  user_id,
  token_hash,
  family_id,
  expires_at,
  created_by_ip = null,
  user_agent = null,
}) => {
  const result = await pool.query(
    `
      INSERT INTO refresh_tokens (
        user_id,
        token_hash,
        family_id,
        expires_at,
        created_by_ip,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        user_id,
        token_hash,
        family_id,
        expires_at,
        created_at,
        revoked_at,
        replaced_by_token_hash
    `,
    [user_id, token_hash, family_id, expires_at, created_by_ip, user_agent]
  );

  return result.rows[0] || null;
};

const findRefreshTokenByHash = async (token_hash) => {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        token_hash,
        family_id,
        expires_at,
        created_at,
        revoked_at,
        replaced_by_token_hash,
        revoked_reason,
        last_used_at
      FROM refresh_tokens
      WHERE token_hash = $1
      LIMIT 1
    `,
    [token_hash]
  );

  return result.rows[0] || null;
};

const revokeRefreshTokenById = async (
  id,
  { replaced_by_token_hash = null, revoked_reason = "logout" } = {}
) => {
  const result = await pool.query(
    `
      UPDATE refresh_tokens
      SET
        revoked_at = COALESCE(revoked_at, NOW()),
        replaced_by_token_hash = COALESCE($2, replaced_by_token_hash),
        revoked_reason = COALESCE($3, revoked_reason),
        last_used_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [id, replaced_by_token_hash, revoked_reason]
  );

  return result.rows[0] || null;
};

const revokeRefreshTokensForUser = async (user_id, revoked_reason = "logout_all") => {
  await pool.query(
    `
      UPDATE refresh_tokens
      SET
        revoked_at = COALESCE(revoked_at, NOW()),
        revoked_reason = COALESCE(revoked_reason, $2)
      WHERE user_id = $1
        AND revoked_at IS NULL
    `,
    [user_id, revoked_reason]
  );
};

const revokeRefreshTokenFamily = async (family_id, revoked_reason = "reuse_detected") => {
  await pool.query(
    `
      UPDATE refresh_tokens
      SET
        revoked_at = COALESCE(revoked_at, NOW()),
        revoked_reason = COALESCE(revoked_reason, $2)
      WHERE family_id = $1
        AND revoked_at IS NULL
    `,
    [family_id, revoked_reason]
  );
};

const createOtpChallenge = async ({
  user_id,
  purpose,
  challenge_hash,
  otp_hash,
  expires_at,
}) => {
  await pool.query(
    `
      UPDATE otp_codes
      SET consumed_at = NOW()
      WHERE user_id = $1
        AND purpose = $2
        AND consumed_at IS NULL
    `,
    [user_id, purpose]
  );

  const result = await pool.query(
    `
      INSERT INTO otp_codes (
        user_id,
        purpose,
        challenge_hash,
        otp_hash,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, purpose, challenge_hash, expires_at, attempts, created_at
    `,
    [user_id, purpose, challenge_hash, otp_hash, expires_at]
  );

  return result.rows[0] || null;
};

const findOtpChallengeByHash = async (challenge_hash, purpose = "login") => {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        purpose,
        challenge_hash,
        otp_hash,
        expires_at,
        attempts,
        consumed_at,
        created_at
      FROM otp_codes
      WHERE challenge_hash = $1
        AND purpose = $2
      LIMIT 1
    `,
    [challenge_hash, purpose]
  );

  return result.rows[0] || null;
};

const incrementOtpAttempts = async (id) => {
  const result = await pool.query(
    `
      UPDATE otp_codes
      SET attempts = attempts + 1
      WHERE id = $1
      RETURNING attempts
    `,
    [id]
  );

  return result.rows[0] || null;
};

const consumeOtpChallenge = async (id) => {
  const result = await pool.query(
    `
      UPDATE otp_codes
      SET consumed_at = NOW()
      WHERE id = $1
        AND consumed_at IS NULL
      RETURNING id
    `,
    [id]
  );

  return result.rows[0] || null;
};

module.exports = {
  consumeOtpChallenge,
  createOtpChallenge,
  createRefreshToken,
  findOtpChallengeByHash,
  findRefreshTokenByHash,
  incrementOtpAttempts,
  revokeRefreshTokenById,
  revokeRefreshTokenFamily,
  revokeRefreshTokensForUser,
};
