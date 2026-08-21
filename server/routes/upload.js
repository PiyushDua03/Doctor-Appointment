/**
 * upload.js — File upload route for doctor photos
 *
 * POST /api/upload — Upload image, returns URL
 */

'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');

// Storage config — save to /uploads folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg';
    var name = 'doc-' + Date.now() + '-' + Math.round(Math.random() * 1000) + ext;
    cb(null, name);
  }
});

// File filter — images only
const fileFilter = function (req, file, cb) {
  var allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.indexOf(file.mimetype) >= 0) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WebP, GIF) are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// POST /api/upload — admin only
router.post('/', authenticate, authorize('admin'), function (req, res) {
  upload.single('photo')(req, res, function (err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Upload failed.'
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.'
      });
    }

    var photoUrl = '/uploads/' + req.file.filename;
    res.status(200).json({
      success: true,
      photoUrl: photoUrl
    });
  });
});

module.exports = router;
