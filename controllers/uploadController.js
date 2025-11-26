// controllers/uploadController.js
const multer = require('multer');
const sharp = require('sharp'); // still imported if you want later, but unused now
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Ensure temp dir exists (important on fresh deploys)
fs.mkdirSync('uploads/temp', { recursive: true });

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Multer temp storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/temp'),
  filename: (req, file, cb) => {
    const base = path.parse(file.originalname).name.replace(/\s+/g, '_');
    // local temp file name, extension doesn't really matter now
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok =
      allowed.test(path.extname(file.originalname).toLowerCase()) &&
      allowed.test(file.mimetype);
    return ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
  }
});

const uploadController = {
  // SINGLE
  uploadImage: async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: 'No file uploaded' });
      }

      const tempIn = req.file.path;

      // 🔥 No compression, no resizing: upload original bytes
      const fileContent = fs.readFileSync(tempIn);

      const safeOriginal = path
        .parse(req.file.originalname)
        .name.replace(/\s+/g, '_');
      const ext =
        path.extname(req.file.originalname).toLowerCase() || '.jpg';
      const key = `products/${Date.now()}-${safeOriginal}${ext}`;

      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: req.file.mimetype, // keep original mime type
        CacheControl: 'public, max-age=31536000, immutable'
      };

      const s3Result = await s3.upload(s3Params).promise();

      // Cleanup temp file
      fs.existsSync(tempIn) && fs.unlinkSync(tempIn);

      const cdn = process.env.CLOUDFRONT_DOMAIN; // e.g. dxxx.cloudfront.net
      const publicUrl = cdn ? `https://${cdn}/${key}` : s3Result.Location;

      res.json({
        success: true,
        image_url: publicUrl,
        key,
        message: 'Image uploaded successfully'
      });
    } catch (error) {
      // Cleanup best-effort
      try {
        req.file?.path &&
          fs.existsSync(req.file.path) &&
          fs.unlinkSync(req.file.path);
      } catch {}
      return res
        .status(500)
        .json({ success: false, message: error.message });
    }
  },

  // MULTIPLE
  uploadMultipleImages: async (req, res) => {
    try {
      if (!req.files || !req.files.length) {
        return res
          .status(400)
          .json({ success: false, message: 'No files uploaded' });
      }

      const uploadedUrls = [];
      const cdn = process.env.CLOUDFRONT_DOMAIN;

      for (const file of req.files) {
        const tempIn = file.path;

        // 🔥 No compression, no resizing here also
        const fileContent = fs.readFileSync(tempIn);

        const safeOriginal = path
          .parse(file.originalname)
          .name.replace(/\s+/g, '_');
        const ext =
          path.extname(file.originalname).toLowerCase() || '.jpg';
        const key = `products/${Date.now()}-${safeOriginal}${ext}`;

        const s3Params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable'
        };

        const s3Result = await s3.upload(s3Params).promise();

        // Cleanup temp file
        fs.existsSync(tempIn) && fs.unlinkSync(tempIn);

        uploadedUrls.push(cdn ? `https://${cdn}/${key}` : s3Result.Location);
      }

      res.json({
        success: true,
        image_urls: uploadedUrls,
        message: 'Images uploaded successfully'
      });
    } catch (error) {
      // Cleanup best-effort
      try {
        req.files?.forEach(f => {
          f?.path && fs.existsSync(f.path) && fs.unlinkSync(f.path);
        });
      } catch {}
      return res
        .status(500)
        .json({ success: false, message: error.message });
    }
  }
};

module.exports = { upload, uploadController };
