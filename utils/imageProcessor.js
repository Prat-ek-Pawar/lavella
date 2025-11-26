const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ImageProcessor {
  constructor() {
    this.defaultOptions = {
      maxWidth: null,       // ⬅ no resize by default
      maxHeight: null,
      quality: 100,         // ⬅ max quality (visually lossless)
      format: 'jpeg'
    };
  }

  async compressImage(inputPath, outputPath, options = {}) {
    try {
      const config = { ...this.defaultOptions, ...options };

      let pipeline = sharp(inputPath);

      // ⬅ Only resize if user explicitly provides dimensions
      if (config.maxWidth && config.maxHeight) {
        pipeline = pipeline.resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // High-quality JPEG output
      pipeline = pipeline.jpeg({
        quality: config.quality,
        progressive: true
      });

      await pipeline.toFile(outputPath);

      const originalSize = fs.statSync(inputPath).size;
      const compressedSize = fs.statSync(outputPath).size;
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

      return {
        success: true,
        originalSize,
        compressedSize,
        compressionRatio: `${compressionRatio}%`,
        outputPath
      };
    } catch (error) {
      console.error('Image compression error:', error);
      throw error;
    }
  }

  async generateThumbnail(inputPath, outputPath, width = 300, height = 300) {
    try {
      await sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 75 })
        .toFile(outputPath);

      return {
        success: true,
        thumbnailPath: outputPath
      };
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw error;
    }
  }

  async convertToWebP(inputPath, outputPath) {
    try {
      await sharp(inputPath)
        .webp({ quality: 80 })
        .toFile(outputPath);

      return {
        success: true,
        webpPath: outputPath
      };
    } catch (error) {
      console.error('WebP conversion error:', error);
      throw error;
    }
  }

  async getImageMetadata(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        success: true,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: fs.statSync(imagePath).size,
          space: metadata.space,
          channels: metadata.channels,
          depth: metadata.depth,
          density: metadata.density
        }
      };
    } catch (error) {
      console.error('Metadata extraction error:', error);
      throw error;
    }
  }

  async batchCompress(inputDir, outputDir, options = {}) {
    try {
      const files = fs.readdirSync(inputDir);
      const imageFiles = files.filter(file =>
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
      );

      const results = [];

      for (const file of imageFiles) {
        const inputPath = path.join(inputDir, file);
        const outputFileName = `compressed-${file.split('.')[0]}.jpg`;
        const outputPath = path.join(outputDir, outputFileName);

        const result = await this.compressImage(inputPath, outputPath, options);
        results.push({
          originalFile: file,
          ...result
        });
      }

      return {
        success: true,
        totalFiles: results.length,
        results
      };
    } catch (error) {
      console.error('Batch compression error:', error);
      throw error;
    }
  }

  cleanupTempFiles(directory) {
    try {
      const files = fs.readdirSync(directory);

      files.forEach(file => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        const now = Date.now();
        const fileAge = now - stats.mtimeMs;
        const maxAge = 60 * 60 * 1000; // 1 hour

        if (fileAge > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old temp file: ${file}`);
        }
      });

      return {
        success: true,
        message: 'Temp files cleanup completed'
      };
    } catch (error) {
      console.error('Cleanup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ImageProcessor();
