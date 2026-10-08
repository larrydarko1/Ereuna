/**
 * Path-parameter schemas: what a route takes in its `:param` segments. The
 * contract names one per route, the router validates with that same schema,
 * and the fuzz document describes it (openapi.ts), so the three read one rule.
 */
import { z } from 'zod';

import { mongoId, portfolioNumberField, resourceNameField, symbolField } from '#requests/fields.js';
import { DATE_FILTERS, ENUM_FILTERS, FLAG_FILTERS, MA_FILTERS, RANGE_FILTERS } from '#screener/filters.js';

export const idParam = z.object({ id: mongoId('id') });
export const symbolParam = z.object({ symbol: symbolField });

/** A screener or a watchlist, addressed by the name the user gave it. */
export const nameParam = z.object({ name: resourceNameField });

/** /portfolios/:number */
export const portfolioParam = z.object({ number: portfolioNumberField });

/**
 * /logos/:exchange/:file. Both segments are allow-listed rather than escaped:
 * neither pattern can express a separator or a dot segment, so no path can
 * leave the logo root. The colon is in the symbol set because the crypto pairs
 * use it (`XAUT:USD`).
 */
export const logoParams = z.object({
    exchange: z.string().regex(/^[A-Z]{2,10}$/),
    file: z.string().regex(/^[A-Z0-9][A-Z0-9.:-]{0,14}\.svg$/),
});

/** Every key the screener registry holds, whatever its kind. */
const FILTER_KEYS = [...RANGE_FILTERS, ...ENUM_FILTERS, ...DATE_FILTERS, ...MA_FILTERS, ...FLAG_FILTERS].map(
    (spec) => spec.key,
);

/** /portfolios/:number/trades/:id */
export const tradeParams = portfolioParam.extend(idParam.shape);

/** /watchlists/:name/tickers/:symbol */
export const tickerParams = nameParam.extend(symbolParam.shape);

/** /screeners/:name/filters/:filter — a key the screener registry holds. */
export const filterParams = nameParam.extend({ filter: z.enum(FILTER_KEYS, 'Unknown screener filter') });
