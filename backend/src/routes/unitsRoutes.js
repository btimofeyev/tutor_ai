const express = require('express');
const router = express.Router();
const unitsController = require('../controllers/unitsController');

// Create a new unit
router.post('/', unitsController.createUnit);

// List units for a specific child_subject_id
router.get('/subject/:child_subject_id', unitsController.listUnitsForSubject);

// Get a specific unit by ID
router.get('/:unit_id', unitsController.getUnitById);

// Update a unit
router.put('/:unit_id', unitsController.updateUnit);

// Delete a unit
router.delete('/:unit_id', unitsController.deleteUnit);

// Reorder units (bulk update sequence_order)
router.patch('/reorder', unitsController.reorderUnits);

module.exports = router;