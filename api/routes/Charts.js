export default function (app, deps) {
    const {
        validate,
        validationSchemas,
        validationSets,
        sanitizeInput,
        logger,
        MongoClient,
        uri
    } = deps;

    //endpoint to display info results
    app.get('/chart/:identifier', validate([
        validationSchemas.identifier()
    ]),
        async (req, res) => {
            const identifier = req.params.identifier.toUpperCase();
            const apiKey = req.header('x-api-key');
            let client;

            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', {
                    providedApiKey: !!sanitizedKey
                });

                return res.status(401).json({
                    message: 'Unauthorized API Access'
                });
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

                    // If found by ISIN, get the corresponding Symbol
                    if (isinAsset) {
                        assetInfo = await collection.findOne({ Symbol: isinAsset.Symbol });
                    }
                }

                if (!assetInfo) {
                    // Log not found scenario
                    logger.warn({
                        msg: 'Chart Data Retrieval Failed',
                        reason: 'Asset not found',
                        identifier: identifier
                    });

                    return res.status(404).json({ message: 'Asset not found' });
                }

                res.json(assetInfo);
            } catch (error) {
                // Error logging
                logger.error({
                    msg: 'Chart Data Retrieval Error',
                    error: error.message,
                    identifier: identifier
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            error: closeError.message
                        });
                    }
                }
            }
        }
    );


    // Unified endpoint for all chart data (daily & weekly OHLC, volume, MAs)
    app.get('/:ticker/chartdata',
        validate(validationSets.chartData),
        async (req, res) => {
            const ticker = sanitizeInput(req.params.ticker.toUpperCase());
            const timeframe = req.query.timeframe || 'daily';
            const before = req.query.before; // New: for lazy loading older data
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');

                // Helper for MA
                function calcMA(Data, period, timeType = 'date') {
                    if (Data.length < period) return [];
                    const arr = [];
                    for (let i = period - 1; i < Data.length; i++) {
                        const sum = Data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0);
                        const average = sum / period;
                        arr.push({
                            time: timeType === 'datetime' ? Data[i].timestamp.toISOString().slice(0, 19) : Data[i].timestamp.toISOString().slice(0, 10),
                            value: parseFloat(average.toFixed(2)),
                        });
                    }
                    return arr;
                }


                // Helper for EMA
                function calcEMA(Data, period, timeType = 'date') {
                    if (Data.length < period) return [];
                    const arr = [];
                    let k = 2 / (period + 1);
                    let emaPrev = Data.slice(0, period).reduce((acc, curr) => acc + curr.close, 0) / period;
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
                let chartSettings = null;
                if (req.query.user) {
                    const usersCollection = db.collection('Users');
                    const userDoc = await usersCollection.findOne({ Username: req.query.user });
                    if (userDoc && userDoc.ChartSettings) {
                        chartSettings = userDoc.ChartSettings;
                    }
                }

                // Helper to get correct data collection and time format
                let coll, timeFormat;
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
                let arr;
                if (timeframe === 'daily') {
                    let query = { tickerID: ticker };
                    if (before) {
                        // Parse before as ISO date string
                        let beforeDate = new Date(before);
                        if (!isNaN(beforeDate.getTime())) {
                            query.timestamp = { $lt: beforeDate };
                        }
                    }
                    arr = await coll.find(query)
                        .sort({ timestamp: -1 }) // Most recent first
                        .limit(1250)
                        .toArray();
                    arr = arr.reverse(); // Oldest first for chart
                } else if (timeframe === 'weekly') {
                    let query = { tickerID: ticker };
                    if (before) {
                        let beforeDate = new Date(before);
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
                let data = {
                    ohlc: arr.length ? arr.map(item => ({
                        time: timeFormat === 'datetime' ? item.timestamp.toISOString().slice(0, 19) : item.timestamp.toISOString().slice(0, 10),
                        open: parseFloat(item.open.toString().slice(0, 8)),
                        high: parseFloat(item.high.toString().slice(0, 8)),
                        low: parseFloat(item.low.toString().slice(0, 8)),
                        close: parseFloat(item.close.toString().slice(0, 8)),
                    })) : [],
                    volume: arr.length ? arr.map(item => ({
                        time: timeFormat === 'datetime' ? item.timestamp.toISOString().slice(0, 19) : item.timestamp.toISOString().slice(0, 10),
                        value: item.volume,
                    })) : []
                };

                // Always use user settings if present, even if indicators is empty or all invisible
                if (chartSettings) {
                    if (Array.isArray(chartSettings.indicators)) {
                        chartSettings.indicators.forEach((indicator, idx) => {
                            if (!indicator.visible) return;
                            let maArr = [];
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

                res.json(data);

            } catch (error) {
                logger.error({
                    msg: 'Unified Chart Data Retrieval Error',
                    ticker: ticker,
                    error: error.message
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } finally {
                if (client) await client.close();
            }
        }
    );

    // sends data to chart2.vue component in the screener
    app.get('/:ticker/chartdata-dl',
        validate(validationSets.chartData),
        async (req, res) => {
            const ticker = sanitizeInput(req.params.ticker.toUpperCase());
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                // Only fetch daily data from OHCLVData
                const dailyColl = db.collection('OHCLVData');
                const dailyData = await dailyColl.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();
                // Helper for MA
                function calcMA(Data, period) {
                    if (Data.length < period) return [];
                    const arr = [];
                    for (let i = period - 1; i < Data.length; i++) {
                        const sum = Data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0);
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
                    ohlc: dailyData.length ? dailyData.map(item => ({
                        time: item.timestamp.toISOString().slice(0, 10),
                        open: parseFloat(item.open.toString().slice(0, 8)),
                        high: parseFloat(item.high.toString().slice(0, 8)),
                        low: parseFloat(item.low.toString().slice(0, 8)),
                        close: parseFloat(item.close.toString().slice(0, 8)),
                    })) : [],
                    volume: dailyData.length ? dailyData.map(item => ({
                        time: item.timestamp.toISOString().slice(0, 10),
                        value: item.volume,
                    })) : [],
                    MA10: dailyData.length ? calcMA(dailyData, 10) : [],
                    MA20: dailyData.length ? calcMA(dailyData, 20) : [],
                    MA50: dailyData.length ? calcMA(dailyData, 50) : [],
                    MA200: dailyData.length ? calcMA(dailyData, 200) : [],
                };
                // Only send daily data
                res.json({ daily });
            } catch (error) {
                logger.error({
                    msg: 'Unified Chart Data Retrieval Error',
                    ticker: ticker,
                    error: error.message
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } finally {
                if (client) await client.close();
            }
        }
    );

    // sends data to chart1.vue component in the screener
    app.get('/:ticker/chartdata-wk',
        validate(validationSets.chartData),
        async (req, res) => {
            const ticker = sanitizeInput(req.params.ticker.toUpperCase());
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                // Only fetch weekly data from OHCLVData2
                const weeklyColl = db.collection('OHCLVData2');
                const weeklyData = await weeklyColl.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();
                // Helper for MA
                function calcMA(Data, period) {
                    if (Data.length < period) return [];
                    const arr = [];
                    for (let i = period - 1; i < Data.length; i++) {
                        const sum = Data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0);
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
                    ohlc: weeklyData.length ? weeklyData.map(item => ({
                        time: item.timestamp.toISOString().slice(0, 10),
                        open: parseFloat(item.open.toString().slice(0, 8)),
                        high: parseFloat(item.high.toString().slice(0, 8)),
                        low: parseFloat(item.low.toString().slice(0, 8)),
                        close: parseFloat(item.close.toString().slice(0, 8)),
                    })) : [],
                    volume: weeklyData.length ? weeklyData.map(item => ({
                        time: item.timestamp.toISOString().slice(0, 10),
                        value: item.volume,
                    })) : [],
                    MA10: weeklyData.length ? calcMA(weeklyData, 10) : [],
                    MA20: weeklyData.length ? calcMA(weeklyData, 20) : [],
                    MA50: weeklyData.length ? calcMA(weeklyData, 50) : [],
                    MA200: weeklyData.length ? calcMA(weeklyData, 200) : [],
                };
                // Only send weekly data
                res.json({ weekly });
            } catch (error) {
                logger.error({
                    msg: 'Weekly Chart Data Retrieval Error',
                    ticker: ticker,
                    error: error.message
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } finally {
                if (client) await client.close();
            }
        }
    );

    // Sends earnings date 
    app.get('/:ticker/earningsdate',
        validate([
            validationSchemas.chartData('ticker')
        ]),
        async (req, res) => {
            try {
                const apiKey = req.header('x-api-key');

                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn('Invalid API key', {
                        providedApiKey: !!sanitizedKey
                    });

                    return res.status(401).json({
                        message: 'Unauthorized API Access'
                    });
                }
                // Sanitize and validate ticker
                const ticker = sanitizeInput(req.params.ticker).toUpperCase();

                const client = new MongoClient(uri);

                try {
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('AssetInfo');

                    // Find data with logging
                    const Data = await collection.find({ Symbol: ticker }).toArray();

                    // Log if no data found
                    if (Data.length === 0) {
                        logger.warn('No earnings data found', {
                            ticker: ticker
                        });
                        return res.status(404).json({
                            message: 'No earnings data found for this ticker'
                        });
                    }

                    // Process and format earnings dates
                    const formattedData = Data.flatMap(item => {
                        // Safely handle quarterlyIncome in case it's undefined
                        if (!item.quarterlyIncome || !Array.isArray(item.quarterlyIncome)) {
                            return [];
                        }

                        return item.quarterlyIncome.map(quarterly => {
                            try {
                                const date = new Date(quarterly.fiscalDateEnding);

                                // Validate date
                                if (isNaN(date.getTime())) {
                                    logger.warn('Invalid date in earnings data', {
                                        ticker: ticker,
                                        originalDate: quarterly.fiscalDateEnding
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
                            } catch (dateError) {
                                logger.error('Error processing date', {
                                    ticker: ticker,
                                    error: dateError.message
                                });
                                return null;
                            }
                        }).filter(entry => entry !== null); // Remove invalid entries
                    });

                    // Send formatted data
                    res.status(200).json(formattedData);

                } catch (dbError) {
                    // Log database-specific errors
                    logger.error('Database error retrieving earnings dates', {
                        ticker: ticker,
                        error: dbError.message,
                        stack: dbError.stack
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
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.error('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }

            } catch (unexpectedError) {
                // Catch any unexpected errors in the main try block
                logger.error('Unexpected error in earnings date retrieval', {
                    error: unexpectedError.message,
                    stack: unexpectedError.stack
                });

                return res.status(500).json({
                    message: 'Internal Server Error',
                    error: 'An unexpected error occurred'
                });
            }
        }
    );

    // Sends splits date 
    app.get('/:ticker/splitsdate',
        validate([
            validationSchemas.chartData('ticker')
        ]),
        async (req, res) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn('Invalid API key', {
                        providedApiKey: !!sanitizedKey
                    });

                    return res.status(401).json({
                        message: 'Unauthorized API Access'
                    });
                }

                const ticker = sanitizeInput(req.params.ticker).toUpperCase();

                const client = new MongoClient(uri);

                try {
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('AssetInfo');

                    const data = await collection.findOne({ Symbol: ticker });

                    if (!data || !data.splits) {
                        return res.status(404).json({
                            message: 'No splits data found for this ticker'
                        });
                    }

                    const splits = data.splits.reverse();

                    res.status(200).json(splits);

                } catch (dbError) {
                    logger.error('Database error retrieving splits dates', {
                        ticker: ticker,
                        error: dbError.message,
                        stack: dbError.stack
                    });

                    if (dbError.name === 'MongoError' || dbError.name === 'MongoNetworkError') {
                        return res.status(503).json({
                            message: 'Database service unavailable',
                            error: 'Unable to connect to the database'
                        });
                    }

                    return res.status(500).json({
                        message: 'Internal Server Error',
                        error: 'Failed to retrieve splits dates'
                    });

                } finally {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.error('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }

            } catch (unexpectedError) {
                logger.error('Unexpected error in splits date retrieval', {
                    error: unexpectedError.message,
                    stack: unexpectedError.stack
                });

                return res.status(500).json({
                    message: 'Internal Server Error',
                    error: 'An unexpected error occurred'
                });
            }
        }
    );

    // Sends dividend dates
    app.get('/:ticker/dividendsdate',
        validate([
            validationSchemas.chartData('ticker')
        ]),
        async (req, res) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn('Invalid API key', {
                        providedApiKey: !!sanitizedKey
                    });

                    return res.status(401).json({
                        message: 'Unauthorized API Access'
                    });
                }

                const ticker = sanitizeInput(req.params.ticker).toUpperCase();

                const client = new MongoClient(uri);

                try {
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('AssetInfo');

                    const data = await collection.findOne({ Symbol: ticker });

                    if (!data || !data.dividends) {
                        return res.status(404).json({
                            message: 'No dividend data found for this ticker'
                        });
                    }

                    const dividends = data.dividends.reverse();

                    res.status(200).json(dividends);

                } catch (dbError) {
                    logger.error('Database error retrieving dividend dates', {
                        ticker: ticker,
                        error: dbError.message,
                        stack: dbError.stack
                    });

                    if (dbError.name === 'MongoError' || dbError.name === 'MongoNetworkError') {
                        return res.status(503).json({
                            message: 'Database service unavailable',
                            error: 'Unable to connect to the database'
                        });
                    }

                    return res.status(500).json({
                        message: 'Internal Server Error',
                        error: 'Failed to retrieve dividend dates'
                    });

                } finally {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.error('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }

            } catch (unexpectedError) {
                logger.error('Unexpected error in dividend date retrieval', {
                    error: unexpectedError.message,
                    stack: unexpectedError.stack
                });

                return res.status(500).json({
                    message: 'Internal Server Error',
                    error: 'An unexpected error occurred'
                });
            }
        }
    );

    // Endpoint to get the price target for a symbol
    app.get('/pricetarget/:symbol', async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            const symbol = sanitizeInput(req.params.symbol.toUpperCase());

            client = new MongoClient(uri);
            await client.connect();

            const db = client.db('EreunaDB');
            const assetInfoCollection = db.collection('AssetInfo');

            const doc = await assetInfoCollection.findOne(
                { Symbol: symbol },
                { projection: { IntrinsicValue: 1, _id: 0 } }
            );

            if (!doc || typeof doc.IntrinsicValue === 'undefined') {
                return res.status(404).json({ message: 'Price target not found' });
            }

            return res.status(200).json({ symbol, priceTarget: doc.IntrinsicValue });
        } catch (error) {
            logger.error({
                msg: 'Error retrieving price target',
                symbol: req.params.symbol,
                error: error.message
            });
            return res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            if (client) await client.close();
        }
    });

    // Endpoint to save chart settings for a user
    app.post('/chart-settings', async (req, res) => {
        // Accept both lowercase and uppercase header
        const apiKey = req.header('x-api-key') || req.header('X-API-KEY');
        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            logger.warn('Invalid API key', { providedApiKey: sanitizedKey, expected: process.env.VITE_EREUNA_KEY });
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

        let client;
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
        } catch (error) {
            logger.error({
                msg: 'Error saving chart settings',
                user,
                error: error.message
            });
            res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    logger.warn({
                        msg: 'Database Client Closure Failed',
                        error: closeError.message
                    });
                }
            }
        }
    });

    // Endpoint to get chart indicator settings for a user
    app.get('/:user/indicators', async (req, res) => {
        const apiKey = req.header('x-api-key') || req.header('X-API-KEY');
        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
            return res.status(401).json({ message: 'Unauthorized API Access' });
        }

        const user = req.params.user;
        if (!user) {
            return res.status(400).json({ message: 'Missing user parameter' });
        }

        let client;
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
        } catch (error) {
            logger.error({
                msg: 'Error retrieving chart indicators',
                user,
                error: error.message
            });
            return res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    logger.warn({
                        msg: 'Database Client Closure Failed',
                        error: closeError.message
                    });
                }
            }
        }
    });

    // Endpoint to import symbols into a user's watchlist
    app.post('/:user/import/watchlist', async (req, res) => {
        const apiKey = req.header('x-api-key') || req.header('X-API-KEY');
        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            logger.warn('Invalid API key', { providedApiKey: sanitizedKey, expected: process.env.VITE_EREUNA_KEY });
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
        // Backend symbol validation: only allow A-Z, 0-9, max 20 chars, no spaces or special chars
        const validSymbolRegex = /^[A-Z0-9]{1,20}$/i;
        const sanitizedSymbols = symbols
            .map(s => typeof s === 'string' ? s.replace(/[^A-Z0-9]/gi, '').toUpperCase() : '')
            .filter((s, i, arr) => validSymbolRegex.test(s) && arr.indexOf(s) === i);
        if (sanitizedSymbols.length === 0) {
            return res.status(400).json({ message: 'No valid symbols in payload' });
        }

        let client;
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
            // Update the List array with the sanitized symbols
            await watchlistsCollection.updateOne(
                { UsernameID: user, Name: watchlistName },
                { $set: { List: sanitizedSymbols } },
                { upsert: false }
            );

            res.status(200).json({ message: 'Watchlist imported successfully' });
        } catch (error) {
            logger.error({
                msg: 'Error importing watchlist',
                user,
                watchlistName,
                error: error.message
            });
            res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    logger.warn({
                        msg: 'Database Client Closure Failed',
                        error: closeError.message
                    });
                }
            }
        }
    });

};