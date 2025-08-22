const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Middleware to handle validation results
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
exports.validateObjectId = (field = 'id') => {
  return param(field)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    });
};

exports.validateEmail = (field = 'email') => {
  return body(field)
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail();
};

exports.validatePassword = (field = 'password') => {
  return body(field)
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)')
    .custom((value) => {
      // Check for common weak passwords
      const commonPasswords = [
        'password', '12345678', 'qwerty123', 'abc123456', 
        'password123', '123456789', 'welcome123'
      ];
      
      if (commonPasswords.includes(value.toLowerCase())) {
        throw new Error('Password is too common. Please choose a stronger password.');
      }
      
      // Check for sequential characters
      if (/123456|abcdef|qwerty/i.test(value)) {
        throw new Error('Password cannot contain sequential characters.');
      }
      
      return true;
    });
};

exports.validatePhone = (field = 'phone') => {
  return body(field)
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number');
};

exports.validateName = (field) => {
  return body(field)
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(`${field} must be between 2 and 50 characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(`${field} must contain only letters, spaces, hyphens, and apostrophes`);
};

exports.validateRole = (field = 'role') => {
  return body(field)
    .isIn(['admin', 'trainer', 'member'])
    .withMessage('Role must be admin, trainer, or member');
};

exports.validateMembershipType = (field = 'membershipType') => {
  return body(field)
    .optional()
    .isIn(['basic', 'premium', 'vip'])
    .withMessage('Membership type must be basic, premium, or vip');
};

exports.validateDate = (field) => {
  return body(field)
    .isISO8601()
    .withMessage(`${field} must be a valid date`)
    .toDate();
};

exports.validateGender = (field = 'gender') => {
  return body(field)
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other');
};

// User registration validation
exports.validateUserRegistration = [
  exports.validateName('firstName'),
  exports.validateName('lastName'),
  exports.validateEmail(),
  exports.validatePassword(),
  exports.validatePhone(),
  exports.validateRole(),
  exports.validateGender(),
  body('dateOfBirth').optional().isISO8601().withMessage('Date of birth must be a valid date').toDate(),
  exports.handleValidationErrors
];

// User login validation
exports.validateUserLogin = [
  exports.validateEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  exports.handleValidationErrors
];

// Profile update validation
exports.validateProfileUpdate = [
  exports.validateName('firstName').optional(),
  exports.validateName('lastName').optional(),
  exports.validatePhone().optional(),
  exports.validateGender().optional(),
  body('dateOfBirth').optional().isISO8601().withMessage('Date of birth must be a valid date').toDate(),
  body('address.street').optional().trim().isLength({ max: 100 }).withMessage('Street address too long'),
  body('address.city').optional().trim().isLength({ max: 50 }).withMessage('City name too long'),
  body('address.state').optional().trim().isLength({ max: 50 }).withMessage('State name too long'),
  body('address.zipCode').optional().trim().isLength({ max: 20 }).withMessage('Zip code too long'),
  body('address.country').optional().trim().isLength({ max: 50 }).withMessage('Country name too long'),
  exports.handleValidationErrors
];

// Password change validation
exports.validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  exports.validatePassword('newPassword'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
    .withMessage('Password confirmation is required'),
  body('newPassword')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  exports.handleValidationErrors
];

// Class validation
exports.validateClass = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Class name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('type')
    .isIn(['yoga', 'pilates', 'hiit', 'cardio', 'strength', 'crossfit', 'dance', 'martial_arts', 'swimming', 'other'])
    .withMessage('Invalid class type'),
  exports.validateObjectId('trainerId').withMessage('Invalid trainer ID'),
  body('capacity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Capacity must be between 1 and 100'),
  body('startDate').isISO8601().withMessage('Start date must be a valid date').toDate(),
  body('endDate').optional().isISO8601().withMessage('End date must be a valid date').toDate(),
  exports.handleValidationErrors
];

// Payment validation
exports.validatePayment = [
  exports.validateObjectId('planId').withMessage('Invalid plan ID'),
  body('paymentMethod')
    .isIn(['card', 'cash', 'bank_transfer', 'stripe', 'paypal'])
    .withMessage('Invalid payment method'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  exports.handleValidationErrors
];

// Attendance validation
exports.validateAttendance = [
  exports.validateObjectId('memberId').withMessage('Invalid member ID'),
  exports.validateObjectId('classId').withMessage('Invalid class ID'),
  body('status')
    .isIn(['present', 'absent', 'late', 'excused', 'cancelled'])
    .withMessage('Invalid attendance status'),
  body('date').optional().isISO8601().withMessage('Date must be valid').toDate(),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  exports.handleValidationErrors
];

// Plan validation
exports.validatePlan = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Plan name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('type')
    .isIn(['membership', 'class_package', 'personal_training', 'nutrition', 'combo'])
    .withMessage('Invalid plan type'),
  body('category')
    .isIn(['basic', 'premium', 'vip', 'student', 'senior', 'family'])
    .withMessage('Invalid plan category'),
  body('pricing.amount')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('pricing.currency')
    .isIn(['USD', 'EUR', 'GBP', 'PKR'])
    .withMessage('Invalid currency'),
  body('pricing.billingCycle')
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time'])
    .withMessage('Invalid billing cycle'),
  body('duration.value')
    .isInt({ min: 1 })
    .withMessage('Duration value must be a positive integer'),
  body('duration.unit')
    .isIn(['days', 'weeks', 'months', 'years'])
    .withMessage('Invalid duration unit'),
  exports.handleValidationErrors
];

// Query parameter validation
exports.validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  exports.handleValidationErrors
];

exports.validateDateRange = [
  query('startDate').optional().isISO8601().withMessage('Start date must be valid').toDate(),
  query('endDate').optional().isISO8601().withMessage('End date must be valid').toDate(),
  exports.handleValidationErrors
];

// Sanitization middleware
exports.sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attempts
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/javascript:/gi, '');
        obj[key] = obj[key].replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

// File upload validation
exports.validateFileUpload = (allowedTypes = ['image/jpeg', 'image/png', 'image/gif'], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      });
    }

    next();
  };
};
