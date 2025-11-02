const express = require('express');
const router = express.Router();
const { upload, uploadController } = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');

// Admin only routes (protected)
router.post('/single', authMiddleware, upload.single('image'), uploadController.uploadImage);
router.post('/multiple', authMiddleware, upload.array('images', 10), uploadController.uploadMultipleImages);

module.exports = router;