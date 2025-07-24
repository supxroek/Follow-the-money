import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from './errorMiddleware.js';

// JWT secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
};

// Verify JWT token
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Auth middleware
export const auth = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('No token, authorization denied', 401));
    }

    try {
      // Verify token
      const decoded = verifyToken(token);
      
      // Check if it's not a refresh token
      if (decoded.type === 'refresh') {
        return next(new AppError('Invalid token type', 401));
      }

      // Get user from database
      const user = await User.findById(decoded.userId).select('-__v');
      
      if (!user) {
        return next(new AppError('User not found', 401));
      }

      if (!user.isActive) {
        return next(new AppError('User account is deactivated', 401));
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('Token expired', 401));
      } else if (error.name === 'JsonWebTokenError') {
        return next(new AppError('Invalid token', 401));
      } else {
        return next(new AppError('Token verification failed', 401));
      }
    }
  } catch (error) {
    next(new AppError('Server error in authentication', 500));
  }
};

// Optional auth middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId).select('-__v');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Silently fail for optional auth
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Admin role middleware
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    next(new AppError('Access denied. Admin role required.', 403));
  }
};

// Group member middleware
export const groupMember = (paramName = 'groupId') => {
  return async (req, res, next) => {
    try {
      const groupId = req.params[paramName];
      
      if (!groupId) {
        return next(new AppError('Group ID is required', 400));
      }

      // Check if user is member of the group
      const isMember = req.user.groups.some(group => 
        group.toString() === groupId.toString()
      );

      if (!isMember) {
        return next(new AppError('Access denied. You are not a member of this group.', 403));
      }

      req.groupId = groupId;
      next();
    } catch (error) {
      next(new AppError('Error checking group membership', 500));
    }
  };
};

// Group admin middleware
export const groupAdmin = (paramName = 'groupId') => {
  return async (req, res, next) => {
    try {
      const Group = (await import('../models/Group.js')).default;
      const groupId = req.params[paramName];
      
      if (!groupId) {
        return next(new AppError('Group ID is required', 400));
      }

      const group = await Group.findById(groupId);
      
      if (!group) {
        return next(new AppError('Group not found', 404));
      }

      if (!group.isAdmin(req.user._id)) {
        return next(new AppError('Access denied. Group admin role required.', 403));
      }

      req.group = group;
      next();
    } catch (error) {
      next(new AppError('Error checking group admin status', 500));
    }
  };
};

// Rate limiting for auth endpoints
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};