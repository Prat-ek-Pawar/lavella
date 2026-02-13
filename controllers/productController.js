const Product = require("../models/Product");

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-"); // Replace multiple - with single -
};

// Helper to sanitize product data
const formatProduct = (product) => {
  if (!product) return null;
  const p = product.toObject ? product.toObject() : product;

  return {
    _id: p._id,
    title: p.title || "",
    slug: p.slug || "",
    description: p.description || "",
    category_id: p.category_id || "",
    category: p.category || "",
    subcategory: p.subcategory || "",
    original_price: typeof p.original_price === 'number' ? p.original_price : 0,
    discounted_price: typeof p.discounted_price === 'number' ? p.discounted_price : 0,
    featured: !!p.featured,
    images: Array.isArray(p.images) ? p.images : [],
    material_used: Array.isArray(p.material_used) ? p.material_used : [],
    color_and_texture: Array.isArray(p.color_and_texture) ? p.color_and_texture : [],
    faqs: Array.isArray(p.faqs) ? p.faqs : [],
    product_guide: p.product_guide || "",
    how_to_use: {
      title: (p.how_to_use && p.how_to_use.title) || "",
      points: (p.how_to_use && Array.isArray(p.how_to_use.points)) ? p.how_to_use.points : []
    },
    is_active: !!p.is_active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    __v: p.__v
  };
};

const productController = {
  // Create new product - Admin only
  createProduct: async (req, res) => {
    try {
      const productData = { ...req.body };
      if (productData.title && !productData.slug) {
        productData.slug =
          slugify(productData.title) + "-" + Date.now().toString().slice(-4);
      }
      const product = new Product(productData);
      await product.save();
      // Return formatted product even on create
      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: formatProduct(product)
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get all active products - Public
  getAllProducts: async (req, res) => {
    try {
      const products = await Product.find({ is_active: true });
      const formattedProducts = products.map(formatProduct);
      res.json({
        success: true,
        message: "Products fetched successfully",
        data: formattedProducts
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get product by ID - Public
  getProductById: async (req, res) => {
    try {
      const { id } = req.params;
      let query;

      // Check if id is a valid MongoDB ObjectId
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        query = { _id: id };
      } else {
        query = { slug: id };
      }

      const product = await Product.findOne({
        ...query,
        is_active: true,
      });

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      res.json({
        success: true,
        message: "Product fetched successfully",
        data: formatProduct(product)
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get featured products - Public
  getFeaturedProducts: async (req, res) => {
    try {
      const products = await Product.find({
        featured: true,
        is_active: true,
      });
      const formattedProducts = products.map(formatProduct);
      res.json({
        success: true,
        message: "Featured products fetched successfully",
        data: formattedProducts
      });
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
        sort = "createdAt",
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
        const materialArray = materials.split(",");
        filter.material_used = { $in: materialArray };
      }

      if (minPrice || maxPrice) {
        filter.$or = [{ discounted_price: {} }, { original_price: {} }];

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
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { subcategory: { $regex: search, $options: "i" } },
        ];
      }

      // Pagination
      const skip = (page - 1) * limit;

      const products = await Product.find(filter)
        .sort(sort)
        .limit(Number(limit))
        .skip(skip);

      const total = await Product.countDocuments(filter);

      const formattedProducts = products.map(formatProduct);

      res.json({
        success: true,
        message: "Filtered products fetched successfully",
        data: formattedProducts,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update product - Admin only
  updateProduct: async (req, res) => {
    try {
      const updateData = { ...req.body };
      if (updateData.title && !updateData.slug) {
        updateData.slug =
          slugify(updateData.title) + "-" + Date.now().toString().slice(-4);
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      res.json({
        success: true,
        message: "Product updated successfully",
        data: formatProduct(product)
      });
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
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = productController;
