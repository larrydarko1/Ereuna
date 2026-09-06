import { afterEach, describe, expect, it, vi } from 'vitest';
import pino, { type Logger } from 'pino';
import { createLogger } from '#logger.js';

/**
 * `createLogger` takes no destination — every service wants fd 1 and passing a
 * stream in just to make it testable would be the test shaping the API. So the
 * suite swaps the stream on the built logger instead, through the symbol pino
 * publishes for exactly this.
 *
 * `isDev: true` is not exercised this way on purpose: the pretty transport is a
 * worker thread, and nothing it writes passes through this process at all.
 */
function collect(logger: Logger): string[] {
    const lines: string[] = [];
    // pino publishes the symbol but does not declare it on `Logger`, so the
    // lookup is typed here rather than left to an implicit any.
    const streams = logger as unknown as Record<symbol, { write: (s: string) => void }>;
    const stream = streams[pino.symbols.streamSym];
    if (stream === undefined) throw new Error('the logger has no destination stream');

    vi.spyOn(stream, 'write').mockImplementation((s: string) => {
        lines.push(s);
    });
    return lines;
}

const parse = (line: string | undefined): Record<string, unknown> =>
    JSON.parse(line ?? '{}') as Record<string, unknown>;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createLogger', () => {
    it('carries the name and the level it was given', () => {
        const logger = createLogger('api', { level: 'warn', isDev: false });
        expect(logger.level).toBe('warn');
        expect(logger.bindings().name).toBe('api');
    });

    it('drops records below the configured level', () => {
        const logger = createLogger('api', { level: 'warn', isDev: false });
        const lines = collect(logger);
        logger.info('ignored');
        expect(lines).toEqual([]);
        logger.warn('kept');
        expect(lines).toHaveLength(1);
    });

    it.each([
        ['password', { password: 'hunter2' }],
        ['accessToken', { accessToken: 'ey.jwt' }],
        ['totpSecret', { totpSecret: 'JBSWY3DP' }],
        ['recoveryCodes', { recoveryCodes: ['a', 'b'] }],
    ])('censors %s rather than dropping the key', (field, payload) => {
        const logger = createLogger('api', { level: 'info', isDev: false });
        const lines = collect(logger);
        logger.info(payload, 'attempt');
        expect(parse(lines[0])[field]).toBe('[REDACTED]');
    });

    it('censors a secret nested one level under an arbitrary key', () => {
        const logger = createLogger('api', { level: 'info', isDev: false });
        const lines = collect(logger);
        logger.info({ body: { password: 'hunter2' } }, 'attempt');
        expect(parse(lines[0]).body).toEqual({ password: '[REDACTED]' });
    });

    it('leaves unlisted fields alone', () => {
        const logger = createLogger('api', { level: 'info', isDev: false });
        const lines = collect(logger);
        logger.info({ username: 'larry' }, 'attempt');
        const record = parse(lines[0]);
        expect(record.username).toBe('larry');
        expect(record.name).toBe('api');
        expect(record.msg).toBe('attempt');
    });

    it('builds a dev logger with the pretty transport attached', () => {
        const logger = createLogger('worker', { level: 'debug', isDev: true });
        expect(logger.level).toBe('debug');
        expect(logger.bindings().name).toBe('worker');
    });
});
