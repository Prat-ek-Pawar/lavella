const Enquiry = require('../models/Enquiry');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const enquiryController = {
  // Send enquiry email - Public
  sendEnquiryEmail: async (req, res) => {
    try {
      const { user_name, user_phone, user_email, user_address, items } = req.body;

      // Validate required fields
      if (!user_name || !user_phone) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name and phone are required' 
        });
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'At least one product item is required' 
        });
      }

      // Validate each item
      for (let item of items) {
        if (!item.product_id || !item.title) {
          return res.status(400).json({ 
            success: false, 
            message: 'Product ID and title are required for each item' 
          });
        }
      }

      // Save enquiry to database
     // Save enquiry to database – allow invalid product_id
const enquiry = new Enquiry({
  user_name,
  user_phone,
  user_email,
  user_address,
  items: items.map(it => ({
    ...it,
    product_id: mongoose.isValidObjectId(it.product_id) ? it.product_id : undefined // accept null / invalid
  }))
});
await enquiry.save();

      // Create email transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Build email content
      let itemsList = '';
      items.forEach((item, index) => {
        itemsList += `
          ${index + 1}. Product: ${item.title}
          Product ID: ${item.product_id}
          Color/Texture: ${item.selected_color_texture || 'Not specified'}
          Quantity: ${item.quantity || 1}
          Price: ${item.price_at_time ? `₹${item.price_at_time}` : 'Price on request'}
          ------------------------
        `;
      });

      const emailBody = `
        New Enquiry Received!
        
        Customer Details:
        Name: ${user_name}
        Phone: ${user_phone}
        Email: ${user_email || 'Not provided'}
        Address: ${user_address || 'Not provided'}
        
        Products Enquired:
        ${itemsList}
        
        Enquiry ID: ${enquiry._id}
        Date: ${new Date().toLocaleString()}
      `;

      // Send email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.OWNER_EMAIL || process.env.EMAIL_USER,
        subject: `New Enquiry from ${user_name}`,
        text: emailBody
      };

      await transporter.sendMail(mailOptions);

      // Update enquiry status
      enquiry.email_sent = true;
      await enquiry.save();

      res.json({ 
        success: true, 
        message: 'Enquiry sent successfully',
        enquiry_id: enquiry._id
      });

    } catch (error) {
      console.log('Enquiry email error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error sending enquiry. Please try again.' 
      });
    }
  },

  // Get all enquiries - Admin only
  getAllEnquiries: async (req, res) => {
    try {
      const enquiries = await Enquiry.find()
        .sort('-createdAt')
        .populate('items.product_id', 'title category');
      
      res.json({ success: true, data: enquiries });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update enquiry status - Admin only
  updateEnquiryStatus: async (req, res) => {
    try {
      const { status, admin_notes } = req.body;
      
      const enquiry = await Enquiry.findByIdAndUpdate(
        req.params.id,
        { status, admin_notes },
        { new: true }
      );

      if (!enquiry) {
        return res.status(404).json({ success: false, message: 'Enquiry not found' });
      }

      res.json({ success: true, data: enquiry });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = enquiryController;