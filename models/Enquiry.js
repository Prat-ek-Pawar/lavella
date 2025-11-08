const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  user_name: {
    type: String,
    required: true,
    trim: true
  },
  user_phone: {
    type: String,
    required: true,
    trim: true
  },
  user_email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  user_address: {
    type: String,
    required: false,
    trim: true
  },
  items: [{
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false
    },
    title: {
      type: String,
      required: true
    },
    selected_color_texture: {
      type: String,
      required: false
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    price_at_time: {
      type: Number,
      required: false
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'contacted', 'converted', 'cancelled'],
    default: 'pending'
  },
  email_sent: {
    type: Boolean,
    default: false
  },
  admin_notes: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

const Enquiry = mongoose.model('Enquiry', enquirySchema);

module.exports = Enquiry;