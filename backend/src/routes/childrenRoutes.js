const express = require('express');
const router = express.Router();
const childrenController = require('../controllers/childrenController');

// List all children for the parent
router.get('/', childrenController.listChildren);

// Add a child
router.post('/', childrenController.createChild);

// Update a child
router.put('/:id', childrenController.updateChild);

// Delete a child
router.delete('/:id', childrenController.deleteChild);


router.post('/:child_id/username', childrenController.setChildUsername);
router.post('/:child_id/pin', childrenController.setChildPin);

module.exports = router;
