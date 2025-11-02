const Category = require('../models/Category');
const Product = require('../models/Product');

const categoryController = {
  // Create category - Admin only
  createCategory: async (req, res) => {
    try {
      const category = new Category(req.body);
      await category.save();
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ 
          success: false, 
          message: 'Category name already exists' 
        });
      }
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get all categories - Public
  getAllCategories: async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const filter = includeInactive ? {} : { is_active: true };
      
      const categories = await Category.find(filter)
        .sort('display_order name');
      
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get category by ID - Public
  getCategoryById: async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      
      if (!category) {
        return res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
      }
      
      res.json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get all subcategories - Public
  getAllSubcategories: async (req, res) => {
    try {
      const categories = await Category.find({ is_active: true })
        .select('name subcategories');
      
      const subcategoriesMap = {};
      categories.forEach(cat => {
        subcategoriesMap[cat.name] = cat.subcategories;
      });
      
      res.json({ success: true, data: subcategoriesMap });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update category - Admin only
  updateCategory: async (req, res) => {
    try {
      const oldCategory = await Category.findById(req.params.id);
      
      if (!oldCategory) {
        return res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
      }

      const updatedCategory = await Category.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      // If category name changed, update products
      if (req.body.name && req.body.name !== oldCategory.name) {
        await Product.updateMany(
          { category: oldCategory.name },
          { category: req.body.name }
        );
      }

      res.json({ success: true, data: updatedCategory });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ 
          success: false, 
          message: 'Category name already exists' 
        });
      }
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Delete category - Admin only
  deleteCategory: async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      
      if (!category) {
        return res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
      }

      // Check if products exist in this category
      const productCount = await Product.countDocuments({ 
        category: category.name 
      });
      
      if (productCount > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot delete category. ${productCount} products exist in this category.` 
        });
      }

      await Category.findByIdAndDelete(req.params.id);
      
      res.json({ 
        success: true, 
        message: 'Category deleted successfully' 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Add subcategory - Admin only
  addSubcategory: async (req, res) => {
    try {
      const { subcategory } = req.body;
      
      if (!subcategory) {
        return res.status(400).json({ 
          success: false, 
          message: 'Subcategory name is required' 
        });
      }

      const category = await Category.findById(req.params.id);
      
      if (!category) {
        return res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
      }

      if (category.subcategories.includes(subcategory)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Subcategory already exists' 
        });
      }

      category.subcategories.push(subcategory);
      await category.save();

      res.json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Remove subcategory - Admin only
  removeSubcategory: async (req, res) => {
    try {
      const { subcategory } = req.body;
      
      const category = await Category.findById(req.params.id);
      
      if (!category) {
        return res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
      }

      // Check if products exist in this subcategory
      const productCount = await Product.countDocuments({ 
        category: category.name,
        subcategory: subcategory 
      });
      
      if (productCount > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot delete subcategory. ${productCount} products exist in this subcategory.` 
        });
      }

      category.subcategories = category.subcategories.filter(
        sub => sub !== subcategory
      );
      await category.save();

      res.json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = categoryController;