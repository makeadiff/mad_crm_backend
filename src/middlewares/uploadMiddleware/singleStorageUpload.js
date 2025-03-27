// const multer = require('multer');
// const path = require('path');
// const { slugify } = require('transliteration');

// const fileFilter = require('./utils/LocalfileFilter');

// const singleStorageUpload = ({
//   entity,
//   fileType = 'default',
//   uploadFieldName = 'file',
//   fieldName = 'file',
// }) => {
//   var diskStorage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, `src/public/uploads/${entity}`);
//     },
//     filename: function (req, file, cb) {
//       try {
//         // fetching the file extension of the uploaded file
//         let fileExtension = path.extname(file.originalname);
//         let uniqueFileID = Math.random().toString(36).slice(2, 7); // generates unique ID of length 5

//         let originalname = '';
//         if (req.body.seotitle) {
//           originalname = slugify(req.body.seotitle.toLocaleLowerCase()); // convert any language to English characters
//         } else {
//           originalname = slugify(file.originalname.split('.')[0].toLocaleLowerCase()); // convert any language to English characters
//         }

//         let _fileName = `${originalname}-${uniqueFileID}${fileExtension}`;

//         const filePath = `public/uploads/${entity}/${_fileName}`;
//         // saving file name and extension in request upload object
//         req.upload = {
//           fileName: _fileName,
//           fieldExt: fileExtension,
//           entity: entity,
//           fieldName: fieldName,
//           fileType: fileType,
//           filePath: filePath,
//         };

//         req.body[fieldName] = filePath;

//         cb(null, _fileName);
//       } catch (error) {
//         cb(error); // pass the error to the callback
//       }
//     },
//   });

//   let filterType = fileFilter(fileType);

//   const multerStorage = multer({ storage: diskStorage, fileFilter: filterType }).single('file');
//   return multerStorage;
// };

// module.exports = singleStorageUpload;

const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');
const { slugify } = require('transliteration');
const fileFilter = require('./utils/LocalfileFilter');

require('dotenv').config();

// AWS S3 Configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadToS3 = async (file, entity) => {
  const fileExtension = path.extname(file.originalname);
  const uniqueFileID = Math.random().toString(36).slice(2, 7);
  const originalname = slugify(file.originalname.split('.')[0].toLowerCase());
  const fileName = `uploads/${entity}/${originalname}-${uniqueFileID}${fileExtension}`;

  try {
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const upload = new Upload({
      client: s3,
      params: uploadParams,
    });

    await upload.done();

    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

// Middleware for file upload
const singleStorageUpload = ({ entity, fileType = 'default', uploadFieldName = 'file' }) => {
  return (req, res, next) => {
    const upload = multer({
      storage: multer.memoryStorage(), // Store in memory before uploading to S3
      fileFilter: fileFilter(fileType),
    }).single(uploadFieldName);

    upload(req, res, async (err) => {
      if (err) {
        return next(err);
      }

      if (!req.file) {
        return next();
      }

      try {
        const fileUrl = await uploadToS3(req.file, entity);
        req.upload = { fileUrl }; // Store the S3 URL in request
        next();
      } catch (error) {
        next(error);
      }
    });
  };
};

module.exports = singleStorageUpload;


