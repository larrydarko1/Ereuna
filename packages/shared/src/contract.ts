/**
 * The API contract: every route the API serves under /api, with the schemas its
 * request and its answer are held to. The routers validate and answer through
 * the same schema objects, so this table is the one place that says, for each
 * route, what a client may send and what it gets back.
 *
 * Who reads it:
 *  - The frontend's one caller, `call()`, types each request's path parameters,
 *    body, query and answer from its key.
 *  - The frontend's mock server checks every mocked exchange against it: a
 *    suite that mocks a route the API does not serve, sends a body or query the
 *    API would refuse, or answers with a body the API never sends, fails.
 *  - The API's route tests check every answer a router gives against it, so an
 *    entry that names the wrong schema fails there.
 *  - The api-standards gate checks its keys against the routers' declarations,
 *    both ways, and each route's path parameters, body, query and answer against
 *    its entry, so a router cannot validate or answer with another schema.
 *  - The fuzz document (openapi.ts) is built from it, path parameters included.
 *
 * Both sides are strict: a key the schema does not declare is a problem, in a
 * request (the API refuses it with a 422) and in an answer (the API reports it
 * as a bug). Every refusal, on any route, is held to `errorBodySchema`: a code
 * from `ERROR_CODES`, never data. The checks themselves are in contract-check.ts.
 */
import { z } from 'zod';

import { drawingsBody, eventsQuery, searchQuery, seriesQuery, timeframeQuery } from '#requests/chart.js';
import type { QueryParams } from '#requests/fields.js';
import {
    changePasswordBody,
    changeUsernameBody,
    confirmPasswordBody,
    disableTotpBody,
    loginBody,
    newPasswordBody,
    recoverBody,
    registerBody,
    totpCodeBody,
    twoFactorBody,
    updatePreferencesBody,
} from '#requests/identity.js';
import { createNoteBody, notesQuery, updateNoteBody } from '#requests/note.js';
import {
    filterParams,
    idParam,
    logoParams,
    nameParam,
    portfolioParam,
    symbolParam,
    tickerParams,
    tradeParams,
} from '#requests/params.js';
import {
    baseValueBody,
    benchmarksBody,
    commissionBody,
    importBody,
    leverageBody,
    tradeBody,
    tradesQuery,
} from '#requests/portfolio.js';
import { createScreenerBody, filterBody, screenerResultsQuery, updateScreenerBody } from '#requests/screener.js';
import { addTickerBody, tickerOrderBody, watchlistNameBody, watchlistOrderBody } from '#requests/watchlist.js';
import { assetProfileSchema, assetSearchSchema, chartEventsSchema, financialsSchema } from '#responses/asset.js';
import { chartDrawingsSchema, chartSeriesSchema } from '#responses/chart.js';
import {
    accessTokenSchema,
    authSessionSchema,
    hiddenSymbolsSchema,
    preferencesSchema,
    recoveryCodeCountSchema,
    recoveryCodesSchema,
    sessionUserSchema,
    totpEnrolmentSchema,
    twoFactorChallengeSchema,
} from '#responses/identity.js';
import { holidayCalendarSchema, marketOverviewSchema } from '#responses/market.js';
import { notePageSchema, noteRowSchema } from '#responses/notes.js';
import {
    baseValueSchema,
    benchmarksSchema,
    defaultCommissionSchema,
    importResultSchema,
    leverageSchema,
    portfolioExportSchema,
    portfolioListSchema,
    portfolioSummarySchema,
    tradePageSchema,
    tradeRowSchema,
} from '#responses/portfolio.js';
import {
    filterCatalogueSchema,
    screenerDetailSchema,
    screenerFilterSetSchema,
    screenerListSchema,
    screenerResultPageSchema,
    screenerSummarySchema,
} from '#responses/screener.js';
import {
    watchlistDetailSchema,
    watchlistEntriesSchema,
    watchlistListSchema,
    watchlistSummarySchema,
} from '#responses/watchlist.js';

export type Endpoint = {
    /** What a success carries: a schema for JSON, `null` for no body (204), `'raw'` for bytes — a file. */
    response: z.ZodType | null | 'raw';
    /** The JSON body. Left out, the route takes no body. */
    body?: z.ZodType;
    /** The query string. Left out, the route takes none. */
    query?: z.ZodType;
    /** The path parameters, one key per `:param` in the route. Left out, the path has none. */
    params?: z.ZodObject;
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiRoute = keyof typeof API_ROUTES;

type EndpointOf<TRoute extends ApiRoute> = (typeof API_ROUTES)[TRoute];

/** What a success on the route carries: its parsed JSON, `undefined` for no body, a `Blob` for a file. */
export type AnswerOf<TRoute extends ApiRoute> = EndpointOf<TRoute>['response'] extends z.ZodType
    ? z.output<EndpointOf<TRoute>['response']>
    : EndpointOf<TRoute>['response'] extends 'raw'
      ? Blob
      : undefined;

/** What the route takes as a body, or `undefined` for none. */
export type BodyOf<TRoute extends ApiRoute> =
    EndpointOf<TRoute> extends { body: infer TBody extends z.ZodType } ? z.input<TBody> : undefined;

/** What the route takes in its query string, or `undefined` for none. */
export type QueryOf<TRoute extends ApiRoute> =
    EndpointOf<TRoute> extends { query: infer TQuery extends z.ZodType } ? QueryParams<TQuery> : undefined;

type PathOf<TRoute extends string> = TRoute extends `${string} ${infer TPath}` ? TPath : never;

type ParamsIn<TPath extends string> = TPath extends `${infer THead}/${infer TTail}`
    ? ParamsIn<THead> | ParamsIn<TTail>
    : TPath extends `:${infer TName}`
      ? TName
      : never;

/**
 * The route's path parameters by name: `{ symbol: string }` for
 * `/charts/:symbol`. A portfolio slot is a number in the caller's hands and a
 * path segment on the wire, so either is taken.
 */
export type ParamsOf<TRoute extends ApiRoute> = Record<ParamsIn<PathOf<TRoute>>, string | number>;

/** Keyed `METHOD /api/path` with the routers' own `:param` names, in the order the routers declare them. */
export const API_ROUTES = {
    'POST /api/auth/register': { body: registerBody, response: authSessionSchema },
    'POST /api/auth/login': { body: loginBody, response: z.union([twoFactorChallengeSchema, authSessionSchema]) },
    'POST /api/auth/2fa/validate': { body: twoFactorBody, response: authSessionSchema },
    'POST /api/auth/recover': { body: recoverBody, response: authSessionSchema },
    // The refresh token is the httpOnly cookie, never a body.
    'POST /api/auth/refresh': { response: accessTokenSchema },
    'POST /api/auth/logout': { response: null },

    'GET /api/account': { response: sessionUserSchema },
    'PATCH /api/account/password': { body: changePasswordBody, response: null },
    'PATCH /api/account/username': { body: changeUsernameBody, response: sessionUserSchema },
    'DELETE /api/account': { body: confirmPasswordBody, response: null },
    'POST /api/account/2fa': { response: totpEnrolmentSchema },
    'POST /api/account/2fa/confirm': { body: totpCodeBody, response: recoveryCodesSchema },
    'DELETE /api/account/2fa': { body: disableTotpBody, response: null },
    'POST /api/account/recovery-codes': { body: confirmPasswordBody, response: recoveryCodesSchema },
    'GET /api/account/recovery-codes': { response: recoveryCodeCountSchema },
    'POST /api/account/recovery-password': { body: newPasswordBody, response: null },

    'GET /api/preferences': { response: preferencesSchema },
    'PATCH /api/preferences': { body: updatePreferencesBody, response: preferencesSchema },
    'POST /api/preferences/hidden/:symbol': { params: symbolParam, response: hiddenSymbolsSchema },
    'DELETE /api/preferences/hidden/:symbol': { params: symbolParam, response: hiddenSymbolsSchema },

    'GET /api/screeners': { response: screenerListSchema },
    'POST /api/screeners': { body: createScreenerBody, response: screenerSummarySchema },
    'GET /api/screeners/filters': { response: filterCatalogueSchema },
    'GET /api/screeners/results': { query: screenerResultsQuery, response: screenerResultPageSchema },
    'GET /api/screeners/hidden/results': { query: screenerResultsQuery, response: screenerResultPageSchema },
    'GET /api/screeners/:name': { params: nameParam, response: screenerDetailSchema },
    'PATCH /api/screeners/:name': { params: nameParam, body: updateScreenerBody, response: screenerSummarySchema },
    'DELETE /api/screeners/:name': { params: nameParam, response: null },
    'GET /api/screeners/:name/results': {
        params: nameParam,
        query: screenerResultsQuery,
        response: screenerResultPageSchema,
    },
    'PUT /api/screeners/:name/filters/:filter': {
        params: filterParams,
        body: filterBody,
        response: screenerFilterSetSchema,
    },
    'DELETE /api/screeners/:name/filters/:filter': { params: filterParams, response: screenerFilterSetSchema },
    'DELETE /api/screeners/:name/filters': { params: nameParam, response: screenerFilterSetSchema },

    'GET /api/watchlists': { response: watchlistListSchema },
    'POST /api/watchlists': { body: watchlistNameBody, response: watchlistSummarySchema },
    'PUT /api/watchlists/order': { body: watchlistOrderBody, response: watchlistListSchema },
    'GET /api/watchlists/:name': { params: nameParam, response: watchlistDetailSchema },
    'PATCH /api/watchlists/:name': { params: nameParam, body: watchlistNameBody, response: watchlistSummarySchema },
    'DELETE /api/watchlists/:name': { params: nameParam, response: null },
    'PUT /api/watchlists/:name/tickers': { params: nameParam, body: tickerOrderBody, response: watchlistEntriesSchema },
    'POST /api/watchlists/:name/tickers': { params: nameParam, body: addTickerBody, response: watchlistEntriesSchema },
    'DELETE /api/watchlists/:name/tickers/:symbol': { params: tickerParams, response: watchlistEntriesSchema },

    'GET /api/portfolios': { response: portfolioListSchema },
    'GET /api/portfolios/:number': { params: portfolioParam, response: portfolioSummarySchema },
    'DELETE /api/portfolios/:number': { params: portfolioParam, response: null },
    'PUT /api/portfolios/:number/base-value': {
        params: portfolioParam,
        body: baseValueBody,
        response: baseValueSchema,
    },
    'PUT /api/portfolios/:number/leverage': { params: portfolioParam, body: leverageBody, response: leverageSchema },
    'PUT /api/portfolios/:number/commission': {
        params: portfolioParam,
        body: commissionBody,
        response: defaultCommissionSchema,
    },
    'PUT /api/portfolios/:number/benchmarks': {
        params: portfolioParam,
        body: benchmarksBody,
        response: benchmarksSchema,
    },
    'GET /api/portfolios/:number/export': { params: portfolioParam, response: portfolioExportSchema },
    'POST /api/portfolios/:number/import': { params: portfolioParam, body: importBody, response: importResultSchema },

    'GET /api/portfolios/:number/trades': { params: portfolioParam, query: tradesQuery, response: tradePageSchema },
    'POST /api/portfolios/:number/trades': { params: portfolioParam, body: tradeBody, response: tradeRowSchema },
    'PATCH /api/portfolios/:number/trades/:id': { params: tradeParams, body: tradeBody, response: tradeRowSchema },
    'DELETE /api/portfolios/:number/trades/:id': { params: tradeParams, response: null },

    'GET /api/charts/search': { query: searchQuery, response: assetSearchSchema },
    'GET /api/charts/:symbol': { params: symbolParam, query: seriesQuery, response: chartSeriesSchema },
    'GET /api/charts/:symbol/profile': { params: symbolParam, response: assetProfileSchema },
    'GET /api/charts/:symbol/events': { params: symbolParam, query: eventsQuery, response: chartEventsSchema },
    'GET /api/charts/:symbol/drawings': { params: symbolParam, query: timeframeQuery, response: chartDrawingsSchema },
    'PUT /api/charts/:symbol/drawings': {
        params: symbolParam,
        query: timeframeQuery,
        body: drawingsBody,
        response: chartDrawingsSchema,
    },
    'DELETE /api/charts/:symbol/drawings': { params: symbolParam, query: timeframeQuery, response: null },

    'GET /api/notes': { query: notesQuery, response: notePageSchema },
    'POST /api/notes': { body: createNoteBody, response: noteRowSchema },
    'PATCH /api/notes/:id': { params: idParam, body: updateNoteBody, response: noteRowSchema },
    'DELETE /api/notes/:id': { params: idParam, response: null },

    'GET /api/market/stats': { response: marketOverviewSchema },
    'GET /api/market/holidays': { response: holidayCalendarSchema },
    'GET /api/market/:symbol/financials': { params: symbolParam, response: financialsSchema },

    // An SVG off disk, for an <img src>, which cannot send a token.
    'GET /api/logos/:exchange/:file': { params: logoParams, response: 'raw' },
} as const satisfies Record<`${Method} /api/${string}`, Endpoint>;
