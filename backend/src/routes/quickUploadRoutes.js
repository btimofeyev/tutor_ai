// backend/src/routes/quickUploadRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const quickUploadController = require('../controllers/quickUploadController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 20 // Max 20 files at once
  }
});

// Quick upload endpoint
router.post('/quick-upload', upload.array('files', 20), quickUploadController.quickUpload);

module.exports = router;