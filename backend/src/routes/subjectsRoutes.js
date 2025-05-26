const express = require('express');
const router = express.Router();
const subjectsController = require('../controllers/subjectsController');

// List all available subjects
router.get('/', subjectsController.listSubjects);

// Get subject details
router.get('/:id', subjectsController.getSubjectDetails);

// Add a new subject
router.post('/', subjectsController.addSubject);

// Update a subject
router.put('/:id', subjectsController.updateSubject);

// Delete a subject
router.delete('/:id', subjectsController.deleteSubject);


module.exports = router;