const express = require('express');
const router = express.Router();
const subjectsController = require('../controllers/subjectsController');

// List all available subjects
router.get('/', subjectsController.listSubjects);

// Add a new subject (optional, admin use)
router.post('/', subjectsController.addSubject);

// Assign subject to a child
router.post('/assign', subjectsController.assignSubjectToChild);

// List subjects for a child
router.get('/child/:child_id', subjectsController.listSubjectsForChild);

// Remove subject from a child
router.delete('/assign', subjectsController.removeSubjectFromChild);

router.get('/child_subject_details/:child_subject_id', subjectsController.getChildSubjectDetails);

module.exports = router;
