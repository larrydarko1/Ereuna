// TypeScript interfaces
export interface Trade {
    Date: string;
    Symbol?: string;
    Action?: string;
    Shares?: number;
    Price?: number;
    Total?: number;
    Leverage?: number;
    IsShort?: boolean;
    Timestamp?: string;
}

import { calculateDividendTransactions } from './dividends.js';

export interface Position {
    Symbol: string;
    Shares: number;
    Price: number;
}

export interface PortfolioDoc {
    cash?: number;
    BaseValue?: number;
}

export interface ClosedPosition {
    symbol: string;
    buyDate: string;
    sellDate: string;
    buyPrice: number;
    sellPrice: number;
    shares: number;
    pnl: number;
    holdDays: number;
    isShort: boolean;
}

export interface ChartBin {
    min: number;
    max: number;
    range: string;
    count: number;
    positive: boolean;
}

export interface PortfolioStats {
    portfolioValueHistory: { date: string; value: number }[];
    realizedPL: number;
    realizedPLPercent: number;
    avgPositionSize: number;
    avgHoldTimeWinners: number;
    avgHoldTimeLosers: number;
    avgGain: number;
    avgLoss: number;
    avgGainAbs: number;
    avgLossAbs: number;
    gainLossRatio: number | null;
    riskRewardRatio: number | null;
    winnerCount: number;
    winnerPercent: number;
    loserCount: number;
    loserPercent: number;
    breakevenCount: number;
    breakevenPercent: number;
    profitFactor: number | null;
    sortinoRatio: number | null;
    biggestWinner: { ticker: string; amount: number; tradeCount: number } | null;
    biggestLoser: { ticker: string; amount: number; tradeCount: number } | null;
    tradeReturnsChart: { labels: string[]; bins: ChartBin[]; medianBinIndex: number };
}

function safeDiv(a: number, b: number): number {
    return b ? a / b : 0;
}

export async function updatePortfolioStats(
    db: any,
    username: string,
    portfolioNumber: number
): Promise<PortfolioStats> {
    const trades: Trade[] = await db.collection('Trades').find({ Username: username, PortfolioNumber: portfolioNumber }).toArray();
    const positions: Position[] = await db.collection('Positions').find({ Username: username, PortfolioNumber: portfolioNumber }).toArray();
    const portfolioDoc: PortfolioDoc = await db.collection('Portfolios').findOne({ Username: username, Number: portfolioNumber });
    const cash: number = portfolioDoc && typeof portfolioDoc.cash === 'number' ? portfolioDoc.cash : 0.0;
    const baseValue: number = portfolioDoc && typeof portfolioDoc.BaseValue === 'number' ? portfolioDoc.BaseValue : 0.0;

    // Calculate and save dividend transactions (this will update the Trades collection)
    try {
        const nonDividendTrades = trades.filter(tx => tx.Action !== 'Dividend');
        const dividendTransactions = await calculateDividendTransactions(db, username, portfolioNumber, nonDividendTrades);

        // Remove old dividends and insert new ones
        await db.collection('Trades').deleteMany({
            Username: username,
            PortfolioNumber: portfolioNumber,
            Action: 'Dividend'
        });

        if (dividendTransactions.length > 0) {
            await db.collection('Trades').insertMany(dividendTransactions);
        }

        // Reload trades to include new dividend transactions
        const allTrades: Trade[] = await db.collection('Trades').find({ Username: username, PortfolioNumber: portfolioNumber }).toArray();
        // Update the trades array to include dividends for calculations below
        trades.length = 0;
        trades.push(...allTrades);
    } catch (error) {
        console.error('Error calculating dividends:', error);
        // Continue with portfolio stats calculation even if dividend calculation fails
    }

    // --- Portfolio Value History Calculation ---
    const txs: Trade[] = trades.filter(tx => tx.Date).sort((a, b) => {
        const dateCompare = new Date(a.Date).getTime() - new Date(b.Date).getTime();
        // If same date, use Timestamp for ordering
        if (dateCompare === 0 && a.Timestamp && b.Timestamp) {
            return new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime();
        }
        return dateCompare;
    });
    let holdings: { [symbol: string]: number } = {};
    let runningCash: number = 0;
    let valueHistory: { date: string; value: number }[] = [];
    let lastDate: string | null = null;
    for (const tx of txs) {
        if (!tx.Date) continue;

        // Handle different transaction types
        if (tx.Action === 'Buy' && tx.Symbol && typeof tx.Shares === 'number' && typeof tx.Total === 'number') {
            if (tx.IsShort) {
                // Buying to close a short position
                holdings[tx.Symbol] = (holdings[tx.Symbol] || 0) + tx.Shares;  // Reduce short position (add positive shares)
                runningCash -= tx.Total;  // Pay to buy back
            } else {
                // Regular buy (open long)
                holdings[tx.Symbol] = (holdings[tx.Symbol] || 0) + tx.Shares;
                runningCash -= tx.Total;
            }
        } else if (tx.Action === 'Sell' && tx.Symbol && typeof tx.Shares === 'number' && typeof tx.Total === 'number') {
            if (tx.IsShort) {
                // Selling to open a short position
                holdings[tx.Symbol] = (holdings[tx.Symbol] || 0) - tx.Shares;  // Add short position (negative shares)
                runningCash += tx.Total;  // Receive cash from short sale
            } else {
                // Regular sell (close long)
                holdings[tx.Symbol] = (holdings[tx.Symbol] || 0) - tx.Shares;
                runningCash += tx.Total;
            }
        } else if (tx.Action === 'Cash Deposit' && typeof tx.Total === 'number') {
            runningCash += tx.Total;
        } else if (tx.Action === 'Cash Withdrawal' && typeof tx.Total === 'number') {
            runningCash += tx.Total;  // Total is negative for withdrawals
        } else if (tx.Action === 'Dividend' && typeof tx.Total === 'number') {
            runningCash += tx.Total;  // Dividends add to cash
        }

        let positionsValue: number = 0;
        for (const [symbol, shares] of Object.entries(holdings)) {
            if (typeof shares !== 'number' || shares === 0) continue;
            let price: number = 0;
            for (let i = txs.length - 1; i >= 0; i--) {
                if (txs[i].Symbol === symbol && new Date(txs[i].Date) <= new Date(tx.Date)) {
                    price = txs[i].Price || 0;
                    break;
                }
            }
            // For short positions (negative shares), the value is negative (liability)
            positionsValue += shares * price;
        }
        const totalValue = positionsValue + runningCash;
        if (lastDate !== tx.Date) {
            valueHistory.push({ date: tx.Date.slice(0, 10), value: Math.max(0, totalValue) });
            lastDate = tx.Date;
        } else {
            valueHistory[valueHistory.length - 1] = { date: tx.Date.slice(0, 10), value: Math.max(0, totalValue) };
        }
    }

    function computeRealizedPL(trades: Trade[]): number {
        const txs = trades.filter(tx => tx.Date && tx.Symbol && tx.Action).sort((a, b) => {
            const dateCompare = new Date(a.Date).getTime() - new Date(b.Date).getTime();
            // If same date, use Timestamp for ordering
            if (dateCompare === 0 && a.Timestamp && b.Timestamp) {
                return new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime();
            }
            return dateCompare;
        });
        let realized = 0;
        let lots: { [symbol: string]: { shares: number; price: number; isShort: boolean }[] } = {};
        for (const tx of txs) {
            // Opening positions: Buy (long) or Sell (short when IsShort=true)
            if ((tx.Action === 'Buy' || tx.Action === 'Sell') && tx.Symbol && typeof tx.Shares === 'number' && typeof tx.Price === 'number') {
                // Check if this is opening a new position
                const isOpeningTrade = (tx.Action === 'Buy' && !tx.IsShort) || (tx.Action === 'Sell' && tx.IsShort);

                if (isOpeningTrade) {
                    lots[tx.Symbol] = lots[tx.Symbol] || [];
                    lots[tx.Symbol].push({ shares: tx.Shares, price: tx.Price, isShort: tx.IsShort || false });
                } else {
                    // Closing positions: Sell (closing long) or Buy (closing short)
                    let sharesToSell = tx.Shares;
                    lots[tx.Symbol] = lots[tx.Symbol] || [];
                    while (sharesToSell > 0 && lots[tx.Symbol].length > 0) {
                        let lot = lots[tx.Symbol][0];
                        let sellShares = Math.min(lot.shares, sharesToSell);
                        // For short positions: profit = (entry price - exit price) * shares
                        // For long positions: profit = (exit price - entry price) * shares
                        if (lot.isShort) {
                            realized += (lot.price - tx.Price) * sellShares;
                        } else {
                            realized += (tx.Price - lot.price) * sellShares;
                        }
                        lot.shares -= sellShares;
                        sharesToSell -= sellShares;
                        if (lot.shares === 0) lots[tx.Symbol].shift();
                    }
                }
            }
        }
        return realized;
    }

    function getClosedPositions(trades: Trade[]): ClosedPosition[] {
        const txs = trades.filter(tx => tx.Date).sort((a, b) => {
            const dateCompare = new Date(a.Date).getTime() - new Date(b.Date).getTime();
            // If same date, use Timestamp for ordering
            if (dateCompare === 0 && a.Timestamp && b.Timestamp) {
                return new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime();
            }
            return dateCompare;
        });
        const positions: ClosedPosition[] = [];
        const lots: { [symbol: string]: { shares: number; price: number; date: string; isShort: boolean }[] } = {};
        for (const tx of txs) {
            if (!tx.Symbol || !tx.Action) continue;

            // Opening positions: Buy (long) or Sell (short when IsShort=true)
            if ((tx.Action === 'Buy' || tx.Action === 'Sell') && typeof tx.Shares === 'number' && typeof tx.Price === 'number' && tx.Date) {
                const isOpeningTrade = (tx.Action === 'Buy' && !tx.IsShort) || (tx.Action === 'Sell' && tx.IsShort);

                if (isOpeningTrade) {
                    lots[tx.Symbol] = lots[tx.Symbol] || [];
                    lots[tx.Symbol].push({ shares: tx.Shares, price: tx.Price, date: tx.Date, isShort: tx.IsShort || false });
                } else {
                    // Closing positions: Sell (closing long) or Buy (closing short)
                    let sharesToSell = tx.Shares;
                    lots[tx.Symbol] = lots[tx.Symbol] || [];
                    while (sharesToSell > 0 && lots[tx.Symbol].length > 0) {
                        let lot = lots[tx.Symbol][0];
                        let sellShares = Math.min(lot.shares, sharesToSell);
                        // For short positions, profit when price drops (entry - exit)
                        // For long positions, profit when price rises (exit - entry)
                        let pnl = lot.price ? (lot.isShort ? ((lot.price - tx.Price) / lot.price) * 100 : ((tx.Price - lot.price) / lot.price) * 100) : 0;
                        let holdDays = Math.max(0, Math.round((new Date(tx.Date).getTime() - new Date(lot.date).getTime()) / (1000 * 60 * 60 * 24)));
                        positions.push({
                            symbol: tx.Symbol,
                            buyDate: lot.date,
                            sellDate: tx.Date,
                            buyPrice: lot.price,
                            sellPrice: tx.Price,
                            shares: sellShares,
                            pnl,
                            holdDays,
                            isShort: lot.isShort
                        });
                        lot.shares -= sellShares;
                        sharesToSell -= sellShares;
                        if (lot.shares === 0) lots[tx.Symbol].shift();
                    }
                }
            }
        }
        return positions;
    }

    // Sort trades by symbol, then by date ascending
    const tradesSorted = trades.sort((a: Trade, b: Trade) => {
        if (a.Symbol === b.Symbol) return new Date(a.Date).getTime() - new Date(b.Date).getTime();
        return (a.Symbol || '').localeCompare(b.Symbol || '');
    });
    const closedPositions = getClosedPositions(tradesSorted);
    const winnerPositions = closedPositions.filter(p => p.pnl > 0);
    const loserPositions = closedPositions.filter(p => p.pnl < 0);
    const breakevenPositions = closedPositions.filter(p => p.pnl === 0);
    const totalClosed = closedPositions.length;

    const winnerCount = winnerPositions.length;
    const loserCount = loserPositions.length;
    const breakevenCount = breakevenPositions.length;

    const winnerPercent = safeDiv(winnerCount * 100, totalClosed);
    const loserPercent = safeDiv(loserCount * 100, totalClosed);
    const breakevenPercent = safeDiv(breakevenCount * 100, totalClosed);

    const avgHoldTimeWinners = safeDiv(winnerPositions.reduce((sum, p) => sum + p.holdDays, 0), winnerCount);
    const avgHoldTimeLosers = safeDiv(loserPositions.reduce((sum, p) => sum + p.holdDays, 0), loserCount);

    const avgGain = safeDiv(winnerPositions.reduce((sum, p) => sum + p.pnl, 0), winnerCount);
    const avgLoss = safeDiv(loserPositions.reduce((sum, p) => sum + p.pnl, 0), loserCount);

    // For avgGainAbs and avgLossAbs, account for short positions
    // Short: profit = (buyPrice - sellPrice) * shares
    // Long: profit = (sellPrice - buyPrice) * shares
    const avgGainAbs = safeDiv(
        winnerPositions.reduce((sum, p) => {
            const dollarGain = p.isShort
                ? (p.buyPrice - p.sellPrice) * p.shares
                : (p.sellPrice - p.buyPrice) * p.shares;
            return sum + dollarGain;
        }, 0),
        winnerCount
    );

    const avgLossAbs = safeDiv(
        loserPositions.reduce((sum, p) => {
            const dollarLoss = p.isShort
                ? Math.abs((p.buyPrice - p.sellPrice) * p.shares)
                : Math.abs((p.sellPrice - p.buyPrice) * p.shares);
            return sum + dollarLoss;
        }, 0),
        loserCount
    );

    const gainLossRatio = avgLoss !== 0 ? safeDiv(Math.abs(avgGain), Math.abs(avgLoss)) : null;
    const riskRewardRatio = avgGain !== 0 ? safeDiv(Math.abs(avgLoss), Math.abs(avgGain)) : null;

    // For grossProfit and grossLoss, account for short positions
    const grossProfit = winnerPositions.reduce((sum, p) => {
        const dollarGain = p.isShort
            ? (p.buyPrice - p.sellPrice) * p.shares
            : (p.sellPrice - p.buyPrice) * p.shares;
        return sum + dollarGain;
    }, 0);

    const grossLoss = loserPositions.reduce((sum, p) => {
        const dollarLoss = p.isShort
            ? Math.abs((p.buyPrice - p.sellPrice) * p.shares)
            : Math.abs((p.sellPrice - p.buyPrice) * p.shares);
        return sum + dollarLoss;
    }, 0);

    const profitFactor = grossLoss !== 0 ? safeDiv(grossProfit, grossLoss) : null;

    // Sortino ratio (riskFreeRate = 0.02)
    const riskFreeRate = 0.02;
    const returns = closedPositions.map(p => p.pnl / 100);
    const avgReturn = returns.length ? safeDiv(returns.reduce((a, b) => a + b, 0), returns.length) : 0;
    const downsideReturns = returns.filter(r => r < riskFreeRate);
    const downsideDev = downsideReturns.length ? Math.sqrt(safeDiv(downsideReturns.reduce((sum, r) => sum + Math.pow(r - riskFreeRate, 2), 0), downsideReturns.length)) : 0;
    const sortinoRatio = downsideDev !== 0 ? safeDiv(avgReturn - riskFreeRate, downsideDev) : null;

    // Biggest winner/loser
    const plByTicker: { [symbol: string]: number } = {};
    const tradeCounts: { [symbol: string]: number } = {};
    for (const p of closedPositions) {
        // Account for short positions in P/L calculation
        const dollarPL = p.isShort
            ? (p.buyPrice - p.sellPrice) * p.shares
            : (p.sellPrice - p.buyPrice) * p.shares;
        plByTicker[p.symbol] = (plByTicker[p.symbol] || 0) + dollarPL;
        tradeCounts[p.symbol] = (tradeCounts[p.symbol] || 0) + 1;
    }
    let biggestWinner: { ticker: string; amount: number; tradeCount: number } | null = null;
    let biggestLoser: { ticker: string; amount: number; tradeCount: number } | null = null;
    if (Object.keys(plByTicker).length) {
        const maxTicker = Object.keys(plByTicker).reduce((a, b) => plByTicker[a] > plByTicker[b] ? a : b);
        const minTicker = Object.keys(plByTicker).reduce((a, b) => plByTicker[a] < plByTicker[b] ? a : b);

        // Set biggest winner
        biggestWinner = {
            ticker: maxTicker,
            amount: Number(plByTicker[maxTicker].toFixed(2)),
            tradeCount: tradeCounts[maxTicker]
        };

        // Only set biggest loser if it's a different ticker or if the single ticker has negative P/L
        if (maxTicker !== minTicker) {
            biggestLoser = {
                ticker: minTicker,
                amount: Math.abs(Number(plByTicker[minTicker].toFixed(2))),
                tradeCount: tradeCounts[minTicker]
            };
        } else if (plByTicker[maxTicker] < 0) {
            // If same ticker and P/L is negative, set it as loser instead of winner
            biggestWinner = null;
            biggestLoser = {
                ticker: maxTicker,
                amount: Math.abs(Number(plByTicker[maxTicker].toFixed(2))),
                tradeCount: tradeCounts[maxTicker]
            };
        }
    }

    // Trade Returns Chart Data (binning)
    function computeTradeReturnsBins(closedPositions: ClosedPosition[]): { labels: string[]; bins: ChartBin[]; medianBinIndex: number } {
        if (!closedPositions.length) return { labels: [], bins: [], medianBinIndex: -1 };
        const returns = closedPositions.map(p => p.pnl);
        const minReturn = Math.floor(Math.min(...returns) / 2) * 2;
        const maxReturn = Math.ceil(Math.max(...returns) / 2) * 2;
        const bins: ChartBin[] = [];
        for (let i = minReturn; i < maxReturn; i += 2) {
            bins.push({ min: i, max: i + 2, range: `${i} to ${i + 2}%`, count: 0, positive: i + 2 > 0 });
        }
        returns.forEach(ret => {
            const binIdx = Math.floor((ret - minReturn) / 2);
            if (bins[binIdx]) bins[binIdx].count += 1;
        });
        // Median calculation
        const sorted = returns.slice().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const medianValue = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        const medianBinIndex = bins.findIndex(b => medianValue >= b.min && medianValue < b.max);
        return {
            labels: bins.map(b => b.range),
            bins,
            medianBinIndex
        };
    }
    const tradeReturnsChart = computeTradeReturnsBins(closedPositions);

    // Avg position size (as percent of portfolio value at buy)
    function computeAvgPositionSize(trades: Trade[], baseValue: number): number {
        const buys = trades.filter(tx => (tx.Action === 'Buy' || tx.Action === 'Short') && typeof tx.Total === 'number');
        if (!buys.length || baseValue <= 0) return 0.0;
        const avgPercents = buys.map(tx => safeDiv(tx.Total as number, baseValue) * 100);
        return safeDiv(avgPercents.reduce((a, b) => a + b, 0), avgPercents.length);
    }
    const avgPositionSize = computeAvgPositionSize(trades, baseValue);

    const realizedPL = computeRealizedPL(trades);
    const realizedPLPercent = baseValue ? safeDiv(realizedPL * 100, baseValue) : 0;

    // Update stats in Portfolios collection
    const stats: PortfolioStats = {
        portfolioValueHistory: valueHistory,
        realizedPL: Number(realizedPL.toFixed(2)),
        realizedPLPercent: Number(realizedPLPercent.toFixed(2)),
        avgPositionSize: Number(avgPositionSize.toFixed(2)),
        avgHoldTimeWinners: Number(avgHoldTimeWinners.toFixed(1)),
        avgHoldTimeLosers: Number(avgHoldTimeLosers.toFixed(1)),
        avgGain: Number(avgGain.toFixed(2)),
        avgLoss: Number(avgLoss.toFixed(2)),
        avgGainAbs: Number(avgGainAbs.toFixed(2)),
        avgLossAbs: Number(avgLossAbs.toFixed(2)),
        gainLossRatio: gainLossRatio !== null ? Number(gainLossRatio.toFixed(2)) : null,
        riskRewardRatio: riskRewardRatio !== null ? Number(riskRewardRatio.toFixed(2)) : null,
        winnerCount,
        winnerPercent: Number(winnerPercent.toFixed(2)),
        loserCount,
        loserPercent: Number(loserPercent.toFixed(2)),
        breakevenCount,
        breakevenPercent: Number(breakevenPercent.toFixed(2)),
        profitFactor: profitFactor !== null ? Number(profitFactor.toFixed(2)) : null,
        sortinoRatio: sortinoRatio !== null ? Number(sortinoRatio.toFixed(2)) : null,
        biggestWinner,
        biggestLoser,
        tradeReturnsChart
    };
    await db.collection('Portfolios').updateOne(
        { Username: username, Number: portfolioNumber },
        { $set: stats }
    );
    return stats;
}