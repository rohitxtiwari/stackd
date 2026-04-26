const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return sendError(res, 'Email already registered', 409);
    }

    const user = await User.create({ name, email, password, role });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token hash
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    return sendSuccess(
      res,
      { accessToken, refreshToken, user: user.toPublicJSON() },
      'Account created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account has been deactivated. Contact support.', 403);
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Limit stored refresh tokens to 5 (multi-device support)
    if (user.refreshTokens.length >= 5) {
      user.refreshTokens = user.refreshTokens.slice(-4);
    }
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    return sendSuccess(
      res,
      { accessToken, refreshToken, user: user.toPublicJSON() },
      'Logged in successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendError(res, 'Refresh token required', 400);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return sendError(res, 'Invalid or expired refresh token', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(res, 'User not found', 401);
    }

    const tokenExists = user.refreshTokens.some((t) => t.token === refreshToken);
    if (!tokenExists) {
      // Possible token reuse — revoke all tokens
      user.refreshTokens = [];
      await user.save();
      return sendError(res, 'Refresh token reuse detected. Please log in again.', 401);
    }

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
    const newRefreshToken = generateRefreshToken(user._id);
    const newAccessToken = generateAccessToken(user._id, user.role);
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

    return sendSuccess(
      res,
      { accessToken: newAccessToken, refreshToken: newRefreshToken },
      'Tokens refreshed'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (refreshToken) {
      const fullUser = await User.findById(req.user._id).select('+refreshTokens');
      if (fullUser) {
        fullUser.refreshTokens = fullUser.refreshTokens.filter((t) => t.token !== refreshToken);
        await fullUser.save();
      }
    }

    return sendSuccess(res, {}, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  return sendSuccess(res, { user: req.user.toPublicJSON() });
};

module.exports = { register, login, refresh, logout, getMe };
