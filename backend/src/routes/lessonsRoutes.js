// src/routes/lessonsRoutes.js
const express = require('express');
const router = express.Router();
const lessonsController = require('../controllers/lessonsController');
const multer = require('multer');
// Configure multer for temporary storage of uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'tmp/') // Ensure 'tmp/' directory exists
    },
    filename: function (req, file, cb) {
        // Preserve original extension, add timestamp for uniqueness
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
    }
});
const upload = multer({ storage: storage });


// Upload and process file(s)
// Changed from upload.single('file') to upload.array('files', 10)
// 'files' is the field name expected from the frontend
router.post('/upload', upload.array('files', 10), lessonsController.uploadLesson);

// ... rest of the routes ...
router.post('/save', lessonsController.saveLesson);
router.get('/:child_subject_id', lessonsController.listLessons);
router.put('/:lesson_id', lessonsController.updateLessonDetails);
router.put('/:lesson_id/toggle-complete', lessonsController.toggleLessonCompletion); 

module.exports = router;