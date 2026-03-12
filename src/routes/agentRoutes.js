const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
	assignFarmer,
	getAgentFarmers,
	addProductByAgent,
} = require("../controllers/agentController");

const router = express.Router();

router.use(authMiddleware);

router.post("/assign-farmer", roleMiddleware("admin"), assignFarmer);
router.get("/farmers", roleMiddleware("admin", "fieldAgent"), getAgentFarmers);
router.post("/add-product", roleMiddleware("admin", "fieldAgent"), addProductByAgent);

module.exports = router;
