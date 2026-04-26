const router = require('express').Router();
const {
  getStartups,
  getStartup,
  createStartup,
  updateStartup,
  deleteStartup,
  getAnalytics,
} = require('../controllers/startupController');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../validators');
const upload = require('../middleware/upload');

// Public routes
router.get('/', optionalAuth, getStartups);
router.get('/:id', optionalAuth, getStartup);

// Protected routes
router.post(
  '/',
  protect,
  authorize('founder'),
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'pitchDeck', maxCount: 1 }]),
  validate(schemas.createStartup),
  createStartup
);

router.put(
  '/:id',
  protect,
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'pitchDeck', maxCount: 1 }]),
  validate(schemas.updateStartup),
  updateStartup
);

router.delete('/:id', protect, deleteStartup);

// Analytics — owner or admin
router.get('/:id/analytics', protect, getAnalytics);

module.exports = router;
