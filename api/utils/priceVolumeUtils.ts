/**
 * Utility functions for efficiently fetching price and volume data
 * This replaces the N+1 query problem where we fetch data for each symbol individually
 */

interface PriceVolumeData {
    symbol: string;
    price: number | null;
    volume: number | null;
    volume_message: string | null;
    todaychange: number | null;
}

interface Asset {
    Symbol: string;
    [key: string]: any;
}

/**
 * Check if current time is during US market hours (9:30 AM - 4:00 PM ET / 13:30 - 20:00 UTC)
 */
export function isMarketHoursUTC(): boolean {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();

    // Market is closed on weekends
    if (day === 0 || day === 6) {
        return false;
    }

    // Market hours: 13:30 - 20:00 UTC (9:30 AM - 4:00 PM ET)
    if (hour < 13 || hour >= 20) {
        return false;
    }

    // If it's 13:xx, check if it's at least 13:30
    if (hour === 13 && minute < 30) {
        return false;
    }

    return true;
}

/**
 * Bulk fetch price and volume data for multiple symbols
 * This is MUCH faster than fetching data for each symbol individually
 * 
 * @param db - MongoDB database instance
 * @param assets - Array of assets with Symbol field
 * @param logger - Logger instance for error tracking
 * @returns Map of symbol -> price/volume data
 */
export async function bulkFetchPriceAndVolume(
    db: any,
    assets: Asset[],
    logger: any
): Promise<Map<string, PriceVolumeData>> {
    const result = new Map<string, PriceVolumeData>();

    // Extract all symbols
    const symbols = assets.map(asset => asset.Symbol);

    if (symbols.length === 0) {
        return result;
    }

    // Initialize result map with default values
    symbols.forEach(symbol => {
        result.set(symbol, {
            symbol,
            price: null,
            volume: null,
            volume_message: null,
            todaychange: null
        });
    });

    const ohclvCollection = db.collection('OHCLVData1m');
    const dailyCollection = db.collection('OHCLVData');
    const isMarketHours = isMarketHoursUTC();

    try {
        // OPTIMIZATION: Fetch latest price for ALL symbols in ONE query using aggregation
        const latestPrices = await ohclvCollection.aggregate([
            {
                $match: {
                    tickerID: { $in: symbols }
                }
            },
            {
                $sort: { tickerID: 1, timestamp: -1 }
            },
            {
                $group: {
                    _id: "$tickerID",
                    latestPrice: { $first: "$close" },
                    latestTimestamp: { $first: "$timestamp" }
                }
            }
        ]).toArray();

        // Map prices to symbols
        latestPrices.forEach((priceData: any) => {
            const data = result.get(priceData._id);
            if (data) {
                data.price = priceData.latestPrice;
            }
        });

        if (isMarketHours) {
            // During market hours: volume is unavailable, calculate todaychange from previous day
            const volumeMessage = "Intraday volume is unavailable during market hours. Final volume will be available after market close.";

            // Fetch previous day's close for ALL symbols in ONE query
            const prevDayCandles = await dailyCollection.aggregate([
                {
                    $match: {
                        tickerID: { $in: symbols }
                    }
                },
                {
                    $sort: { tickerID: 1, timestamp: -1 }
                },
                {
                    $group: {
                        _id: "$tickerID",
                        prevClose: { $first: "$close" }
                    }
                }
            ]).toArray();

            // Calculate todaychange for each symbol
            prevDayCandles.forEach((prevData: any) => {
                const data = result.get(prevData._id);
                if (data && data.price !== null && prevData.prevClose) {
                    data.todaychange = (data.price - prevData.prevClose) / prevData.prevClose;
                }
                if (data) {
                    data.volume_message = volumeMessage;
                }
            });

        } else {
            // After market hours: fetch volume from daily collection
            const dailyCandles = await dailyCollection.aggregate([
                {
                    $match: {
                        tickerID: { $in: symbols }
                    }
                },
                {
                    $sort: { tickerID: 1, timestamp: -1 }
                },
                {
                    $group: {
                        _id: "$tickerID",
                        volume: { $first: "$volume" },
                        todaychange: { $first: "$todaychange" }
                    }
                }
            ]).toArray();

            // Map volume and todaychange to symbols
            dailyCandles.forEach((dailyData: any) => {
                const data = result.get(dailyData._id);
                if (data) {
                    data.volume = dailyData.volume;
                    // Use todaychange from asset if available, otherwise from daily data
                    const asset = assets.find(a => a.Symbol === dailyData._id);
                    data.todaychange = asset?.todaychange !== undefined ? asset.todaychange : dailyData.todaychange;
                }
            });
        }

    } catch (error) {
        logger.error({
            msg: 'Error in bulkFetchPriceAndVolume',
            error: error instanceof Error ? error.message : String(error),
            symbolCount: symbols.length
        });
    }

    return result;
}

/**
 * Enrich assets with price and volume data using bulk fetching
 * This is the optimized version that should replace the Promise.all + map pattern
 * 
 * @param db - MongoDB database instance
 * @param assets - Array of assets to enrich
 * @param logger - Logger instance
 * @returns Array of assets enriched with price, volume, todaychange
 */
export async function enrichAssetsWithPriceAndVolume(
    db: any,
    assets: Asset[],
    logger: any
): Promise<any[]> {
    if (assets.length === 0) {
        return [];
    }

    // Bulk fetch all price/volume data in optimized queries
    const priceVolumeMap = await bulkFetchPriceAndVolume(db, assets, logger);

    // Enrich each asset with the fetched data
    return assets.map(asset => {
        const pvData = priceVolumeMap.get(asset.Symbol);

        return {
            ...asset,
            Close: pvData?.price ?? null,
            Volume: pvData?.volume ?? null,
            volume_message: pvData?.volume_message ?? null,
            todaychange: pvData?.todaychange ?? null
        };
    });
}
