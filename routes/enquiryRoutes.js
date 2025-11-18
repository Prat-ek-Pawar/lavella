const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const authMiddleware = require('../middleware/authMiddleware');
const { enquiryLimiter } = require('../middleware/rateLimitMiddleware');

// Public routes
router.post('/', enquiryLimiter, enquiryController.sendEnquiryEmail);

// Admin routes (protected)
router.get('/all', authMiddleware, enquiryController.getAllEnquiries);
router.put('/:id/status', authMiddleware, enquiryController.updateEnquiryStatus);

module.exports = router;