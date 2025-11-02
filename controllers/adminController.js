const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminController = {
  // Admin login
  loginAdmin: async (req, res) => {
    try {
      const { username, password } = req.body;

      // Find admin
      const admin = await Admin.findOne({ username: username.toLowerCase() });
      
      if (!admin) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Update last login
      admin.last_login = new Date();
      await admin.save();

      // Create JWT token
      const token = jwt.sign(
        { id: admin._id, username: admin.username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.json({ 
        success: true, 
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          full_name: admin.full_name
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Create admin (initial setup only)
  createAdmin: async (req, res) => {
    try {
      const { username, password, full_name, email } = req.body;

      // Check if admin exists
      const existingAdmin = await Admin.findOne({ username: username.toLowerCase() });
      
      if (existingAdmin) {
        return res.status(400).json({ success: false, message: 'Admin already exists' });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create admin
      const admin = new Admin({
        username: username.toLowerCase(),
        password_hash,
        full_name,
        email
      });

      await admin.save();

      res.status(201).json({ 
        success: true, 
        message: 'Admin created successfully',
        admin: {
          id: admin._id,
          username: admin.username,
          full_name: admin.full_name
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

module.exports = adminController;