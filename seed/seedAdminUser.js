const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const username = "admin";
    const password = "admin123";
    const full_name = "System Admin";
    const email = "admin@lavelladecor.com";

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      username: username.toLowerCase(),
    });
    if (existingAdmin) {
      console.log("Admin user already exists. Updating password...");
      const salt = await bcrypt.genSalt(10);
      existingAdmin.password_hash = await bcrypt.hash(password, salt);
      existingAdmin.full_name = full_name;
      existingAdmin.email = email;
      await existingAdmin.save();
      console.log("Admin password updated successfully");
    } else {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const newAdmin = new Admin({
        username: username.toLowerCase(),
        password_hash,
        full_name,
        email,
      });

      await newAdmin.save();
      console.log("Admin user created successfully");
    }

    mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
