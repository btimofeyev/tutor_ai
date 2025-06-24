// backend/src/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

// Schedule entry routes
router.get('/:child_id', scheduleController.getScheduleEntries);
router.post('/', scheduleController.createScheduleEntry);
router.put('/:id', scheduleController.updateScheduleEntry);
router.delete('/:id', scheduleController.deleteScheduleEntry);

// Unscheduled materials route (may be used by manual scheduling)
router.get('/unscheduled/:child_id', scheduleController.getUnscheduledMaterials);

// Schedule preferences routes
router.get('/preferences/:child_id', scheduleController.getSchedulePreferences);
router.post('/preferences/:child_id', scheduleController.updateSchedulePreferences);

module.exports = router;