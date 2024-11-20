import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure security logs directory exists
const logDirectory = path.join(process.cwd(), 'logs', 'security');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory, { recursive: true });

const securityLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
    ),
    defaultMeta: { service: 'security-service' },
    transports: [
        // Dedicated security log file
        new winston.transports.File({
            filename: path.join(logDirectory, 'security-events.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 10
        }),
        // Console transport for immediate visibility
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Utility function to mask sensitive information
function maskSensitiveData(data, fieldsToMask = ['password', 'paymentMethodId', 'authKey']) {
    if (!data || typeof data !== 'object') return data;

    const maskedData = { ...data };
    fieldsToMask.forEach(field => {
        if (maskedData[field]) {
            // Mask all but first and last 2 characters
            const originalValue = maskedData[field].toString();
            maskedData[field] = originalValue.length > 4
                ? `${originalValue.slice(0, 2)}${'*'.repeat(originalValue.length - 4)}${originalValue.slice(-2)}`
                : '*'.repeat(originalValue.length);
        }
    });

    return maskedData;
}

// Security logging methods
const SecurityEvents = {
    // Authentication events
    loginAttempt: (username, success, metadata = {}) => {
        securityLogger.info('Login Attempt', {
            event: 'LOGIN_ATTEMPT',
            username: username,
            success: success,
            ...metadata
        });
    },

    // User registration events
    registrationAttempt: (username, success, metadata = {}) => {
        securityLogger.info('Registration Attempt', {
            event: 'REGISTRATION_ATTEMPT',
            username: username,
            success: success,
            ...metadata
        });
    },

    // Password change events
    passwordChange: (username, method, success, metadata = {}) => {
        securityLogger.info('Password Change', {
            event: 'PASSWORD_CHANGE',
            username: username,
            method: method, // e.g., 'self', 'admin', 'reset'
            success: success,
            ...metadata
        });
    },

    // Suspicious activity
    suspiciousActivity: (type, details, metadata = {}) => {
        securityLogger.warn('Suspicious Activity', {
            event: 'SUSPICIOUS_ACTIVITY',
            type: type,
            ...details,
            ...metadata
        });
    },

    // Access control events
    accessControlViolation: (username, resource, action, metadata = {}) => {
        securityLogger.error('Access Control Violation', {
            event: 'ACCESS_CONTROL_VIOLATION',
            username: username,
            resource: resource,
            action: action,
            ...metadata
        });
    },

    // Rate limiting events
    rateLimitExceeded: (username, endpoint, metadata = {}) => {
        securityLogger.warn('Rate Limit Exceeded', {
            event: 'RATE_LIMIT_EXCEEDED',
            username: username,
            endpoint: endpoint,
            ...metadata
        });
    }
};

export { securityLogger, SecurityEvents, maskSensitiveData };