const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const { slugify } = require('transliteration');
require('dotenv').config();

// AWS S3 Configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadFileToS3 = async (file, entity, originalName) => {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  const fileExtension = path.extname(originalName);
  const uniqueFileID = Math.random().toString(36).slice(2, 7); // Generate unique ID
  const cleanName = slugify(originalName.split('.')[0].toLowerCase());
  const fileName = `${cleanName}-${uniqueFileID}${fileExtension}`; // Construct safe filename

  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `uploads/${entity}/${fileName}`,
    Body: file.data, // <-- Use the binary file directly
    ContentType: file.mimetype || 'application/octet-stream', // Use mimetype from file
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${entity}/${fileName}`;
};

module.exports = { uploadFileToS3 };
