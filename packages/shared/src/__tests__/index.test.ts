import { describe, expect, it } from 'vitest';
import * as shared from '#index.js';

/**
 * The barrel is what the api, ingestor, worker and frontend all import from, so
 * a re-export dropped in a refactor breaks four workspaces at once and none of
 * them at compile time in this package.
 */
describe('the package barrel', () => {
    it.each([
        'ERROR_CODES',
        'isErrorCode',
        'hasValue',
        'isFiniteNumber',
        'ALL_COLLECTIONS',
        'COLLECTIONS',
        'INDEXES',
        'OHLCV_COLLECTIONS',
        'OHLCV_INDEXES',
        'REFERENCE_INDEXES',
        'REDACT_PATHS',
        'nodeEnv',
        'mongoEnv',
        'redisEnv',
        'tiingoEnv',
        'requiredSecret',
        'hexSecret',
        'infraDefault',
        'AGGREGATOR_TIMEFRAMES',
        'aggregateChannel',
        'lastCandleKey',
        'BREADTH_UNIVERSES',
        'ALL_FILTER_KEYS',
        'findRangeFilter',
    ])('re-exports %s', (name) => {
        expect(shared).toHaveProperty(name);
    });

    it('pulls in nothing framework-flavoured — the api imports this', () => {
        expect(shared).not.toHaveProperty('startProbeServer');
        expect(shared).not.toHaveProperty('createLogger');
    });
});
