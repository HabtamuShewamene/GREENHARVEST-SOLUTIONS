const storeLayoutService = require("../services/storeLayoutService");

const getStoreLayout = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const layout = await storeLayoutService.getStoreLayout(farmer_id);
    res.status(200).json({ layout });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch store layout" });
  }
};

const updateStoreLayout = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const layout = await storeLayoutService.updateStoreLayout(farmer_id, req.body);
    res.status(200).json({ message: "Store layout updated successfully", layout });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getStoreLayoutByFarmerId = async (req, res) => {
  try {
    const farmer_id = req.params.farmerId;
    const layout = await storeLayoutService.getStoreLayout(farmer_id);
    res.status(200).json({ layout });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch store layout" });
  }
};

module.exports = {
  getStoreLayout,
  getStoreLayoutByFarmerId,
  updateStoreLayout
};
