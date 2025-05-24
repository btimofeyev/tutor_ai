// src/routes/unitsRoutes.js
const express = require('express');
const router = express.Router();
const unitsController = require('../controllers/unitsController');

router.post('/', unitsController.createUnit);
router.get('/subject/:child_subject_id', unitsController.listUnitsForSubject);
router.put('/:unit_id', unitsController.updateUnit);
router.delete('/:unit_id', unitsController.deleteUnit);

module.exports = router;