/** Portfolio fixtures — the summary shape every panel on the page reads. */
import type { PortfolioSummary } from '@/api/portfolio';

export function summary(over: Partial<PortfolioSummary> = {}): PortfolioSummary {
    return {
        number: 0,
        cash: 10_000,
        baseValue: 100_000,
        leverage: 2,
        defaultCommission: 1,
        positions: [],
        longValue: 90_000,
        shortValue: 0,
        grossExposure: 90_000,
        netExposure: 90_000,
        totalValue: 100_000,
        leverageUsed: 0.9,
        buyingPower: 110_000,
        unrealizedPL: 5_000,
        totalPL: 0,
        totalPLPercent: 0,
        stats: null,
        valueHistory: [],
        benchmarks: [],
        ...over,
    };
}
