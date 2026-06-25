const Campaign = require("../models/campaignModel");
const { validateCampaignPayload } = require("../utils/campaignValidators");

class CampaignService {
  async createCampaign(farmer_id, data) {
    const validation = validateCampaignPayload(data);
    if (!validation.valid) {
      const error = new Error(validation.message);
      error.statusCode = 400;
      throw error;
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
    const existing = await Campaign.getCampaignById(id, farmer_id);
    if (!existing) {
      throw new Error("Campaign not found or cannot be updated");
    }

    const merged = {
      name: data.name ?? existing.name,
      type: data.type ?? existing.type,
      start_date: data.start_date ?? existing.start_date,
      end_date: data.end_date ?? existing.end_date,
      discount_type: data.discount_type ?? existing.discount_type,
      discount_value: data.discount_value ?? existing.discount_value,
      voucher_code: data.voucher_code ?? existing.voucher_code,
    };

    const validation = validateCampaignPayload(merged);
    if (!validation.valid) {
      const error = new Error(validation.message);
      error.statusCode = 400;
      throw error;
    }

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
