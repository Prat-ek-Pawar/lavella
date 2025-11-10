// controllers/enquiryController.js
const Enquiry = require('../models/Enquiry');
const mongoose = require('mongoose');
const emailService = require('../utils/emailService');   // ← our service

const enquiryController = {
  // PUBLIC – create enquiry + background email
  sendEnquiryEmail: async (req, res) => {
    try {
      const { user_name, user_phone, user_email, user_address, items } = req.body;

      // --- basic validation ---
      if (!user_name || !user_phone) {
        return res.status(400).json({ success: false, message: 'Name and phone are required' });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one product item is required' });
      }
      for (const it of items) {
        if (!it.title) {
          return res.status(400).json({ success: false, message: 'Product title is required for each item' });
        }
      }

      // --- save enquiry ---
      const enquiry = new Enquiry({
        user_name,
        user_phone,
        user_email,
        user_address,
        items: items.map(it => ({
          ...it,
          product_id: mongoose.isValidObjectId(it.product_id) ? it.product_id : undefined
        }))
      });
      await enquiry.save();

      // --- respond instantly ---
      res.json({ success: true, message: 'Enquiry sent successfully', enquiry_id: enquiry._id });

      // --- background email ---
      (async () => {
        try {
          await emailService.sendEnquiryEmail({
            user_name,
            user_phone,
            user_email,
            user_address,
            items: enquiry.items,   // saved items (with real ObjectIds if valid)
            enquiry_id: enquiry._id
          });
          enquiry.email_sent = true;
          await enquiry.save();
        } catch (mailErr) {
          console.error('Background mail error:', mailErr.message);
        }
      })();
    } catch (err) {
      console.error('Enquiry error:', err);
      res.status(500).json({ success: false, message: 'Error sending enquiry. Please try again.' });
    }
  },

  // --- admin endpoints (unchanged) ---
  getAllEnquiries: async (req, res) => {
    try {
      const enquiries = await Enquiry.find().sort('-createdAt').populate('items.product_id', 'title category');
      res.json({ success: true, data: enquiries });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateEnquiryStatus: async (req, res) => {
    try {
      const { status, admin_notes } = req.body;
      const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, { status, admin_notes }, { new: true });
      if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });
      res.json({ success: true, data: enquiry });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = enquiryController;