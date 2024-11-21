import pino from 'pino';
import pinoHttp from 'pino-http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Ensure the logs directory exists
const logDirectory = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// Create a secure log rotation transport
const createRotatingFileTransport = () => {
    return pino.transport({
        target: 'pino/file',
        options: {
            destination: path.join(logDirectory, 'app-%DATE%.log'),
            mkdir: true,
            interval: '1d', // Rotate daily
            maxFiles: '14d', // Keep logs for 14 days
            compress: true // Compress old log files
        }
    });
};

// Security-focused logger configuration
const createLogger = () => {
    return pino({
        level: process.env.LOG_LEVEL || 'info',
        timestamp: pino.stdTimeFunctions.isoTime,

        // Redact sensitive information
        redact: {
            paths: [
                'password',
                'paymentMethodId',
                'creditCardNumber',
                'authKey',
                'hashedPassword',
                'req.headers.authorization',
                '*.password'
            ],
            censor: '**REDACTED**'
        },

        // Security-focused serializers
        serializers: {
            req: (req) => ({
                id: req.id || crypto.randomBytes(16).toString('hex'),
                method: req.method,
                url: req.url,
                headers: {
                    host: req.headers.host,
                    'user-agent': req.headers['user-agent']
                },
                remoteAddress: req.ip || req.socket.remoteAddress
            }),
            res: (res) => ({
                statusCode: res.statusCode,
                responseTime: res.responseTime
            }),
            err: (err) => ({
                type: err.constructor.name,
                message: err.message,
                code: err.code
            })
        },

        // Transport configuration
        transport: {
            targets: [
                // Console output with pretty print
                {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname'
                    }
                },
                // File transport with rotation
                {
                    target: 'pino/file',
                    options: {
                        destination: path.join(logDirectory, 'app.log'),
                        mkdir: true
                    }
                }
            ]
        }
    });
};

// Create logger instances
const logger = createLogger();

// HTTP logging middleware with enhanced security
const httpLogger = pinoHttp({
    logger: logger,

    // Custom log level based on status code
    customLogLevel: (res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
        } else if (res.statusCode >= 500) {
            return 'error';
        }
        return 'info';
    },

    // Generate a unique request ID
    genReqId: (req) => {
        return crypto.randomBytes(16).toString('hex');
    },

    // Log request and response details
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
    },

    // Error logging
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} ${res.statusCode} ${err.message}`;
    }
});

// Metrics handler (placeholder)
const metricsHandler = (req, res) => {
    logger.info('Metrics endpoint accessed', {
        ip: req.ip,
        method: req.method
    });
    res.json({ status: 'Metrics endpoint' });
};

// Security logging utility
const securityLogger = {
    // Log security-related events
    logSecurityEvent: (event, details) => {
        logger.warn({
            msg: 'Security Event',
            event: event,
            ...details
        });
    },

    // Log authentication attempts
    logAuthAttempt: (username, success, details = {}) => {
        logger.info({
            msg: 'Authentication Attempt',
            username: username,
            success: success,
            ...details
        });
    }
};

// Obfuscation utility function
const obfuscateUsername = (username) => {
    if (!username) return '...';
    return username.length > 3
        ? username.substring(0, 3) + '...'
        : username + '...';
};


export {
    logger,
    httpLogger,
    metricsHandler,
    securityLogger,
    obfuscateUsername,
};