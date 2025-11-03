// controllers/uploadController.js
const multer = require('multer');
const sharp = require('sharp');
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
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}-${base}.jpg`); // we will output jpeg
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    return ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
  }
});

const uploadController = {
  // SINGLE
  uploadImage: async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

      const tempIn = req.file.path;
      const tempOut = path.join('uploads/temp', `compressed-${req.file.filename}`);

      // Compress to JPEG
      await sharp(tempIn)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(tempOut);

      const fileContent = fs.readFileSync(tempOut);

      const safeOriginal = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
      const key = `products/${Date.now()}-${safeOriginal}.jpg`;

      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: 'image/jpeg',
        // ❌ Do NOT include ACL when bucket has "bucket owner enforced"
        CacheControl: 'public, max-age=31536000, immutable'
      };

      const s3Result = await s3.upload(s3Params).promise();

      // Cleanup
      fs.existsSync(tempIn) && fs.unlinkSync(tempIn);
      fs.existsSync(tempOut) && fs.unlinkSync(tempOut);

      // If serving via CloudFront, map the URL (optional)
      const cdn = process.env.CLOUDFRONT_DOMAIN; // e.g. dxxx.cloudfront.net
      const publicUrl = cdn ? `https://${cdn}/${key}` : s3Result.Location;

      res.json({ success: true, image_url: publicUrl, key, message: 'Image uploaded successfully' });
    } catch (error) {
      // Cleanup best-effort
      try { req.file?.path && fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path); } catch {}
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // MULTIPLE
  uploadMultipleImages: async (req, res) => {
    try {
      if (!req.files || !req.files.length) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
      }

      const uploadedUrls = [];
      const cdn = process.env.CLOUDFRONT_DOMAIN;

      for (const file of req.files) {
        const tempIn = file.path;
        const tempOut = path.join('uploads/temp', `compressed-${file.filename}`);

        await sharp(tempIn)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(tempOut);

        const fileContent = fs.readFileSync(tempOut);

        const safeOriginal = path.parse(file.originalname).name.replace(/\s+/g, '_');
        const key = `products/${Date.now()}-${safeOriginal}.jpg`;

        const s3Params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable'
        };

        const s3Result = await s3.upload(s3Params).promise();

        // Cleanup
        fs.existsSync(tempIn) && fs.unlinkSync(tempIn);
        fs.existsSync(tempOut) && fs.unlinkSync(tempOut);

        uploadedUrls.push(cdn ? `https://${cdn}/${key}` : s3Result.Location);
      }

      res.json({ success: true, image_urls: uploadedUrls, message: 'Images uploaded successfully' });
    } catch (error) {
      // Cleanup best-effort
      try {
        req.files?.forEach(f => f?.path && fs.existsSync(f.path) && fs.unlinkSync(f.path));
      } catch {}
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = { upload, uploadController };
