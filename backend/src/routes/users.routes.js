const express = require("express");
const usersController = require("../controllers/users.controller");
const { authenticate } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { asyncHandler } = require("../middleware/error-handler");

const router = express.Router();

router.post(
  "/users/create-instructor",
  authenticate,
  requireAdmin,
  asyncHandler(usersController.createInstructor)
);

router.get(
  "/users/instructors",
  authenticate,
  requireAdmin,
  asyncHandler(usersController.listInstructors)
);

router.get(
  "/users/all",
  authenticate,
  requireAdmin,
  asyncHandler(usersController.listAll)
);

router.get(
  "/users/:id",
  authenticate,
  requireAdmin,
  asyncHandler(usersController.getById)
);

router.delete(
  "/users/:id",
  authenticate,
  requireAdmin,
  asyncHandler(usersController.removeById)
);

router.post(
  "/users/:id/reset-password",
  authenticate,
  requireAdmin,
  asyncHandler(usersController.resetPassword)
);

router.post(
  "/users/bulk-import",
  authenticate,
  requireAdmin,
  asyncHandler(usersController.bulkImportCadets)
);

module.exports = router;
