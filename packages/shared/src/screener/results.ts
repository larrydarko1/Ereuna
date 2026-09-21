/**
 * The screener contract — the shapes `/api/screeners` answers with, beside the
 * filter registry in `filters.ts`. Timestamps are ISO 8601 strings.
 */

export type ScreenerSummary = {
    id: string;
    name: string;
    include: boolean; // Whether it contributes to the combined results
    filterCount: number;
    updatedAt: string;
};

/** One matching asset, projected through the user's chosen columns — hence the open index. */
export type ScreenerResult = {
    symbol: string;
    name: string | null;
    assetType: string | null;
    sector: string | null;
    exchange: string | null;
    screeners?: string[]; // Combined results only: the included screeners this symbol matched
    [column: string]: unknown;
};

export type ScreenerResultPage = {
    items: ScreenerResult[];
    total: number;
    page: number;
    pages: number;
};
