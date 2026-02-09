const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes
router.get("/", categoryController.getAllCategories);
router.get("/subcategories", categoryController.getAllSubcategories);
router.get("/:id", categoryController.getCategoryById);

// Admin routes (now public)
router.post("/", categoryController.createCategory);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);
router.post("/:id/subcategory", categoryController.addSubcategory);
router.delete("/:id/subcategory", categoryController.removeSubcategory);

module.exports = router;
