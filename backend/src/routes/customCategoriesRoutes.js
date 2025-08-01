// src/routes/customCategoriesRoutes.js
const express = require('express');
const router = express.Router();
const customCategoriesController = require('../controllers/customCategoriesController');

// All routes are for custom assignment categories

// GET /custom-categories/:child_subject_id - Get all custom categories for a child subject
router.get('/:child_subject_id', customCategoriesController.getCustomCategoriesForChildSubject);

// POST /custom-categories/:child_subject_id - Create a new custom category for a child subject
router.post('/:child_subject_id', customCategoriesController.createCustomCategory);

// PUT /custom-categories/category/:id - Update a specific custom category
router.put('/category/:id', customCategoriesController.updateCustomCategory);

// DELETE /custom-categories/category/:id - Delete a specific custom category
router.delete('/category/:id', customCategoriesController.deleteCustomCategory);

module.exports = router;