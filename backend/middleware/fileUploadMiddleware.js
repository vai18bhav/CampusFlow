const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { errorResponse } = require('../utils/responseHelper');

// Helper to fetch max upload size limit from database (default 10 MB)
const getMaxUploadSizeMB = async () => {
  try {
    const [rows] = await pool.query("SELECT config_value FROM platform_config WHERE config_key = 'MAX_UPLOAD_SIZE_MB'");
    if (rows.length > 0 && !isNaN(rows[0].config_value)) {
      return parseFloat(rows[0].config_value);
    }
  } catch (err) {
    console.error('Failed to query MAX_UPLOAD_SIZE_MB from DB:', err.message);
  }
  return 10; // Default 10 MB per SRS specification
};

// Storage Engine Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isProfile = req.path.includes('/profile') || req.body.upload_type === 'profile';
    const folder = isProfile ? 'profiles' : 'assignments';
    const targetDir = path.join(__dirname, '..', 'uploads', folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

// File format filter (PDF, JPG, PNG, JPEG)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_FORMAT'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Default 10 MB buffer limit
});

/**
 * Middleware handler wrapping Multer with dynamic DB configuration & clean JSON errors.
 */
const handleFileUpload = (fieldName = 'file') => {
  return async (req, res, next) => {
    const maxMb = await getMaxUploadSizeMB();
    const maxSizeBytes = maxMb * 1024 * 1024;

    const singleUpload = upload.single(fieldName);

    singleUpload(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(res, 400, `File size exceeds maximum permitted limit of ${maxMb} MB.`);
        }
        if (err.message === 'INVALID_FILE_FORMAT') {
          return errorResponse(res, 400, 'Invalid file format. Supported upload formats are: PDF, JPG, PNG, JPEG.');
        }
        return errorResponse(res, 400, 'File upload failed: ' + err.message);
      }

      if (req.file && req.file.size > maxSizeBytes) {
        // Remove file if exceeded dynamic MB limit
        fs.unlinkSync(req.file.path);
        return errorResponse(res, 400, `File size exceeds maximum permitted limit of ${maxMb} MB.`);
      }

      next();
    });
  };
};

module.exports = {
  handleFileUpload,
  getMaxUploadSizeMB
};
