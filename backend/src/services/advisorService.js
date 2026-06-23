const advisorModel = require("../models/advisorModel");

class AdvisorService {
  async getAdvisorDashboard(farmer_id) {
    return await advisorModel.getAdvisorData(farmer_id);
  }
}

module.exports = new AdvisorService();
