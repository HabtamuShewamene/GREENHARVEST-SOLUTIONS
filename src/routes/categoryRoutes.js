const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
	createCategory,
	deleteCategory,
	getAllCategories,
	getCategoryById,
	updateCategory,
} = require("../controllers/categoryController");

const router = express.Router();

router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.post("/", authMiddleware, roleMiddleware("admin"), createCategory);
router.put("/:id", authMiddleware, roleMiddleware("admin"), updateCategory);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteCategory);

module.exports = router;
