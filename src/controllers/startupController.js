const Startup = require('../models/Startup');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { sendSuccess, sendError, paginate } = require('../utils/response');

/**
 * GET /api/startups
 * Query: page, limit, search, industry, fundingStage, location, sort
 */
const getStartups = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      industry,
      fundingStage,
      location,
      sort = 'newest',
    } = req.query;

    const filter = { isPublished: true };

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Filters
    if (industry) filter.industry = industry;
    if (fundingStage) filter.fundingStage = fundingStage;
    if (location) filter.location = new RegExp(location, 'i');

    // Sorting
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      trending: { views: -1 },
      popular: { 'likes.length': -1 },
    };
    const sortBy = sortOptions[sort] || sortOptions.newest;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [startups, total] = await Promise.all([
      Startup.find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('founder', 'name avatar email')
        .select('-__v'),
      Startup.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      startups,
      pagination: paginate(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/startups/:id
 * Also accepts slug
 */
const getStartup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const startup = await Startup.findOne({ ...query, isPublished: true })
      .populate('founder', 'name avatar email bio location website')
      .populate({
        path: 'comments',
        match: { isDeleted: false, parentComment: null },
        populate: [
          { path: 'user', select: 'name avatar' },
          {
            path: 'replies',
            match: { isDeleted: false },
            populate: { path: 'user', select: 'name avatar' },
          },
        ],
        options: { sort: { createdAt: -1 }, limit: 50 },
      });

    if (!startup) {
      return sendError(res, 'Startup not found', 404);
    }

    // Increment view count if requested (defaults to true for legacy compatibility, but can be disabled)
    if (req.query.inc !== 'false') {
      Startup.findByIdAndUpdate(startup._id, { $inc: { views: 1 } }).exec();
    }

    return sendSuccess(res, { startup });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/startups
 * Founders only
 */
const createStartup = async (req, res, next) => {
  try {
    const data = { ...req.body, founder: req.user._id };

    if (req.files?.logo?.[0]) {
      data.logoUrl = `/uploads/logos/${req.files.logo[0].filename}`;
    }
    if (req.files?.pitchDeck?.[0]) {
      data.pitchDeckUrl = `/uploads/decks/${req.files.pitchDeck[0].filename}`;
    }

    const startup = await Startup.create(data);
    await startup.populate('founder', 'name avatar email');

    return sendSuccess(res, { startup }, 'Startup created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/startups/:id
 * Owner or admin only
 */
const updateStartup = async (req, res, next) => {
  try {
    const startup = await Startup.findById(req.params.id);
    if (!startup) return sendError(res, 'Startup not found', 404);

    const isOwner = startup.founder.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return sendError(res, 'Not authorized to update this startup', 403);
    }

    if (req.files?.logo?.[0]) {
      req.body.logoUrl = `/uploads/logos/${req.files.logo[0].filename}`;
    }
    if (req.files?.pitchDeck?.[0]) {
      req.body.pitchDeckUrl = `/uploads/decks/${req.files.pitchDeck[0].filename}`;
    }

    const updated = await Startup.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('founder', 'name avatar email');

    return sendSuccess(res, { startup: updated }, 'Startup updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/startups/:id
 * Owner or admin only
 */
const deleteStartup = async (req, res, next) => {
  try {
    const startup = await Startup.findById(req.params.id);
    if (!startup) return sendError(res, 'Startup not found', 404);

    const isOwner = startup.founder.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return sendError(res, 'Not authorized to delete this startup', 403);
    }

    await Promise.all([
      Startup.findByIdAndDelete(req.params.id),
      Comment.deleteMany({ startup: req.params.id }),
      User.updateMany({ bookmarks: req.params.id }, { $pull: { bookmarks: req.params.id } }),
    ]);

    return sendSuccess(res, {}, 'Startup deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/startups/:id/analytics
 * Founder/admin only
 */
const getAnalytics = async (req, res, next) => {
  try {
    const startup = await Startup.findById(req.params.id);
    if (!startup) return sendError(res, 'Startup not found', 404);

    const isOwner = startup.founder.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return sendError(res, 'Not authorized', 403);
    }

    const commentCount = await Comment.countDocuments({ startup: startup._id, isDeleted: false });
    const bookmarkCount = await User.countDocuments({ bookmarks: startup._id });

    const likesCount = (startup.likes || []).length;
    const analytics = {
      views: startup.views,
      likes: likesCount,
      comments: commentCount,
      bookmarks: bookmarkCount,
      engagementRate: startup.views > 0
        ? Math.round(((likesCount + commentCount) / startup.views) * 100) / 100
        : 0,
      metrics: startup.metrics,
    };

    return sendSuccess(res, { analytics });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStartups, getStartup, createStartup, updateStartup, deleteStartup, getAnalytics };
