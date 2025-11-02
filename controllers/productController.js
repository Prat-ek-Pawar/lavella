const Product = require('../models/Product');

const productController = {
  // Create new product - Admin only
  createProduct: async (req, res) => {
    try {
      const product = new Product(req.body);
      await product.save();
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get all active products - Public
  getAllProducts: async (req, res) => {
    try {
      const products = await Product.find({ is_active: true });
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get product by ID - Public
  getProductById: async (req, res) => {
    try {
      const product = await Product.findOne({ 
        _id: req.params.id, 
        is_active: true 
      });
      
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get featured products - Public
  getFeaturedProducts: async (req, res) => {
    try {
      const products = await Product.find({ 
        featured: true, 
        is_active: true 
      });
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get filtered products - Public
  getFilteredProducts: async (req, res) => {
    try {
      const {
        category,
        subcategory,
        materials,
        minPrice,
        maxPrice,
        search,
        page = 1,
        limit = 12,
        sort = 'createdAt'
      } = req.query;

      // Build filter query
      const filter = { is_active: true };

      if (category) {
        filter.category = category;
      }

      if (subcategory) {
        filter.subcategory = subcategory;
      }

      if (materials) {
        const materialArray = materials.split(',');
        filter.material_used = { $in: materialArray };
      }

      if (minPrice || maxPrice) {
        filter.$or = [
          { discounted_price: {} },
          { original_price: {} }
        ];

        if (minPrice) {
          filter.$or[0].discounted_price.$gte = Number(minPrice);
          filter.$or[1].original_price.$gte = Number(minPrice);
        }

        if (maxPrice) {
          filter.$or[0].discounted_price.$lte = Number(maxPrice);
          filter.$or[1].original_price.$lte = Number(maxPrice);
        }
      }

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { subcategory: { $regex: search, $options: 'i' } }
        ];
      }

      // Pagination
      const skip = (page - 1) * limit;

      const products = await Product.find(filter)
        .sort(sort)
        .limit(Number(limit))
        .skip(skip);

      const total = await Product.countDocuments(filter);

      res.json({
        success: true,
        data: products,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update product - Admin only
  updateProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Delete product - Admin only
  deleteProduct: async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { is_active: false },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = productController;