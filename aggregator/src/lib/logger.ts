/**
 * Aggregator logger — pino, built by the shared factory so this process and the
 * API produce identical structured JSON in production and readable output in
 * development. Every line carries `name: 'aggregator'`.
 */
import { createLogger } from '@ereuna/shared/logger';
import { config } from '@/lib/config.js';

export const logger = createLogger('aggregator', {
    level: config.logger.level,
    isDev: config.isDev,
});
