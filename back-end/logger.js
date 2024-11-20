import winston from 'winston';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logDirectory = path.join(process.cwd(), 'logs');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// Create a custom logger with Winston
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'ereuna-backend' },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),

        // File transport for errors
        new winston.transports.File({
            filename: path.join(logDirectory, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),

        // File transport for combined logs
        new winston.transports.File({
            filename: path.join(logDirectory, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// Create a Morgan stream for Winston
const morganStream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

// Custom Morgan format
const morganFormat = process.env.NODE_ENV === 'production'
    ? 'combined'  // Standard Apache combined log output
    : 'dev';  // Concise output colored by response status

// Morgan middleware
const httpLogger = morgan(morganFormat, {
    stream: morganStream,
    skip: (req, res) => {
        // Skip logging for health check or static file requests if needed
        return req.path === '/health' || req.path.startsWith('/static');
    }
});

// Error logging method
logger.logError = (error, additionalInfo = {}) => {
    logger.error({
        message: error.message,
        stack: error.stack,
        ...additionalInfo
    });
};

export { logger, httpLogger };