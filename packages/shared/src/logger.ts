/** Shared pino logger factory used by every Node service in the monorepo. */
import pino, { type Logger } from 'pino';

import { REDACT_PATHS } from '#config/redact.js';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type LoggerOptions = {
    level: LogLevel;
    isDev: boolean;
    /** A file that also receives every line as JSON (`LOG_FILE`), whatever stdout shows. */
    file?: string | undefined;
};

const PRETTY = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
};

export function createLogger(name: string, { level, isDev, file }: LoggerOptions): Logger {
    const stdout = isDev ? PRETTY : { target: 'pino/file', options: { destination: 1 } };
    const transport =
        file === undefined
            ? isDev && { transport: PRETTY }
            : {
                  transport: {
                      targets: [
                          { ...stdout, level },
                          // Append mode, so truncating the file while the process runs is safe
                          { target: 'pino/file', options: { destination: file, mkdir: true, append: true }, level },
                      ],
                  },
              };
    return pino({
        name,
        level,
        redact: {
            paths: REDACT_PATHS,
            censor: '[REDACTED]',
        },
        ...transport,
    });
}
