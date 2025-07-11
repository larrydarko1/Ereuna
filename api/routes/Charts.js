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

    // endpoint for OHLC and Volume data for Daily chart
    app.get('/:ticker/data',
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
                const collection = db.collection('OHCLVData');
                const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

                if (Data.length === 0) {
                    logger.warn({ msg: 'No Chart Data Found', ticker: ticker });
                    return res.status(404).json({ message: 'No data found for this ticker' });
                }

                // Format OHLC data
                const ohlc = Data.map(item => ({
                    time: item.timestamp.toISOString().slice(0, 10),
                    open: parseFloat(item.open.toString().slice(0, 8)),
                    high: parseFloat(item.high.toString().slice(0, 8)),
                    low: parseFloat(item.low.toString().slice(0, 8)),
                    close: parseFloat(item.close.toString().slice(0, 8)),
                }));

                // Format Volume data
                const volume = Data.map(item => ({
                    time: item.timestamp.toISOString().slice(0, 10),
                    value: item.volume,
                }));

                res.json({ ohlc, volume });

            } catch (error) {
                logger.error({
                    msg: 'Chart Data Retrieval Error',
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

    // Endpoint to retrieve daily moving averages for a ticker
    app.get('/:ticker/data3',
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
                const collection = db.collection('OHCLVData');
                const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

                if (Data.length === 0) {
                    logger.warn({ msg: 'No Moving Average Data Found', ticker: ticker });
                    return res.status(404).json({ message: 'No data found for this ticker' });
                }

                // Helper to calculate moving average
                function calcMA(period) {
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

                res.json({
                    MA10: calcMA(10),
                    MA20: calcMA(20),
                    MA50: calcMA(50),
                    MA200: calcMA(200),
                });

            } catch (error) {
                logger.error({ msg: 'Moving Average Data Retrieval Error', ticker: ticker, error: error.message });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } finally {
                if (client) await client.close();
            }
        }
    );

    //Weekly OHCLV Data
    app.get('/:ticker/data7',
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
                const collection = db.collection('OHCLVData2');
                const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

                if (Data.length === 0) {
                    logger.warn({ msg: 'No Weekly Chart Data Found', ticker: ticker });
                    return res.status(404).json({ message: 'No weekly data found for this ticker' });
                }

                // Format OHLC data
                const ohlc2 = Data.map(item => ({
                    time: item.timestamp.toISOString().slice(0, 10),
                    open: parseFloat(item.open.toString().slice(0, 8)),
                    high: parseFloat(item.high.toString().slice(0, 8)),
                    low: parseFloat(item.low.toString().slice(0, 8)),
                    close: parseFloat(item.close.toString().slice(0, 8)),
                }));

                // Format Volume data
                const volume2 = Data.map(item => ({
                    time: item.timestamp.toISOString().slice(0, 10),
                    value: item.volume,
                }));

                res.json({ ohlc2, volume2 });

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

    // Combined endpoint for Weekly Moving Averages (10, 20, 50, 200)
    app.get('/:ticker/data9',
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
                const collection = db.collection('OHCLVData2');
                const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

                if (Data.length === 0) {
                    logger.warn({ msg: 'No Weekly MA Data Found', ticker: ticker });
                    return res.status(404).json({ message: 'No data found for this ticker' });
                }

                // Helper to calculate moving average
                function calcMA(period) {
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

                res.json({
                    MA10: calcMA(10),
                    MA20: calcMA(20),
                    MA50: calcMA(50),
                    MA200: calcMA(200),
                });

            } catch (error) {
                logger.error({ msg: 'Weekly MA Data Retrieval Error', ticker: ticker, error: error.message });
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
                { projection: { PriceTarget: 1, _id: 0 } }
            );

            if (!doc || typeof doc.PriceTarget === 'undefined') {
                return res.status(404).json({ message: 'Price target not found' });
            }

            return res.status(200).json({ symbol, priceTarget: doc.PriceTarget });
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