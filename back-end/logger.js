import pino from 'pino';
import pinoHttp from 'pino-http';
import fs from 'fs';
import path from 'path';

// Ensure the logs directory exists
const logDirectory = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// Create a write stream for file logging
const fileTransport = pino.transport({
    target: 'pino/file',
    options: {
        destination: path.join(logDirectory, 'app.log'),
        mkdir: true
    }
});

// Create the logger with file transport
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        targets: [
            {
                target: 'pino/file',
                options: {
                    destination: path.join(logDirectory, 'app.log'),
                    mkdir: true
                }
            },
            {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            }
        ]
    }
});

// HTTP logging middleware
const httpLogger = pinoHttp({
    logger: logger,
    customLogLevel: (res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
        } else if (res.statusCode >= 500) {
            return 'error';
        }
        return 'info';
    }
});

// Metrics handler
const metricsHandler = (req, res) => {
    // Implement your metrics logic here
    res.json({ status: 'Metrics endpoint' });
};

export { logger, httpLogger, metricsHandler };