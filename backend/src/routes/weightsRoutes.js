// src/routes/weightsRoutes.js
const express = require('express');
const router = express.Router();
const weightsController = require('../controllers/weightsController');
// Add any necessary auth middleware here if you have it

router.get('/:child_subject_id', weightsController.getWeightsForChildSubject);
router.get('/combined/:child_subject_id', weightsController.getCombinedWeightsForChildSubject);
router.post('/:child_subject_id', weightsController.saveWeightsForChildSubject);

module.exports = router;