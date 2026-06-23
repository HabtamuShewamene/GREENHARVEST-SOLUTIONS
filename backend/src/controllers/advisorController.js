const advisorService = require("../services/advisorService");

const getAdvisorDashboard = async (req, res) => {
  try {
    const farmer_id = req.user.id;
    const data = await advisorService.getAdvisorDashboard(farmer_id);
    res.status(200).json(data);
  } catch (error) {
    console.error("Advisor Error:", error);
    res.status(500).json({ error: "Failed to fetch advisor data" });
  }
};

module.exports = {
  getAdvisorDashboard
};
