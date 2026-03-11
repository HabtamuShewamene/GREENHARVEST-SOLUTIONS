// Added during the structure refactor as a reusable JWT helper.
const jwt = require("jsonwebtoken");

const signToken = (payload, options = { expiresIn: "7d" }) => {
  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  signToken,
  verifyToken,
};
