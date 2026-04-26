const router = require('express').Router();
const {
  getMe,
  getUserProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  toggleUserStatus,
  addToDealFlow,
  updateDealFlowStatus,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../validators');
const upload = require('../middleware/upload');

// Current user
router.get('/me', protect, getMe);
router.put('/me', protect, upload.single('avatar'), validate(schemas.updateProfile), updateProfile);
router.put('/me/password', protect, validate(schemas.changePassword), changePassword);
router.post('/dealflow/:startupId', protect, addToDealFlow);
router.put('/dealflow/:startupId', protect, updateDealFlowStatus);

// Admin
router.get('/', protect, authorize('admin'), getAllUsers);
router.put('/:id/status', protect, authorize('admin'), toggleUserStatus);

// Public profile (must come last to avoid shadowing /me)
router.get('/:id', getUserProfile);

module.exports = router;
