const AWS = require('aws-sdk');
const fs = require('fs');

class S3Service {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'ap-south-1'
    });
    
    this.bucketName = process.env.S3_BUCKET_NAME;
  }

  async uploadFile(filePath, key, contentType = 'image/jpeg') {
    try {
      const fileContent = fs.readFileSync(filePath);

      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
      };

      const result = await this.s3.upload(params).promise();
      return {
        success: true,
        url: result.Location,
        key: result.Key
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  }

  async deleteFile(key) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('S3 delete error:', error);
      throw error;
    }
  }

  async deleteMultipleFiles(keys) {
    try {
      if (!keys || keys.length === 0) {
        return { success: true, message: 'No files to delete' };
      }

      const objects = keys.map(key => ({ Key: key }));

      const params = {
        Bucket: this.bucketName,
        Delete: {
          Objects: objects,
          Quiet: false
        }
      };

      const result = await this.s3.deleteObjects(params).promise();
      return {
        success: true,
        deleted: result.Deleted,
        errors: result.Errors
      };
    } catch (error) {
      console.error('S3 multiple delete error:', error);
      throw error;
    }
  }

  getFileKeyFromUrl(url) {
    try {
      if (!url) return null;
      
      // Extract key from S3 URL
      const urlParts = url.split('/');
      const bucketIndex = urlParts.indexOf(this.bucketName);
      
      if (bucketIndex !== -1) {
        return urlParts.slice(bucketIndex + 1).join('/');
      }
      
      // Alternative: if URL contains amazonaws.com
      if (url.includes('amazonaws.com')) {
        const key = url.split('.amazonaws.com/')[1];
        return key;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      return null;
    }
  }

  async checkBucketExists() {
    try {
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
      console.log(`S3 Bucket ${this.bucketName} is accessible`);
      return true;
    } catch (error) {
      console.error(`S3 Bucket ${this.bucketName} is not accessible:`, error.message);
      return false;
    }
  }
}

module.exports = new S3Service();