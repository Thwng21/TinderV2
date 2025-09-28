const express = require('express');
const { body } = require('express-validator');
const auth = require('../Middlewares/auth');
const {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
  deleteAccount,
  verifyToken
} = require('../Controllers/auth.controller');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('age')
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18 and 100'),
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('interestedIn')
    .isIn(['male', 'female', 'both'])
    .withMessage('Interested in must be male, female, or both')
], register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], login);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, logout);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, getCurrentUser);

// @route   GET /api/auth/verify-token
// @desc    Verify JWT token
// @access  Private
router.get('/verify-token', auth, verifyToken);

// @route   PUT /api/auth/update-profile
// @desc    Update user profile
// @access  Private
router.put('/update-profile', auth, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('age')
    .optional()
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18 and 100'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot be more than 500 characters')
], updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], changePassword);

// @route   DELETE /api/auth/delete-account
// @desc    Delete user account
// @access  Private
router.delete('/delete-account', auth, deleteAccount);

module.exports = router;