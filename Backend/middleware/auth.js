const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user found with this token',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Check if user is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'User recently changed password. Please log in again.',
        code: 'PASSWORD_CHANGED'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      code: 'AUTH_ERROR'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user owns resource or is admin/trainer
exports.checkOwnership = (resourceUserField = 'user') => {
  return (req, res, next) => {
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Trainers can access their assigned members' resources
    if (req.user.role === 'trainer') {
      // This would need additional logic based on trainer-member relationships
      return next();
    }

    // Members can only access their own resources
    if (req.user.role === 'member') {
      // Check if the resource belongs to the user
      if (req.params.id && req.params.id !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }
    }

    next();
  };
};

// Middleware to check if user is member's assigned trainer
exports.checkTrainerAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.role === 'trainer') {
      const memberId = req.params.memberId || req.params.id;
      const member = await User.findById(memberId);

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      if (member.assignedTrainer && member.assignedTrainer.toString() === req.user._id.toString()) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this member\'s data'
      });
    }

    if (req.user.role === 'member') {
      const memberId = req.params.memberId || req.params.id;
      if (memberId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authorization check'
    });
  }
};

// Middleware to validate membership status
exports.checkMembershipStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'member') {
      return next();
    }

    const user = await User.findById(req.user._id);
    
    if (!user.membershipEndDate || user.membershipEndDate < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Membership has expired. Please renew to access this feature.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in membership check'
    });
  }
};

// Generate refresh token
exports.generateRefreshToken = async (userId, deviceInfo = {}) => {
  try {
    // Clean up old tokens for this user (keep only last 5)
    const existingTokens = await RefreshToken.find({ 
      user: userId, 
      isActive: true 
    }).sort({ createdAt: -1 });

    if (existingTokens.length >= 5) {
      const tokensToRevoke = existingTokens.slice(4);
      await RefreshToken.updateMany(
        { _id: { $in: tokensToRevoke.map(t => t._id) } },
        { isActive: false }
      );
    }

    // Generate new refresh token
    const token = RefreshToken.generateToken();
    
    const refreshToken = await RefreshToken.create({
      token,
      user: userId,
      deviceInfo
    });

    return refreshToken.token;
  } catch (error) {
    throw new Error('Failed to generate refresh token');
  }
};

// Verify refresh token
exports.verifyRefreshToken = async (token) => {
  try {
    const refreshToken = await RefreshToken.findOne({ 
      token, 
      isActive: true 
    }).populate('user');

    if (!refreshToken || refreshToken.isExpired()) {
      return null;
    }

    // Update last used
    refreshToken.lastUsed = new Date();
    await refreshToken.save();

    return refreshToken;
  } catch (error) {
    return null;
  }
};

// Revoke refresh token
exports.revokeRefreshToken = async (token) => {
  try {
    const refreshToken = await RefreshToken.findOne({ token });
    if (refreshToken) {
      await refreshToken.revoke();
    }
    return true;
  } catch (error) {
    return false;
  }
};

// Rate limiting for sensitive operations
exports.sensitiveOperationLimit = (req, res, next) => {
  // This would integrate with express-rate-limit for specific operations
  // like password changes, payment processing, etc.
  next();
};
