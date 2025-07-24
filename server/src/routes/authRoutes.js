import express from 'express';
import { body } from 'express-validator';
import { 
  loginWithLine,
  refreshToken,
  logout,
  getProfile,
  updateProfile 
} from '../controllers/authController.js';
import { auth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// @route   POST /api/auth/line
// @desc    Login or register user with LINE
// @access  Public
router.post('/line',
  [
    body('accessToken').notEmpty().withMessage('LINE access token is required'),
    body('idToken').optional(),
    validate
  ],
  loginWithLine
);

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Public
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    validate
  ],
  refreshToken
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, logout);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile',
  auth,
  [
    body('email').optional().isEmail().withMessage('Please enter a valid email'),
    body('promptPayId').optional().isLength({ min: 10, max: 13 }).withMessage('PromptPay ID must be 10-13 characters'),
    body('bankAccount.bankName').optional().isLength({ min: 1, max: 50 }).withMessage('Bank name is required'),
    body('bankAccount.accountNumber').optional().isLength({ min: 10, max: 20 }).withMessage('Account number must be 10-20 characters'),
    body('bankAccount.accountName').optional().isLength({ min: 1, max: 100 }).withMessage('Account name is required'),
    validate
  ],
  updateProfile
);

export default router;