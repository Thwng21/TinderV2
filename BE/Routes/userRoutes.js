const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../Models/User');
const Match = require('../Models/Match');
const auth = require('../Middlewares/auth');

const router = express.Router();

// All routes are protected
router.use(auth);

// @route   GET /api/users/discover
// @desc    Get potential matches for swiping
// @access  Private
router.get('/discover', [
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

    const limit = parseInt(req.query.limit) || 10;
    const potentialMatches = await req.user.getPotentialMatches(limit);

    res.json({
      success: true,
      data: {
        users: potentialMatches,
        count: potentialMatches.length
      }
    });
  } catch (error) {
    console.error('Discover users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching potential matches'
    });
  }
});

// @route   POST /api/users/swipe
// @desc    Swipe on a user (like or pass)
// @access  Private
router.post('/swipe', [
  body('targetUserId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid target user ID is required'),
  body('action')
    .isIn(['like', 'pass'])
    .withMessage('Action must be either like or pass')
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

    const { targetUserId, action } = req.body;

    // Check if target user exists and is active
    const targetUser = await User.findOne({ _id: targetUserId, isActive: true });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is trying to swipe on themselves
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot swipe on yourself'
      });
    }

    // Add swipe and check for match
    const result = await req.user.addSwipe(targetUserId, action);

    let responseData = {
      action,
      match: result.match
    };

    if (result.match) {
      // Get match details
      const match = await Match.findById(result.matchId)
        .populate('users', 'name photos age bio');
      
      responseData.matchDetails = match;
      
      // Emit match event to both users via Socket.IO
      const io = req.app.get('io');
      io.to(targetUserId).emit('new_match', {
        match: match,
        message: `You have a new match with ${req.user.name}!`
      });
    }

    res.json({
      success: true,
      message: result.match ? 'It\'s a match!' : `${action} recorded`,
      data: responseData
    });
  } catch (error) {
    if (error.message === 'Already swiped on this user') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Swipe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during swipe'
    });
  }
});

// @route   GET /api/users/profile/:userId
// @desc    Get user profile by ID
// @access  Private
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ _id: userId, isActive: true })
      .select('-password -swipedUsers -matches');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @route   POST /api/users/upload-photo
// @desc    Upload user photo
// @access  Private
router.post('/upload-photo', [
  body('photoUrl')
    .notEmpty()
    .isURL()
    .withMessage('Valid photo URL is required'),
  body('isMain')
    .optional()
    .isBoolean()
    .withMessage('isMain must be a boolean')
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

    const { photoUrl, isMain = false } = req.body;

    // If this is set as main photo, update all other photos
    if (isMain) {
      req.user.photos.forEach(photo => {
        photo.isMain = false;
      });
    }

    // Add new photo
    req.user.photos.push({
      url: photoUrl,
      isMain: isMain || req.user.photos.length === 0 // First photo is automatically main
    });

    await req.user.save();

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        photos: req.user.photos
      }
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during photo upload'
    });
  }
});

// @route   DELETE /api/users/delete-photo/:photoId
// @desc    Delete user photo
// @access  Private
router.delete('/delete-photo/:photoId', async (req, res) => {
  try {
    const { photoId } = req.params;

    // Find and remove the photo
    const photoIndex = req.user.photos.findIndex(
      photo => photo._id.toString() === photoId
    );

    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    const deletedPhoto = req.user.photos[photoIndex];
    req.user.photos.splice(photoIndex, 1);

    // If deleted photo was main and there are other photos, make first one main
    if (deletedPhoto.isMain && req.user.photos.length > 0) {
      req.user.photos[0].isMain = true;
    }

    await req.user.save();

    res.json({
      success: true,
      message: 'Photo deleted successfully',
      data: {
        photos: req.user.photos
      }
    });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during photo deletion'
    });
  }
});

// @route   PUT /api/users/set-main-photo/:photoId
// @desc    Set a photo as main
// @access  Private
router.put('/set-main-photo/:photoId', async (req, res) => {
  try {
    const { photoId } = req.params;

    // Find the photo
    const photo = req.user.photos.find(
      photo => photo._id.toString() === photoId
    );

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Set all photos as not main, then set the selected one as main
    req.user.photos.forEach(p => {
      p.isMain = p._id.toString() === photoId;
    });

    await req.user.save();

    res.json({
      success: true,
      message: 'Main photo updated successfully',
      data: {
        photos: req.user.photos
      }
    });
  } catch (error) {
    console.error('Set main photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during main photo update'
    });
  }
});

// @route   PUT /api/users/update-location
// @desc    Update user location
// @access  Private
router.put('/update-location', [
  body('coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
  body('coordinates.*')
    .isFloat()
    .withMessage('Coordinates must be valid numbers'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country name cannot exceed 100 characters')
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

    const { coordinates, city, country } = req.body;

    req.user.location = {
      type: 'Point',
      coordinates,
      city: city || req.user.location.city,
      country: country || req.user.location.country
    };

    await req.user.save();

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        location: req.user.location
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during location update'
    });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get match statistics
    const matchStats = await Match.getMatchStats(userId);
    
    // Get swipe statistics
    const totalSwipes = req.user.swipedUsers.length;
    const likes = req.user.swipedUsers.filter(swipe => swipe.action === 'like').length;
    const passes = req.user.swipedUsers.filter(swipe => swipe.action === 'pass').length;
    
    // Get recent activity
    const recentSwipes = req.user.swipedUsers.filter(
      swipe => swipe.swipedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    res.json({
      success: true,
      data: {
        swipes: {
          total: totalSwipes,
          likes,
          passes,
          recentWeek: recentSwipes,
          likeRate: totalSwipes > 0 ? ((likes / totalSwipes) * 100).toFixed(1) : 0
        },
        matches: matchStats,
        profile: {
          completeness: calculateProfileCompleteness(req.user),
          photosCount: req.user.photos.length,
          joinedDate: req.user.createdAt,
          lastActive: req.user.lastActive
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

// Helper function to calculate profile completeness
function calculateProfileCompleteness(user) {
  let completeness = 0;
  const fields = ['name', 'age', 'bio', 'gender', 'interestedIn'];
  
  fields.forEach(field => {
    if (user[field] && user[field].toString().trim() !== '') {
      completeness += 20;
    }
  });
  
  // Photos bonus
  if (user.photos.length > 0) {
    completeness += Math.min(user.photos.length * 10, 30);
  }
  
  return Math.min(completeness, 100);
}

module.exports = router;