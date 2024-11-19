import { body, validationResult } from 'express-validator';
import validator from 'validator';

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

const sanitizeInput = (input) => {
    return validator.trim(validator.escape(input));
};

export {
    validate,
    body,
    validationResult,
    validator,
    sanitizeInput
};