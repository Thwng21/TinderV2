const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../Models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, email, password, age, gender, interestedIn, bio, location } = req.body;

    // Check MongoDB connection
    if (require('mongoose').connection.readyState !== 1) {
      // Mock response for development when DB is not connected
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: name.trim(),
        email: email.toLowerCase().trim(),
        age: parseInt(age),
        gender,
        interestedIn,
        bio: bio ? bio.trim() : '',
        location: location || { 
          type: 'Point',
          coordinates: [106.6297, 10.8231],
          city: 'Ho Chi Minh City',
          country: 'Vietnam'
        },
        createdAt: new Date().toISOString(),
        isOnline: false
      };

      const token = generateToken(mockUser._id);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully (DEV MODE - No Database)',
        data: {
          user: mockUser,
          token
        }
      });
    }

    // Check if user already exists (only if DB is connected)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      age: parseInt(age),
      gender,
      interestedIn,
      bio: bio ? bio.trim() : '',
      location: location || { 
        type: 'Point',
        coordinates: [0, 0],
        city: '',
        country: ''
      }
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check MongoDB connection
    if (require('mongoose').connection.readyState !== 1) {
      // Mock login for development when DB is not connected
      // Accept any email/password for demo purposes
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User',
        email: email.toLowerCase().trim(),
        age: 25,
        gender: 'male',
        interestedIn: 'female',
        bio: 'This is a demo user for development',
        location: { 
          type: 'Point',
          coordinates: [106.6297, 10.8231],
          city: 'Ho Chi Minh City',
          country: 'Vietnam'
        },
        createdAt: new Date().toISOString(),
        isOnline: true,
        lastActive: new Date().toISOString()
      };

      const token = generateToken(mockUser._id);

      return res.json({
        success: true,
        message: 'Login successful (DEV MODE - No Database)',
        data: {
          user: mockUser,
          token
        }
      });
    }

    // Find user and include password for comparison (only if DB is connected)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update user's online status and last active
    user.isOnline = true;
    user.lastActive = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Update user's online status
    if (req.user) {
      req.user.isOnline = false;
      req.user.lastActive = new Date();
      await req.user.save();
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('matches', 'users lastActivity')
      .select('-password -swipedUsers');

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
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const allowedUpdates = ['name', 'age', 'bio', 'location', 'preferences'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Trim string fields
    if (updates.name) updates.name = updates.name.trim();
    if (updates.bio) updates.bio = updates.bio.trim();

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -swipedUsers');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/delete-account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    // Soft delete - mark as inactive
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        isActive: false,
        isOnline: false,
        lastActive: new Date()
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during account deletion'
    });
  }
};

// @desc    Verify JWT token
// @route   GET /api/auth/verify-token
// @access  Private
const verifyToken = async (req, res) => {
  try {
    // If we reach here, the auth middleware has verified the token
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        userId: req.user._id,
        isAuthenticated: true
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token verification'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
  deleteAccount,
  verifyToken
};
