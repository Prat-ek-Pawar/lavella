I'll create a new Category model and update all related files accordingly.

**File name: `models/Category.js`**

```javascript
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  subcategories: [{
    type: String,
    trim: true
  }],
  image_url: {
    type: String,
    required: false
  },
  display_order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
```

**File name: `models/Product.js` (UPDATED)**

```javascript
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: false,
    trim: true
  },
  description: {
    type: String,
    required: false
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false
  },
  category: {
    type: String,
    required: false,
    trim: true
  },
  subcategory: {
    type: String,
    required: false,
    trim: true
  },
  original_price: {
    type: Number,
    required: false,
    min: 0
  },
  discounted_price: {
    type: Number,
    required: false,
    min: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  images: {
    type: [String],
    required: false,
    default: []
  },
  material_used: {
    type: [String],
    required: false,
    default: []
  },
  color_and_texture: {
    type: [String],
    required: false,
    default: []
  },
  faqs: [{
    question: {
      type: String,
      required: false
    },
    answer: {
      type: String,
      required: false
    }
  }],
  how_to_use: {
    title: {
      type: String,
      required: false
    },
    points: {
      type: [String],
      required: false,
      default: []
    }
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
```

**File name: `controllers/categoryController.js`**

```javascript
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
```

**File name: `routes/categoryRoutes.js`**

```javascript
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
```

**File name: `server.js` (UPDATED - add category routes)**

```javascript
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Load environment variables
dotenv.config();

// Database connection
const dbConnect = require('./config/DBConnect');

// Import middleware
const compressionMiddleware = require('./middleware/compressionMiddleware');
const errorHandlerMiddleware = require('./middleware/errorHandlerMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');

// Import routes
const productRoutes = require('./routes/productRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Initialize express app
const app = express();

// Connect to database
dbConnect();

// Security middleware
app.use(helmet());
app.use(cors());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compressionMiddleware);

// Rate limiting
app.use('/api/', apiLimiter);

// Static files (if needed for serving uploads temporarily)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enquiry', enquiryRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handling middleware (must be last)
app.use(errorHandlerMiddleware);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
```

**File name: `API_DOCUMENTATION.md` (UPDATED - added Category section)**

```markdown
# API Documentation

## Base URL: `http://localhost:5000/api`

## Authentication
Protected routes require JWT token:
```
Authorization: Bearer <token>
```

---

## CATEGORY ROUTES

### Get All Categories
**GET** `/api/categories`  
**Access:** Public

Query Parameters:
- `includeInactive` (boolean): Include inactive categories

Response (200):
```json
{
  "success": true,
  "data": [{
    "_id": "category_id",
    "name": "Curtains",
    "description": "Window treatments",
    "subcategories": ["Ring Curtain", "Eyelet Curtain", "Blackout"],
    "image_url": "category_image_url",
    "display_order": 1,
    "is_active": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }]
}
```

### Get Category by ID
**GET** `/api/categories/:id`  
**Access:** Public

Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "category_id",
    "name": "Curtains",
    "description": "Window treatments",
    "subcategories": ["Ring Curtain", "Eyelet Curtain"],
    "image_url": "category_image_url",
    "display_order": 1,
    "is_active": true
  }
}
```

### Get All Subcategories
**GET** `/api/categories/subcategories`  
**Access:** Public

Response (200):
```json
{
  "success": true,
  "data": {
    "Curtains": ["Ring Curtain", "Eyelet Curtain", "Blackout"],
    "Bedsheets": ["King Size", "Queen Size", "Single"],
    "Cushion Covers": ["Square", "Rectangle", "Round"]
  }
}
```

### Create Category
**POST** `/api/categories`  
**Access:** Protected

Request:
```json
{
  "name": "Curtains",
  "description": "Premium window treatments",
  "subcategories": ["Ring Curtain", "Eyelet Curtain"],
  "image_url": "uploaded_image_url",
  "display_order": 1,
  "is_active": true
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "_id": "new_category_id",
    "name": "Curtains",
    "subcategories": ["Ring Curtain", "Eyelet Curtain"],
    "is_active": true
  }
}
```

### Update Category
**PUT** `/api/categories/:id`  
**Access:** Protected

Request:
```json
{
  "name": "Updated Curtains",
  "description": "Updated description",
  "display_order": 2,
  "is_active": true
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "category_id",
    "name": "Updated Curtains",
    "display_order": 2
  }
}
```

### Delete Category
**DELETE** `/api/categories/:id`  
**Access:** Protected

Response (200):
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

Error (400) if products exist:
```json
{
  "success": false,
  "message": "Cannot delete category. 15 products exist in this category."
}
```

### Add Subcategory
**POST** `/api/categories/:id/subcategory`  
**Access:** Protected

Request:
```json
{
  "subcategory": "Blackout Curtain"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "category_id",
    "name": "Curtains",
    "subcategories": ["Ring Curtain", "Eyelet Curtain", "Blackout Curtain"]
  }
}
```

### Remove Subcategory
**DELETE** `/api/categories/:id/subcategory`  
**Access:** Protected

Request:
```json
{
  "subcategory": "Blackout Curtain"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "category_id",
    "name": "Curtains",
    "subcategories": ["Ring Curtain", "Eyelet Curtain"]
  }
}
```

---

## ADMIN ROUTES

### Login Admin
**POST** `/api/admin/login`  
**Access:** Public

Request:
```json
{
  "username": "admin",
  "password": "Admin@123"
}
```

Response (200):
```json
{
  "success": true,
  "token": "jwt_token_here",
  "admin": {
    "id": "admin_id",
    "username": "admin",
    "full_name": "System Administrator"
  }
}
```

### Create Admin
**POST** `/api/admin/create`  
**Access:** Protected

Request:
```json
{
  "username": "newadmin",
  "password": "Password@123",
  "full_name": "John Doe",
  "email": "john@example.com"
}
```

Response (201):
```json
{
  "success": true,
  "message": "Admin created successfully",
  "admin": {
    "id": "admin_id",
    "username": "newadmin",
    "full_name": "John Doe"
  }
}
```

---

## PRODUCT ROUTES

### Get All Products
**GET** `/api/products`  
**Access:** Public

Response (200):
```json
{
  "success": true,
  "data": [{
    "_id": "product_id",
    "title": "Product Name",
    "description": "Description",
    "category_id": "category_object_id",
    "category": "Curtains",
    "subcategory": "Ring Curtain",
    "original_price": 5000,
    "discounted_price": 4200,
    "featured": false,
    "images": ["image_url_1", "image_url_2"],
    "material_used": ["Cotton", "Silk"],
    "color_and_texture": ["Blue", "Smooth"],
    "faqs": [{
      "question": "Q1",
      "answer": "A1"
    }],
    "how_to_use": {
      "title": "Care Instructions",
      "points": ["Step 1", "Step 2"]
    },
    "is_active": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }]
}
```

### Get Product by ID
**GET** `/api/products/:id`  
**Access:** Public

Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "title": "Product Name",
    "description": "Description",
    "category_id": "category_object_id",
    "category": "Curtains",
    "subcategory": "Ring Curtain",
    "original_price": 5000,
    "discounted_price": 4200,
    "featured": false,
    "images": ["image_url"],
    "material_used": ["Cotton"],
    "color_and_texture": ["Blue"],
    "is_active": true
  }
}
```

### Get Featured Products
**GET** `/api/products/featured`  
**Access:** Public

Response (200):
```json
{
  "success": true,
  "data": [{
    "_id": "product_id",
    "title": "Featured Product",
    "category": "Curtains",
    "discounted_price": 4200,
    "featured": true,
    "images": ["image_url"],
    "is_active": true
  }]
}
```

### Get Filtered Products
**GET** `/api/products/filter`  
**Access:** Public

Query Parameters:
- `category` (string)
- `subcategory` (string)
- `materials` (comma-separated string)
- `minPrice` (number)
- `maxPrice` (number)
- `search` (string)
- `page` (number, default: 1)
- `limit` (number, default: 12)
- `sort` (string, default: "createdAt")

Example: `/api/products/filter?category=Curtains&minPrice=1000&maxPrice=5000&page=1&limit=12`

Response (200):
```json
{
  "success": true,
  "data": [{
    "_id": "product_id",
    "title": "Product Name",
    "category": "Curtains",
    "discounted_price": 3000,
    "images": ["image_url"]
  }],
  "pagination": {
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

### Create Product
**POST** `/api/products`  
**Access:** Protected

Request:
```json
{
  "title": "New Product",
  "description": "Product description",
  "category_id": "category_object_id",
  "category": "Curtains",
  "subcategory": "Eyelet Curtain",
  "original_price": 5000,
  "discounted_price": 4500,
  "featured": false,
  "images": ["image_url_1", "image_url_2"],
  "material_used": ["Cotton", "Polyester"],
  "color_and_texture": ["Grey", "Matte"],
  "faqs": [{
    "question": "Wash care?",
    "answer": "Machine washable"
  }],
  "how_to_use": {
    "title": "Installation",
    "points": ["Measure window", "Install rod", "Hang curtains"]
  },
  "is_active": true
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "_id": "new_product_id",
    "title": "New Product",
    "category": "Curtains",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Update Product
**PUT** `/api/products/:id`  
**Access:** Protected

Request (partial update allowed):
```json
{
  "title": "Updated Product Name",
  "discounted_price": 3999,
  "featured": true,
  "is_active": true
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "title": "Updated Product Name",
    "discounted_price": 3999,
    "featured": true,
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### Delete Product
**DELETE** `/api/products/:id`  
**Access:** Protected

Response (200):
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## BANNER ROUTES

### Get All Banners
**GET** `/api/banners`  
**Access:** Public

Response (200):
```json
{
  "success": true,
  "data": [{
    "_id": "banner_id",
    "title": "Summer Sale",
    "subtitle": "Up to 50% off",
    "category": "Curtains Collection",
    "image_url": "banner_image_url",
    "is_active": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }]
}
```

### Create Banner
**POST** `/api/banners`  
**Access:** Protected

Request:
```json
{
  "title": "New Collection",
  "subtitle": "Premium Range",
  "category": "Bedsheets",
  "image_url": "uploaded_image_url",
  "is_active": true
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "_id": "new_banner_id",
    "title": "New Collection",
    "is_active": true
  }
}
```

### Update Banner
**PUT** `/api/banners/:id`  
**Access:** Protected

Request:
```json
{
  "title": "Updated Title",
  "is_active": false
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "banner_id",
    "title": "Updated Title",
    "is_active": false
  }
}
```

### Delete Banner
**DELETE** `/api/banners/:id`  
**Access:** Protected

Response (200):
```json
{
  "success": true,
  "message": "Banner deleted successfully"
}
```

---

## ENQUIRY ROUTES

### Send Enquiry
**POST** `/api/enquiry`  
**Access:** Public

Request:
```json
{
  "user_name": "John Doe",
  "user_phone": "9876543210",
  "user_email": "john@email.com",
  "user_address": "123 Street, City",
  "items": [{
    "product_id": "product_id_here",
    "title": "Premium Curtains",
    "selected_color_texture": "Blue Silk",
    "quantity": 2,
    "price_at_time": 4200
  }]
}
```

Response (200):
```json
{
  "success": true,
  "message": "Enquiry sent successfully",
  "enquiry_id": "enquiry_id_here"
}
```

### Get All Enquiries
**GET** `/api/enquiry/all`  
**Access:** Protected

Response (200):
```json
{
  "success": true,
  "data": [{
    "_id": "enquiry_id",
    "user_name": "John Doe",
    "user_phone": "9876543210",
    "user_email": "john@email.com",
    "user_address": "123 Street",
    "items": [{
      "product_id": "product_id",
      "title": "Product Name",
      "selected_color_texture": "Blue",
      "quantity": 2,
      "price_at_time": 4200
    }],
    "status": "pending",
    "email_sent": true,
    "admin_notes": "",
    "createdAt": "2024-01-15T10:00:00Z"
  }]
}
```

### Update Enquiry Status
**PUT** `/api/enquiry/:id/status`  
**Access:** Protected

Request:
```json
{
  "status": "contacted",
  "admin_notes": "Called customer, will visit tomorrow"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "_id": "enquiry_id",
    "status": "contacted",
    "admin_notes": "Called customer, will visit tomorrow"
  }
}
```

---

## UPLOAD ROUTES

### Upload Single Image
**POST** `/api/upload/single`  
**Access:** Protected  
**Content-Type:** multipart/form-data

Form Data:
- `image`: File (jpg/png/gif/webp, max 10MB)

Response (200):
```json
{
  "success": true,
  "image_url": "https://s3-url/compressed-image.jpg",
  "message": "Image uploaded successfully"
}
```

### Upload Multiple Images
**POST** `/api/upload/multiple`  
**Access:** Protected  
**Content-Type:** multipart/form-data

Form Data:
- `images`: Files array (max 10 files)

Response (200):
```json
{
  "success": true,
  "image_urls": [
    "https://s3-url/image1.jpg",
    "https://s3-url/image2.jpg"
  ],
  "message": "Images uploaded successfully"
}
```

---

## COMMON ERROR RESPONSES

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "No token provided"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### Rate Limit (429)
```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Something went wrong"
}
```

---

## NOTES

1. **Required Fields:**
   - Category: `name`
   - Enquiry: `user_name`, `user_phone`, `items[]`
   - Each item: `product_id`, `title`
   - Admin login: `username`, `password`

2. **Optional Fields:**
   - Category: `description`, `image_url`, `subcategories`
   - Product: All fields are optional
   - Enquiry: `user_email`, `user_address`

3. **Status Values for Enquiry:**
   - `pending` (default)
   - `contacted`
   - `converted`
   - `cancelled`

4. **Rate Limits:**
   - Login: 5 attempts per 15 minutes
   - Enquiry: 10 per hour
   - General API: 100 requests per minute

5. **Category Management:**
   - Categories maintain consistency across products
   - Cannot delete category if products exist
   - Cannot delete subcategory if products exist
   - Updating category name updates all related products
```