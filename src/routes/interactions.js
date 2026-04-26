const router = require('express').Router();
const {
  toggleLike,
  toggleBookmark,
  getBookmarks,
  postComment,
  getComments,
  deleteComment,
  sendMessage,
  getMessages,
  markMessageRead,
} = require('../controllers/interactionController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../validators');

// Likes
router.post('/like/:startupId', protect, toggleLike);

// Bookmarks
router.post('/bookmark/:startupId', protect, toggleBookmark);
router.get('/bookmarks', protect, getBookmarks);

// Comments
router.get('/comments/:startupId', getComments);
router.post('/comment/:startupId', protect, validate(schemas.postComment), postComment);
router.delete('/comment/:commentId', protect, deleteComment);

// Messages
router.post('/message', protect, validate(schemas.sendMessage), sendMessage);
router.get('/messages', protect, getMessages);
router.put('/messages/:messageId/read', protect, markMessageRead);

module.exports = router;
