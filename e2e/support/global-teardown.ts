import { logErrors } from '@larrydarko/lint-config/server-errors';

import { API_LOG } from './constants';

/**
 * Fail the run when the API logged an error, even one no test saw as a 5xx: a
 * socket push its schema refused, an answer that carried a field its schema does
 * not declare, an error logged inside a request that still answered 2xx. Each
 * test already fails on the 5xx it received (fixtures.ts); this is the net for
 * everything else.
 */
export default function globalTeardown(): void {
    const errors = logErrors(API_LOG);
    if (errors.length > 0) {
        throw new Error(`The API logged ${errors.length} error(s) during the run (${API_LOG}):\n${errors.join('\n')}`);
    }
}
