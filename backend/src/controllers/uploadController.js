// Backend: dedicated upload endpoint for Cloudinary
const logger = require('../utils/logger');
const { cloudinary, upload } = require('../config/cloudinary');

/**
 * POST /api/upload/product-image
 * Multer middleware handles the multipart upload to Cloudinary.
 * Returns { url, public_id } on success.
 */
const uploadProductImage = [
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      // multer-storage-cloudinary already uploaded the file; the URL is in req.file.path
      return res.status(200).json({
        url: req.file.path,
        public_id: req.file.filename,
      });
    } catch (error) {
      logger.error('Image upload failed', { message: error.message });
      return res.status(500).json({ message: 'Image upload failed' });
    }
  },
];

/**
 * DELETE /api/upload/product-image
 * Deletes an image from Cloudinary by public_id.
 */
const deleteProductImage = async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id) {
      return res.status(400).json({ message: 'public_id is required' });
    }
    await cloudinary.uploader.destroy(public_id);
    return res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    logger.error('Image delete failed', { message: error.message });
    return res.status(500).json({ message: 'Image delete failed' });
  }
};

module.exports = { uploadProductImage, deleteProductImage };
