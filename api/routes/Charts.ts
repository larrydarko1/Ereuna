import { Request, Response } from 'express';
import { handleError } from '../utils/logger.js';

export default function (app: any, deps: any) {
    const {
        validate,
        validationSchemas,
        validationSets,
        sanitizeInput,
        logger,
        MongoClient,
        uri
    } = deps;

    // Refactored endpoint to display info results
    app.get('/chart/:identifier', async (req: Request, res: Response) => {
        const identifier = sanitizeInput(req.params.identifier).toUpperCase();
        const apiKey = req.header('x-api-key');
        let client: typeof MongoClient | null = null;

        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            logger.warn({
                msg: 'Invalid API key',
                providedApiKey: !!sanitizedKey,
                context: 'GET /chart/:identifier',
                statusCode: 401
            });
            return res.status(401).json({ message: 'Unauthorized API Access' });
        }

        try {
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const collection = db.collection('AssetInfo');

            // First, try to find by Symbol
            let assetInfo = await collection.findOne({ Symbol: identifier });

            // If not found by Symbol, try to find by ISIN
            if (!assetInfo) {
                const isinAsset = await collection.findOne({ ISIN: identifier });
                if (isinAsset) {
                    assetInfo = await collection.findOne({ Symbol: isinAsset.Symbol });
                }
            }

            if (!assetInfo) {
                logger.warn({
                    msg: 'Chart Data Retrieval Failed',
                    reason: 'Asset not found',
                    identifier,
                    context: 'GET /chart/:identifier',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Asset not found' });
            }

            // EPS (quarterlyEarnings) - only send reportedEPS
            if (Array.isArray(assetInfo.quarterlyEarnings)) {
                const arr = assetInfo.quarterlyEarnings;
                const earningsArr = (!req.query.showAllEPS || req.query.showAllEPS !== 'true')
                    ? arr.slice(0, 8)
                    : arr;
                assetInfo.quarterlyEarnings = earningsArr.map((e: any) => ({
                    reportedEPS: e.reportedEPS,
                    fiscalDateEnding: e.fiscalDateEnding
                }));
            } else {
                assetInfo.quarterlyEarnings = [];
            }

            // Earnings (quarterlyFinancials) - lazy load only
            if (Array.isArray(assetInfo.quarterlyFinancials)) {
                const arr = assetInfo.quarterlyFinancials;
                const showAll = (req.query.showAllSales === 'true') || (req.query.showAllEarnings === 'true');
                const financialsArr = showAll ? arr : arr.slice(0, 8);
                assetInfo.quarterlyFinancials = financialsArr.map((f: any) => ({
                    netIncome: f.netIncome,
                    totalRevenue: f.totalRevenue,
                    fiscalDateEnding: f.fiscalDateEnding
                }));
            } else {
                assetInfo.quarterlyFinancials = [];
            }

            // Annual Financials - lazy load only
            if (Array.isArray(assetInfo.annualFinancials)) {
                const arr = assetInfo.annualFinancials;
                assetInfo.annualFinancials = (!req.query.showAllAnnualFinancials || req.query.showAllAnnualFinancials !== 'true')
                    ? arr.slice(0, 8)
                    : arr;
            } else {
                assetInfo.annualFinancials = [];
            }

            res.status(200).json(assetInfo);
        } catch (error: any) {
            const errObj = handleError(error, 'GET /chart/:identifier', { identifier }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.error({
                        msg: 'Error closing database connection',
                        error: closeError.message,
                        context: 'GET /chart/:identifier'
                    });
                }
            }
        }
    });


    // Unified endpoint for all chart data (daily & weekly OHLC, volume, MAs)
    app.get('/:ticker/chartdata', validate(validationSets.chartData), async (req: Request, res: Response) => {
        const ticker = sanitizeInput(req.params.ticker.toUpperCase());
        const timeframe = req.query.timeframe || 'daily';
        const before = req.query.before;
        let client: typeof MongoClient | null = null;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /:ticker/chartdata',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');

            // Helper for MA
            function calcMA(Data: any[], period: number, timeType: 'date' | 'datetime' = 'date') {
                if (Data.length < period) return [];
                const arr: { time: string; value: number }[] = [];
                for (let i = period - 1; i < Data.length; i++) {
                    const sum = Data.slice(i - period + 1, i + 1).reduce((acc: number, curr: any) => acc + curr.close, 0);
                    const average = sum / period;
                    arr.push({
                        time: timeType === 'datetime' ? Data[i].timestamp.toISOString().slice(0, 19) : Data[i].timestamp.toISOString().slice(0, 10),
                        value: parseFloat(average.toFixed(2)),
                    });
                }
                return arr;
            }

            // Helper for EMA
            function calcEMA(Data: any[], period: number, timeType: 'date' | 'datetime' = 'date') {
                if (Data.length < period) return [];
                const arr: { time: string; value: number }[] = [];
                let k = 2 / (period + 1);
                let emaPrev = Data.slice(0, period).reduce((acc: number, curr: any) => acc + curr.close, 0) / period;
                for (let i = period - 1; i < Data.length; i++) {
                    let close = Data[i].close;
                    if (i === period - 1) {
                        arr.push({
                            time: timeType === 'datetime' ? Data[i].timestamp.toISOString().slice(0, 19) : Data[i].timestamp.toISOString().slice(0, 10),
                            value: parseFloat(emaPrev.toFixed(2)),
                        });
                    } else {
                        emaPrev = close * k + emaPrev * (1 - k);
                        arr.push({
                            time: timeType === 'datetime' ? Data[i].timestamp.toISOString().slice(0, 19) : Data[i].timestamp.toISOString().slice(0, 10),
                            value: parseFloat(emaPrev.toFixed(2)),
                        });
                    }
                }
                return arr;
            }

            // Get user chart settings if user param is present
            let chartSettings: any = null;
            if (req.query.user) {
                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: req.query.user });
                if (userDoc && userDoc.ChartSettings) {
                    chartSettings = userDoc.ChartSettings;
                }
            }

            // Helper to get correct data collection and time format
            let coll: any, timeFormat: 'date' | 'datetime';
            switch (timeframe) {
                case 'daily':
                    coll = db.collection('OHCLVData');
                    timeFormat = 'date';
                    break;
                case 'weekly':
                    coll = db.collection('OHCLVData2');
                    timeFormat = 'date';
                    break;
                case 'intraday1m':
                    coll = db.collection('OHCLVData1m');
                    timeFormat = 'datetime';
                    break;
                case 'intraday5m':
                    coll = db.collection('OHCLVData5m');
                    timeFormat = 'datetime';
                    break;
                case 'intraday15m':
                    coll = db.collection('OHCLVData15m');
                    timeFormat = 'datetime';
                    break;
                case 'intraday30m':
                    coll = db.collection('OHCLVData30m');
                    timeFormat = 'datetime';
                    break;
                case 'intraday1hr':
                    coll = db.collection('OHCLVData1hr');
                    timeFormat = 'datetime';
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid timeframe' });
            }

            // Cap results for daily/weekly (lazy loading)
            let arr: any[];
            if (timeframe === 'daily') {
                let query: any = { tickerID: ticker };
                if (before) {
                    let beforeDate = new Date(before as string);
                    if (!isNaN(beforeDate.getTime())) {
                        query.timestamp = { $lt: beforeDate };
                    }
                }
                arr = await coll.find(query)
                    .sort({ timestamp: -1 })
                    .limit(1250)
                    .toArray();
                arr = arr.reverse();
            } else if (timeframe === 'weekly') {
                let query: any = { tickerID: ticker };
                if (before) {
                    let beforeDate = new Date(before as string);
                    if (!isNaN(beforeDate.getTime())) {
                        query.timestamp = { $lt: beforeDate };
                    }
                }
                arr = await coll.find(query)
                    .sort({ timestamp: -1 })
                    .limit(260)
                    .toArray();
                arr = arr.reverse();
            } else {
                arr = await coll.find({ tickerID: ticker })
                    .sort({ timestamp: 1 })
                    .toArray();
            }

            let data: Record<string, any> = {
                ohlc: arr.length ? arr.map((item: any) => ({
                    time: timeFormat === 'datetime' ? item.timestamp.toISOString().slice(0, 19) : item.timestamp.toISOString().slice(0, 10),
                    open: parseFloat(item.open.toString().slice(0, 8)),
                    high: parseFloat(item.high.toString().slice(0, 8)),
                    low: parseFloat(item.low.toString().slice(0, 8)),
                    close: parseFloat(item.close.toString().slice(0, 8)),
                })) : [],
                volume: arr.length ? arr.map((item: any) => ({
                    time: timeFormat === 'datetime' ? item.timestamp.toISOString().slice(0, 19) : item.timestamp.toISOString().slice(0, 10),
                    value: item.volume,
                })) : []
            };

            // Always use user settings if present, even if indicators is empty or all invisible
            if (chartSettings) {
                if (Array.isArray(chartSettings.indicators)) {
                    chartSettings.indicators.forEach((indicator: any, idx: number) => {
                        if (!indicator.visible) return;
                        let maArr: { time: string; value: number }[] = [];
                        if (indicator.type === 'EMA') {
                            maArr = calcEMA(arr, indicator.timeframe, timeFormat);
                        } else {
                            maArr = calcMA(arr, indicator.timeframe, timeFormat);
                        }
                        data[`MA${idx + 1}`] = maArr;
                    });
                }
                // Add IntrinsicValue if enabled
                if (chartSettings.intrinsicValue && chartSettings.intrinsicValue.visible) {
                    const assetInfo = await db.collection('AssetInfo').findOne({ Symbol: ticker });
                    if (assetInfo && typeof assetInfo.IntrinsicValue !== 'undefined') {
                        data.intrinsicValue = assetInfo.IntrinsicValue;
                    }
                }
            } else {
                // Default: provide 10, 20, 50, 200 SMA
                data.MA1 = arr.length ? calcMA(arr, 10, timeFormat) : [];
                data.MA2 = arr.length ? calcMA(arr, 20, timeFormat) : [];
                data.MA3 = arr.length ? calcMA(arr, 50, timeFormat) : [];
                data.MA4 = arr.length ? calcMA(arr, 200, timeFormat) : [];
            }

            res.status(200).json(data);
        } catch (error: any) {
            const errObj = handleError(error, 'GET /:ticker/chartdata', { ticker }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.error({
                        msg: 'Error closing database connection',
                        error: closeError.message,
                        context: 'GET /:ticker/chartdata'
                    });
                }
            }
        }
    });

    // sends data to chart2.vue component in the screener
    app.get('/:ticker/chartdata-dl', validate(validationSets.chartData), async (req: Request, res: Response) => {
        const ticker = sanitizeInput(req.params.ticker.toUpperCase());
        const before = req.query.before;
        let client: typeof MongoClient | null = null;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /:ticker/chartdata-dl',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            // Only fetch daily data from OHCLVData
            const dailyColl = db.collection('OHCLVData');
            let query: any = { tickerID: ticker };
            if (before) {
                let beforeDate = new Date(before as string);
                if (!isNaN(beforeDate.getTime())) {
                    query.timestamp = { $lt: beforeDate };
                }
            }
            let dailyData: any[] = await dailyColl.find(query)
                .sort({ timestamp: -1 })
                .limit(500)
                .toArray();
            dailyData = dailyData.reverse();
            // Helper for MA
            function calcMA(Data: any[], period: number) {
                if (Data.length < period) return [];
                const arr: { time: string; value: number }[] = [];
                for (let i = period - 1; i < Data.length; i++) {
                    const sum = Data.slice(i - period + 1, i + 1).reduce((acc: number, curr: any) => acc + curr.close, 0);
                    const average = sum / period;
                    arr.push({
                        time: Data[i].timestamp.toISOString().slice(0, 10),
                        value: parseFloat(average.toFixed(2)),
                    });
                }
                return arr;
            }
            // Format daily (always object with arrays)
            const daily = {
                ohlc: dailyData.length ? dailyData.map((item: any) => ({
                    time: item.timestamp.toISOString().slice(0, 10),
                    open: parseFloat(item.open.toString().slice(0, 8)),
                    high: parseFloat(item.high.toString().slice(0, 8)),
                    low: parseFloat(item.low.toString().slice(0, 8)),
                    close: parseFloat(item.close.toString().slice(0, 8)),
                })) : [],
                volume: dailyData.length ? dailyData.map((item: any) => ({
                    time: item.timestamp.toISOString().slice(0, 10),
                    value: item.volume,
                })) : [],
                MA10: dailyData.length ? calcMA(dailyData, 10) : [],
                MA20: dailyData.length ? calcMA(dailyData, 20) : [],
                MA50: dailyData.length ? calcMA(dailyData, 50) : [],
                MA200: dailyData.length ? calcMA(dailyData, 200) : [],
            };
            // Only send daily data
            res.status(200).json({ daily });
        } catch (error: any) {
            const errObj = handleError(error, 'GET /:ticker/chartdata-dl', { ticker }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.error({
                        msg: 'Error closing database connection',
                        error: closeError.message,
                        context: 'GET /:ticker/chartdata-dl'
                    });
                }
            }
        }
    });

    // sends data to chart1.vue component in the screener
    app.get('/:ticker/chartdata-wk', validate(validationSets.chartData), async (req: Request, res: Response) => {
        const ticker = sanitizeInput(req.params.ticker.toUpperCase());
        const before = req.query.before;
        let client: typeof MongoClient | null = null;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /:ticker/chartdata-wk',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            // Only fetch weekly data from OHCLVData2
            const weeklyColl = db.collection('OHCLVData2');
            let query: any = { tickerID: ticker };
            if (before) {
                let beforeDate = new Date(before as string);
                if (!isNaN(beforeDate.getTime())) {
                    query.timestamp = { $lt: beforeDate };
                }
            }
            let weeklyData: any[] = await weeklyColl.find(query)
                .sort({ timestamp: -1 })
                .limit(500)
                .toArray();
            weeklyData = weeklyData.reverse();
            // Helper for MA
            function calcMA(Data: any[], period: number) {
                if (Data.length < period) return [];
                const arr: { time: string; value: number }[] = [];
                for (let i = period - 1; i < Data.length; i++) {
                    const sum = Data.slice(i - period + 1, i + 1).reduce((acc: number, curr: any) => acc + curr.close, 0);
                    const average = sum / period;
                    arr.push({
                        time: Data[i].timestamp.toISOString().slice(0, 10),
                        value: parseFloat(average.toFixed(2)),
                    });
                }
                return arr;
            }
            // Format weekly (always object with arrays)
            const weekly = {
                ohlc: weeklyData.length ? weeklyData.map((item: any) => ({
                    time: item.timestamp.toISOString().slice(0, 10),
                    open: parseFloat(item.open.toString().slice(0, 8)),
                    high: parseFloat(item.high.toString().slice(0, 8)),
                    low: parseFloat(item.low.toString().slice(0, 8)),
                    close: parseFloat(item.close.toString().slice(0, 8)),
                })) : [],
                volume: weeklyData.length ? weeklyData.map((item: any) => ({
                    time: item.timestamp.toISOString().slice(0, 10),
                    value: item.volume,
                })) : [],
                MA10: weeklyData.length ? calcMA(weeklyData, 10) : [],
                MA20: weeklyData.length ? calcMA(weeklyData, 20) : [],
                MA50: weeklyData.length ? calcMA(weeklyData, 50) : [],
                MA200: weeklyData.length ? calcMA(weeklyData, 200) : [],
            };
            // Only send weekly data
            res.status(200).json({ weekly });
        } catch (error: any) {
            const errObj = handleError(error, 'GET /:ticker/chartdata-wk', { ticker }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.error({
                        msg: 'Error closing database connection',
                        error: closeError.message,
                        context: 'GET /:ticker/chartdata-wk'
                    });
                }
            }
        }
    });

    // Sends earnings date 
    app.get('/:ticker/earningsdate',
        validate([
            validationSchemas.chartData('ticker')
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /:ticker/earningsdate',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                // Sanitize and validate ticker
                const ticker = sanitizeInput(req.params.ticker).toUpperCase();
                let client: typeof MongoClient | null = null;
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const collection = db.collection('AssetInfo');
                    // Find data with logging
                    const Data: any[] = await collection.find({ Symbol: ticker }).toArray();
                    // Log if no data found
                    if (Data.length === 0) {
                        logger.warn({
                            msg: 'No earnings data found',
                            ticker,
                            context: 'GET /:ticker/earningsdate',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No earnings data found for this ticker' });
                    }
                    // Process and format earnings dates
                    const formattedData = Data.flatMap((item: any) => {
                        // Safely handle quarterlyIncome in case it's undefined
                        if (!item.quarterlyIncome || !Array.isArray(item.quarterlyIncome)) {
                            return [];
                        }
                        return item.quarterlyIncome.map((quarterly: any) => {
                            try {
                                const date = new Date(quarterly.fiscalDateEnding);
                                // Validate date
                                if (isNaN(date.getTime())) {
                                    logger.warn({
                                        msg: 'Invalid date in earnings data',
                                        ticker,
                                        originalDate: quarterly.fiscalDateEnding,
                                        context: 'GET /:ticker/earningsdate',
                                        statusCode: 400
                                    });
                                    return null;
                                }
                                return {
                                    time: {
                                        year: date.getFullYear(),
                                        month: date.getMonth() + 1,
                                        day: date.getDate(),
                                    },
                                };
                            } catch (dateError: any) {
                                logger.error({
                                    msg: 'Error processing date',
                                    ticker,
                                    error: dateError.message,
                                    context: 'GET /:ticker/earningsdate',
                                    statusCode: 500
                                });
                                return null;
                            }
                        }).filter((entry: any) => entry !== null); // Remove invalid entries
                    });
                    // Send formatted data
                    res.status(200).json(formattedData);
                } catch (dbError: any) {
                    // Log database-specific errors
                    logger.error({
                        msg: 'Database error retrieving earnings dates',
                        ticker,
                        error: dbError.message,
                        stack: dbError.stack,
                        context: 'GET /:ticker/earningsdate',
                        statusCode: 500
                    });
                    // Differentiate between different types of database errors
                    if (dbError.name === 'MongoError' || dbError.name === 'MongoNetworkError') {
                        return res.status(503).json({
                            message: 'Database service unavailable',
                            error: 'Unable to connect to the database'
                        });
                    }
                    return res.status(500).json({
                        message: 'Internal Server Error',
                        error: 'Failed to retrieve earnings dates'
                    });
                } finally {
                    // Ensure database connection is always closed
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError: any) {
                            logger.error({
                                msg: 'Error closing database connection',
                                error: closeError.message,
                                context: 'GET /:ticker/earningsdate',
                                statusCode: 500
                            });
                        }
                    }
                }
            } catch (unexpectedError: any) {
                // Catch any unexpected errors in the main try block
                const errObj = handleError(unexpectedError, 'GET /:ticker/earningsdate', {}, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // Sends splits date 
    app.get('/:ticker/splitsdate',
        validate([
            validationSchemas.chartData('ticker'),
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /:ticker/splitsdate',
                        statusCode: 401,
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const ticker = sanitizeInput(req.params.ticker).toUpperCase();
                let client: typeof MongoClient | null = null;
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const collection = db.collection('AssetInfo');
                    const data: any = await collection.findOne({ Symbol: ticker });
                    if (!data || !data.splits) {
                        logger.warn({
                            msg: 'No splits data found',
                            ticker,
                            context: 'GET /:ticker/splitsdate',
                            statusCode: 404,
                        });
                        return res.status(404).json({ message: 'No splits data found for this ticker' });
                    }
                    const splits: any[] = Array.isArray(data.splits) ? [...data.splits].reverse() : [];
                    // Lazy loading: send only first 5 unless ?all=true
                    const showAll = req.query.all === 'true';
                    const resultSplits = showAll ? splits : splits.slice(0, 4);
                    res.status(200).json(resultSplits);
                } catch (dbError: any) {
                    logger.error({
                        msg: 'Database error retrieving splits dates',
                        ticker,
                        error: dbError.message,
                        stack: dbError.stack,
                        context: 'GET /:ticker/splitsdate',
                        statusCode: 500,
                    });
                    if (dbError.name === 'MongoError' || dbError.name === 'MongoNetworkError') {
                        return res.status(503).json({
                            message: 'Database service unavailable',
                            error: 'Unable to connect to the database',
                        });
                    }
                    return res.status(500).json({
                        message: 'Internal Server Error',
                        error: 'Failed to retrieve splits dates',
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError: any) {
                            logger.error({
                                msg: 'Error closing database connection',
                                error: closeError.message,
                                context: 'GET /:ticker/splitsdate',
                                statusCode: 500,
                            });
                        }
                    }
                }
            } catch (unexpectedError: any) {
                const errObj = handleError(unexpectedError, 'GET /:ticker/splitsdate', {}, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // Sends dividend dates
    app.get('/:ticker/dividendsdate',
        validate([
            validationSchemas.chartData('ticker'),
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /:ticker/dividendsdate',
                        statusCode: 401,
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const ticker = sanitizeInput(req.params.ticker).toUpperCase();
                let client: typeof MongoClient | null = null;
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const collection = db.collection('AssetInfo');
                    const data: any = await collection.findOne({ Symbol: ticker });
                    if (!data || !data.dividends) {
                        logger.warn({
                            msg: 'No dividend data found',
                            ticker,
                            context: 'GET /:ticker/dividendsdate',
                            statusCode: 404,
                        });
                        return res.status(404).json({ message: 'No dividend data found for this ticker' });
                    }
                    // Lazy loading: send only first 5 unless ?all=true
                    let dividends: any[] = Array.isArray(data.dividends) ? [...data.dividends].reverse() : [];
                    const showAll = req.query.all === 'true';
                    const resultDividends = showAll ? dividends : dividends.slice(0, 4);
                    res.status(200).json(resultDividends);
                } catch (dbError: any) {
                    logger.error({
                        msg: 'Database error retrieving dividend dates',
                        ticker,
                        error: dbError.message,
                        stack: dbError.stack,
                        context: 'GET /:ticker/dividendsdate',
                        statusCode: 500,
                    });
                    if (dbError.name === 'MongoError' || dbError.name === 'MongoNetworkError') {
                        return res.status(503).json({
                            message: 'Database service unavailable',
                            error: 'Unable to connect to the database',
                        });
                    }
                    return res.status(500).json({
                        message: 'Internal Server Error',
                        error: 'Failed to retrieve dividend dates',
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError: any) {
                            logger.error({
                                msg: 'Error closing database connection',
                                error: closeError.message,
                                context: 'GET /:ticker/dividendsdate',
                                statusCode: 500,
                            });
                        }
                    }
                }
            } catch (unexpectedError: any) {
                const errObj = handleError(unexpectedError, 'GET /:ticker/dividendsdate', {}, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // Endpoint to get the price target for a symbol
    app.get('/pricetarget/:symbol', async (req: Request, res: Response) => {
        let client: typeof MongoClient | null = null;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /pricetarget/:symbol',
                    statusCode: 401,
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const symbol = sanitizeInput(req.params.symbol.toUpperCase());
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const assetInfoCollection = db.collection('AssetInfo');
            const doc: any = await assetInfoCollection.findOne(
                { Symbol: symbol },
                { projection: { IntrinsicValue: 1, _id: 0 } }
            );
            if (!doc || typeof doc.IntrinsicValue === 'undefined') {
                logger.warn({
                    msg: 'Price target not found',
                    symbol,
                    context: 'GET /pricetarget/:symbol',
                    statusCode: 404,
                });
                return res.status(404).json({ message: 'Price target not found' });
            }
            return res.status(200).json({ symbol, priceTarget: doc.IntrinsicValue });
        } catch (error: any) {
            logger.error({
                msg: 'Error retrieving price target',
                symbol: req.params.symbol,
                error: error.message,
                stack: error.stack,
                context: 'GET /pricetarget/:symbol',
                statusCode: 500,
            });
            const errObj = handleError(error, 'GET /pricetarget/:symbol', { symbol: req.params.symbol }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.error({
                        msg: 'Error closing database connection',
                        error: closeError.message,
                        context: 'GET /pricetarget/:symbol',
                        statusCode: 500,
                    });
                }
            }
        }
    });

    // Endpoint to save chart settings for a user
    app.post('/chart-settings', async (req: Request, res: Response) => {
        // Accept both lowercase and uppercase header
        const apiKey = req.header('x-api-key') || req.header('X-API-KEY');
        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            logger.warn({
                msg: 'Invalid API key',
                providedApiKey: sanitizedKey,
                expected: process.env.VITE_EREUNA_KEY,
                context: 'POST /chart-settings',
                statusCode: 401,
            });
            return res.status(401).json({ message: 'Unauthorized API Access' });
        }
        const user = req.query.user;
        if (!user) {
            return res.status(400).json({ message: 'Missing user query parameter' });
        }
        const { indicators, intrinsicValue } = req.body;
        if (!Array.isArray(indicators) || typeof intrinsicValue !== 'object') {
            return res.status(400).json({ message: 'Invalid payload' });
        }
        let client: typeof MongoClient | null = null;
        try {
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            // Find the user by Username
            const userDoc = await usersCollection.findOne({ Username: user });
            if (!userDoc) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Prepare the new ChartSettings array (replace or upsert)
            const newSettings = { indicators, intrinsicValue };
            // If ChartSettings exists, replace it; otherwise, create it
            await usersCollection.updateOne(
                { Username: user },
                { $set: { ChartSettings: newSettings } },
                { upsert: false }
            );
            res.status(200).json({ message: 'Chart settings saved successfully' });
        } catch (error: any) {
            logger.error({
                msg: 'Error saving chart settings',
                user,
                error: error.message,
                stack: error.stack,
                context: 'POST /chart-settings',
                statusCode: 500,
            });
            const errObj = handleError(error, 'POST /chart-settings', { user }, 500);
            res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.warn({
                        msg: 'Database Client Closure Failed',
                        error: closeError.message,
                        context: 'POST /chart-settings',
                        statusCode: 500,
                    });
                }
            }
        }
    });

    // Endpoint to get chart indicator settings for a user
    app.get('/:user/indicators', async (req: Request, res: Response) => {
        const apiKey = req.header('x-api-key') || req.header('X-API-KEY');
        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            logger.warn({
                msg: 'Invalid API key',
                providedApiKey: !!sanitizedKey,
                context: 'GET /:user/indicators',
                statusCode: 401,
            });
            return res.status(401).json({ message: 'Unauthorized API Access' });
        }
        const user = req.params.user;
        if (!user) {
            return res.status(400).json({ message: 'Missing user parameter' });
        }
        let client: typeof MongoClient | null = null;
        try {
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDoc = await usersCollection.findOne({ Username: user });
            if (!userDoc || !userDoc.ChartSettings) {
                return res.status(404).json({ message: 'ChartSettings not found for user' });
            }
            // Return the indicators array (or the whole ChartSettings if you want)
            return res.status(200).json(userDoc.ChartSettings.indicators || []);
        } catch (error: any) {
            logger.error({
                msg: 'Error retrieving chart indicators',
                user,
                error: error.message,
                stack: error.stack,
                context: 'GET /:user/indicators',
                statusCode: 500,
            });
            const errObj = handleError(error, 'GET /:user/indicators', { user }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.warn({
                        msg: 'Database Client Closure Failed',
                        error: closeError.message,
                        context: 'GET /:user/indicators',
                        statusCode: 500,
                    });
                }
            }
        }
    });

    // Endpoint to import symbols into a user's watchlist
    app.post('/:user/import/watchlist', async (req: Request, res: Response) => {
        const apiKey = req.header('x-api-key') || req.header('X-API-KEY');
        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            logger.warn({
                msg: 'Invalid API key',
                providedApiKey: sanitizedKey,
                expected: process.env.VITE_EREUNA_KEY,
                context: 'POST /:user/import/watchlist',
                statusCode: 401,
            });
            return res.status(401).json({ message: 'Unauthorized API Access' });
        }
        const user = req.params.user;
        if (!user) {
            return res.status(400).json({ message: 'Missing user parameter' });
        }
        const { watchlistName, symbols } = req.body;
        // Watchlist name validation: 3-25 chars, letters, numbers, underscores only
        const validNameRegex = /^[a-zA-Z0-9_]{3,25}$/;
        if (!watchlistName || typeof watchlistName !== 'string' || !validNameRegex.test(watchlistName)) {
            return res.status(400).json({ message: 'Invalid watchlist name' });
        }
        if (!Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ message: 'Invalid payload' });
        }
        // Backend validation for array of objects {ticker, exchange}
        const validSymbolRegex = /^[A-Z0-9]{1,20}$/i;
        const validExchangeRegex = /^[A-Z]{2,10}$/i;
        const sanitizedSymbols = symbols
            .map((s: any) => {
                if (typeof s === 'object' && s.ticker && s.exchange) {
                    const ticker = String(s.ticker).replace(/[^A-Z0-9]/gi, '').toUpperCase();
                    const exchange = String(s.exchange).replace(/[^A-Z]/gi, '').toUpperCase();
                    if (validSymbolRegex.test(ticker) && validExchangeRegex.test(exchange)) {
                        return { ticker, exchange };
                    }
                }
                return null;
            })
            .filter((s, i, arr) => s && arr.findIndex(o => o && o.ticker === s.ticker && o.exchange === s.exchange) === i);
        if (sanitizedSymbols.length === 0) {
            return res.status(400).json({ message: 'No valid symbols in payload' });
        }
        let client: typeof MongoClient | null = null;
        try {
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const watchlistsCollection = db.collection('Watchlists');
            // Find the watchlist by UsernameID and Name
            const watchlistDoc = await watchlistsCollection.findOne({ UsernameID: user, Name: watchlistName });
            if (!watchlistDoc) {
                return res.status(404).json({ message: 'Watchlist not found' });
            }
            // Update the List array with the sanitized symbol objects
            await watchlistsCollection.updateOne(
                { UsernameID: user, Name: watchlistName },
                { $set: { List: sanitizedSymbols } },
                { upsert: false }
            );
            res.status(200).json({ message: 'Watchlist imported successfully' });
        } catch (error: any) {
            logger.error({
                msg: 'Error importing watchlist',
                user,
                watchlistName,
                error: error.message,
                stack: error.stack,
                context: 'POST /:user/import/watchlist',
                statusCode: 500,
            });
            const errObj = handleError(error, 'POST /:user/import/watchlist', { user, watchlistName }, 500);
            res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.warn({
                        msg: 'Database Client Closure Failed',
                        error: closeError.message,
                        context: 'POST /:user/import/watchlist',
                        statusCode: 500,
                    });
                }
            }
        }
    });

};