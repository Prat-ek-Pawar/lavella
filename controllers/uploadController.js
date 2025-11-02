const multer = require('multer');
const sharp = require('sharp');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Configure multer for temp storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const uploadController = {
  // Upload and compress image - Admin only
  uploadImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const tempFilePath = req.file.path;
      const compressedFileName = 'compressed-' + req.file.filename;
      const compressedFilePath = path.join('uploads/temp', compressedFileName);

      // Compress image using Sharp
      await sharp(tempFilePath)
        .resize(1200, 1200, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 80 })
        .toFile(compressedFilePath);

      // Read compressed file
      const fileContent = fs.readFileSync(compressedFilePath);

      // Upload to S3
      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `products/${Date.now()}-${req.file.originalname}`,
        Body: fileContent,
        ContentType: 'image/jpeg',
        ACL: 'public-read'
      };

      const s3Result = await s3.upload(s3Params).promise();

      // Delete temp files
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(compressedFilePath);

      res.json({
        success: true,
        image_url: s3Result.Location,
        message: 'Image uploaded successfully'
      });

    } catch (error) {
      // Clean up temp files on error
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Upload multiple images - Admin only
  uploadMultipleImages: async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
      }

      const uploadedUrls = [];

      for (const file of req.files) {
        const tempFilePath = file.path;
        const compressedFileName = 'compressed-' + file.filename;
        const compressedFilePath = path.join('uploads/temp', compressedFileName);

        // Compress image
        await sharp(tempFilePath)
          .resize(1200, 1200, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 80 })
          .toFile(compressedFilePath);

        // Read compressed file
        const fileContent = fs.readFileSync(compressedFilePath);

        // Upload to S3
        const s3Params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: `products/${Date.now()}-${file.originalname}`,
          Body: fileContent,
          ContentType: 'image/jpeg',
          ACL: 'public-read'
        };

        const s3Result = await s3.upload(s3Params).promise();
        uploadedUrls.push(s3Result.Location);

        // Delete temp files
        fs.unlinkSync(tempFilePath);
        fs.unlinkSync(compressedFilePath);
      }

      res.json({
        success: true,
        image_urls: uploadedUrls,
        message: 'Images uploaded successfully'
      });

    } catch (error) {
      // Clean up temp files on error
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = { upload, uploadController };