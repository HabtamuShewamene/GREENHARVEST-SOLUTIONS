const campaignService = require("../services/campaignService");

const createCampaign = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const campaign = await campaignService.createCampaign(farmer_id, req.body);
    res.status(201).json({ message: "Campaign created successfully", campaign });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCampaigns = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const campaigns = await campaignService.getFarmerCampaigns(farmer_id);
    res.status(200).json({ campaigns });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
};

const getCampaignStats = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const stats = await campaignService.getMarketingStats(farmer_id);
    
    const enrichedStats = {
      active_campaigns: parseInt(stats.active_campaigns || 0),
      promo_revenue: parseFloat(stats.promo_revenue || 0),
      marketing_roi: Math.round(parseFloat(stats.marketing_roi || 0)),
      voucher_redemptions: parseInt(stats.voucher_redemptions || 0)
    };
    
    res.status(200).json({ stats: enrichedStats });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

const getCampaign = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const campaign = await campaignService.getCampaignDetails(req.params.id, farmer_id);
    res.status(200).json({ campaign });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const campaign = await campaignService.updateCampaign(req.params.id, farmer_id, req.body);
    res.status(200).json({ message: "Campaign updated successfully", campaign });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateCampaignStatus = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const { status } = req.body;
    const campaign = await campaignService.updateCampaignStatus(req.params.id, farmer_id, status);
    res.status(200).json({ message: "Campaign updated successfully", campaign });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    await campaignService.deleteCampaign(req.params.id, farmer_id);
    res.status(200).json({ message: "Campaign deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignStats,
  getCampaign,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign
};
