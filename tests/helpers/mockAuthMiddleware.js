const createHeaderAuthMiddleware = () => {
  return (req, res, next) => {
    const role = req.headers["x-test-role"];

    if (!role) {
      return res.status(401).json({
        message: "Authentication is required",
      });
    }

    const id = Number(req.headers["x-test-user-id"] || 1);
    const user_id = Number(req.headers["x-test-user-db-id"] || id);

    req.user = {
      id,
      user_id,
      role,
    };

    return next();
  };
};

module.exports = {
  createHeaderAuthMiddleware,
};
