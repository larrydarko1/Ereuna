import { resolve } from 'node:path';

export const FRONTEND_URL = 'http://localhost:3500';
export const API_URL = 'http://localhost:5500';

/**
 * Where the API this suite boots writes its log as JSON (LOG_FILE): the server-error
 * tripwire reads it to say why a request failed. Gitignored, like every `logs` folder.
 */
export const API_LOG = resolve(import.meta.dirname, '..', 'logs', 'api.log');
