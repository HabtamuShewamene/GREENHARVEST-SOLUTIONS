const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const marketInsightsController = require('../controllers/marketInsightsController');

router.get('/', authMiddleware, requireRole('farmer'), marketInsightsController.getMarketInsights);

module.exports = router;
