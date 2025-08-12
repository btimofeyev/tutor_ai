const express = require('express');
const router = express.Router();
const childSubjectsController = require('../controllers/childSubjectsController');

// Assign a subject to a child
router.post('/assign', childSubjectsController.assignSubjectToChild);

// Unassign a subject from a child (by child_id + subject_id)
router.delete('/unassign', childSubjectsController.unassignSubjectFromChild);

// Unassign a subject from a child (by child_subject_id)
router.delete('/:child_subject_id', childSubjectsController.unassignByChildSubjectId);

// List all assigned subjects for a child
router.get('/child/:child_id', childSubjectsController.listSubjectsForChild);

// Update custom subject name override
router.put('/:child_subject_id', childSubjectsController.updateCustomSubjectName);

// Get child subject details (for subject settings page)
router.get('/details/:child_subject_id', childSubjectsController.getChildSubjectDetails);

module.exports = router;
