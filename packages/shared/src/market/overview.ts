/** The market overview's two fixed vocabularies — the shape itself is `responses/market.ts`. */

/** The universe a breadth figure was measured over. `all` is every asset. */
export type BreadthUniverse = (typeof BREADTH_UNIVERSES)[number];

export type OutlookTerm = (typeof OUTLOOK_TERMS)[number];

export const BREADTH_UNIVERSES = ['all', 'stock', 'etf', 'fund', 'otc', 'pink', 'crypto'] as const;

/** The three horizons the outlook is reported over, shortest first. */
export const OUTLOOK_TERMS = ['short', 'mid', 'long'] as const;
