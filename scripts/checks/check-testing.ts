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
});
