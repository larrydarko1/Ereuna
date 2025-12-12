// Utility functions for dividend calculation

export interface DividendPayment {
    payment_date: string;
    amount: number;
}

export interface AssetDividends {
    Symbol: string;
    dividends: DividendPayment[];
}

export interface DividendTransaction {
    Date: string;
    Symbol: string;
    Action: 'Dividend';
    Shares: number;
    Price: number; // dividend per share
    Total: number; // total dividend amount received
    Username: string;
    PortfolioNumber: number;
    Timestamp: string;
}

/**
 * Fetch dividend data for a list of symbols from AssetInfo collection
 */
export async function fetchDividendsForSymbols(
    db: any,
    symbols: string[]
): Promise<Map<string, DividendPayment[]>> {
    if (!symbols.length) return new Map();

    const assetInfoCollection = db.collection('AssetInfo');
    const assets = await assetInfoCollection.find(
        { Symbol: { $in: symbols }, dividends: { $exists: true, $ne: [] } },
        { projection: { Symbol: 1, dividends: 1 } }
    ).toArray();

    const dividendMap = new Map<string, DividendPayment[]>();

    for (const asset of assets) {
        if (asset.dividends && Array.isArray(asset.dividends) && asset.dividends.length > 0) {
            // Filter and validate dividend data
            const validDividends = asset.dividends
                .filter((div: any) =>
                    div.payment_date &&
                    typeof div.amount === 'number' &&
                    div.amount > 0
                )
                .map((div: any) => ({
                    payment_date: new Date(div.payment_date).toISOString(),
                    amount: Number(div.amount)
                }))
                .sort((a: DividendPayment, b: DividendPayment) =>
                    new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
                );

            if (validDividends.length > 0) {
                dividendMap.set(asset.Symbol, validDividends);
            }
        }
    }

    return dividendMap;
}

/**
 * Calculate dividend transactions for a portfolio based on holdings history
 * This integrates with the portfolio replay logic to inject dividends at the appropriate times
 */
export async function calculateDividendTransactions(
    db: any,
    username: string,
    portfolioNumber: number,
    trades: any[]
): Promise<DividendTransaction[]> {
    // Get all unique symbols from trades
    const symbols = [...new Set(trades
        .filter(tx => tx.Symbol)
        .map(tx => tx.Symbol))];

    if (!symbols.length) return [];

    // Fetch dividend data for all symbols
    const dividendMap = await fetchDividendsForSymbols(db, symbols);

    if (dividendMap.size === 0) return [];

    // Sort trades by date and timestamp
    const sortedTrades = [...trades].sort((a, b) => {
        const dateCompare = new Date(a.Date).getTime() - new Date(b.Date).getTime();
        if (dateCompare === 0 && a.Timestamp && b.Timestamp) {
            return new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime();
        }
        return dateCompare;
    });

    // Build holdings history (replay portfolio to know shares held at each point in time)
    const holdingsHistory: { [symbol: string]: number } = {};
    const dividendTransactions: DividendTransaction[] = [];

    // Get earliest and latest trade dates for filtering dividends
    const earliestTradeDate = new Date(sortedTrades[0].Date);
    const latestTradeDate = new Date(sortedTrades[sortedTrades.length - 1].Date);

    // For each symbol with dividends, check if we held shares during payment dates
    for (const [symbol, dividends] of dividendMap.entries()) {
        // Track holdings for this symbol over time
        let currentHoldings = 0;
        let tradeIndex = 0;

        // Process each dividend payment for this symbol
        for (const dividend of dividends) {
            const paymentDate = new Date(dividend.payment_date);

            // Only process dividends that fall within or after our trading period
            if (paymentDate < earliestTradeDate) continue;

            // Update holdings up to the dividend payment date
            while (tradeIndex < sortedTrades.length &&
                new Date(sortedTrades[tradeIndex].Date) <= paymentDate) {
                const trade = sortedTrades[tradeIndex];

                if (trade.Symbol === symbol) {
                    if (trade.Action === 'Buy') {
                        if (trade.IsShort) {
                            // Buying to close short: add shares (reduce short position)
                            currentHoldings += trade.Shares || 0;
                        } else {
                            // Regular buy: add shares
                            currentHoldings += trade.Shares || 0;
                        }
                    } else if (trade.Action === 'Sell') {
                        if (trade.IsShort) {
                            // Short sell: subtract shares (open short position)
                            currentHoldings -= trade.Shares || 0;
                        } else {
                            // Regular sell: subtract shares
                            currentHoldings -= trade.Shares || 0;
                        }
                    }
                }
                tradeIndex++;
            }

            // If we held shares on the payment date, calculate dividend
            // Only pay dividends for long positions (positive holdings)
            if (currentHoldings > 0) {
                const totalDividend = currentHoldings * dividend.amount;

                // Create dividend transaction
                const dividendTx: DividendTransaction = {
                    Date: dividend.payment_date,
                    Symbol: symbol,
                    Action: 'Dividend',
                    Shares: currentHoldings,
                    Price: dividend.amount, // dividend per share
                    Total: totalDividend,
                    Username: username,
                    PortfolioNumber: portfolioNumber,
                    Timestamp: new Date(dividend.payment_date).toISOString()
                };

                dividendTransactions.push(dividendTx);
            }

            // Reset trade index for next dividend (need to replay from start for each dividend)
            // This is inefficient but ensures accuracy - could be optimized later
        }
    }

    // Sort dividend transactions by date
    return dividendTransactions.sort((a, b) =>
        new Date(a.Date).getTime() - new Date(b.Date).getTime()
    );
}

/**
 * Merge dividend transactions with trade transactions and save to database
 */
export async function saveDividendTransactions(
    db: any,
    username: string,
    portfolioNumber: number,
    dividendTransactions: DividendTransaction[]
): Promise<void> {
    if (!dividendTransactions.length) return;

    const tradesCollection = db.collection('Trades');

    // Remove existing dividend transactions for this portfolio
    await tradesCollection.deleteMany({
        Username: username,
        PortfolioNumber: portfolioNumber,
        Action: 'Dividend'
    });

    // Insert new dividend transactions
    if (dividendTransactions.length > 0) {
        await tradesCollection.insertMany(dividendTransactions);
    }
}
