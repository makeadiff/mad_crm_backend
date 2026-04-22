const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');
const { slugify } = require('transliteration');
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  requestTimeout: 120000,
});

const uploadFileToS3 = async (file, entity, originalName) => {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  const fileExtension = path.extname(originalName);
  const uniqueFileID = Math.random().toString(36).slice(2, 7);
  const cleanName = slugify(originalName.split('.')[0].toLowerCase());
  const fileName = `${cleanName}-${uniqueFileID}${fileExtension}`;

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `uploads/${entity}/${fileName}`,
      Body: file.data,
      ContentType: file.mimetype || 'application/octet-stream',
    },
  });

  await upload.done();

  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${entity}/${fileName}`;
};

module.exports = { uploadFileToS3 };
