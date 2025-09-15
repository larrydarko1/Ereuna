import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logDirectory = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory);

// Create logger instance
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
        paths: [
            'password',
            '*.password',
            'paymentMethodId',
            'creditCardNumber',
            'authKey',
            'hashedPassword',
            'req.headers.authorization'
        ],
        censor: '**REDACTED**'
    },
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' }
            },
            {
                target: 'pino/file',
                options: { destination: path.join(logDirectory, 'app.log'), mkdir: true }
            }
        ]
    }
});

// Standardized error handler
export function handleError(
    error: unknown,
    context: string,
    meta: Record<string, unknown> = {},
    statusCode: number = 500
) {
    let message = 'Internal Server Error';
    let details: Record<string, unknown> = {};

    if (error instanceof Error) {
        message = error.message;
        details = { stack: error.stack, name: error.name };
    } else if (typeof error === 'string') {
        message = error;
    }

    logger.error({ msg: message, context, ...details, ...meta, statusCode });
    return { message, statusCode, ...(process.env.NODE_ENV === 'development' ? details : {}) };
}

export default logger;