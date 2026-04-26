const Startup = require('../models/Startup');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Message = require('../models/Message');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * POST /api/interactions/like/:startupId
 * Toggle like on a startup
 */
const toggleLike = async (req, res, next) => {
  try {
    const startup = await Startup.findById(req.params.startupId);
    if (!startup) return sendError(res, 'Startup not found', 404);

    const userId = req.user._id;
    const alreadyLiked = startup.likes.some((id) => id.toString() === userId.toString());

    if (alreadyLiked) {
      startup.likes.pull(userId);
    } else {
      startup.likes.push(userId);
    }
    await startup.save();

    return sendSuccess(res, {
      liked: !alreadyLiked,
      likeCount: (startup.likes || []).length,
    }, alreadyLiked ? 'Like removed' : 'Startup liked');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interactions/bookmark/:startupId
 * Toggle bookmark on a startup
 */
const toggleBookmark = async (req, res, next) => {
  try {
    const startup = await Startup.findById(req.params.startupId);
    if (!startup) return sendError(res, 'Startup not found', 404);

    const user = await User.findById(req.user._id);
    const alreadyBookmarked = (user.bookmarks || []).some((id) => id.toString() === startup._id.toString());

    if (alreadyBookmarked) {
      user.bookmarks.pull(startup._id);
    } else {
      user.bookmarks.push(startup._id);
    }
    await user.save();

    return sendSuccess(res, {
      bookmarked: !alreadyBookmarked,
      bookmarkCount: (user.bookmarks || []).length,
    }, alreadyBookmarked ? 'Bookmark removed' : 'Startup saved');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interactions/bookmarks
 * Get current user's bookmarked startups
 */
const getBookmarks = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'bookmarks',
      select: 'name tagline industry fundingStage location views likes slug logoUrl founder',
      populate: { path: 'founder', select: 'name avatar' },
    });

    return sendSuccess(res, { bookmarks: user.bookmarks });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interactions/comment/:startupId
 */
const postComment = async (req, res, next) => {
  try {
    const startup = await Startup.findById(req.params.startupId);
    if (!startup) return sendError(res, 'Startup not found', 404);

    const { content, parentComment } = req.body;

    // Validate parent comment exists if provided
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.startup.toString() !== startup._id.toString()) {
        return sendError(res, 'Parent comment not found', 404);
      }
    }

    const comment = await Comment.create({
      content,
      user: req.user._id,
      startup: startup._id,
      parentComment: parentComment || null,
    });

    await comment.populate('user', 'name avatar');

    return sendSuccess(res, { comment }, 'Comment posted', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interactions/comments/:startupId
 */
const getComments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [comments, total] = await Promise.all([
      Comment.find({ startup: req.params.startupId, parentComment: null, isDeleted: false })
        .populate('user', 'name avatar')
        .populate({
          path: 'replies',
          match: { isDeleted: false },
          populate: { path: 'user', select: 'name avatar' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Comment.countDocuments({ startup: req.params.startupId, parentComment: null, isDeleted: false }),
    ]);

    return sendSuccess(res, { comments, total, page: parseInt(page) });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/interactions/comment/:commentId
 * Owner or admin can delete (soft delete)
 */
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return sendError(res, 'Comment not found', 404);

    const isOwner = comment.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return sendError(res, 'Not authorized', 403);
    }

    comment.isDeleted = true;
    comment.content = '[deleted]';
    await comment.save();

    return sendSuccess(res, {}, 'Comment deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interactions/message
 * Send a message to a founder
 */
const sendMessage = async (req, res, next) => {
  try {
    const { recipientId, startupId, subject, content } = req.body;

    const recipient = await User.findById(recipientId);
    if (!recipient) return sendError(res, 'Recipient not found', 404);

    if (recipientId === req.user._id.toString()) {
      return sendError(res, 'Cannot message yourself', 400);
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      startup: startupId || null,
      subject,
      content,
      parentMessage: req.body.parentMessage || null,
    });

    await message.populate('sender', 'name avatar email');

    return sendSuccess(res, { message }, 'Message sent', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interactions/messages
 * Get inbox for current user
 */
const getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ 
      $or: [{ recipient: req.user._id }, { sender: req.user._id }] 
    })
      .populate('sender', 'name avatar email role')
      .populate('recipient', 'name avatar email role')
      .populate('startup', 'name slug')
      .sort({ createdAt: -1 })
      .limit(100);

    const unreadCount = messages.filter((m) => !m.isRead).length;

    return sendSuccess(res, { messages, unreadCount });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/interactions/messages/:messageId/read
 */
const markMessageRead = async (req, res, next) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.messageId, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!message) return sendError(res, 'Message not found', 404);
    return sendSuccess(res, { message }, 'Message marked as read');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  toggleLike,
  toggleBookmark,
  getBookmarks,
  postComment,
  getComments,
  deleteComment,
  sendMessage,
  getMessages,
  markMessageRead,
};
