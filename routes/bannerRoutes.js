const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/', bannerController.getAllBanners);

// Admin routes (protected)
router.post('/', authMiddleware, bannerController.createBanner);
router.put('/:id', authMiddleware, bannerController.updateBanner);
router.delete('/:id', authMiddleware, bannerController.deleteBanner);

module.exports = router;