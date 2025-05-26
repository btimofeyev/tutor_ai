// backend/src/routes/lessonContainersRoutes.js
const express = require('express');
const router = express.Router();
const lessonsContainerController = require('../controllers/lessonsContainerController');

// Create a new lesson container
router.post('/', lessonsContainerController.createLessonContainer);

// List lesson containers for a specific unit
router.get('/unit/:unit_id', lessonsContainerController.listLessonsForUnit);

// Get a specific lesson container by ID
router.get('/:lesson_id', lessonsContainerController.getLessonContainerById);

// Update a lesson container
router.put('/:lesson_id', lessonsContainerController.updateLessonContainer);

// Delete a lesson container
router.delete('/:lesson_id', lessonsContainerController.deleteLessonContainer);

// Reorder lesson containers (bulk update sequence_order)
router.patch('/reorder', lessonsContainerController.reorderLessonContainers);

module.exports = router;