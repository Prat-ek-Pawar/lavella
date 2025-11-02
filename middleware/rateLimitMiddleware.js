const rateLimit = require('express-rate-limit');

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { 
    success: false, 
    message: 'Too many login attempts, please try again later' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for enquiry submissions
const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 enquiries per hour
  message: { 
    success: false, 
    message: 'Too many enquiries submitted, please try again later' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { 
    success: false, 
    message: 'Too many requests, please try again later' 
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  enquiryLimiter,
  apiLimiter
};