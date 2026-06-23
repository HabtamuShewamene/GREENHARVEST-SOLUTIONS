const Campaign = require("../models/campaignModel");

class CampaignService {
  async createCampaign(farmer_id, data) {
    if (!data.name || !data.type || !data.start_date || !data.end_date) {
      throw new Error("Missing required fields for campaign creation");
    }
    
    return await Campaign.createCampaign({
      farmer_id,
      ...data
    });
  }

  async getFarmerCampaigns(farmer_id) {
    return await Campaign.getCampaignsByFarmer(farmer_id);
  }

  async getCampaignDetails(id, farmer_id) {
    const campaign = await Campaign.getCampaignById(id, farmer_id);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    return campaign;
  }

  async updateCampaign(id, farmer_id, data) {
    const campaign = await Campaign.updateCampaign(id, farmer_id, data);
    if (!campaign) {
      throw new Error("Campaign not found or cannot be updated");
    }
    return campaign;
  }

  async updateCampaignStatus(id, farmer_id, status) {
    const campaign = await Campaign.updateCampaignStatus(id, farmer_id, status);
    if (!campaign) {
      throw new Error("Campaign not found or cannot be updated");
    }
    return campaign;
  }

  async deleteCampaign(id, farmer_id) {
    const deleted = await Campaign.deleteCampaign(id, farmer_id);
    if (!deleted) {
      throw new Error("Campaign not found");
    }
    return deleted;
  }
  
  async getMarketingStats(farmer_id) {
    return await Campaign.getMarketingStats(farmer_id);
  }
}

module.exports = new CampaignService();
