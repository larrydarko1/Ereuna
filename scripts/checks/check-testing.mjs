#!/usr/bin/env node
/**
 * Testing standards gate.
 *   1. PLACEMENT. The standard offers two patterns and says to pick one and
 *      stay consistent. This repo picked co-located `__tests__/`, and
 *      consistency is the whole value — a suite in the other pattern isn't
 *      wrong so much as unfindable. The count in the message is read off the
 *      tree, so it cannot go stale the way a number written here would.
 *   2. E2E SEPARATION. Playwright specs belong in `e2e/` with their own config,
 *      away from the unit suites. They boot real services; a `.spec.ts` that
 *      drifts into `src/` gets picked up by no runner at all and silently stops
 *      running. The config is demanded only once a spec exists: this repo has
 *      no e2e suite yet, and a gate that fails for something nobody has written
 *      teaches people to switch gates off.
 *   3. THE COVERAGE CONFIG, RATCHETED. Two numbers-only rules, both quoted
 *      straight from the standard: thresholds may rise and never fall ("ratchet
 *      upward as coverage climbs — never lower it"), and the exclude list may
 *      not grow ("files never imported by any test show as 0% — that's the
 *      signal to write the missing test, not to add another exclude"). Without
 *      this, the cheapest way to make a coverage failure go away is to edit the
 *      number that defines failure.
 *   4. NOTHING AT 0%. The aggregate hides individual files: at 86% statements,
 *      a whole untested module is a rounding error. Reads the coverage report
 *      when one is present.
 *   5. HTTP MOCKED AT THE NETWORK, NOT BY PATCHING. MSW is the standard's
 *      choice precisely so tests survive swapping axios for fetch. Patching
 *      either directly is the thing it exists to replace.
 *   6. REACHING INTO COMPONENT INTERNALS, AS A RATCHET. "Test behaviour, not
 *      implementation." `wrapper.vm.someRef` is the mechanical form of the
 *      violation — but it is also a legitimate escape hatch often enough that a
 *      ban would be wrong. So it is counted, not forbidden: currently zero, and
 *      the number may only be raised deliberately, in this file, with a reason.
 *   7. THE DOM ENVIRONMENT. One word in a config file, and the repo disagreed
 *      with the standard on it for as long as nobody read both on the same day.
 * TWO SECTIONS ARE CONDITIONAL, and say so in the output rather than passing
 * quietly: 4 needs `coverage/coverage-summary.json`, which only exists after a
 * `--coverage` run. In CI the gate is ordered after it. Locally, `npm run
 * test:check` straight after `npm test` will skip that section, and the summary
 * line names what it skipped so a green tick never overstates itself.
 * NOT CHECKED, deliberately:
 *   - Whether a test is any good. Section 4 catches a file with no test at all;
 *     nothing here can tell a thorough suite from one that executes every line
 *     and asserts almost nothing. `vitest/expect-expect` catches only the
 *     degenerate case of zero assertions.
 *   - The priority order (security → utilities → services → composables →
 *     components). It describes what to write NEXT, which is a property of a
 *     backlog, not of the tree.
 *   - Accessibility assertions in the E2E suite. The axe scan is a test, and
 *     tests are checked by running them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT as ROOT } from '../lib/repo-root.mjs';

const VITEST_CONFIG = 'vitest.config.mts';
const COVERAGE_SUMMARY = 'coverage/coverage-summary.json';
const PLAYWRIGHT_CONFIG = 'e2e/playwright.config.ts';

/**
 * The floors as they stand. Raise them as coverage climbs; the gate fails if
 * the config drops below one, which is the only direction that needs guarding.
 * These are NOT the target — the standard's target is 100%.
 */
const MIN_THRESHOLDS = { statements: 80, branches: 80, functions: 80, lines: 80 };

/**
 * Every path the coverage config is allowed to exclude, with the reason it is
 * not a coverage gap. A new entry here is a deliberate decision that something
 * will never be unit-tested — which the standard says should almost always be a
 * missing test instead, so it is made once, in writing, rather than by editing
 * a list in a config file.
 */
const ALLOWED_EXCLUDES = new Map([
    ['**/__tests__/**', 'the tests themselves'],
    ['**/*.test.ts', 'the tests themselves'],
    ['**/*.d.ts', 'declarations, no runtime'],
    [
        'frontend/src/lib/lightweight-charts/**',
        'the vendored charting fork — 208 files of upstream code held frozen, which every other gate skips for the same reason. Testing it would be testing a dependency, and at 10k statements it would also dominate the coverage denominator.',
    ],
]);

/**
 * Tests reaching into a component's internals instead of its rendered output.
 * Zero today. If a case genuinely warrants it, raise this WITH the reason —
 * the point of a number rather than a ban is that the exception gets argued.
 */
const VM_ACCESS_BASELINE = 0;

const failures = [];
const fail = (file, what, why) => failures.push({ file, what, why });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const repoFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    encoding: 'utf8',
})
    .split('\n')
    .filter(Boolean);

const unitTests = repoFiles.filter((f) => /\.test\.ts$/.test(f));
const e2eSpecs = repoFiles.filter((f) => /\.spec\.ts$/.test(f));

// ── 1. Placement: co-located __tests__/, consistently ───────────────────────
for (const rel of unitTests) {
    if (!rel.includes('/__tests__/')) {
        fail(
            rel,
            'a .test.ts outside a `__tests__/` directory',
            `This project uses the co-located \`__tests__/\` pattern — all ${unitTests.length - 1} other suites are in one. The standard allows either pattern but not both: half a convention is worse than either half, because now nobody knows where to look for a file that might not exist.`,
        );
    }
}

// ── 2. E2E stays separate, with its own config ──────────────────────────────
// Demanded by the specs, not unconditionally: there is no e2e suite here yet,
// and a config demanded for tests nobody has written is noise.
if (e2eSpecs.length > 0 && !exists(PLAYWRIGHT_CONFIG)) {
    fail(
        PLAYWRIGHT_CONFIG,
        'missing',
        'E2E tests get their own Playwright config at the project root, separate from the Vitest projects.',
    );
}
for (const rel of e2eSpecs) {
    if (!rel.startsWith('e2e/')) {
        fail(
            rel,
            'a .spec.ts outside `e2e/`',
            'Playwright specs live in `e2e/`. Anywhere else, no runner picks the file up: Vitest matches `*.test.ts`, Playwright only looks under its own testDir — so the suite silently stops running while still looking like a test.',
        );
    }
}

// ── 3. The coverage config, ratcheted ───────────────────────────────────────
const configSrc = read(VITEST_CONFIG);

const thresholdBlock = /thresholds:\s*\{([^}]*)\}/.exec(configSrc);
if (thresholdBlock === null) {
    fail(
        VITEST_CONFIG,
        'no `thresholds` block found in the coverage config',
        'Either it was removed — in which case coverage no longer fails anything — or it was reshaped and this gate can no longer read it. Both need a human.',
    );
} else {
    for (const [metric, floor] of Object.entries(MIN_THRESHOLDS)) {
        const m = new RegExp(`${metric}:\\s*(\\d+)`).exec(thresholdBlock[1]);
        if (m === null) {
            fail(VITEST_CONFIG, `no \`${metric}\` threshold`, 'All four metrics carry a floor; branches is the honest one.');
        } else if (Number(m[1]) < floor) {
            fail(
                VITEST_CONFIG,
                `\`${metric}\` threshold lowered to ${m[1]} (floor is ${floor})`,
                'Coverage ratchets one way. Lowering the number does not fix the gap, it deletes the record of it — write the test, then raise MIN_THRESHOLDS here to match.',
            );
        }
    }
}

const excludeBlock = /exclude:\s*\[([\s\S]*?)\]/.exec(configSrc);
if (excludeBlock === null) {
    fail(VITEST_CONFIG, 'no coverage `exclude` list found', 'This gate can no longer tell whether the list has grown.');
} else {
    const listed = [...excludeBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    for (const entry of listed) {
        if (!ALLOWED_EXCLUDES.has(entry)) {
            fail(
                VITEST_CONFIG,
                `new coverage exclude \`${entry}\``,
                'A file at 0% is the signal to write the missing test, not to add another exclude. If this one genuinely has no runtime to cover, add it to ALLOWED_EXCLUDES in this gate with the reason — one sentence, written once, instead of a list nobody reviews.',
            );
        }
    }
    for (const [entry] of ALLOWED_EXCLUDES) {
        if (!listed.includes(entry)) {
            fail(
                VITEST_CONFIG,
                `\`${entry}\` is no longer excluded from coverage`,
                'Good news, probably — remove it from ALLOWED_EXCLUDES in this gate so the two lists stay in step.',
            );
        }
    }
}

// ── 4. Nothing at 0% (needs a coverage report) ──────────────────────────────
let measured = 0;
let uncovered = 0;
const haveCoverage = exists(COVERAGE_SUMMARY);

if (haveCoverage) {
    const summary = JSON.parse(read(COVERAGE_SUMMARY));
    for (const [key, entry] of Object.entries(summary)) {
        if (key === 'total') continue;
        const rel = key.startsWith(ROOT) ? path.relative(ROOT, key) : key;
        measured++;
        if (entry.statements.total === 0) continue;
        if (entry.statements.covered === 0) {
            uncovered++;
            fail(
                rel,
                `0% of ${entry.statements.total} statement(s) covered — no test imports this file`,
                'The aggregate hides this: one untested module inside a passing total is a rounding error. Write the suite, or if the file genuinely has no testable runtime, say so in ALLOWED_EXCLUDES here rather than leaving it at zero.',
            );
        }
    }
}

// ── 5. HTTP mocked at the network, not by patching ──────────────────────────
const PATCHED_HTTP = /vi\.mock\(\s*['"](axios|node-fetch|cross-fetch)['"]|(?:global|globalThis)\.fetch\s*=|stubGlobal\(\s*['"]fetch['"]/;
for (const rel of unitTests.filter((f) => f.startsWith('frontend/'))) {
    const src = read(rel);
    if (PATCHED_HTTP.test(src)) {
        fail(
            rel,
            'patches axios or fetch directly',
            'Use MSW. It intercepts at the network level, so the test keeps passing when the client swaps axios for fetch or gains an interceptor — which is the entire reason the standard names it. Patching the transport couples the test to the implementation it is supposed to be independent of.',
        );
    }
}

// ── 6. Reaching into component internals, ratcheted ─────────────────────────
const vmHits = [];
for (const rel of unitTests.filter((f) => f.startsWith('frontend/'))) {
    read(rel)
        .split('\n')
        .forEach((line, i) => {
            if (/\.vm\.[a-zA-Z_][a-zA-Z0-9_]*/.test(line)) vmHits.push(`${rel}:${i + 1}`);
        });
}
if (vmHits.length > VM_ACCESS_BASELINE) {
    for (const site of vmHits.slice(VM_ACCESS_BASELINE)) {
        fail(
            site,
            'reads a component\'s internals through `wrapper.vm`',
            'Assert what the component DOES — what renders, what event fires, what the user sees. A test bound to internal state breaks on every refactor without catching a single real bug. If this case genuinely warrants it, raise VM_ACCESS_BASELINE in this gate with the reason.',
        );
    }
} else if (vmHits.length < VM_ACCESS_BASELINE) {
    fail(
        VITEST_CONFIG,
        `VM_ACCESS_BASELINE is ${VM_ACCESS_BASELINE} but only ${vmHits.length} site(s) remain`,
        'Lower it so the ratchet cannot slip back.',
    );
}

// ── 7. The DOM environment named by the standard ────────────────────────────
const DOM_ENVIRONMENT = 'jsdom';
const FRONTEND_VITEST_CONFIG = 'frontend/vitest.config.ts';

const frontendEnv = /name:\s*'frontend',[\s\S]{0,200}?environment:\s*'([\w-]+)'/.exec(read(FRONTEND_VITEST_CONFIG));
if (frontendEnv === null) {
    fail(FRONTEND_VITEST_CONFIG, 'could not read the frontend project environment', 'This gate can no longer tell which DOM implementation the suite runs on.');
} else if (frontendEnv[1] !== DOM_ENVIRONMENT) {
    fail(
        FRONTEND_VITEST_CONFIG,
        `frontend tests run on \`${frontendEnv[1]}\`, but the standard names \`${DOM_ENVIRONMENT}\``,
        `Switch it back, or change the standard and DOM_ENVIRONMENT here together. They are one decision — the last time they disagreed, the repo won silently for as long as nobody read both files on the same day.`,
    );
}

for (const rel of unitTests) {
    const m = /@vitest-environment\s+([\w-]+)/.exec(read(rel));
    if (m !== null && m[1] !== DOM_ENVIRONMENT) {
        fail(
            rel,
            `pins itself to \`${m[1]}\` with an @vitest-environment pragma`,
            `The project config chooses the environment for every suite. A pragma that disagrees with it is a per-file override nobody reviewing ${VITEST_CONFIG} would ever see.`,
        );
    }
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
    console.error(`\n✖ ${failures.length} testing standards violation(s):\n`);
    for (const { file, what, why } of failures) {
        console.error(`  ${file}: ${what}`);
        console.error(`    → ${why}\n`);
    }
    console.error('See testing.instructions.md, then re-run.');
    process.exit(1);
}

console.log(
    `✓ Testing OK — ${unitTests.length} unit suite(s) all co-located in \`__tests__/\`, ${
        e2eSpecs.length === 0
            ? 'no Playwright spec yet'
            : `${e2eSpecs.length} Playwright spec(s) all under e2e/ with their own config`
    }, coverage thresholds at or above the ${MIN_THRESHOLDS.statements}% floor, ${ALLOWED_EXCLUDES.size} coverage exclude(s) all accounted for, no HTTP patched around MSW, no test reading component internals, all on ${DOM_ENVIRONMENT}.`,
);
console.log(
    haveCoverage
        ? `  Coverage report: ${measured} file(s) measured, ${uncovered} with no test at all.`
        : `  Coverage report: not present — the 0%-file check was SKIPPED. Run \`npm run test:coverage\` first to include it.`,
);
console.log(
    '\nNot machine-checked: whether a passing test asserts anything worth asserting, whether the next test to write is the highest-priority one, whether a component test would survive a refactor.',
);
