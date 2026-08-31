/**
 * Application logger — pino, built by the shared factory in `@ereuna/shared`
 * so every Node service in the monorepo shares one redaction list and format.
 */
import { createLogger } from '@ereuna/shared/logger';
import { config } from '@/lib/config.js';

export const logger = createLogger('api', {
    level: config.logger.level,
    isDev: config.isDev,
});
