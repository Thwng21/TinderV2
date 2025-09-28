const express = require('express');
const { query, validationResult } = require('express-validator');
const Match = require('../Models/Match');
const Message = require('../Models/Message');
const auth = require('../Middlewares/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// @route   GET /api/matches
// @desc    Get user's matches
// @access  Private
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const matches = await Match.findUserMatches(req.user._id, page, limit);

    // Format matches for response
    const formattedMatches = await Promise.all(
      matches.map(async (match) => {
        const matchDetails = await Match.findById(match._id).getMatchDetailsForUser(req.user._id);
        return matchDetails;
      })
    );

    res.json({
      success: true,
      data: {
        matches: formattedMatches,
        pagination: {
          page,
          limit,
          total: formattedMatches.length
        }
      }
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching matches'
    });
  }
});

// @route   GET /api/matches/:matchId
// @desc    Get specific match details
// @access  Private
router.get('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;

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

    const matchDetails = await match.getMatchDetailsForUser(req.user._id);

    res.json({
      success: true,
      data: { match: matchDetails }
    });
  } catch (error) {
    console.error('Get match details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching match details'
    });
  }
});

// @route   DELETE /api/matches/:matchId
// @desc    Unmatch with a user
// @access  Private
router.delete('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;

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

    // Unmatch
    await match.unmatch(req.user._id);

    // Get the other user ID for socket notification
    const otherUserId = match.users.find(
      userId => userId.toString() !== req.user._id.toString()
    );

    // Notify other user via Socket.IO
    const io = req.app.get('io');
    io.to(otherUserId.toString()).emit('unmatched', {
      matchId: match._id,
      unmatchedBy: req.user._id,
      message: 'Someone unmatched with you'
    });

    res.json({
      success: true,
      message: 'Successfully unmatched'
    });
  } catch (error) {
    console.error('Unmatch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during unmatch'
    });
  }
});

// @route   GET /api/matches/:matchId/messages
// @desc    Get messages for a specific match
// @access  Private
router.get('/:matchId/messages', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
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

    const { matchId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

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

    // Get messages
    const messages = await Message.getMatchMessages(matchId, page, limit);

    // Mark messages as read
    await Message.markAsRead(matchId, req.user._id);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to get chronological order
        pagination: {
          page,
          limit,
          total: messages.length
        }
      }
    });
  } catch (error) {
    console.error('Get match messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
});

// @route   GET /api/matches/stats/overview
// @desc    Get match statistics overview
// @access  Private
router.get('/stats/overview', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get comprehensive match statistics
    const matchStats = await Match.getMatchStats(userId);

    // Get recent matches (last 7 days)
    const recentMatches = await Match.find({
      users: userId,
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).countDocuments();

    // Get matches with unread messages
    const matchesWithUnread = await Match.aggregate([
      {
        $match: {
          users: userId,
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'match',
          as: 'messages'
        }
      },
      {
        $match: {
          'messages': {
            $elemMatch: {
              recipient: userId,
              isRead: false,
              isActive: true
            }
          }
        }
      },
      {
        $count: 'count'
      }
    ]);

    const unreadMatchesCount = matchesWithUnread.length > 0 ? matchesWithUnread[0].count : 0;

    // Get total unread messages count
    const totalUnreadMessages = await Message.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        ...matchStats,
        recentMatches,
        unreadMatchesCount,
        totalUnreadMessages,
        averageResponseTime: '2.5 hours', // This would need more complex calculation
        bestMatchingDay: 'Sunday' // This would need analysis of match creation patterns
      }
    });
  } catch (error) {
    console.error('Get match stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching match statistics'
    });
  }
});

// @route   GET /api/matches/activity/recent
// @desc    Get recent match activity
// @access  Private
router.get('/activity/recent', [
  query('days')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Days must be between 1 and 30')
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

    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get recent matches
    const recentMatches = await Match.find({
      users: req.user._id,
      isActive: true,
      createdAt: { $gte: startDate }
    })
    .populate('users', 'name photos')
    .populate('lastMessage', 'content messageType createdAt')
    .sort({ createdAt: -1 })
    .limit(20);

    // Get recent messages in matches
    const recentMessages = await Message.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ],
      isActive: true,
      createdAt: { $gte: startDate }
    })
    .populate('sender', 'name photos')
    .populate('recipient', 'name photos')
    .populate('match', 'users')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      data: {
        period: `Last ${days} days`,
        recentMatches,
        recentMessages,
        summary: {
          newMatches: recentMatches.length,
          messagesSent: recentMessages.filter(msg => msg.sender._id.toString() === req.user._id.toString()).length,
          messagesReceived: recentMessages.filter(msg => msg.recipient._id.toString() === req.user._id.toString()).length
        }
      }
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recent activity'
    });
  }
});

// @route   POST /api/matches/:matchId/report
// @desc    Report a match/user
// @access  Private
router.post('/:matchId/report', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { reason, description } = req.body;

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

    // In a real application, you would save this report to a reports collection
    // For now, we'll just log it and return success
    console.log('User report:', {
      reportedBy: req.user._id,
      matchId,
      reason,
      description,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Report submitted successfully. Thank you for helping keep our community safe.'
    });
  } catch (error) {
    console.error('Report match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting report'
    });
  }
});

module.exports = router;