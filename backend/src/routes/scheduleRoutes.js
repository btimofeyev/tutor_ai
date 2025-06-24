// backend/src/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const aiSchedulingController = require('../controllers/aiSchedulingController');

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

// AI Scheduling routes
router.post('/ai-generate', aiSchedulingController.generateAISchedule);
router.post('/ai-generate-family', aiSchedulingController.generateFamilyAISchedule);

module.exports = router;