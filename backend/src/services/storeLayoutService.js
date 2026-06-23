const StoreLayout = require("../models/storeLayoutModel");

class StoreLayoutService {
  async getStoreLayout(farmer_id) {
    return await StoreLayout.getStoreLayout(farmer_id);
  }

  async updateStoreLayout(farmer_id, data) {
    // Validate modules structure
    if (data.modules && !Array.isArray(data.modules)) {
      throw new Error("Modules must be an array");
    }
    
    return await StoreLayout.updateStoreLayout(farmer_id, data);
  }
}

module.exports = new StoreLayoutService();
