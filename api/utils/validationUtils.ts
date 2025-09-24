/**
 * =====================================================================
 *  Main Validation Rules (for consistency across backend and frontend)
 * =====================================================================
 *
 * BODY FIELDS:
 *
 * Username (username, Username, newUsername, user):
 *   - Required, trimmed, 3-25 characters
 *   - Only letters, numbers, and underscores (^[a-zA-Z0-9_]+$)
 *
 * Password (password, oldPassword, newPassword):
 *   - Required, trimmed, 5-40 characters
 *
 * API Key (apiKey):
 *   - Required, trimmed
 *   - Only letters and numbers (^[a-zA-Z0-9]+$)
 *
 * MFA Code (mfaCode):
 *   - Required, trimmed, exactly 6 digits
 *   - Only numbers (^[0-9]+$)
 *
 * Recovery Key (recoveryKey):
 *   - Required, trimmed, 64-128 characters
 *   - Only hexadecimal (^[0-9a-fA-F]+$)
 *
 * Email (email):
 *   - Required, trimmed, valid email format
 *
 * Credit Card (creditCardNumber):
 *   - Required, trimmed, valid credit card number
 *
 * Note (note):
 *   - Required, trimmed, 1-350 characters
 *
 * PARAM FIELDS:
 *
 * Symbol (symbol, symbolParam):
 *   - Required, trimmed, 1-12 characters
 *   - Only uppercase letters and numbers (^[A-Z0-9]+$)
 *
 * Identifier (identifier):
 *   - Required, trimmed, 1-12 characters
 *   - Only uppercase letters and numbers (^[A-Z0-9]+$)
 *
 * Note ID (noteId):
 *   - Required, valid MongoDB ObjectId
 *
 * API Key (apiKeyParam):
 *   - Required, trimmed
 *   - Only letters and numbers (^[a-zA-Z0-9]+$)
 *
 * QUERY FIELDS:
 *
 * Username (userQuery, usernameQuery):
 *   - Required, trimmed, 3-25 characters
 *   - Only letters, numbers, and underscores (^[a-zA-Z0-9_]+$)
 *
 *
 * These rules are enforced in this file and should be mirrored in frontend validation for a consistent user experience.
 * =====================================================================
 */
import { body, validationResult, param, query } from 'express-validator';
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

    enabled: (fieldName = 'enabled') => body(fieldName)
        .isBoolean().withMessage('Remember me must be a boolean value'),

    apiKey: () => body('apiKey')
        .trim()
        .notEmpty().withMessage('API Key is required')
        .matches(/^[a-zA-Z0-9]+$/).withMessage('API Key should only contain letters and numbers'),

    mfaCode: () => body('mfaCode')
        .trim()
        .notEmpty().withMessage('MFA code is required')
        .isLength({ min: 6, max: 6 }).withMessage('MFA code must be 6 digits')
        .matches(/^[0-9]+$/).withMessage('MFA code must be a number'),

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

    usernameQuery: (fieldName = 'username') => query(fieldName)
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

    theme: () => body('theme')
        .trim()
        .isLength({ min: 1, max: 30 })
        .withMessage('Theme must be between 1 and 30 characters')
        .isIn([
            'default', 'ihatemyeyes', 'colorblind', 'catpuccin', 'black',
            'nord', 'dracula', 'gruvbox', 'tokyo-night', 'solarized',
            'synthwave', 'github-dark', 'everforest', 'ayu-dark', 'rose-pine',
            'material', 'one-dark', 'night-owl', 'panda', 'monokai-pro',
            'tomorrow-night', 'oceanic-next', 'palenight', 'cobalt', 'poimandres',
            'github-light', 'neon', 'moonlight', 'nightfox', 'spacemacs',
            'borland', 'amber', 'cyberpunk', 'matrix', 'sunset',
            'deep-ocean', 'gotham', 'retro', 'spotify', 'autumn',
            'noctis', 'iceberg', 'tango', 'horizon', 'railscasts',
            'vscode-dark', 'slack-dark', 'mintty', 'atom-one', 'light-owl'
        ])
        .withMessage('Invalid theme.'),

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

    symbolsArray: () =>
        body('symbols')
            .isArray({ min: 0, max: 20 }).withMessage('Symbols must be an array with up to 20 elements')
            .custom((arr: string[]) => arr.every((s: string) => typeof s === 'string')).withMessage('Each symbol must be a string')
            .custom((arr: string[]) => arr.every((s: string) => /^[A-Z0-9]+$/.test(s))).withMessage('Symbols must be uppercase alphanumeric'),

    rsScore: () => [
        body('value1')
            .optional({ nullable: true }) // Allow null values
            .custom((value: any) => {
                // If value is null or empty, return true (valid)
                if (value === null || value === '') return true;

                // Validate float between 1 and 100
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value1 must be a float between 1 and 100 or null'),
        body('value2')
            .optional({ nullable: true })
            .custom((value: any) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value2 must be a float between 1 and 100 or null'),
        body('value3')
            .optional({ nullable: true })
            .custom((value: any) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value3 must be a float between 1 and 100 or null'),
        body('value4')
            .optional({ nullable: true })
            .custom((value: any) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value4 must be a float between 1 and 100 or null'),
        body('value5')
            .optional({ nullable: true })
            .custom((value: any) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value5 must be a float between 1 and 100 or null'),
        body('value6')
            .optional({ nullable: true })
            .custom((value: any) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value6 must be a float between 1 and 100 or null')
    ],

    ADV: () => [
        body('value1')
            .optional({ nullable: true }) // Allow null values
            .custom((value) => {
                // If value is null or empty, return true (valid)
                if (value === null || value === '') return true;

                // Validate float
                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value1 must be a float, NaN, or null'),

        body('value2')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value2 must be a float, NaN, or null'),

        body('value3')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value3 must be a float, NaN, or null'),

        body('value4')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value4 must be a float, NaN, or null'),

        body('value5')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value5 must be a float, NaN, or null'),

        body('value6')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value6 must be a float, NaN, or null'),

        body('value7')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value7 must be a float, NaN, or null'),

        body('value8')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value8 must be a float, NaN, or null')
    ],

    pricePerformanceValues: () => [
        // Validation for changePerc values
        body('value1')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value1 must be a valid number or null'),

        body('value2')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value2 must be a valid number or null'),

        body('value3')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '' || value === '-') return true;
                const validOptions = ['1D', '1W', '1M', '4M', '6M', '1Y', 'YTD'];
                return validOptions.includes(value.trim());
            })
            .withMessage('Value3 must be a valid time period or null'),

        // Validation for percentage off week high/low
        body('value4')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value4 must be a valid number or null'),

        body('value5')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value5 must be a valid number or null'),

        body('value6')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value6 must be a valid number or null'),

        body('value7')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value7 must be a valid number or null'),

        // Validation for NewHigh and NewLow
        body('value8')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                // Allow specific values or return true
                const allowedValues = ['yes', 'no', 'Yes', 'No'];
                return allowedValues.includes(value.trim());
            })
            .withMessage('Value8 must be "yes" or "no"'),

        body('value9')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                // Allow specific values or return true
                const allowedValues = ['yes', 'no', 'Yes', 'No'];
                return allowedValues.includes(value.trim());
            })
            .withMessage('Value9 must be "yes" or "no"'),
    ]

};


// Validation Middleware
import { Request, Response, NextFunction } from 'express';
const validate = (validations: any[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Flatten validations in case of nested arrays (e.g., spread operator or grouped schemas)
        const flatValidations = validations.flat(Infinity);
        await Promise.all(flatValidations.map((validation: any) => {
            if (typeof validation.run === 'function') {
                return validation.run(req);
            }
            // If not a validation chain, skip (or throw if strict)
            return Promise.resolve();
        }));

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Log the errors for debugging
            console.error('Validation Errors:', errors.array());
            return res.status(400).json({
                errors: errors.array().map((error: any) => ({
                    field: error.param || '',
                    message: error.msg
                }))
            });
        }
        next();
    };
};

// Input Sanitization
const sanitizeInput = (input: string): string => {
    if (typeof input !== 'string') return '';
    return validator.trim(validator.escape(input));
};

// Validation for /signup-paywall endpoint (A/B paywall signup)
const signupPaywall = [
    validationSchemas.username(),
    validationSchemas.password(),
    body('payment_method_id')
        .notEmpty().withMessage('Payment method ID is required'),
    body('duration')
        .isInt({ min: 1, max: 12 }).withMessage('Invalid duration').toInt(),
    body('country')
        .isString().isLength({ min: 2, max: 2 }).withMessage('Invalid country code'),
    body('vat')
        .isFloat({ min: 0, max: 1 }).withMessage('Invalid VAT rate').toFloat(),
    body('total')
        .isInt({ min: 50 }).withMessage('Invalid total price (must be integer cents, min 50)'),
    body('promoCode')
        .optional()
        .trim()
        .isLength({ max: 10 }).withMessage('Promo code cannot exceed 10 characters')
        .matches(/^[A-Z0-9]+$/).withMessage('Promo code can only contain uppercase letters and numbers')
];

const renewalPaywall = [
    // Username is sent as 'user' from frontend
    validationSchemas.user(),
    // payment_method_id is required
    body('payment_method_id')
        .notEmpty().withMessage('Payment method ID is required'),
    // duration: integer, 1-12
    body('duration')
        .isInt({ min: 1, max: 12 }).withMessage('Invalid duration').toInt(),
    // country: 2-letter string
    body('country')
        .isString().isLength({ min: 2, max: 2 }).withMessage('Invalid country code'),
    // vat: float 0-1
    body('vat')
        .isFloat({ min: 0, max: 1 }).withMessage('Invalid VAT rate').toFloat(),
    // total: string, decimal format
    body('total')
        .isInt({ min: 50 }).withMessage('Invalid total price (must be integer cents, min 50)'),
    // promoCode: optional, up to 10 chars, uppercase letters/numbers
    body('promoCode')
        .optional()
        .trim()
        .isLength({ max: 10 }).withMessage('Promo code cannot exceed 10 characters')
        .matches(/^[A-Z0-9]+$/).withMessage('Promo code can only contain uppercase letters and numbers')
];

const refundRequest = [
    validationSchemas.user(),
    body('amount')
        .isInt({ min: 50 }).withMessage('Invalid refund amount (must be integer cents, min 50)').toInt(),
    body('paymentIntentId')
        .notEmpty().withMessage('PaymentIntentId is required')
        .isString().withMessage('PaymentIntentId must be a string'),
];


const validationSets = {
    signupPaywall,
    renewalPaywall,
    refundRequest,
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

    newsSearch: [
        validationSchemas.symbolParam('symbol')
    ],

    notesDeletion: [
        validationSchemas.symbolParam('symbol'),
        validationSchemas.noteId(),
        validationSchemas.userQuery()
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
    ],
};

export {
    validate,
    validationSchemas,
    validationSets,
    body,
    validationResult,
    validator,
    sanitizeInput,
    param,
    query
};