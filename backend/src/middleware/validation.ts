import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User registration validation
export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .escape()
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .escape()
    .withMessage('Last name must be 1-50 characters'),
  body('phoneNumber')
    .optional()
    .matches(/^[\+]?[1-9]\d{1,14}$/)
    .withMessage('Phone number must be in international format'),
  body('hcaptchaToken')
    .notEmpty()
    .withMessage('Captcha verification is required'),
  handleValidationErrors
];

// Phone verification validation
export const validatePhoneVerification = [
  body('phoneNumber')
    .matches(/^[\+]?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required'),
  body('hcaptchaToken')
    .optional()
    .notEmpty()
    .withMessage('Captcha token must not be empty if provided'),
  handleValidationErrors
];

// Verify phone code validation
export const validatePhoneCode = [
  body('phoneNumber')
    .matches(/^[\+]?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Verification code must be 6 digits'),
  handleValidationErrors
];

// Email verification validation
export const validateEmailVerification = [
  body('token')
    .notEmpty()
    .isLength({ min: 10 })
    .withMessage('Valid verification token is required'),
  handleValidationErrors
];

// User login validation
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Post creation validation - increased limit for content that gets split automatically
export const validatePost = [
  body('content')
    .isLength({ min: 1, max: 5000 })
    .trim()
    .withMessage('Post content must be 1-5000 characters'),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be valid'),
  handleValidationErrors
];

// Comment creation validation (max 5000 for author continuations, validated in route)
export const validateComment = [
  body('content')
    .isLength({ min: 1, max: 5000 })
    .trim()
    .withMessage('Comment must be 1-5000 characters'),
  handleValidationErrors
];

// Profile update validation
export const validateProfileUpdate = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .escape()
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .escape()
    .withMessage('Last name must be 1-50 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage('Bio must be less than 500 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Location must be less than 100 characters'),
  handleValidationErrors
];

// Political profile validation
export const validatePoliticalProfile = [
  body('streetAddress')
    .optional()
    .isLength({ max: 200 })
    .trim()
    .escape()
    .withMessage('Street address must be less than 200 characters'),
  body('city')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('City must be less than 100 characters'),
  body('state')
    .optional()
    .isLength({ min: 2, max: 2 })
    .matches(/^[A-Z]{2}$/)
    .withMessage('State must be 2-letter abbreviation'),
  body('zipCode')
    .optional()
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('ZIP code must be valid format'),
  body('politicalParty')
    .optional()
    .isLength({ max: 50 })
    .trim()
    .escape()
    .withMessage('Political party must be less than 50 characters'),
  body('campaignWebsite')
    .optional()
    .isURL()
    .withMessage('Campaign website must be a valid URL'),
  body('office')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Office must be less than 100 characters'),
  body('officialTitle')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Official title must be less than 100 characters'),
  handleValidationErrors
];

// Message validation
export const validateMessage = [
  body('content')
    .isLength({ min: 1, max: 1000 })
    .trim()
    .withMessage('Message must be 1-1000 characters'),
  handleValidationErrors
];

// Report validation
export const validateReport = [
  body('targetType')
    .isIn(['POST', 'COMMENT', 'USER', 'MESSAGE'])
    .withMessage('Target type must be POST, COMMENT, USER, or MESSAGE'),
  body('targetId')
    .notEmpty()
    .trim()
    .withMessage('Target ID is required'),
  body('reason')
    .isIn([
      'SPAM', 'HARASSMENT', 'HATE_SPEECH', 'MISINFORMATION',
      'INAPPROPRIATE_CONTENT', 'FAKE_ACCOUNT', 'IMPERSONATION',
      'COPYRIGHT_VIOLATION', 'VIOLENCE_THREATS', 'SELF_HARM',
      'ILLEGAL_CONTENT', 'OTHER'
    ])
    .withMessage('Invalid report reason'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .trim()
    .withMessage('Description must be less than 1000 characters'),
  handleValidationErrors
];

// Moderation action validation
export const validateModerationAction = [
  body('action')
    .isIn([
      'NO_ACTION', 'WARNING_ISSUED', 'CONTENT_HIDDEN', 'CONTENT_DELETED',
      'USER_WARNED', 'USER_SUSPENDED', 'USER_BANNED', 'APPEAL_APPROVED', 'APPEAL_DENIED'
    ])
    .withMessage('Invalid moderation action'),
  body('notes')
    .optional()
    .isLength({ max: 2000 })
    .trim()
    .withMessage('Notes must be less than 2000 characters'),
  handleValidationErrors
];