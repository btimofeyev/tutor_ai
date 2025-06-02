const express = require('express');
const router = express.Router();
const childrenController = require('../controllers/childrenController');
const { enforceChildLimit, enforceChildLoginAccess } = require('../middleware/subscriptionEnforcement');

// List all children for the parent
router.get('/', childrenController.listChildren);

// Add a child - ENFORCE CHILD LIMIT
router.post('/', enforceChildLimit, childrenController.createChild);

// Update a child
router.put('/:id', childrenController.updateChild);

// Delete a child
router.delete('/:id', childrenController.deleteChild);

// Set username/PIN - ENFORCE CHILD LOGIN ACCESS
router.post('/:child_id/username', enforceChildLoginAccess, childrenController.setChildUsername);
router.post('/:child_id/pin', enforceChildLoginAccess, childrenController.setChildPin);

module.exports = router;