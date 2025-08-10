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

                let data = {
                    ohlc: [],
                    volume: [],
                    MA1: [],
                    MA2: [],
                    MA3: [],
                    MA4: []
                };

                switch (timeframe) {
                    case 'daily': {
                        const dailyColl = db.collection('OHCLVData');
                        const dailyData = await dailyColl.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();
                        data.ohlc = dailyData.length ? dailyData.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 10),
                            open: parseFloat(item.open.toString().slice(0, 8)),
                            high: parseFloat(item.high.toString().slice(0, 8)),
                            low: parseFloat(item.low.toString().slice(0, 8)),
                            close: parseFloat(item.close.toString().slice(0, 8)),
                        })) : [];
                        data.volume = dailyData.length ? dailyData.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 10),
                            value: item.volume,
                        })) : [];
                        data.MA1 = dailyData.length ? calcMA(dailyData, 10) : [];
                        data.MA2 = dailyData.length ? calcMA(dailyData, 20) : [];
                        data.MA3 = dailyData.length ? calcMA(dailyData, 50) : [];
                        data.MA4 = dailyData.length ? calcMA(dailyData, 200) : [];
                        break;
                    }
                    case 'weekly': {
                        const weeklyColl = db.collection('OHCLVData2');
                        const weeklyData = await weeklyColl.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();
                        data.ohlc = weeklyData.length ? weeklyData.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 10),
                            open: parseFloat(item.open.toString().slice(0, 8)),
                            high: parseFloat(item.high.toString().slice(0, 8)),
                            low: parseFloat(item.low.toString().slice(0, 8)),
                            close: parseFloat(item.close.toString().slice(0, 8)),
                        })) : [];
                        data.volume = weeklyData.length ? weeklyData.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 10),
                            value: item.volume,
                        })) : [];
                        data.MA1 = weeklyData.length ? calcMA(weeklyData, 10) : [];
                        data.MA2 = weeklyData.length ? calcMA(weeklyData, 20) : [];
                        data.MA3 = weeklyData.length ? calcMA(weeklyData, 50) : [];
                        data.MA4 = weeklyData.length ? calcMA(weeklyData, 200) : [];
                        break;
                    }
                    case 'intraday1m': {
                        const coll = db.collection('OHCLVData1m');
                        const arr = await coll.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();
                        data.ohlc = arr.length ? arr.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 19),
                            open: parseFloat(item.open.toString().slice(0, 8)),
                            high: parseFloat(item.high.toString().slice(0, 8)),
                            low: parseFloat(item.low.toString().slice(0, 8)),
                            close: parseFloat(item.close.toString().slice(0, 8)),
                        })) : [];
                        data.volume = arr.length ? arr.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 19),
                            value: item.volume,
                        })) : [];
                        data.MA1 = arr.length ? calcMA(arr, 10, 'datetime') : [];
                        data.MA2 = arr.length ? calcMA(arr, 20, 'datetime') : [];
                        data.MA3 = arr.length ? calcMA(arr, 50, 'datetime') : [];
                        data.MA4 = arr.length ? calcMA(arr, 200, 'datetime') : [];
                        break;
                    }
                    case 'intraday5m': {
                        const coll = db.collection('OHCLVData5m');
                        const arr = await coll.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();
                        data.ohlc = arr.length ? arr.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 16),
                            open: parseFloat(item.open.toString().slice(0, 8)),
                            high: parseFloat(item.high.toString().slice(0, 8)),
                            low: parseFloat(item.low.toString().slice(0, 8)),
                            close: parseFloat(item.close.toString().slice(0, 8)),
                        })) : [];
                        data.volume = arr.length ? arr.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 16),
                            value: item.volume,
                        })) : [];
                        data.MA1 = arr.length ? calcMA(arr, 10, 'datetime') : [];
                        data.MA2 = arr.length ? calcMA(arr, 20, 'datetime') : [];
                        data.MA3 = arr.length ? calcMA(arr, 50, 'datetime') : [];
                        data.MA4 = arr.length ? calcMA(arr, 200, 'datetime') : [];
                        break;
                    }
                    case 'intraday15m': {
                        const coll = db.collection('OHCLVData15m');
                        const arr = await coll.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();
                        data.ohlc = arr.length ? arr.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 16),
                            open: parseFloat(item.open.toString().slice(0, 8)),
                            high: parseFloat(item.high.toString().slice(0, 8)),
                            low: parseFloat(item.low.toString().slice(0, 8)),
                            close: parseFloat(item.close.toString().slice(0, 8)),
                        })) : [];
                        data.volume = arr.length ? arr.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 16),
                            value: item.volume,
                        })) : [];
                        data.MA1 = arr.length ? calcMA(arr, 10, 'datetime') : [];
                        data.MA2 = arr.length ? calcMA(arr, 20, 'datetime') : [];
                        data.MA3 = arr.length ? calcMA(arr, 50, 'datetime') : [];
                        data.MA4 = arr.length ? calcMA(arr, 200, 'datetime') : [];
                        break;
                    }
                    case 'intraday30m': {
                        const coll = db.collection('OHCLVData30m');
                        const arr = await coll.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();
                        data.ohlc = arr.length ? arr.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 16),
                            open: parseFloat(item.open.toString().slice(0, 8)),
                            high: parseFloat(item.high.toString().slice(0, 8)),
                            low: parseFloat(item.low.toString().slice(0, 8)),
                            close: parseFloat(item.close.toString().slice(0, 8)),
                        })) : [];
                        data.volume = arr.length ? arr.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 16),
                            value: item.volume,
                        })) : [];
                        data.MA1 = arr.length ? calcMA(arr, 10, 'datetime') : [];
                        data.MA2 = arr.length ? calcMA(arr, 20, 'datetime') : [];
                        data.MA3 = arr.length ? calcMA(arr, 50, 'datetime') : [];
                        data.MA4 = arr.length ? calcMA(arr, 200, 'datetime') : [];
                        break;
                    }
                    case 'intraday1hr': {
                        const coll = db.collection('OHCLVData1hr');
                        const arr = await coll.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();
                        data.ohlc = arr.length ? arr.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 16),
                            open: parseFloat(item.open.toString().slice(0, 8)),
                            high: parseFloat(item.high.toString().slice(0, 8)),
                            low: parseFloat(item.low.toString().slice(0, 8)),
                            close: parseFloat(item.close.toString().slice(0, 8)),
                        })) : [];
                        data.volume = arr.length ? arr.map(item => ({
                            time: item.timestamp.toISOString().slice(0, 16),
                            value: item.volume,
                        })) : [];
                        data.MA1 = arr.length ? calcMA(arr, 10, 'datetime') : [];
                        data.MA2 = arr.length ? calcMA(arr, 20, 'datetime') : [];
                        data.MA3 = arr.length ? calcMA(arr, 50, 'datetime') : [];
                        data.MA4 = arr.length ? calcMA(arr, 200, 'datetime') : [];
                        break;
                    }
                    default: {
                        return res.status(400).json({ message: 'Invalid timeframe' });
                    }
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

};