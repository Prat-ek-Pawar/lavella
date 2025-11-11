const Enquiry = require('../models/Enquiry');
const mongoose = require('mongoose');
const emailService = require('../utils/emailService');

const enquiryController = {
  sendEnquiryEmail: async (req, res) => {
    try {
      const { user_name, user_phone, user_email, user_address, items } = req.body;

      // Validation
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

      // Save enquiry
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

      res.json({ success: true, message: 'Enquiry sent successfully', enquiry_id: enquiry._id });

      // Background email
      (async () => {
        try {
          console.log('Sending enquiry email in background for enquiry ID:', enquiry._id);
          const emailResult = await emailService.sendEnquiryEmail({
            user_name,
            user_phone,
            user_email,
            user_address,
            items: enquiry.items,
            enquiry_id: enquiry._id
          });

          if (emailResult.success) {
            enquiry.email_sent = true;
            console.log('Enquiry email saved in mongo db');
            await enquiry.save();
          }
        } catch (mailErr) {
          console.error('Background email error:', mailErr.message);
        }
      })();

    } catch (err) {
      console.error('Enquiry error:', err);
      res.status(500).json({ success: false, message: 'Error sending enquiry. Please try again.' });
    }
  },

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
