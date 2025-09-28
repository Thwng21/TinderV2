const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Message = require('../Models/Message');
const Match = require('../Models/Match');
const auth = require('../Middlewares/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', [
  body('matchId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid match ID is required'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be between 1 and 1000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'gif', 'emoji'])
    .withMessage('Message type must be text, image, gif, or emoji'),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be valid'),
  body('gifUrl')
    .optional()
    .isURL()
    .withMessage('GIF URL must be valid'),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Reply to must be a valid message ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      matchId,
      content,
      messageType = 'text',
      imageUrl,
      gifUrl,
      replyTo
    } = req.body;

    // Verify match exists and user is part of it
    const match = await Match.findOne({
      _id: matchId,
      users: req.user._id,
      isActive: true
    }).populate('users', '_id name');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or inactive'
      });
    }

    // Get recipient (the other user in the match)
    const recipient = match.users.find(
      user => user._id.toString() !== req.user._id.toString()
    );

    // Validate message content based on type
    if (messageType === 'text' && (!content || content.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Text messages require content'
      });
    }

    if (messageType === 'image' && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image messages require imageUrl'
      });
    }

    if (messageType === 'gif' && !gifUrl) {
      return res.status(400).json({
        success: false,
        message: 'GIF messages require gifUrl'
      });
    }

    // Verify replyTo message exists and belongs to this match
    if (replyTo) {
      const replyMessage = await Message.findOne({
        _id: replyTo,
        match: matchId,
        isActive: true
      });

      if (!replyMessage) {
        return res.status(404).json({
          success: false,
          message: 'Reply message not found'
        });
      }
    }

    // Create message
    const message = new Message({
      match: matchId,
      sender: req.user._id,
      recipient: recipient._id,
      content: content?.trim(),
      messageType,
      imageUrl,
      gifUrl,
      replyTo
    });

    await message.save();

    // Populate message for response
    await message.populate([
      { path: 'sender', select: 'name photos' },
      { path: 'recipient', select: 'name photos' },
      { path: 'replyTo', select: 'content sender messageType' }
    ]);

    // Emit message to recipient via Socket.IO
    const io = req.app.get('io');
    io.to(recipient._id.toString()).emit('receive_message', {
      message: message.toResponse(),
      match: {
        _id: matchId,
        sender: {
          _id: req.user._id,
          name: req.user.name,
          mainPhoto: req.user.mainPhoto
        }
      }
    });

    // Also emit to sender for confirmation
    io.to(req.user._id.toString()).emit('message_sent', {
      message: message.toResponse(),
      matchId
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: message.toResponse() }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
});

// @route   GET /api/messages/unread-count
// @desc    Get unread messages count
// @access  Private
router.get('/unread-count', async (req, res) => {
  try {
    const unreadCount = await Message.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching unread count'
    });
  }
});

// @route   PUT /api/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOneAndUpdate(
      {
        _id: messageId,
        recipient: req.user._id,
        isActive: true
      },
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Emit read receipt to sender
    const io = req.app.get('io');
    io.to(message.sender.toString()).emit('message_read', {
      messageId: message._id,
      readBy: req.user._id,
      readAt: message.readAt
    });

    res.json({
      success: true,
      message: 'Message marked as read',
      data: { message: message.toResponse() }
    });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking message as read'
    });
  }
});

// @route   PUT /api/messages/match/:matchId/read-all
// @desc    Mark all messages in a match as read
// @access  Private
router.put('/match/:matchId/read-all', async (req, res) => {
  try {
    const { matchId } = req.params;

    // Verify match exists and user is part of it
    const match = await Match.findOne({
      _id: matchId,
      users: req.user._id,
      isActive: true
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const modifiedCount = await Message.markAsRead(matchId, req.user._id);

    // Get the other user for socket notification
    const otherUser = match.users.find(
      userId => userId.toString() !== req.user._id.toString()
    );

    // Emit read receipt to other user
    const io = req.app.get('io');
    io.to(otherUser.toString()).emit('messages_read', {
      matchId,
      readBy: req.user._id,
      readCount: modifiedCount,
      readAt: new Date()
    });

    res.json({
      success: true,
      message: `${modifiedCount} messages marked as read`,
      data: { modifiedCount }
    });
  } catch (error) {
    console.error('Mark all messages read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking messages as read'
    });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message (soft delete)
// @access  Private
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.deleteMessage(messageId, req.user._id);

    // Emit message deletion to recipient
    const io = req.app.get('io');
    io.to(message.recipient.toString()).emit('message_deleted', {
      messageId: message._id,
      matchId: message.match,
      deletedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Message not found or unauthorized') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting message'
    });
  }
});

// @route   PUT /api/messages/:messageId/edit
// @desc    Edit a message
// @access  Private
router.put('/:messageId/edit', [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be between 1 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.editMessage(messageId, req.user._id, content.trim());

    // Populate message for response
    await message.populate([
      { path: 'sender', select: 'name photos' },
      { path: 'recipient', select: 'name photos' }
    ]);

    // Emit message edit to recipient
    const io = req.app.get('io');
    io.to(message.recipient._id.toString()).emit('message_edited', {
      message: message.toResponse(),
      editedBy: req.user._id,
      editedAt: message.editedAt
    });

    res.json({
      success: true,
      message: 'Message edited successfully',
      data: { message: message.toResponse() }
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('too old')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while editing message'
    });
  }
});

// @route   GET /api/messages/stats
// @desc    Get message statistics for user
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const stats = await Message.getMessageStats(req.user._id);

    // Get average response time (simplified calculation)
    const recentMessages = await Message.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ],
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    })
    .sort({ createdAt: 1 })
    .limit(100);

    // Get message type distribution
    const messageTypes = await Message.aggregate([
      {
        $match: {
          sender: req.user._id,
          isActive: true
        }
      },
      {
        $group: {
          _id: '$messageType',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeDistribution = {};
    messageTypes.forEach(type => {
      typeDistribution[type._id] = type.count;
    });

    res.json({
      success: true,
      data: {
        ...stats,
        messageTypes: typeDistribution,
        averageLength: 42, // This would need actual calculation
        averageResponseTime: '3.2 hours', // This would need complex calculation
        mostActiveHour: '20:00', // This would need analysis
        streak: 5 // Days with at least one message
      }
    });
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching message statistics'
    });
  }
});

// @route   GET /api/messages/search
// @desc    Search messages
// @access  Private
router.get('/search', [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('matchId')
    .optional()
    .isMongoId()
    .withMessage('Match ID must be valid'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { q, matchId, limit = 20 } = req.query;

    const searchQuery = {
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ],
      isActive: true,
      messageType: 'text',
      content: { $regex: q, $options: 'i' }
    };

    if (matchId) {
      searchQuery.match = matchId;
    }

    const messages = await Message.find(searchQuery)
      .populate('sender', 'name photos')
      .populate('recipient', 'name photos')
      .populate('match', 'users')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        messages,
        query: q,
        total: messages.length
      }
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching messages'
    });
  }
});

module.exports = router;