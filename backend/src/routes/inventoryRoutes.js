const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
	updateInventory,
	getInventoryByProduct,
} = require("../controllers/inventoryController");

const router = express.Router();

router.use(authMiddleware);

router.put("/update", roleMiddleware("admin", "farmer", "fieldAgent"), updateInventory);
router.get("/:productId", getInventoryByProduct);

module.exports = router;
