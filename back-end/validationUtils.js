// Add these to your existing imports
import { body, validationResult } from 'express-validator';
import validator from 'validator';

// Create a validation middleware utility
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

// Optional: Create a reusable sanitization function
const sanitizeInput = (input) => {
    // Trim whitespace and escape potential HTML
    return validator.trim(validator.escape(input));
};

// Export these for use in other files
export {
    validate,
    body,
    validationResult,
    validator,
    sanitizeInput
};