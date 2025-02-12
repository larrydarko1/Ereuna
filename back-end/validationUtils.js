import { body, validationResult, param, query, } from 'express-validator';
import validator from 'validator';

const validationSchemas = {
    username: (fieldName = 'username') => body(fieldName)
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    Username: (fieldName = 'Username') => body(fieldName)
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    rememberMe: () => body('rememberMe')
        .isBoolean().withMessage('Remember me must be a boolean value'),

    newUsername: (fieldName = 'newUsername') => body(fieldName)
        .trim()
        .notEmpty().withMessage('new Username is required')
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

    apiKey: () => body('apiKey')
        .trim()
        .notEmpty().withMessage('API Key is required')
        .matches(/^[a-zA-Z0-9]+$/).withMessage('API Key should only contain letters and numbers'),

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
        .isLength({ min: 1, max: 12 }).withMessage('Identifier must be between 1 and 12 characters')
        .matches(/^[A-Z0-9]+$/).withMessage('Identifier must be uppercase alphanumeric'),

    apiKeyParam: () => param('apiKey')
        .trim()
        .notEmpty().withMessage('API Key is required')
        .matches(/^[a-zA-Z0-9]+$/).withMessage('API Key should only contain letters and numbers'),


    symbol: (fieldName = 'symbol') => param(fieldName)
        .trim()
        .notEmpty().withMessage('Symbol is required')
        .isLength({ min: 1, max: 12 }).withMessage('Symbol must be between 1 and 12 characters')
        .matches(/^[A-Z0-9]+$/).withMessage('Symbol must be uppercase alphanumeric'),

    // Note Validation
    note: () => body('note')
        .trim()
        .notEmpty().withMessage('Note is required')
        .isLength({ min: 1, max: 350 }).withMessage('Note must be between 1 and 350 characters'),

    noteId: () => param('noteId').trim()
        .notEmpty().withMessage('Note ID is required')
        .isMongoId().withMessage('Invalid Note ID'),

    userQuery: (fieldName = 'user') => query(fieldName)
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    chartData: (fieldName = 'ticker') => param(fieldName)
        .trim()
        .notEmpty().withMessage('Ticker symbol is required')
        .isLength({ min: 1, max: 12 }).withMessage('Ticker symbol must be between 1 and 12 characters')
        .matches(/^[A-Z0-9]+$/).withMessage('Ticker symbol must be uppercase alphanumeric'),

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

    // Add to the existing validationSchemas
    symbolParam: (fieldName = 'symbol') => param(fieldName)
        .trim()
        .notEmpty().withMessage('Symbol is required')
        .isLength({ min: 1, max: 12 }).withMessage('Symbol must be between 1 and 12 characters')
        .matches(/^[A-Z0-9]+$/).withMessage('Symbol must be uppercase alphanumeric'),

    userParam: (fieldName = 'user') => param(fieldName)
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    userParam2: (fieldName = 'usernameID') => param(fieldName)
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    // Address Validation
    address: () => [
        body('street').trim().notEmpty().withMessage('Street is required'),
        body('city').trim().notEmpty().withMessage('City is required'),
        body('country').trim().notEmpty().withMessage('Country is required'),
        body('postalCode').trim().matches(/^[A-Z0-9\s-]+$/i).withMessage('Invalid postal code')
    ],

    watchlistName: () =>
        param('list')
            .trim()
            .isLength({ min: 1, max: 20 })
            .withMessage('Watchlist name must be between 1 and 20 characters')
            .matches(/^[a-zA-Z0-9\s_-]+$/)
            .withMessage('Watchlist name can only contain letters, numbers, spaces, underscores, and hyphens'),


    screenerName: () =>
        param('list')
            .trim()
            .isLength({ min: 1, max: 20 })
            .withMessage('screener name must be between 1 and 20 characters')
            .matches(/^[a-zA-Z0-9\s_-]+$/)
            .withMessage('screener name can only contain letters, numbers, spaces, underscores, and hyphens'),

    screenerNameParam: () =>
        param('name')
            .trim()
            .isLength({ min: 1, max: 40 }) // Increased max length
            .withMessage('screener name must be between 1 and 50 characters')
            .matches(/^[a-zA-Z0-9\s_\-+()]+$/) // Added + and () to allowed characters
            .withMessage('screener name can only contain letters, numbers, spaces, underscores, hyphens, plus signs, and parentheses'),

    oldname: () =>
        body('oldname')
            .trim()
            .isLength({ min: 1, max: 20 })
            .withMessage('Old name must be between 1 and 20 characters')
            .matches(/^[a-zA-Z0-9\s_-]+$/)
            .withMessage(' name can only contain letters, numbers, spaces, underscores, and hyphens'),

    newname: () =>
        body('newname')
            .trim()
            .isLength({ min: 1, max: 20 })
            .withMessage('New name must be between 1 and 20 characters')
            .matches(/^[a-zA-Z0-9\s_-]+$/)
            .withMessage('name can only contain letters, numbers, spaces, underscores, and hyphens'),

    screenerNameBody: () =>
        body('screenerName')
            .trim()
            .isLength({ min: 1, max: 20 })
            .withMessage('Screener name must be between 1 and 20 characters')
            .matches(/^[a-zA-Z0-9\s_-]+$/)
            .withMessage('Screener name can only contain letters, numbers, spaces, underscores, and hyphens'),

    user: () => body('user')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    minPrice: () =>
        body('minPrice')
            .optional({ nullable: true }) // Allow null values
            .isLength({ max: 30 })         // Ensure the length does not exceed 30 characters
            .withMessage('Min price must not exceed 30 characters')
            .custom((value) => {
                // If value is null or empty, return true (valid)
                // This allows the endpoint logic to set it to 0
                if (value === null || value === '') return true;

                // Ensure it's a valid float if provided
                return !isNaN(parseFloat(value));
            })
            .withMessage('Min price must be a valid number'),

    maxPrice: () =>
        body('maxPrice')
            .optional({ nullable: true }) // Allow null values
            .isLength({ max: 30 })         // Ensure the length does not exceed 30 characters
            .withMessage('Max price must not exceed 30 characters')
            .custom((value) => {
                // If value is null or empty, return true (valid)
                if (value === null || value === '') return true;

                // Ensure it's a valid float if provided
                return !isNaN(parseFloat(value));
            })
            .withMessage('Max price must be a valid number'),

    // Volume Values Validation
    volumeValues: () => [
        body('value1')
            .optional({ nullable: true })
            .custom((value) => {
                // If value is null or empty, return true (valid)
                if (value === null || value === '') return true;

                // Ensure it's a valid positive float
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 0.1;
            })
            .withMessage('Value1 must be a valid number greater than or equal to 0.1'),

        body('value2')
            .optional({ nullable: true })
            .custom((value) => {
                // If value is null or empty, return true (valid)
                if (value === null || value === '') return true;

                // Ensure it's a valid float
                return !isNaN(parseFloat(value));
            })
            .withMessage('Value2 must be a valid number'),

        body('value3')
            .optional({ nullable: true })
            .custom((value) => {
                // If value is null or empty, return true (valid)
                if (value === null || value === '') return true;

                // Ensure it's a valid number (including 0)
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 0; // Allow 0 and positive numbers
            })
            .withMessage('Value3 must be a valid non-negative number'), // Updated message

        body('value4')
            .optional({ nullable: true })
            .custom((value) => {
                // If value is null or empty, return true (valid)
                if (value === null || value === '') return true;

                // Ensure it's a valid float
                return !isNaN(parseFloat(value));
            })
            .withMessage('Value4 must be a valid number')
    ],

    // Relative Volume Option Validation
    relativeVolumeOption: () => body('relVolOption')
        .trim()
        .notEmpty().withMessage('Relative Volume Option is required')
        .custom((value) => {
            const validOptions = ['-', '1D', '5D', '1W', '1M', '6M', '1Y'];
            if (!validOptions.includes(value)) {
                console.log('Invalid relVolOption:', value);
                throw new Error('Invalid Relative Volume Option');
            }
            return true;
        }),

    // Average Volume Option Validation
    averageVolumeOption: () => body('avgVolOption')
        .trim()
        .notEmpty().withMessage('Average Volume Option is required')
        .isIn(['-', '1W', '1M', '6M', '1Y']).withMessage('Invalid Average Volume Option'),
};

// Validation Middleware
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Log the errors for debugging
            console.error('Validation Errors:', errors.array());
            return res.status(400).json({
                errors: errors.array().map(error => ({
                    field: error.param,
                    message: error.msg
                }))
            });
        }
        next();
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
    ],

    // Notes Search Validation
    notesSearch: [
        validationSchemas.userParam('user'),
        validationSchemas.symbolParam('symbol')
    ],

    notesDeletion: [
        validationSchemas.symbolParam('symbol'),
        validationSchemas.noteId(),
        validationSchemas.userQuery(),
        validationSchemas.apiKeyParam()
    ],

    chartData: [
        validationSchemas.chartData('ticker')
    ],

    volumeScreener: [
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.relativeVolumeOption(),
        validationSchemas.averageVolumeOption(),
        ...validationSchemas.volumeValues()
    ]
};

export {
    validate,
    validationSchemas,
    validationSets,
    body,
    validationResult,
    validator,
    sanitizeInput,
    param
};