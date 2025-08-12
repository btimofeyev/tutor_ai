const express = require('express');
const router = express.Router();
const parentNotesController = require('../controllers/parentNotesController');
const { authenticateParent } = require('../middleware/auth');

// All routes require parent authentication
router.use(authenticateParent);

// ===== NOTES ROUTES (HANDLES BOTH CHILD-SPECIFIC AND GLOBAL) =====
// Global notes use "global" as child_id

// Get all notes for a specific child
router.get('/:child_id/notes', parentNotesController.getNotes);

// Create a new note for a specific child
router.post('/:child_id/notes', parentNotesController.createNote);

// Update a specific note
router.put('/:child_id/notes/:note_id', parentNotesController.updateNote);

// Delete a specific note
router.delete('/:child_id/notes/:note_id', parentNotesController.deleteNote);

module.exports = router;
