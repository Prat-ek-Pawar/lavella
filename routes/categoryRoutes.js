const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/subcategories', categoryController.getAllSubcategories);
router.get('/:id', categoryController.getCategoryById);

// Admin routes (protected)
router.post('/', authMiddleware, categoryController.createCategory);
router.put('/:id', authMiddleware, categoryController.updateCategory);
router.delete('/:id', authMiddleware, categoryController.deleteCategory);
router.post('/:id/subcategory', authMiddleware, categoryController.addSubcategory);
router.delete('/:id/subcategory', authMiddleware, categoryController.removeSubcategory);

module.exports = router;