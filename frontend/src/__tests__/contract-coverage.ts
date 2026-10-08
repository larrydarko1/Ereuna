/**
 * Global setup: a full run with coverage fails when a route of the API contract
 * was never answered with a success by the mocked API, so a page or wrapper
 * calling it was never held to its schemas (see contract-coverage.ts in
 * @ereuna/shared). The mock server (`support/msw.ts`) records each route it checks.
 */
import type { TestProject } from 'vitest/node';

import type { ApiRoute } from '@ereuna/shared';
import { openCoverageLog, uncheckedRoutes } from '@ereuna/shared/contract-coverage';

/** Routes the frontend never calls through `call()`, and who does. */
const NOT_CALLED_BY_THE_UI: Partial<Record<ApiRoute, string>> = {
    'GET /api/logos/:exchange/:file': 'the browser loads it from an <img src>; the API route tests check it',
};

export function setup(project: TestProject): (() => void) | undefined {
    const { coverage, watch } = project.vitest.config;
    if (!coverage.enabled || watch) return undefined;
    const dir = openCoverageLog();
    project.provide('contractCoverageDir', dir);
    return () => {
        const missing = uncheckedRoutes(dir, NOT_CALLED_BY_THE_UI);
        if (missing.length === 0) return;
        throw new Error(
            `No frontend test got a success from ${missing.length} route(s), so the code calling them was never checked:\n${missing.join('\n')}`,
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
