const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { uploadProductImage, deleteProductImage } = require('../controllers/uploadController');

const router = express.Router();

// Only authenticated farmers can upload product images
router.post('/product-image', authMiddleware, requireRole('farmer'), uploadProductImage);
router.delete('/product-image', authMiddleware, requireRole('farmer'), deleteProductImage);

module.exports = router;
