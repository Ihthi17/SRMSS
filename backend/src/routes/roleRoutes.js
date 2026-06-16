const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');

router.get('/', roleController.getAllRoles);
router.post('/', roleController.createRole);
router.put('/:id', roleController.updateRole);

// Role permissions endpoints
router.get('/:id/permissions', roleController.getRolePermissions);
router.put('/:id/permissions', roleController.updateRolePermissions);

module.exports = router;
