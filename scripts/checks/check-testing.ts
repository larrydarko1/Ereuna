#!/usr/bin/env node
/**
 * Testing standards gate. The rules live in @larrydarko/lint-config/gates/testing;
 * what stays here is this repo's answers, and every one of them is a decision
 * somebody made rather than a default.
 *
 * `layout: colocated` — the standard offers two patterns and says to pick one and
 * stay consistent. This repo picked co-located `__tests__/`, and consistency is the
 * whole value: a suite in the other pattern is not wrong so much as unfindable.
 *
 * `e2e` — Playwright specs live in `e2e/` with their own config, away from the unit
 * suites. They boot the real API and frontend, and a `.spec.ts` that drifts into
 * `src/` is picked up by no runner at all: Vitest matches `*.test.ts`, Playwright
 * only looks under its own testDir, so the suite silently stops running while still
 * looking like a test.
 *
 * `thresholds` and `excludes` are the two numbers-only rules: thresholds may rise
 * and never fall, and the exclude list may not grow — a file at 0% is the signal to
 * write the missing test, not to add another exclude. Without them the cheapest way
 * to make a coverage failure go away is to edit the number that defines failure.
 *
 * `domEnvironment` names the frontend Vitest project, because this config has one
 * project per workspace and only the frontend one runs in a DOM.
 *
 * `vmBaseline: 0` — "test behaviour, not implementation". `wrapper.vm.someRef` is
 * the mechanical form of the violation, but it is a legitimate escape hatch often
 * enough that a ban would be wrong, so it is counted rather than forbidden. Zero
 * today; raise it deliberately, here, with the reason.
 *
 * `serverErrors` — a test that checks what it came to check walks past a 500 on
 * the side. The fixtures fail the test that received a 5xx, with what the API
 * logged for that request id; the global teardown fails the run on any error the
 * API logged at all, a field `send()` refused to put on the wire included. The
 * gate checks the wiring nobody would notice coming apart: the recorder created
 * with the log file, the teardown registered, the API booted with `LOG_FILE`, and
 * every spec taking `test` from the fixtures.
 *
 * `apiClient` names the two exports every frontend request goes through to the
 * mock server: `call()` and the axios `api` instance under it. The mock server
 * checks each exchange against the API contract, so a suite replacing either
 * checks nothing. `main.test.ts` mocks the module for `initAuth` alone, which
 * the rule allows.
 */
import { checkTesting } from '@larrydarko/lint-config/gates/testing';

checkTesting({
    config: 'vitest.config.mts',
    layout: { kind: 'colocated' },
    e2e: { dir: 'e2e', config: 'e2e/playwright.config.ts' },
    thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    excludes: {
        '**/__tests__/**': 'the tests themselves',
        '**/*.test.ts': 'the tests themselves',
        '**/*.d.ts': 'declarations, no runtime',
    },
    domEnvironment: { name: 'jsdom', config: 'frontend/vitest.config.ts', project: 'frontend' },
    vmBaseline: 0,
    serverErrors: { fixtures: 'e2e/support/fixtures.ts', teardown: 'e2e/support/global-teardown.ts' },
    apiClient: { module: '@/api/client', exports: ['call', 'api'] },
});
