class Validators {
  // Validate phone number
  validatePhone(phone) {
    if (!phone) return { valid: false, message: 'Phone number is required' };
    
    // Remove spaces and special characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check if it's a valid Indian phone number (10 digits, optionally with +91)
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      return { 
        valid: false, 
        message: 'Please enter a valid 10-digit phone number' 
      };
    }
    
    return { valid: true, cleaned: cleanPhone };
  }

  // Validate email
  validateEmail(email) {
    if (!email) return { valid: true }; // Email is optional
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { 
        valid: false, 
        message: 'Please enter a valid email address' 
      };
    }
    
    return { valid: true, cleaned: email.toLowerCase() };
  }

  // Validate enquiry data
  validateEnquiry(data) {
    const errors = [];

    // Check required fields
    if (!data.user_name || data.user_name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    // Validate phone
    const phoneValidation = this.validatePhone(data.user_phone);
    if (!phoneValidation.valid) {
      errors.push(phoneValidation.message);
    }

    // Validate email if provided
    if (data.user_email) {
      const emailValidation = this.validateEmail(data.user_email);
      if (!emailValidation.valid) {
        errors.push(emailValidation.message);
      }
    }

    // Check items
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      errors.push('At least one product item is required');
    } else {
      // Validate each item
      data.items.forEach((item, index) => {
        if (!item.product_id) {
          errors.push(`Item ${index + 1}: Product ID is required`);
        }
        if (!item.title) {
          errors.push(`Item ${index + 1}: Product title is required`);
        }
        if (item.quantity && (item.quantity < 1 || item.quantity > 100)) {
          errors.push(`Item ${index + 1}: Quantity must be between 1 and 100`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      cleanedData: errors.length === 0 ? {
        ...data,
        user_name: data.user_name.trim(),
        user_phone: phoneValidation.cleaned || data.user_phone,
        user_email: data.user_email ? data.user_email.toLowerCase().trim() : null,
        user_address: data.user_address ? data.user_address.trim() : null
      } : null
    };
  }

  // Validate product data
  validateProduct(data) {
    const errors = [];

    // Validate prices if provided
    if (data.original_price !== undefined && data.original_price < 0) {
      errors.push('Original price cannot be negative');
    }

    if (data.discounted_price !== undefined && data.discounted_price < 0) {
      errors.push('Discounted price cannot be negative');
    }

    if (data.original_price && data.discounted_price && 
        data.discounted_price > data.original_price) {
      errors.push('Discounted price cannot be greater than original price');
    }

    // Validate images if provided
    if (data.images && Array.isArray(data.images)) {
      data.images.forEach((image, index) => {
        if (!this.isValidUrl(image)) {
          errors.push(`Image ${index + 1}: Invalid URL format`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate URL
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Sanitize input to prevent XSS
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  // Sanitize object recursively
  sanitizeObject(obj) {
    const sanitized = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          sanitized[key] = this.sanitizeInput(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (Array.isArray(obj[key])) {
            sanitized[key] = obj[key].map(item => 
              typeof item === 'object' ? this.sanitizeObject(item) : this.sanitizeInput(item)
            );
          } else {
            sanitized[key] = this.sanitizeObject(obj[key]);
          }
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    
    return sanitized;
  }

  // Validate pagination parameters
  validatePagination(page, limit) {
    const validatedPage = parseInt(page) || 1;
    const validatedLimit = parseInt(limit) || 12;

    return {
      page: Math.max(1, validatedPage),
      limit: Math.min(100, Math.max(1, validatedLimit))
    };
  }

  // Validate MongoDB ObjectId
  isValidObjectId(id) {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }
}

module.exports = new Validators();