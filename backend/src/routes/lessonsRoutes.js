const express = require('express');
const router = express.Router();
const lessonsController = require('../controllers/lessonsController');
const multer = require('multer');
const upload = multer({ dest: 'tmp/' });

// Upload and process file (returns structured JSON for review)
router.post('/upload', upload.single('file'), lessonsController.uploadLesson);

// Save/approve the processed lesson
router.post('/save', lessonsController.saveLesson);

// List all lessons for a child_subject_id
router.get('/:child_subject_id', lessonsController.listLessons);

module.exports = router;
