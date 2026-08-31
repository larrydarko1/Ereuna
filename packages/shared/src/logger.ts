/** Shared pino logger factory used by every Node service in the monorepo. */
import pino, { type Logger } from 'pino';
import { REDACT_PATHS } from '#config/redact.js';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LoggerOptions = {
    level: LogLevel;
    isDev: boolean;
};

export function createLogger(name: string, { level, isDev }: LoggerOptions): Logger {
    return pino({
        name,
        level,
        redact: {
            paths: REDACT_PATHS,
            censor: '[REDACTED]',
        },
        ...(isDev && {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:HH:MM:ss',
                    ignore: 'pid,hostname',
                },
            },
        }),
    });
}
