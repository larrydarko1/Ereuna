import { body, validationResult, param, query, } from 'express-validator';
import validator from 'validator';

const validationSchemas = {
    username: (fieldName = 'username') => body(fieldName)
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    newUsername: (fieldName = 'newUsername') => body(fieldName)
        .trim()
        .notEmpty().withMessage('new Username is required')
        .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    user: (fieldName = 'user') => body(fieldName)
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    // Password validation
    password: () => body('password')
        .trim()
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 5, max: 40 }).withMessage('Password must be between 5 and 40 characters'),

    oldPassword: () => body('oldPassword')
        .trim()
        .notEmpty().withMessage('old Password is required')
        .isLength({ min: 5, max: 40 }).withMessage('Password must be between 5 and 40 characters'),

    newPassword: () => body('newPassword')
        .trim()
        .notEmpty().withMessage('new Password is required')
        .isLength({ min: 5, max: 40 }).withMessage('Password must be between 5 and 40 characters'),

    // Subscription Plan Validation
    subscriptionPlan: () => body('subscriptionPlan')
        .isInt({ min: 1, max: 2 }).withMessage('Invalid subscription plan')
        .toInt(),

    // Payment Method ID Validation
    paymentMethodId: () => body('paymentMethodId')
        .optional()
        .notEmpty().withMessage('Payment method ID is required for credit card payment'),

    // Promo Code Validation
    promoCode: () => body('promoCode')
        .optional()
        .trim()
        .isLength({ max: 10 }).withMessage('Promo code cannot exceed 10 characters')
        .matches(/^[A-Z0-9]+$/).withMessage('Promo code can only contain uppercase letters and numbers'),

    // Recovery Key Validation
    recoveryKey: () => body('recoveryKey')
        .trim()
        .notEmpty().withMessage('Recovery key is required')
        .isLength({ min: 64, max: 128 }).withMessage('Invalid recovery key format')
        .matches(/^[0-9a-fA-F]+$/).withMessage('Recovery key must be a hexadecimal string'),

    // tickers or ISIN
    identifier: () => param('identifier')
        .trim()
        .notEmpty().withMessage('Identifier is required')
        .isLength({ min: 3, max: 12 }).withMessage('Identifier must be between 3 and 12 characters')
        .matches(/^[A-Z0-9]+$/).withMessage('Identifier must be uppercase alphanumeric'),

    // Email Validation
    email: () => body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    // Phone Number Validation
    phoneNumber: () => body('phoneNumber')
        .trim()
        .optional()
        .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format'),

    // Credit Card Validation
    creditCard: () => body('creditCardNumber')
        .trim()
        .notEmpty().withMessage('Credit card number is required')
        .isCreditCard().withMessage('Invalid credit card number'),

    // Generic ID Validation
    id: (fieldName = 'id') => body(fieldName)
        .isInt({ min: 1 }).withMessage('Invalid ID')
        .toInt(),

    // Address Validation
    address: () => [
        body('street').trim().notEmpty().withMessage('Street is required'),
        body('city').trim().notEmpty().withMessage('City is required'),
        body('country').trim().notEmpty().withMessage('Country is required'),
        body('postalCode').trim().matches(/^[A-Z0-9\s-]+$/i).withMessage('Invalid postal code')
    ]
};

// Validation Middleware
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        return res.status(400).json({
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        });
    };
};

// Input Sanitization
const sanitizeInput = (input) => {
    return validator.trim(validator.escape(input));
};

// Comprehensive Validation Sets
const validationSets = {
    // Registration Validation
    registration: [
        validationSchemas.username(),
        validationSchemas.password(),
        validationSchemas.subscriptionPlan()
    ],

    // Payment Validation
    payment: [
        validationSchemas.paymentMethodId(),
        validationSchemas.promoCode(),
        validationSchemas.creditCard()
    ],

    // Recovery Validation
    recovery: [
        validationSchemas.recoveryKey()
    ]
};

export {
    validate,
    validationSchemas,
    validationSets,
    body,
    validationResult,
    validator,
    sanitizeInput
};