/**
 * useLivePrices — a result page with its price and today's change ticking as
 * the session trades.
 * The API priced the page from the latest quote when it was read; this keeps
 * those two cells moving after that, over the quote feed the watchlist uses.
 * Every other figure is the nightly run's and stays as read. A page is 100
 * rows, which is what one quote subscription holds.
 */
import { computed, type ComputedRef } from 'vue';

import type { LiveQuote, ScreenerResult } from '@ereuna/shared';

import { useLiveQuotes } from '@/composables/data/useLiveQuotes';

export type UseLivePricesReturn = {
    items: ComputedRef<ScreenerResult[]>;
};

const PRICE_COLUMN = 'TimeSeries.close';
const CHANGE_COLUMN = 'todaychange';

export function useLivePrices(items: () => readonly ScreenerResult[], enabled: () => boolean): UseLivePricesReturn {
    const { quotes } = useLiveQuotes(
        () => items().map((item) => item.symbol),
        () => enabled() && items().length > 0,
    );

    return { items: computed(() => items().map((item) => withLiveQuote(item, quotes.value[item.symbol]))) };
}

/** The change goes in as the fraction the nightly run stores, so the column reads one unit whichever filled it. */
function withLiveQuote(item: ScreenerResult, quote: Readonly<LiveQuote> | undefined): ScreenerResult {
    if (quote === undefined) return item;

    const columns = { ...item.columns };
    if (PRICE_COLUMN in columns) columns[PRICE_COLUMN] = quote.price;
    if (CHANGE_COLUMN in columns) {
        columns[CHANGE_COLUMN] = quote.changePercent === null ? null : quote.changePercent / 100;
    }
    return { ...item, columns };
}
