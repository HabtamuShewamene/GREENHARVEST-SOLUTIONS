const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

// All campaign routes require farmer authentication
router.use(authMiddleware, requireRole("farmer"));

router.get("/stats", campaignController.getCampaignStats);
router.post("/", campaignController.createCampaign);
router.get("/", campaignController.getCampaigns);
router.get("/:id", campaignController.getCampaign);
router.put("/:id", campaignController.updateCampaign);
router.patch("/:id/status", campaignController.updateCampaignStatus);
router.delete("/:id", campaignController.deleteCampaign);

module.exports = router;
