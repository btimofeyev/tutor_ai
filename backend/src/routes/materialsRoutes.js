const express = require('express');
const router = express.Router();
const materialsController = require('../controllers/materialsController');
const { enforceMaterialLimit } = require('../middleware/subscriptionEnforcement');
const multer = require('multer');

// Configure multer (same as before)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'tmp/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
    }
});
const upload = multer({ storage: storage });

// Upload and process file(s) - ENFORCE MATERIAL LIMIT
router.post('/upload', upload.array('files', 10), enforceMaterialLimit, materialsController.uploadMaterial);

// Save a material - ENFORCE MATERIAL LIMIT  
router.post('/save', enforceMaterialLimit, materialsController.saveMaterial);

// Other routes (no enforcement needed for reading)
router.get('/lesson/:lesson_id', materialsController.listMaterialsForLesson);
router.get('/subject/:child_subject_id', materialsController.listMaterialsForChildSubject);
router.put('/:material_id', materialsController.updateMaterialDetails);
router.put('/:material_id/toggle-complete', materialsController.toggleMaterialCompletion);
router.delete('/:material_id', materialsController.deleteMaterial);

module.exports = router;