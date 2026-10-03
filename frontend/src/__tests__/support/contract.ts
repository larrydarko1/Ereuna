/**
 * The API's routes, each with the schema its router answers through `send()` —
 * the same schemas from `@ereuna/shared` — so a mocked answer is held to what
 * the real one can be. A suite that answers a route the API does not serve, or
 * answers with a shape no router sends, was testing the frontend against an API
 * that does not exist; `mockApi().on()` refuses both.
 *
 * `null` is a route that answers 204 with no body. The order is the routers'
 * own, so a fixed segment (`/charts/search`) is matched before a parameter
 * (`/charts/:symbol`) that would also take it.
 */
import { z } from 'zod';

import {
    accessTokenSchema,
    assetProfileSchema,
    assetSearchSchema,
    authSessionSchema,
    baseValueSchema,
    benchmarksSchema,
    chartDrawingsSchema,
    chartEventsSchema,
    chartSeriesSchema,
    defaultCommissionSchema,
    filterCatalogueSchema,
    financialsSchema,
    hiddenSymbolsSchema,
    holidayCalendarSchema,
    importResultSchema,
    isList,
    isRecord,
    leverageSchema,
    marketOverviewSchema,
    notePageSchema,
    noteRowSchema,
    portfolioExportSchema,
    portfolioListSchema,
    portfolioSummarySchema,
    preferencesSchema,
    recoveryCodeCountSchema,
    recoveryCodesSchema,
    screenerDetailSchema,
    screenerFilterSetSchema,
    screenerListSchema,
    screenerResultPageSchema,
    screenerSummarySchema,
    sessionUserSchema,
    totpEnrolmentSchema,
    tradePageSchema,
    tradeRowSchema,
    twoFactorChallengeSchema,
    watchlistDetailSchema,
    watchlistEntriesSchema,
    watchlistListSchema,
    watchlistSummarySchema,
} from '@ereuna/shared';

type Route = { route: string; schema: z.ZodType | null };

const ROUTES: readonly Route[] = [
    { route: 'POST /api/auth/register', schema: authSessionSchema },
    { route: 'POST /api/auth/login', schema: z.union([twoFactorChallengeSchema, authSessionSchema]) },
    { route: 'POST /api/auth/2fa/validate', schema: authSessionSchema },
    { route: 'POST /api/auth/recover', schema: authSessionSchema },
    { route: 'POST /api/auth/refresh', schema: accessTokenSchema },
    { route: 'POST /api/auth/logout', schema: null },

    { route: 'GET /api/account', schema: sessionUserSchema },
    { route: 'PATCH /api/account/password', schema: null },
    { route: 'PATCH /api/account/username', schema: sessionUserSchema },
    { route: 'DELETE /api/account', schema: null },
    { route: 'POST /api/account/2fa', schema: totpEnrolmentSchema },
    { route: 'POST /api/account/2fa/confirm', schema: recoveryCodesSchema },
    { route: 'DELETE /api/account/2fa', schema: null },
    { route: 'POST /api/account/recovery-codes', schema: recoveryCodesSchema },
    { route: 'GET /api/account/recovery-codes', schema: recoveryCodeCountSchema },
    { route: 'POST /api/account/recovery-password', schema: null },

    { route: 'GET /api/preferences', schema: preferencesSchema },
    { route: 'PATCH /api/preferences', schema: preferencesSchema },
    { route: 'POST /api/preferences/hidden/:symbol', schema: hiddenSymbolsSchema },
    { route: 'DELETE /api/preferences/hidden/:symbol', schema: hiddenSymbolsSchema },

    { route: 'GET /api/market/stats', schema: marketOverviewSchema },
    { route: 'GET /api/market/holidays', schema: holidayCalendarSchema },
    { route: 'GET /api/market/:symbol/financials', schema: financialsSchema },

    { route: 'GET /api/charts/search', schema: assetSearchSchema },
    { route: 'GET /api/charts/:symbol', schema: chartSeriesSchema },
    { route: 'GET /api/charts/:symbol/profile', schema: assetProfileSchema },
    { route: 'GET /api/charts/:symbol/events', schema: chartEventsSchema },
    { route: 'GET /api/charts/:symbol/drawings', schema: chartDrawingsSchema },
    { route: 'PUT /api/charts/:symbol/drawings', schema: chartDrawingsSchema },
    { route: 'DELETE /api/charts/:symbol/drawings', schema: null },

    { route: 'GET /api/notes', schema: notePageSchema },
    { route: 'POST /api/notes', schema: noteRowSchema },
    { route: 'PATCH /api/notes/:id', schema: noteRowSchema },
    { route: 'DELETE /api/notes/:id', schema: null },

    { route: 'GET /api/portfolios', schema: portfolioListSchema },
    { route: 'GET /api/portfolios/:number', schema: portfolioSummarySchema },
    { route: 'DELETE /api/portfolios/:number', schema: null },
    { route: 'PUT /api/portfolios/:number/base-value', schema: baseValueSchema },
    { route: 'PUT /api/portfolios/:number/leverage', schema: leverageSchema },
    { route: 'PUT /api/portfolios/:number/commission', schema: defaultCommissionSchema },
    { route: 'PUT /api/portfolios/:number/benchmarks', schema: benchmarksSchema },
    { route: 'GET /api/portfolios/:number/export', schema: portfolioExportSchema },
    { route: 'POST /api/portfolios/:number/import', schema: importResultSchema },
    { route: 'GET /api/portfolios/:number/trades', schema: tradePageSchema },
    { route: 'POST /api/portfolios/:number/trades', schema: tradeRowSchema },
    { route: 'PATCH /api/portfolios/:number/trades/:id', schema: tradeRowSchema },
    { route: 'DELETE /api/portfolios/:number/trades/:id', schema: null },

    { route: 'GET /api/watchlists', schema: watchlistListSchema },
    { route: 'POST /api/watchlists', schema: watchlistSummarySchema },
    { route: 'PUT /api/watchlists/order', schema: watchlistListSchema },
    { route: 'GET /api/watchlists/:name', schema: watchlistDetailSchema },
    { route: 'PATCH /api/watchlists/:name', schema: watchlistSummarySchema },
    { route: 'DELETE /api/watchlists/:name', schema: null },
    { route: 'PUT /api/watchlists/:name/tickers', schema: watchlistEntriesSchema },
    { route: 'POST /api/watchlists/:name/tickers', schema: watchlistEntriesSchema },
    { route: 'DELETE /api/watchlists/:name/tickers/:symbol', schema: watchlistEntriesSchema },

    { route: 'GET /api/screeners', schema: screenerListSchema },
    { route: 'POST /api/screeners', schema: screenerSummarySchema },
    { route: 'GET /api/screeners/filters', schema: filterCatalogueSchema },
    { route: 'GET /api/screeners/results', schema: screenerResultPageSchema },
    { route: 'GET /api/screeners/hidden/results', schema: screenerResultPageSchema },
    { route: 'GET /api/screeners/:name', schema: screenerDetailSchema },
    { route: 'PATCH /api/screeners/:name', schema: screenerSummarySchema },
    { route: 'DELETE /api/screeners/:name', schema: null },
    { route: 'GET /api/screeners/:name/results', schema: screenerResultPageSchema },
    { route: 'PUT /api/screeners/:name/filters/:filter', schema: screenerFilterSetSchema },
    { route: 'DELETE /api/screeners/:name/filters/:filter', schema: screenerFilterSetSchema },
    { route: 'DELETE /api/screeners/:name/filters', schema: screenerFilterSetSchema },
];

/**
 * Throw unless `body`, answered with `status`, is something the API could send
 * on `route` (`METHOD /api/path`, concrete or with `:params`). An error status
 * is not checked: its body carries a code, which no route's schema describes.
 */
export function assertApiAnswer(route: string, status: number, body: unknown): void {
    const match = ROUTES.find((entry) => sameRoute(entry.route, route));
    if (match === undefined) throw new Error(`${route} is not a route the API serves`);
    if (status >= 400) return;

    if (match.schema === null) {
        if (status !== 204) throw new Error(`${route} answers 204 with no body, not ${status}`);
        return;
    }

    const parsed = match.schema.safeParse(body);
    if (!parsed.success) {
        throw new Error(`${route} never answers with this body: ${z.prettifyError(parsed.error)}`);
    }
    // The schema strips what it does not declare, so a body it changed carried a field the API drops
    if (JSON.stringify(sortedKeys(parsed.data)) !== JSON.stringify(sortedKeys(body))) {
        throw new Error(`${route} answers with fields the API never sends: ${JSON.stringify(body)}`);
    }
}

/**
 * Whether `given` is a request to the `declared` route. A declared `:param`
 * takes any one segment; a `:param` the test wrote takes only a declared one,
 * so `/charts/:symbol` is never read as `/charts/search`.
 */
function sameRoute(declared: string, given: string): boolean {
    const left = declared.split(/[ /]/);
    const right = given.split('?')[0]?.split(/[ /]/) ?? [];
    if (left.length !== right.length) return false;
    return left.every((part, index) => part.startsWith(':') || part === right[index]);
}

/** The value with every object's keys in order, so two shapes compare by content alone. */
function sortedKeys(value: unknown): unknown {
    if (isList(value)) return value.map(sortedKeys);
    if (!isRecord(value)) return value;
    return Object.fromEntries(
        Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, child]) => [key, sortedKeys(child)]),
    );
}
