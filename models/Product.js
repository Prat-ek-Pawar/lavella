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