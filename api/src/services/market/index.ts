/**
 * market — the public market-data reads, none of which carry identity.
 * Four modules, one dataset each: reference data for an asset, candles, the
 * dashboard's aggregates, and live quotes. All of them read collections the
 * worker writes; none of them writes anything.
 */
export * from '@/services/market/market-assets.js';
export * from '@/services/market/market-bars.js';
export * from '@/services/market/market-overview.js';
export * from '@/services/market/market-quotes.js';
