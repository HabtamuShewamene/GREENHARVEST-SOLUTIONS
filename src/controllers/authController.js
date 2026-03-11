// Moved from controllers/authController.js during the structure refactor.
// Import path updated to use src/config/db.js.
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { pool } = require("../config/db");

const allowedRoles = ["buyer", "farmer", "admin", "delivery"];

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password, and role are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role.trim().toLowerCase();

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        message: "Invalid role provided",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `
        INSERT INTO users (name, email, password, role)
        VALUES ($1, $2, $3, $4)
      `,
      [name.trim(), normalizedEmail, hashedPassword, normalizedRole]
    );

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("User registration failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `
        SELECT id, name, email, password, role, phone, address, created_at
        FROM users
        WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("User login failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, email, role, phone, address, created_at
        FROM users
        WHERE id = $1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Fetching profile failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
