const express = require('express');
const collegesController = require('../controllers/colleges.controller');
const { authenticate } = require('../middleware/auth');
const { requireStaff, requireAdmin } = require('../middleware/roles');
const { asyncHandler } = require('../middleware/error-handler');

const router = express.Router();

// Both ADMIN and INSTRUCTOR can list colleges (needed for dropdowns)
router.get('/admin/colleges', authenticate, requireStaff, asyncHandler(collegesController.list));

// Only ADMIN can mutate
router.post('/admin/colleges', authenticate, requireAdmin, asyncHandler(collegesController.create));
router.patch('/admin/colleges/:id', authenticate, requireAdmin, asyncHandler(collegesController.update));
router.delete('/admin/colleges/:id', authenticate, requireAdmin, asyncHandler(collegesController.deactivate));

module.exports = router;
