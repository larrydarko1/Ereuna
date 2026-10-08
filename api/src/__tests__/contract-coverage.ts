/**
 * Global setup: a full run with coverage fails when a route of the API contract
 * was never answered with a success by a route test, so never held to its
 * schemas (see contract-coverage.ts in @ereuna/shared). the route
 * harness (`__tests__/support/http.ts`) records each route it checks.
 */
import type { TestProject } from 'vitest/node';

import { openCoverageLog, uncheckedRoutes } from '@ereuna/shared/contract-coverage';

export function setup(project: TestProject): (() => void) | undefined {
    const { coverage, watch } = project.vitest.config;
    if (!coverage.enabled || watch) return undefined;
    const dir = openCoverageLog();
    project.provide('contractCoverageDir', dir);
    return () => {
        const missing = uncheckedRoutes(dir);
        if (missing.length === 0) return;
        throw new Error(
            `No route test got a success from ${missing.length} route(s), so their schemas were never checked:\n${missing.join('\n')}`,
        );
    };
}

declare module 'vitest' {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- vitest declares this as an interface; only an interface merges
    interface ProvidedContext {
        /** The run's coverage log; unset when the run is not measuring coverage. */
        contractCoverageDir?: string;
    }
}
