// backend/src/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

// Schedule entry routes
router.get('/:child_id', scheduleController.getScheduleEntries);
router.post('/', scheduleController.createScheduleEntry);
router.put('/:id', scheduleController.updateScheduleEntry);
router.delete('/:id', scheduleController.deleteScheduleEntry);

// Schedule preferences routes
router.get('/preferences/:child_id', scheduleController.getSchedulePreferences);
router.post('/preferences/:child_id', scheduleController.updateSchedulePreferences);

// AI scheduling routes
router.post('/ai-generate', scheduleController.generateAISchedule);
router.post('/family-generate', scheduleController.generateFamilySchedule);

// Simplified conflict-free family scheduling
router.post('/conflict-free', scheduleController.generateConflictFreeSchedule);

module.exports = router;