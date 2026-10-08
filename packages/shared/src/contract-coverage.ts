/**
 * Which routes of the API contract a test run actually held to it.
 *
 * The contract checks (contract-check.ts) only see the exchanges a suite makes:
 * a route no test calls is never checked, and its schemas can be wrong while
 * every test stays green. A full run with coverage records each route a suite
 * checked, then fails on the ones it never did — the same promise the line
 * thresholds make for code, made for the contract.
 *
 * Node only, and kept out of the package index: the frontend bundle imports
 * that index. Each suite's global setup opens the log and reads it back; its
 * contract hook records into it.
 */
import { appendFileSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { threadId } from 'node:worker_threads';

import { isApiRoute } from '#contract-check.js';
import { API_ROUTES, type ApiRoute } from '#contract.js';

/** What this worker has already recorded, as `dir route`: each is written once, not once per exchange. */
const recorded = new Set<string>();

/** A fresh, empty log for one run, as a directory each test worker writes its own file into. @public */
export function openCoverageLog(): string {
    return mkdtempSync(join(tmpdir(), 'contract-coverage-'));
}

/**
 * Note that this worker held a successful exchange on `route` to the contract.
 * A no-op when `dir` is undefined: the run is not measuring coverage.
 *
 * @public
 */
export function recordCheckedRoute(dir: string | undefined, route: ApiRoute): void {
    if (dir === undefined || recorded.has(`${dir} ${route}`)) return;
    recorded.add(`${dir} ${route}`);
    appendFileSync(join(dir, `${process.pid}-${threadId}.log`), `${route}\n`);
}

/**
 * Every route in the contract that no worker recorded, less the ones `exempt`
 * names with the reason the suite never calls them. Removes the log.
 *
 * @public
 */
export function uncheckedRoutes(dir: string, exempt: Partial<Record<ApiRoute, string>> = {}): ApiRoute[] {
    const checked = new Set<string>();
    for (const file of readdirSync(dir)) {
        for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) checked.add(line);
    }
    rmSync(dir, { recursive: true, force: true });
    return Object.keys(API_ROUTES)
        .filter(isApiRoute)
        .filter((route) => !checked.has(route) && exempt[route] === undefined);
}
