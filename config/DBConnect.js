const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const dbConnect = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your_db_name');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
dbConnect();
module.exports = dbConnect;