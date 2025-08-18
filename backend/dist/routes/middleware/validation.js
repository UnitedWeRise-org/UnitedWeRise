"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateModerationAction = exports.validateReport = exports.validateMessage = exports.validatePoliticalProfile = exports.validateProfileUpdate = exports.validateComment = exports.validatePost = exports.validateLogin = exports.validateEmailVerification = exports.validatePhoneCode = exports.validatePhoneVerification = exports.validateRegistration = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
// User registration validation
exports.validateRegistration = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    (0, express_validator_1.body)('username')
        .isLength({ min: 3, max: 30 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
    (0, express_validator_1.body)('firstName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .trim()
        .escape()
        .withMessage('First name must be 1-50 characters'),
    (0, express_validator_1.body)('lastName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .trim()
        .escape()
        .withMessage('Last name must be 1-50 characters'),
    (0, express_validator_1.body)('phoneNumber')
        .optional()
        .matches(/^[\+]?[1-9]\d{1,14}$/)
        .withMessage('Phone number must be in international format'),
    (0, express_validator_1.body)('hcaptchaToken')
        .notEmpty()
        .withMessage('Captcha verification is required'),
    exports.handleValidationErrors
];
// Phone verification validation
exports.validatePhoneVerification = [
    (0, express_validator_1.body)('phoneNumber')
        .matches(/^[\+]?[1-9]\d{1,14}$/)
        .withMessage('Valid phone number is required'),
    (0, express_validator_1.body)('hcaptchaToken')
        .optional()
        .notEmpty()
        .withMessage('Captcha token must not be empty if provided'),
    exports.handleValidationErrors
];
// Verify phone code validation
exports.validatePhoneCode = [
    (0, express_validator_1.body)('phoneNumber')
        .matches(/^[\+]?[1-9]\d{1,14}$/)
        .withMessage('Valid phone number is required'),
    (0, express_validator_1.body)('code')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('Verification code must be 6 digits'),
    exports.handleValidationErrors
];
// Email verification validation
exports.validateEmailVerification = [
    (0, express_validator_1.body)('token')
        .notEmpty()
        .isLength({ min: 10 })
        .withMessage('Valid verification token is required'),
    exports.handleValidationErrors
];
// User login validation
exports.validateLogin = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
    exports.handleValidationErrors
];
// Post creation validation
exports.validatePost = [
    (0, express_validator_1.body)('content')
        .isLength({ min: 1, max: 2000 })
        .trim()
        .withMessage('Post content must be 1-2000 characters'),
    (0, express_validator_1.body)('imageUrl')
        .optional()
        .isURL()
        .withMessage('Image URL must be valid'),
    exports.handleValidationErrors
];
// Comment creation validation
exports.validateComment = [
    (0, express_validator_1.body)('content')
        .isLength({ min: 1, max: 500 })
        .trim()
        .withMessage('Comment must be 1-500 characters'),
    exports.handleValidationErrors
];
// Profile update validation
exports.validateProfileUpdate = [
    (0, express_validator_1.body)('firstName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .trim()
        .escape()
        .withMessage('First name must be 1-50 characters'),
    (0, express_validator_1.body)('lastName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .trim()
        .escape()
        .withMessage('Last name must be 1-50 characters'),
    (0, express_validator_1.body)('bio')
        .optional()
        .isLength({ max: 500 })
        .trim()
        .withMessage('Bio must be less than 500 characters'),
    (0, express_validator_1.body)('website')
        .optional()
        .isURL()
        .withMessage('Website must be a valid URL'),
    (0, express_validator_1.body)('location')
        .optional()
        .isLength({ max: 100 })
        .trim()
        .escape()
        .withMessage('Location must be less than 100 characters'),
    exports.handleValidationErrors
];
// Political profile validation
exports.validatePoliticalProfile = [
    (0, express_validator_1.body)('streetAddress')
        .optional()
        .isLength({ max: 200 })
        .trim()
        .escape()
        .withMessage('Street address must be less than 200 characters'),
    (0, express_validator_1.body)('city')
        .optional()
        .isLength({ max: 100 })
        .trim()
        .escape()
        .withMessage('City must be less than 100 characters'),
    (0, express_validator_1.body)('state')
        .optional()
        .isLength({ min: 2, max: 2 })
        .matches(/^[A-Z]{2}$/)
        .withMessage('State must be 2-letter abbreviation'),
    (0, express_validator_1.body)('zipCode')
        .optional()
        .matches(/^\d{5}(-\d{4})?$/)
        .withMessage('ZIP code must be valid format'),
    (0, express_validator_1.body)('politicalParty')
        .optional()
        .isLength({ max: 50 })
        .trim()
        .escape()
        .withMessage('Political party must be less than 50 characters'),
    (0, express_validator_1.body)('campaignWebsite')
        .optional()
        .isURL()
        .withMessage('Campaign website must be a valid URL'),
    (0, express_validator_1.body)('office')
        .optional()
        .isLength({ max: 100 })
        .trim()
        .escape()
        .withMessage('Office must be less than 100 characters'),
    (0, express_validator_1.body)('officialTitle')
        .optional()
        .isLength({ max: 100 })
        .trim()
        .escape()
        .withMessage('Official title must be less than 100 characters'),
    exports.handleValidationErrors
];
// Message validation
exports.validateMessage = [
    (0, express_validator_1.body)('content')
        .isLength({ min: 1, max: 1000 })
        .trim()
        .withMessage('Message must be 1-1000 characters'),
    exports.handleValidationErrors
];
// Report validation
exports.validateReport = [
    (0, express_validator_1.body)('targetType')
        .isIn(['POST', 'COMMENT', 'USER', 'MESSAGE'])
        .withMessage('Target type must be POST, COMMENT, USER, or MESSAGE'),
    (0, express_validator_1.body)('targetId')
        .notEmpty()
        .trim()
        .withMessage('Target ID is required'),
    (0, express_validator_1.body)('reason')
        .isIn([
        'SPAM', 'HARASSMENT', 'HATE_SPEECH', 'MISINFORMATION',
        'INAPPROPRIATE_CONTENT', 'FAKE_ACCOUNT', 'IMPERSONATION',
        'COPYRIGHT_VIOLATION', 'VIOLENCE_THREATS', 'SELF_HARM',
        'ILLEGAL_CONTENT', 'OTHER'
    ])
        .withMessage('Invalid report reason'),
    (0, express_validator_1.body)('description')
        .optional()
        .isLength({ max: 1000 })
        .trim()
        .withMessage('Description must be less than 1000 characters'),
    exports.handleValidationErrors
];
// Moderation action validation
exports.validateModerationAction = [
    (0, express_validator_1.body)('action')
        .isIn([
        'NO_ACTION', 'WARNING_ISSUED', 'CONTENT_HIDDEN', 'CONTENT_DELETED',
        'USER_WARNED', 'USER_SUSPENDED', 'USER_BANNED', 'APPEAL_APPROVED', 'APPEAL_DENIED'
    ])
        .withMessage('Invalid moderation action'),
    (0, express_validator_1.body)('notes')
        .optional()
        .isLength({ max: 2000 })
        .trim()
        .withMessage('Notes must be less than 2000 characters'),
    exports.handleValidationErrors
];
