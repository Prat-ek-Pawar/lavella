const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');
const dbConnect = require('../config/DBConnect');

dotenv.config();

// Script to create initial admin user
async function seedAdmin() {
  try {
    // Connect to database
    await dbConnect();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create default admin credentials
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create admin
    const admin = new Admin({
      username: 'admin',
      password_hash: hashedPassword,
      full_name: 'System Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@lavelladecore.com',
      is_active: true
    });

    await admin.save();

    console.log('=================================');
    console.log('Admin user created successfully!');
    console.log('=================================');
    console.log('Username: admin');
    console.log(`Password: ${defaultPassword}`);
    console.log('=================================');
    console.log('IMPORTANT: Please change the password after first login');
    console.log('=================================');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

// Run the seed script
seedAdmin();