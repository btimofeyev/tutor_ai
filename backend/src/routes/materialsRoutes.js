// backend/src/routes/materialsRoutes.js
const express = require('express');
const router = express.Router();
const materialsController = require('../controllers/materialsController');
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

// Upload and process file(s) - analyze with AI
router.post('/upload', upload.array('files', 10), materialsController.uploadMaterial);

// Save a material (after analysis/approval)
router.post('/save', materialsController.saveMaterial);

// List materials for a specific lesson container
router.get('/lesson/:lesson_id', materialsController.listMaterialsForLesson);

// List materials for a child subject (backward compatibility)
router.get('/subject/:child_subject_id', materialsController.listMaterialsForChildSubject);

// Get, update, delete specific material
router.put('/:material_id', materialsController.updateMaterialDetails);
router.put('/:material_id/toggle-complete', materialsController.toggleMaterialCompletion);
router.delete('/:material_id', materialsController.deleteMaterial);

module.exports = router;