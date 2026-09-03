/**
 * Ingestor logger — pino, built by the shared factory so this process and the
 * API produce identical structured JSON in production and readable output in
 * development. Every line carries `name: 'ingestor'`.
 */
import { createLogger } from '@ereuna/shared/logger';
import { config } from '@/lib/config.js';

export const logger = createLogger('ingestor', {
    level: config.logger.level,
    isDev: config.isDev,
});
