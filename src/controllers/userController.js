const User = require('../models/User');
const Startup = require('../models/Startup');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * GET /api/users/me
 */
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('bookmarks', 'name tagline industry fundingStage slug logoUrl')
    .populate('startups', 'name tagline views likes fundingStage slug')
    .populate('dealFlow.startup', 'name tagline views likes fundingStage slug');
  return sendSuccess(res, { user: user.toPublicJSON() });
};

/**
 * POST /api/users/dealflow/:startupId
 */
const addToDealFlow = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.role !== 'investor') return sendError(res, 'Only investors can track deal flow', 403);

    const startupId = req.params.startupId;
    const exists = user.dealFlow.find(item => item.startup.toString() === startupId);
    
    if (exists) {
      return sendError(res, 'Already in deal flow', 400);
    }

    user.dealFlow.push({ startup: startupId });
    await user.save();
    
    await user.populate('dealFlow.startup', 'name tagline');

    return sendSuccess(res, { dealFlow: user.dealFlow }, 'Added to deal flow');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/dealflow/:startupId
 */
const updateDealFlowStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const user = await User.findById(req.user._id);
    
    const deal = user.dealFlow.find(item => item.startup.toString() === req.params.startupId);
    if (!deal) return sendError(res, 'Deal not found', 404);

    if (status) deal.status = status;
    if (notes !== undefined) deal.notes = notes;
    deal.updatedAt = Date.now();

    await user.save();
    await user.populate('dealFlow.startup', 'name tagline');

    return sendSuccess(res, { dealFlow: user.dealFlow }, 'Status updated');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id  (public profile)
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshTokens -bookmarks');
    if (!user || !user.isActive) return sendError(res, 'User not found', 404);

    const startups = await Startup.find({ founder: user._id, isPublished: true })
      .select('name tagline industry fundingStage views likes slug logoUrl')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { user, startups });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/me
 */
const updateProfile = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.avatar = `/uploads/logos/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
      runValidators: true,
    }).select('-password -refreshTokens');

    return sendSuccess(res, { user: user.toPublicJSON() }, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/me/password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return sendError(res, 'Current password is incorrect', 400);

    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    return sendSuccess(res, {}, 'Password changed. Please log in again.');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users  (admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select('-password -refreshTokens').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    return sendSuccess(res, { users, total, page: parseInt(page) });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id/status  (admin only)
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);
    if (user.role === 'admin') return sendError(res, 'Cannot deactivate admin accounts', 403);

    user.isActive = !user.isActive;
    if (!user.isActive) user.refreshTokens = []; // Revoke all tokens
    await user.save();

    return sendSuccess(res, { isActive: user.isActive }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    next(error);
  }
};

module.exports = { getMe, getUserProfile, updateProfile, changePassword, getAllUsers, toggleUserStatus, addToDealFlow, updateDealFlowStatus };
