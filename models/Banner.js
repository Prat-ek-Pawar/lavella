const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: false,
    trim: true
  },
  subtitle: {
    type: String,
    required: false,
    trim: true
  },
  category: {
    type: String,
    required: false,
    trim: true
  },
  image_url: {
    type: String,
    required: false
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;