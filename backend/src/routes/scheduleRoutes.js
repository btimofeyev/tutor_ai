// backend/src/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const simpleFamilyScheduler = require('../controllers/simpleFamilyScheduler');
const { enforceAIAccess } = require('../middleware/subscriptionEnforcement');

// Schedule entry routes
router.get('/:child_id', scheduleController.getScheduleEntries);
router.post('/', scheduleController.createScheduleEntry);
router.put('/:id', scheduleController.updateScheduleEntry);
router.delete('/:id', scheduleController.deleteScheduleEntry);

// Schedule preferences routes
router.get('/preferences/:child_id', scheduleController.getSchedulePreferences);
router.post('/preferences/:child_id', scheduleController.updateSchedulePreferences);

// AI scheduling routes - protected by subscription
router.post('/ai-generate', enforceAIAccess, scheduleController.generateAISchedule);
router.post('/family-generate', enforceAIAccess, scheduleController.generateFamilySchedule);

// Simplified conflict-free family scheduling - protected by subscription
router.post('/conflict-free', enforceAIAccess, scheduleController.generateConflictFreeSchedule);

// Simple family scheduler - protected by subscription
router.post('/simple-family', enforceAIAccess, simpleFamilyScheduler.generateSimpleFamilySchedule);

module.exports = router;