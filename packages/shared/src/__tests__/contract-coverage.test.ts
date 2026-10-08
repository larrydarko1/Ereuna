import { readdirSync } from 'node:fs';

import { describe, it, expect } from 'vitest';

import { openCoverageLog, recordCheckedRoute, uncheckedRoutes } from '#contract-coverage.js';
import { API_ROUTES } from '#contract.js';

describe('contract coverage', () => {
    it('reports every route no suite recorded, less the exempt ones, and removes the log', () => {
        const dir = openCoverageLog();
        recordCheckedRoute(dir, 'GET /api/account');
        recordCheckedRoute(dir, 'GET /api/account');

        const missing = uncheckedRoutes(dir, { 'GET /api/logos/:exchange/:file': 'an <img> loads it' });

        expect(missing).not.toContain('GET /api/account');
        expect(missing).not.toContain('GET /api/logos/:exchange/:file');
        expect(missing).toHaveLength(Object.keys(API_ROUTES).length - 2);
        expect(() => readdirSync(dir)).toThrow();
    });

    it('records nothing when the run is not measuring coverage', () => {
        expect(() => recordCheckedRoute(undefined, 'GET /api/account')).not.toThrow();
    });
});
