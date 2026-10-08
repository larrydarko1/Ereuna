/**
 * How much of everything one user may hold, and how large one request may be.
 * The request schemas cap their arrays and numbers with these, the services
 * refuse a write that would cross one, and the API's config hands them on as
 * `config.limits` — one definition, so the 422 a schema answers and the 409 a
 * service answers can never disagree on where the line is.
 */
export const LIMITS = {
    screenersPerUser: 20,
    watchlistsPerUser: 30,
    tickersPerWatchlist: 500,
    notesPerSymbol: 200,
    portfolioSlots: 10,
    benchmarksPerPortfolio: 5,
    maxLeverage: 10,
    maxCommission: 100_000,
    tradesPerPortfolio: 1000,
    positionsPerPortfolio: 500,
    drawingsPerKind: 1000,
    indicatorsPerChart: 12,
    maxIndicatorPeriod: 400,
    importRows: 5000,
    symbolsPerRequest: 50,
} as const;
