const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");
const { verifyToken, isFarmer } = require("../middleware/authMiddleware");

// All campaign routes require farmer authentication
router.use(verifyToken, isFarmer);

router.get("/stats", campaignController.getCampaignStats);
router.post("/", campaignController.createCampaign);
router.get("/", campaignController.getCampaigns);
router.get("/:id", campaignController.getCampaign);
router.put("/:id", campaignController.updateCampaign);
router.patch("/:id/status", campaignController.updateCampaignStatus);
router.delete("/:id", campaignController.deleteCampaign);

module.exports = router;
