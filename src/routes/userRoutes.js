const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { getMe, listUsers } = require("../controllers/userController");

const router = express.Router();

router.use(authMiddleware);

router.get("/me", getMe);
router.get("/", roleMiddleware("admin"), listUsers);

module.exports = router;
