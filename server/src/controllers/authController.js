import axios from 'axios';
import User from '../models/User.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { generateToken, generateRefreshToken, verifyToken } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

// LINE API endpoints
const LINE_PROFILE_API = 'https://api.line.me/v2/profile';
const LINE_VERIFY_API = 'https://api.line.me/oauth2/v2.1/verify';

// Login or register with LINE
export const loginWithLine = async (req, res, next) => {
  try {
    const { accessToken, idToken, lineUserId, displayName, pictureUrl } = req.body;

    let lineProfile;
    
    // If direct LINE profile data is provided (development mode)
    if (lineUserId && displayName) {
      lineProfile = {
        userId: lineUserId,
        displayName: displayName,
        pictureUrl: pictureUrl || ''
      };
    } else if (accessToken) {
      // Verify LINE access token and get user profile
      const profileResponse = await axios.get(LINE_PROFILE_API, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      lineProfile = profileResponse.data;
    } else {
      return next(new AppError('Missing authentication data', 400));
    }
    
    if (!lineProfile || !lineProfile.userId) {
      return next(new AppError('Invalid LINE access token', 401));
    }

    // Check if user exists
    let user = await User.findByLineId(lineProfile.userId);

    if (user) {
      // Update user profile with latest LINE data
      user.displayName = lineProfile.displayName || user.displayName;
      user.pictureUrl = lineProfile.pictureUrl || user.pictureUrl;
      await user.updateLastLogin();
    } else {
      // Create new user
      user = new User({
        lineUserId: lineProfile.userId,
        displayName: lineProfile.displayName,
        pictureUrl: lineProfile.pictureUrl || '',
        lastLoginAt: new Date()
      });
      
      await user.save();
      logger.info(`New user registered: ${user.displayName} (${user.lineUserId})`);
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          email: user.email,
          hasPromptPay: user.hasPromptPay(),
          groups: user.groups,
          notificationSettings: user.notificationSettings,
          lastLoginAt: user.lastLoginAt
        }
      }
    });

  } catch (error) {
    logger.error('LINE login error:', error);
    
    if (error.response?.status === 401) {
      return next(new AppError('Invalid LINE access token', 401));
    }
    
    next(new AppError('Failed to authenticate with LINE', 500));
  }
};

// Refresh JWT token
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: clientRefreshToken } = req.body;
    const cookieRefreshToken = req.cookies.refreshToken;
    
    const refreshToken = clientRefreshToken || cookieRefreshToken;
    
    if (!refreshToken) {
      return next(new AppError('Refresh token not provided', 401));
    }

    try {
      const decoded = verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        return next(new AppError('Invalid refresh token type', 401));
      }

      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return next(new AppError('User not found or inactive', 401));
      }

      // Generate new tokens
      const newToken = generateToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      // Set new refresh token as cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        success: true,
        data: {
          token: newToken
        }
      });

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('Refresh token expired', 401));
      } else if (error.name === 'JsonWebTokenError') {
        return next(new AppError('Invalid refresh token', 401));
      } else {
        throw error;
      }
    }

  } catch (error) {
    logger.error('Token refresh error:', error);
    next(new AppError('Failed to refresh token', 500));
  }
};

// Logout user
export const logout = async (req, res, next) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    next(new AppError('Failed to logout', 500));
  }
};

// Get current user profile
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('groups', 'name groupType imageUrl activeMembersCount')
      .select('-__v');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          email: user.email,
          promptPayId: user.promptPayId,
          bankAccount: user.bankAccount,
          hasPromptPay: user.hasPromptPay(),
          groups: user.groups,
          notificationSettings: user.notificationSettings,
          role: user.role,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    next(new AppError('Failed to get user profile', 500));
  }
};

// Update user profile
export const updateProfile = async (req, res, next) => {
  try {
    const {
      email,
      promptPayId,
      bankAccount,
      notificationSettings
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Update fields if provided
    if (email !== undefined) user.email = email;
    if (promptPayId !== undefined) user.promptPayId = promptPayId;
    if (bankAccount !== undefined) {
      user.bankAccount = {
        ...user.bankAccount,
        ...bankAccount
      };
    }
    if (notificationSettings !== undefined) {
      user.notificationSettings = {
        ...user.notificationSettings,
        ...notificationSettings
      };
    }

    await user.save();

    logger.info(`User profile updated: ${user.displayName} (${user.lineUserId})`);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          email: user.email,
          promptPayId: user.promptPayId,
          bankAccount: user.bankAccount,
          hasPromptPay: user.hasPromptPay(),
          notificationSettings: user.notificationSettings,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    next(new AppError('Failed to update user profile', 500));
  }
};