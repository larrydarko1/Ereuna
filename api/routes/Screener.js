import { body, param } from '../utils/validationUtils.js';

export default function (app, deps) {
    const {
        validate,
        validationSchemas,
        validationSets,
        sanitizeInput,
        logger,
        obfuscateUsername,
        MongoClient,
        uri,
        crypto,
        query
    } = deps;

    // endpoint that handles creation of new screeners 
    app.post('/:user/create/screener/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.screenerName()
        ]),
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method
            });

            let client;
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
                const user = sanitizeInput(req.params.user);
                const list = sanitizeInput(req.params.list);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                // Check the number of existing screeners for this user
                const screenerCount = await collection.countDocuments({ UsernameID: user });
                if (screenerCount >= 20) {
                    requestLogger.warn('Attempt to create screener beyond limit', {
                        user: obfuscateUsername(user),
                        screenerCount: screenerCount
                    });
                    return res.status(400).json({
                        message: 'Maximum number of screeners (20) has been reached'
                    });
                }

                // Check if a screener with the same name and username already exists
                const existingScreener = await collection.findOne({ UsernameID: user, Name: list });
                if (existingScreener) {
                    requestLogger.warn('Attempt to create duplicate screener', {
                        user: obfuscateUsername(user),
                        screenerName: '[masked]'
                    });
                    return res.status(400).json({
                        message: 'Screener with the same name already exists'
                    });
                }

                // Create a new screener document
                const screenerDoc = {
                    UsernameID: user,
                    Name: list,
                    Include: true,
                    CreatedAt: new Date(),
                };

                const result = await collection.insertOne(screenerDoc);

                // Check if insertion was successful
                if (result.insertedCount === 1 || result.acknowledged) {
                    return res.json({
                        message: 'Screener created successfully',
                        screenerCount: screenerCount + 1
                    });
                } else {
                    requestLogger.error('Failed to create screener', {
                        user: obfuscateUsername(user),
                        screenerName: '[masked]'
                    });
                    return res.status(500).json({ message: 'Failed to create screener' });
                }
            } catch (error) {
                requestLogger.error('Error creating screener', {
                    error: error.message,
                    stack: error.stack
                });
                return res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                // Ensure client is closed if it was opened
                if (client) {
                    await client.close();
                }
            }
        });

    // endpoint that renames selected screener
    app.patch('/:user/rename/screener',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.oldname(),
            validationSchemas.newname()
        ]),
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method
            });

            let client;
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
                const oldname = sanitizeInput(req.body.oldname);
                const newname = sanitizeInput(req.body.newname);
                const Username = sanitizeInput(req.params.user);

                // Check if new name is provided and different from old name
                if (!newname) {
                    requestLogger.warn('Attempt to rename screener with empty name', {
                        user: obfuscateUsername(Username),
                        oldname: '[masked]'
                    });
                    return res.status(400).json({ message: 'Please provide a new name' });
                }

                if (oldname === newname) {
                    requestLogger.warn('Attempt to rename screener with same name', {
                        user: obfuscateUsername(Username),
                        screenerName: '[masked]'
                    });
                    return res.status(400).json({
                        message: 'New name must be different from the current name'
                    });
                }

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                // Check if a screener with the new name already exists
                const existingScreener = await collection.findOne({
                    UsernameID: Username,
                    Name: newname
                });

                if (existingScreener) {
                    requestLogger.warn('Attempt to create duplicate screener name', {
                        user: obfuscateUsername(Username),
                        screenerName: '[masked]'
                    });
                    return res.status(400).json({
                        message: 'A screener with this name already exists'
                    });
                }

                const filter = { UsernameID: Username, Name: oldname };
                const updateDoc = { $set: { Name: newname } };

                const result = await collection.updateOne(filter, updateDoc);

                // Check if any document was modified
                if (result.modifiedCount === 0) {
                    requestLogger.warn('Screener not found for renaming', {
                        user: obfuscateUsername(Username),
                        oldname: '[masked]'
                    });
                    return res.status(404).json({ message: 'Screener not found' });
                }

                // Send success response
                return res.json({ message: 'Screener renamed successfully' });
            } catch (error) {
                requestLogger.error('Error renaming screener', {
                    error: error.message,
                    stack: error.stack
                });
                return res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                // Ensure client is closed if it was opened
                if (client) {
                    await client.close();
                }
            }
        });

    // endpoint that deletes selected screener 
    app.delete('/:user/delete/screener/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.screenerName()
        ]),
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method
            });

            let client;
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
                const user = sanitizeInput(req.params.user);
                const list = sanitizeInput(req.params.list);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                const filter = { Name: list, UsernameID: user };

                const result = await collection.deleteOne(filter);

                if (result.deletedCount === 0) {
                    requestLogger.warn('Screener not found for deletion', {
                        user: obfuscateUsername(user),
                        screenerName: '[masked]'
                    });
                    return res.status(404).json({ message: 'Screener not found' });
                }

                res.json({ message: 'Screener deleted successfully' });
            } catch (error) {
                requestLogger.error('Error deleting screener', {
                    error: error.message,
                    stack: error.stack
                });
                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                // Ensure client is closed if it was opened
                if (client) {
                    await client.close();
                }
            }
        });

    // Map frontend keys to backend fields
    const fieldMap = {
        name: 'Name',
        perc_change: 'todaychange',
        price: 'Close',
        sector: 'Sector',
        exchange: 'Exchange',
        dividend_yield: 'DividendYield',
        rs_score1m: 'RSScore1M',
        rs_score4m: 'RSScore4M',
        rs_score1w: 'RSScore1W',
        eps: 'EPS',
        country: 'Country',
        adv1w: 'ADV1W',
        adv1m: 'ADV1M',
        adv4m: 'ADV4M',
        adv1y: 'ADV1Y',
        market_cap: 'MarketCapitalization',
        volume: 'Volume',
        ipo: 'IPO',
        assettype: 'AssetType',
        pe_ratio: 'PERatio',
        ps_ratio: 'PriceToSalesRatioTTM',
        fcf: 'FCF',
        cash: 'Cash',
        current_debt: 'CurrentDebt',
        current_assets: 'CurrentAssets',
        current_liabilities: 'CurrentLiabilities',
        current_ratio: 'CurrentRatio',
        roe: 'ROE',
        roa: 'ROA',
        peg: 'PEGRatio',
        currency: 'Currency',
        pb_ratio: 'PriceToBookRatio',
        industry: 'Industry',
        book_value: 'BookValue',
        shares: 'SharesOutstanding',
        all_time_high: 'AlltimeHigh',
        low_52w: 'fiftytwoWeekLow',
        high_52w: 'fiftytwoWeekHigh',
        all_time_low: 'AlltimeLow',
        gap: 'Gap',
        ev: 'EV',
        rsi: 'RSI',
        intrinsic_value: 'IntrinsicValue',
        isin: 'ISIN'
    };

    // endpoint that sends filtered database data into screener results (minus hidden list for user)
    app.get('/:user/screener/results/all',
        validate([
            validationSchemas.userParam('user')
        ]),
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method
            });

            let client;
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
                const user = sanitizeInput(req.params.user);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');

                // Find the user document and extract the 'Hidden' array
                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: user });

                if (!userDoc) {
                    requestLogger.warn('User not found', {
                        user: obfuscateUsername(user)
                    });
                    return res.status(404).json({ message: 'User not found' });
                }

                const hiddenSymbols = userDoc.Hidden || [];

                // Build projection based on Table array
                const projection = { Symbol: 1, _id: 0 };
                if (Array.isArray(userDoc.Table)) {
                    userDoc.Table.forEach(key => {
                        if (fieldMap[key]) {
                            if (key === 'price') {
                                // Special handling for Close
                                projection['Close'] = { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] };
                            } else if (key === 'volume') {
                                // Special handling for Volume
                                projection['Volume'] = { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "5. volume", input: "$$item.v" } } } }, 0] };
                            } else if ([
                                'fcf', 'cash', 'current_debt', 'current_assets', 'current_liabilities', 'current_ratio', 'roe', 'roa'
                            ].includes(key)) {
                                // Special handling for quarterlyFinancials fields
                                const qfMap = {
                                    fcf: 'freeCashFlow',
                                    cash: 'cashAndEq',
                                    current_debt: 'debtCurrent',
                                    current_assets: 'assetsCurrent',
                                    current_liabilities: 'liabilitiesCurrent',
                                    current_ratio: 'currentRatio',
                                    roe: 'roe',
                                    roa: 'roa',
                                };
                                const field = qfMap[key];
                                if (field) {
                                    projection[qfMap[key]] = { $ifNull: [{ $getField: { field: qfMap[key], input: { $arrayElemAt: ['$quarterlyFinancials', 0] } } }, null] };
                                }
                            } else {
                                projection[fieldMap[key]] = 1;
                            }
                        }
                    });
                }

                // Filter the AssetInfo collection using the 'Hidden' array
                const assetInfoCollection = db.collection('AssetInfo');
                const filteredAssets = await assetInfoCollection.find(
                    { Symbol: { $nin: hiddenSymbols } },
                    { projection }
                ).toArray();

                res.json(filteredAssets);
            } catch (error) {
                requestLogger.error('Error fetching screener results', {
                    error: error.message,
                    stack: error.stack
                });
                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                // Ensure client is closed if it was opened
                if (client) {
                    await client.close();
                }
            }
        });

    // endpoint that updates screener document with price parameters 
    app.patch('/screener/price', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minPrice, maxPrice, screenerName, Username;

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
                // Sanitize inputs
                minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min price and max price cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const ohlcCollection = db.collection('OHCLVData');

                    if (isNaN(minPrice)) {
                        minPrice = 0.000001;
                    }

                    if (isNaN(maxPrice)) {
                        const recentDate = await ohlcCollection.find({})
                            .sort({ timestamp: -1 })
                            .limit(1)
                            .project({ timestamp: 1 })
                            .toArray();

                        if (recentDate.length > 0) {
                            const mostRecentTimestamp = recentDate[0].timestamp;
                            const closeValues = await ohlcCollection.find({
                                timestamp: {
                                    $gte: new Date(mostRecentTimestamp.setHours(0, 0, 0, 0)),
                                    $lt: new Date(mostRecentTimestamp.setHours(23, 59, 59, 999))
                                }
                            }).project({ close: 1 }).toArray();

                            if (closeValues.length > 0) {
                                const sortedCloseValues = closeValues.map(doc => doc.close).sort((a, b) => b - a);
                                maxPrice = sortedCloseValues[0];
                                maxPrice = Math.ceil(maxPrice * 100) / 100;
                            }
                        }
                    }

                    if (minPrice >= maxPrice) {
                        return res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { Price: [minPrice, maxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    res.json({
                        message: 'Price range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Price Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });


    // endpoint that updates screener document with market cap parameters 
    app.patch('/screener/marketcap',
        validate([
            validationSchemas.user(),
            validationSchemas.screenerNameBody(),
            validationSchemas.minPrice(),
            validationSchemas.maxPrice()
        ]),
        async (req, res) => {
            let client;
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
                // Sanitize inputs
                const minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                const maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                const Username = sanitizeInput(req.body.user || '');
                const screenerName = sanitizeInput(req.body.screenerName || '');

                // Additional validation
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }

                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min market cap and max market cap cannot be empty' });
                }

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const assetInfoCollection = db.collection('AssetInfo');
                const collection = db.collection('Screeners');

                // If minPrice is empty, find the lowest MarketCapitalization
                let finalMinPrice = minPrice;
                if (isNaN(finalMinPrice)) {
                    const lowestMarketCapDoc = await assetInfoCollection.find({
                        MarketCapitalization: { $ne: null, $ne: undefined, $gt: 0 }
                    })
                        .sort({ MarketCapitalization: 1 })
                        .limit(1)
                        .project({ MarketCapitalization: 1 })
                        .toArray();

                    if (lowestMarketCapDoc.length > 0) {
                        finalMinPrice = lowestMarketCapDoc[0].MarketCapitalization;
                    } else {
                        return res.status(404).json({ message: 'No assets found to determine minimum market cap' });
                    }
                }

                // If maxPrice is empty, find the highest MarketCapitalization
                let finalMaxPrice = maxPrice;
                if (isNaN(finalMaxPrice)) {
                    const highestMarketCapDoc = await assetInfoCollection.find({
                        MarketCapitalization: { $ne: null, $ne: undefined, $gt: 0 }
                    })
                        .sort({ MarketCapitalization: -1 })
                        .limit(1)
                        .project({ MarketCapitalization: 1 })
                        .toArray();

                    if (highestMarketCapDoc.length > 0) {
                        finalMaxPrice = highestMarketCapDoc[0].MarketCapitalization;
                    } else {
                        return res.status(404).json({ message: 'No assets found to determine maximum market cap' });
                    }
                }

                // Ensure minPrice is less than maxPrice
                if (finalMinPrice >= finalMaxPrice) {
                    return res.status(400).json({ message: 'Min market cap cannot be higher than or equal to max market cap' });
                }

                // Find and update the screener
                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                const updateDoc = { $set: { MarketCap: [finalMinPrice, finalMaxPrice] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }

                res.json({
                    message: 'Market Cap range updated successfully',
                    updatedScreener: {
                        minMarketCap: finalMinPrice,
                        maxMarketCap: finalMaxPrice
                    }
                });

            } catch (error) {
                // Log the error with sensitive information redacted
                logger.error('Market Cap Update Error', {
                    message: error.message,
                    stack: error.stack,
                    username: obfuscateUsername(req.body.user)
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }
            }
        }
    );

    // endpoint that updates screener document with ipo date parameters 
    app.patch('/screener/ipo-date',
        validate([
            validationSchemas.user(),
            validationSchemas.screenerNameBody(),
            // Custom validation for dates
            body('minPrice')
                .optional()
                .custom((value) => {
                    // If value is provided, ensure it's a valid date
                    if (value) {
                        const date = new Date(value);
                        if (isNaN(date.getTime())) {
                            throw new Error('Invalid minimum date');
                        }
                    }
                    return true;
                }),
            body('maxPrice')
                .optional()
                .custom((value) => {
                    // If value is provided, ensure it's a valid date
                    if (value) {
                        const date = new Date(value);
                        if (isNaN(date.getTime())) {
                            throw new Error('Invalid maximum date');
                        }
                    }
                    return true;
                })
        ]),
        async (req, res) => {
            let client;
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
                // Sanitize inputs
                const rawMinPrice = sanitizeInput(req.body.minPrice || '');
                const rawMaxPrice = sanitizeInput(req.body.maxPrice || '');
                const Username = sanitizeInput(req.body.user || '');
                const screenerName = sanitizeInput(req.body.screenerName || '');

                // Parse dates
                const minPrice = rawMinPrice ? new Date(rawMinPrice) : new Date('invalid');
                const maxPrice = rawMaxPrice ? new Date(rawMaxPrice) : new Date('invalid');

                // Additional validation
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }

                // Check if both dates are invalid
                if (isNaN(minPrice.getTime()) && isNaN(maxPrice.getTime())) {
                    return res.status(400).json({ message: 'At least one of min or max IPO date must be provided' });
                }

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const assetInfoCollection = db.collection('AssetInfo');
                const collection = db.collection('Screeners');

                // If minPrice is empty, find the oldest IPO date
                let finalMinPrice = minPrice;
                if (isNaN(finalMinPrice.getTime())) {
                    const oldestIpoDoc = await assetInfoCollection.find({
                        IPO: { $ne: null, $ne: undefined }
                    })
                        .sort({ IPO: 1 })
                        .limit(1)
                        .project({ IPO: 1 })
                        .toArray();

                    if (oldestIpoDoc.length > 0) {
                        finalMinPrice = new Date(oldestIpoDoc[0].IPO);
                    } else {
                        return res.status(404).json({ message: 'No IPO dates found to determine minimum date' });
                    }
                }

                // If maxPrice is empty, set to current date
                let finalMaxPrice = maxPrice;
                if (isNaN(finalMaxPrice.getTime())) {
                    finalMaxPrice = new Date(); // Current date
                }

                // Ensure minPrice is less than maxPrice
                if (finalMinPrice >= finalMaxPrice) {
                    return res.status(400).json({ message: 'Minimum IPO date cannot be later than or equal to maximum IPO date' });
                }

                // Find and update the screener
                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                const updateDoc = { $set: { IPO: [finalMinPrice, finalMaxPrice] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }

                res.json({
                    message: 'IPO date range updated successfully',
                    updatedScreener: {
                        minIpoDate: finalMinPrice.toISOString(),
                        maxIpoDate: finalMaxPrice.toISOString()
                    }
                });

            } catch (error) {
                // Log the error with sensitive information redacted
                logger.error('IPO Date Update Error', {
                    message: error.message,
                    stack: error.stack,
                    username: obfuscateUsername(req.body.user)
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }
            }
        }
    );

    // endpoint that handles adding symbol to hidden list for user 
    app.patch('/screener/:user/hidden/:symbol',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.symbolParam('symbol')
        ]),
        async (req, res) => {
            let client;
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
                // Sanitize inputs
                const symbol = sanitizeInput(req.params.symbol).toUpperCase();
                const Username = sanitizeInput(req.params.user);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const assetInfoCollection = db.collection('AssetInfo');

                // Verify symbol exists in AssetInfo collection
                const assetExists = await assetInfoCollection.findOne({ Symbol: symbol });
                if (!assetExists) {
                    return res.status(404).json({
                        message: 'Symbol not found',
                        symbol: symbol
                    });
                }

                // Find the user
                const userDoc = await usersCollection.findOne({ Username: Username });
                if (!userDoc) {
                    return res.status(404).json({
                        message: 'User not found',
                        username: obfuscateUsername(Username)
                    });
                }

                // Check if symbol is already in hidden list
                if (userDoc.Hidden && userDoc.Hidden.includes(symbol)) {
                    return res.status(409).json({
                        message: 'Symbol already in hidden list',
                        symbol: symbol
                    });
                }

                // Update hidden list
                const filter = { Username: Username };
                const updateDoc = { $addToSet: { Hidden: symbol } };
                const result = await usersCollection.updateOne(filter, updateDoc);

                res.json({
                    message: 'Hidden List updated successfully',
                    symbol: symbol
                });

            } catch (error) {
                // Log the error with sensitive information redacted
                logger.error('Hidden List Update Error', {
                    message: error.message,
                    stack: error.stack,
                    username: obfuscateUsername(req.params.user),
                    symbol: req.params.symbol
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }
            }
        }
    );

    // endpoint that fetches hidden list for user 
    app.get('/screener/results/:user/hidden',
        validate([
            validationSchemas.userParam('user')
        ]),
        async (req, res) => {
            let client;
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
                // Sanitize input
                const username = sanitizeInput(req.params.user);

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Users');

                // Find user document with only Hidden field
                const userDoc = await collection.findOne({ Username: username }, {
                    projection: {
                        Hidden: 1,
                        _id: 0
                    }
                });

                // Check if user exists
                if (!userDoc) {
                    logger.warn('Hidden List Fetch - User Not Found', {
                        username: obfuscateUsername(username)
                    });
                    return res.status(404).json({
                        message: 'User not found',
                        username: obfuscateUsername(username)
                    });
                }

                // Check if Hidden list exists and is not empty
                if (!userDoc.Hidden || userDoc.Hidden.length === 0) {
                    return res.json([]);
                }
                // Send hidden list
                res.json(userDoc.Hidden);

            } catch (error) {
                // Log the error with sensitive information redacted
                logger.error('Hidden List Retrieval Error', {
                    message: error.message,
                    stack: error.stack,
                    username: obfuscateUsername(req.params.user)
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }
            }
        }
    );

    // endpoint that retrieves all screeners' names for user 
    app.get('/screener/:user/names',
        validate([
            validationSchemas.userParam('user')
        ]),
        async (req, res) => {
            let client;
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
                // Sanitize username input
                const username = sanitizeInput(req.params.user);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                // Find screeners for the user with specific projection
                const userDocs = await collection.find({ UsernameID: username }, {
                    projection: {
                        Name: 1,
                        Include: 1,
                        _id: 0
                    }
                }).toArray();

                // Check if any screeners were found
                if (userDocs.length > 0) {
                    // Send the array of objects with Name and Include properties
                    res.status(200).json(userDocs);
                } else {
                    // Log when no screeners are found
                    logger.warn('No Screeners Found', {
                        username: obfuscateUsername(username)
                    });

                    res.status(404).json({
                        message: 'No screeners found for the user',
                        username: obfuscateUsername(username)
                    });
                }
            } catch (error) {
                // Log any unexpected errors
                logger.error('Screener Names Retrieval Error', {
                    message: error.message,
                    stack: error.stack,
                    username: obfuscateUsername(req.params.user)
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
                });
            } finally {
                // Ensure client is closed
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }
            }
        }
    );

    // endpoint that sends hidden list of user in results 
    app.get('/:user/screener/results/hidden',
        validate([
            validationSchemas.userParam('user')
        ]),
        async (req, res) => {
            let client;
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
                // Sanitize input
                const user = sanitizeInput(req.params.user);

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');

                // Find the user document and extract the 'Hidden' array
                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: user });

                if (!userDoc) {
                    logger.warn('Hidden Results - User Not Found', {
                        username: obfuscateUsername(user)
                    });
                    return res.status(404).json({
                        message: 'User not found',
                        username: obfuscateUsername(user)
                    });
                }

                // Check if hidden symbols exist
                const hiddenSymbols = userDoc.Hidden || [];
                if (hiddenSymbols.length === 0) {
                    return res.json([]);
                }


                // Dynamic projection logic based on userDoc.Table (like /:user/screener/results/all)
                const projection = { Symbol: 1, _id: 0 };
                const fieldMap = {
                    symbol: 'Symbol',
                    name: 'Name',
                    isin: 'ISIN',
                    market_cap: 'MarketCapitalization',
                    price: 'Close',
                    volume: 'Volume',
                    ipo: 'IPO',
                    assettype: 'AssetType',
                    pe_ratio: 'PERatio',
                    peg: 'PEGRatio',
                    pb_ratio: 'PriceToBookRatio',
                    ps_ratio: 'PriceToSalesRatioTTM',
                    dividend_yield: 'DividendYield',
                    eps: 'EPS',
                    fcf: 'freeCashFlow',
                    cash: 'cashAndEq',
                    current_debt: 'debtCurrent',
                    current_assets: 'assetsCurrent',
                    current_liabilities: 'liabilitiesCurrent',
                    current_ratio: 'currentRatio',
                    roe: 'roe',
                    roa: 'roa',
                    currency: 'Currency',
                    book_value: 'BookValue',
                    shares: 'SharesOutstanding',
                    sector: 'Sector',
                    industry: 'Industry',
                    exchange: 'Exchange',
                    country: 'Country',
                    rs_score1w: 'RSScore1W',
                    rs_score1m: 'RSScore1M',
                    rs_score4m: 'RSScore4M',
                    adv1w: 'ADV1W',
                    adv1m: 'ADV1M',
                    adv4m: 'ADV4M',
                    adv1y: 'ADV1Y',
                    perc_change: 'todaychange',
                    all_time_high: 'AlltimeHigh',
                    all_time_low: 'AlltimeLow',
                    high_52w: 'fiftytwoWeekHigh',
                    low_52w: 'fiftytwoWeekLow',
                    gap: 'Gap',
                    ev: 'EV',
                    rsi: 'RSI',
                    intrinsic_value: 'IntrinsicValue',
                };
                if (Array.isArray(userDoc?.Table)) {
                    userDoc.Table.forEach(key => {
                        if (fieldMap[key]) {
                            if (key === 'price') {
                                projection['Close'] = { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] };
                            } else if (key === 'volume') {
                                projection['Volume'] = { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "5. volume", input: "$$item.v" } } } }, 0] };
                            } else if ([
                                'fcf', 'cash', 'current_debt', 'current_assets', 'current_liabilities', 'current_ratio', 'roe', 'roa'
                            ].includes(key)) {
                                const qfMap = {
                                    fcf: 'freeCashFlow',
                                    cash: 'cashAndEq',
                                    current_debt: 'debtCurrent',
                                    current_assets: 'assetsCurrent',
                                    current_liabilities: 'liabilitiesCurrent',
                                    current_ratio: 'currentRatio',
                                    roe: 'roe',
                                    roa: 'roa',
                                };
                                const field = qfMap[key];
                                if (field) {
                                    projection[field] = { $ifNull: [{ $getField: { field, input: { $arrayElemAt: ['$quarterlyFinancials', 0] } } }, null] };
                                }
                            } else {
                                projection[fieldMap[key]] = 1;
                            }
                        }
                    });
                }

                const assetInfoCollection = db.collection('AssetInfo');
                const filteredAssets = await assetInfoCollection.find({
                    Symbol: { $in: hiddenSymbols }
                }, {
                    projection
                }).toArray();

                res.json(filteredAssets);

            } catch (error) {
                // Log the error with sensitive information redacted
                logger.error('Hidden Results Retrieval Error', {
                    message: error.message,
                    stack: error.stack,
                    username: obfuscateUsername(req.params.user)
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }
            }
        }
    );

    // endpoint that removes ticker from hidden list 
    app.patch('/screener/:user/show/:symbol',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.symbolParam('symbol')
        ]),
        async (req, res) => {
            let client;
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
                // Sanitize inputs
                const username = sanitizeInput(req.params.user);
                const symbol = sanitizeInput(req.params.symbol);

                // Validate symbol
                if (!symbol) {
                    logger.warn('Show Symbol - Missing Symbol', {
                        username: obfuscateUsername(username)
                    });
                    return res.status(400).json({
                        message: 'Please provide a valid symbol',
                        username: obfuscateUsername(username)
                    });
                }

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Users');

                // Find user to ensure they exist and the symbol is in their hidden list
                const userDoc = await collection.findOne({
                    Username: username,
                    Hidden: { $in: [symbol] }
                });

                if (!userDoc) {
                    logger.warn('Show Symbol - User Not Found or Symbol Not Hidden', {
                        username: obfuscateUsername(username),
                        symbol: symbol
                    });
                    return res.status(404).json({
                        message: 'User not found or symbol not in hidden list',
                        username: obfuscateUsername(username),
                        symbol: symbol
                    });
                }

                // Remove symbol from hidden list
                const filter = { Username: username };
                const updateDoc = { $pull: { Hidden: symbol } };
                const result = await collection.updateOne(filter, updateDoc);

                // Check if update was successful
                if (result.modifiedCount === 0) {
                    return res.status(500).json({
                        message: 'Failed to update hidden list',
                        username: obfuscateUsername(username),
                        symbol: symbol
                    });
                }

                res.status(200).json({
                    message: 'Hidden List updated successfully',
                    username: obfuscateUsername(username),
                    symbol: symbol
                });

            } catch (error) {
                // Log the error with sensitive information redacted
                logger.error('Remove Hidden Symbol Error', {
                    message: error.message,
                    stack: error.stack,
                    username: obfuscateUsername(req.params.user),
                    symbol: sanitizeInput(req.params.symbol)
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }
            }
        }
    );

    // endpoint that retrieves all available asset types for user (for screener)
    app.get('/screener/asset-type',
        async (req, res) => {
            let client;
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
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const assetInfoCollection = db.collection('AssetInfo');

                // Retrieve distinct sectors
                const assetTypes = await assetInfoCollection.distinct('AssetType');

                // Basic type and null/undefined filtering
                const uniqueAssetTypes = assetTypes
                    .filter(assetTypes =>
                        typeof assetTypes === 'string' &&
                        assetTypes.trim() !== '' &&
                        assetTypes !== null &&
                        assetTypes !== undefined
                    )
                    .slice(0, 50);

                res.status(200).json(uniqueAssetTypes);

            } catch (error) {
                logger.error({ error }, 'Error retrieving asset types');
                res.status(500).json({
                    message: 'Internal Server Error'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({ closeError }, 'Error closing database connection');
                    }
                }
            }
        });

    // endpoint that updates screener document with asset type params 
    app.patch('/screener/asset-types',
        validate([
            validationSchemas.user(),
            validationSchemas.screenerNameBody(),
            body('assetTypes')
                .isArray().withMessage('Asset types must be an array')
                .custom((value) => {
                    // Ensure each asset type is a non-empty string
                    if (!value.every(type =>
                        typeof type === 'string' &&
                        type.trim().length > 0 &&
                        type.trim().length <= 50 &&
                        /^[a-zA-Z0-9&\s_-]+$/.test(type) // Allowing letters, numbers, &, spaces, underscores, and hyphens
                    )) {
                        throw new Error('Each asset type must be a non-empty string with max 50 characters and can include &');
                    }
                    return true;
                })
        ]),
        async (req, res) => {
            let client;
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
                const assetTypes = req.body.assetTypes;
                const Username = req.body.user;
                const screenerName = req.body.screenerName;

                // Sanitize asset types (trim and remove duplicates)
                const sanitizedAssetTypes = [...new Set(
                    assetTypes.map(type => sanitizeInput(type).replace(/&amp;/g, '&'))
                )];

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const updateDoc = { $set: { AssetTypes: sanitizedAssetTypes } };
                const options = { returnOriginal: false };

                const result = await collection.findOneAndUpdate(filter, updateDoc, options);

                if (!result.value) {
                    logger.warn('Screener not found', {
                        username: obfuscateUsername(Username),
                        screenerName
                    });
                    return res.status(404).json({ message: 'Screener not found' });
                }
                res.json({
                    message: 'Asset types updated successfully',
                    assetTypes: sanitizedAssetTypes
                });

            } catch (error) {
                logger.error({
                    error,
                    username: obfuscateUsername(req.body.user)
                }, 'Error updating screener asset types');

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({ closeError }, 'Error closing database connection');
                    }
                }
            }
        }
    );

    // endpoint that retrieves all available sectors for user (for screener)
    app.get('/screener/sectors',
        async (req, res) => {
            let client;
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
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const assetInfoCollection = db.collection('AssetInfo');

                // Retrieve distinct sectors
                const sectors = await assetInfoCollection.distinct('Sector');

                // Basic type and null/undefined filtering
                const uniqueSectors = sectors
                    .filter(sector =>
                        typeof sector === 'string' &&
                        sector.trim() !== '' &&
                        sector !== null &&
                        sector !== undefined
                    )
                    .slice(0, 50); // Optional: limit to 50 sectors to prevent potential DoS

                res.status(200).json(uniqueSectors);

            } catch (error) {
                logger.error({ error }, 'Error retrieving sectors');
                res.status(500).json({
                    message: 'Internal Server Error'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({ closeError }, 'Error closing database connection');
                    }
                }
            }
        });

    // endpoint that updates screener document with sector params 
    app.patch('/screener/sectors',
        validate([
            validationSchemas.user(),
            validationSchemas.screenerNameBody(),
            body('sectors')
                .isArray().withMessage('Sectors must be an array')
                .custom((value) => {
                    // Ensure each sector is a non-empty string that can include & character
                    if (!value.every(sector =>
                        typeof sector === 'string' &&
                        sector.trim().length > 0 &&
                        sector.trim().length <= 50 &&
                        /^[a-zA-Z0-9&\s_-]+$/.test(sector) // Allowing letters, numbers, &, spaces, underscores, and hyphens
                    )) {
                        throw new Error('Each sector must be a non-empty string with max 50 characters and can include &');
                    }
                    return true;
                })
        ]),
        async (req, res) => {
            let client;
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
                const sectors = req.body.sectors;
                const Username = req.body.user;
                const screenerName = req.body.screenerName;

                // Sanitize sectors (trim and remove duplicates)
                const sanitizedSectors = [...new Set(
                    sectors.map(sector => {
                        // Use sanitizeInput but ensure we don't escape & characters
                        return sanitizeInput(sector).replace(/&amp;/g, '&'); // Replace &amp; back to &
                    })
                )];

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const updateDoc = { $set: { Sectors: sanitizedSectors } };
                const options = { returnOriginal: false };

                const result = await collection.findOneAndUpdate(filter, updateDoc, options);

                if (!result.value) {
                    logger.warn('Screener not found', {
                        username: obfuscateUsername(Username),
                        screenerName
                    });
                    return res.status(404).json({ message: 'Screener not found' });
                }
                res.json({
                    message: 'Sectors updated successfully',
                    sectors: sanitizedSectors
                });

            } catch (error) {
                logger.error({
                    error,
                    username: obfuscateUsername(req.body.user)
                }, 'Error updating screener sectors');

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({ closeError }, 'Error closing database connection');
                    }
                }
            }
        }
    );

    // endpoint that retrieves all available exchanges for user (screener)
    app.get('/screener/exchange',
        async (req, res) => {
            let client;
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
                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const assetInfoCollection = db.collection('AssetInfo');

                // Retrieve distinct exchanges
                const exchanges = await assetInfoCollection.distinct('Exchange');

                // Basic type and null/undefined filtering 
                const uniqueExchanges = exchanges
                    .filter(exchange =>
                        typeof exchange === 'string' &&
                        exchange.trim() !== '' &&
                        exchange !== null &&
                        exchange !== undefined
                    )
                    .slice(0, 10); // Optional: limit to 10 exchanges to prevent potential DoS 

                res.status(200).json(uniqueExchanges);

            } catch (error) {
                // Log the error with more detailed information
                logger.error({ error }, 'Error retrieving exchanges');

                res.status(500).json({
                    message: 'Internal Server Error'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({ closeError }, 'Error closing database connection');
                    }
                }
            }
        });

    // endpoint that updates screener document with exchange params 
    app.patch('/screener/exchange',
        validate([
            validationSchemas.user(),
            validationSchemas.screenerNameBody(),
            body('exchanges')
                .isArray().withMessage('Exchanges must be an array')
                .custom((value) => {
                    if (!value.every(exchange =>
                        typeof exchange === 'string' &&
                        exchange.trim().length > 0 &&
                        exchange.trim().length <= 10
                    )) {
                        throw new Error('Each exchange must be a non-empty string with max 10 characters');
                    }
                    return true;
                })
        ]),
        async (req, res) => {
            let client;
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
                const exchanges = req.body.exchanges;
                const Username = req.body.user;
                const screenerName = req.body.screenerName;

                const sanitizedExchanges = [...new Set(
                    exchanges.map(exchange => sanitizeInput(exchange))
                )];

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                // Comprehensive debugging of user's screeners
                const allUserScreeners = await collection.find({
                    UsernameID: Username
                }).toArray();

                logger.debug('All User Screeners', {
                    count: allUserScreeners.length,
                    screenerNames: allUserScreeners.map(s => s.Name)
                });

                const filter = {
                    UsernameID: Username,
                    Name: screenerName
                };

                logger.debug('Update Filter', filter);

                // Use updateOne with comprehensive logging
                const updateResult = await collection.updateOne(filter, {
                    $set: { Exchanges: sanitizedExchanges }
                });

                logger.debug('Update Operation Result', {
                    matchedCount: updateResult.matchedCount,
                    modifiedCount: updateResult.modifiedCount
                });

                if (updateResult.matchedCount === 0) {
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: {
                            username: obfuscateUsername(Username),
                            screenerName,
                            availableScreeners: allUserScreeners.map(s => s.Name)
                        }
                    });
                }

                res.json({
                    message: 'Exchanges updated successfully',
                    exchanges: sanitizedExchanges
                });

            } catch (error) {
                logger.error({
                    error,
                    username: obfuscateUsername(req.body.user)
                }, 'Error updating screener exchanges');

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({ closeError }, 'Error closing database connection');
                    }
                }
            }
        }
    );

    // endpoint that retrieves all available countries for user (screener)
    app.get('/screener/country',
        async (req, res) => {
            let client;
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
                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const assetInfoCollection = db.collection('AssetInfo');

                // Use the `distinct` method to get an array of unique Country values
                const Country = await assetInfoCollection.distinct('Country');

                // Remove any null or undefined values from the array
                const uniqueCountry = Country.filter(country => country !== null && country !== undefined);

                res.json(uniqueCountry);

            } catch (error) {
                logger.error({
                    error,
                    endpoint: req.path
                }, 'Error retrieving  countries');

                res.status(500).json({ message: 'Internal Server Error' });

            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({ closeError }, 'Error closing database connection');
                    }
                }
            }
        }
    );

    // endpoint that updates screener document with country params 
    app.patch('/screener/country',
        validate([
            validationSchemas.user(),
            validationSchemas.screenerNameBody(),
            body('countries')
                .isArray().withMessage('Countries must be an array')
                .custom((value) => {
                    if (!value.every(country =>
                        typeof country === 'string' &&
                        country.trim().length > 0 &&
                        country.trim().length <= 50
                    )) {
                        throw new Error('Each country must be a non-empty string with max 50 characters');
                    }
                    return true;
                })
        ]),
        async (req, res) => {
            let client;
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
                const countries = req.body.countries;
                const Username = req.body.user;
                const screenerName = req.body.screenerName;

                const sanitizedCountries = [...new Set(
                    countries.map(country => sanitizeInput(country))
                )];

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                // Comprehensive debugging of user's screeners
                const allUserScreeners = await collection.find({
                    UsernameID: Username
                }).toArray();

                logger.debug('All User Screeners', {
                    count: allUserScreeners.length,
                    screenerNames: allUserScreeners.map(s => s.Name)
                });

                const filter = {
                    UsernameID: Username,
                    Name: screenerName
                };

                logger.debug('Update Filter', filter);

                // Use updateOne with comprehensive logging
                const updateResult = await collection.updateOne(filter, {
                    $set: { Countries: sanitizedCountries }
                });

                logger.debug('Update Operation Result', {
                    matchedCount: updateResult.matchedCount,
                    modifiedCount: updateResult.modifiedCount
                });

                if (updateResult.matchedCount === 0) {
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: {
                            username: obfuscateUsername(Username),
                            screenerName,
                            availableScreeners: allUserScreeners.map(s => s.Name)
                        }
                    });
                }

                res.json({
                    message: 'Countries updated successfully',
                    countries: sanitizedCountries
                });

            } catch (error) {
                logger.error({
                    error,
                    username: obfuscateUsername(req.body.user)
                }, 'Error updating screener countries');

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({ closeError }, 'Error closing database connection');
                    }
                }
            }
        }
    );

    // endpoint that updates screener document with PE parameters 
    app.patch('/screener/pe', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minPrice, maxPrice, screenerName, Username;

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
                // Sanitize inputs
                minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min PE and max PE cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    if (isNaN(minPrice)) {
                        minPrice = 1; // Minimum PE ratio typically starts at 1
                    }

                    if (isNaN(maxPrice)) {
                        const highestPERatioDoc = await assetInfoCollection.find({
                            PERatio: { $ne: 'None', $ne: null, $ne: undefined },
                            PERatio: { $gt: 0 } // Ensure positive PE ratio
                        })
                            .sort({ PERatio: -1 })
                            .limit(1)
                            .project({ PERatio: 1 })
                            .toArray();

                        if (highestPERatioDoc.length > 0) {
                            maxPrice = highestPERatioDoc[0].PERatio;
                            // Optional: Round to 2 decimal places if needed
                            maxPrice = Math.ceil(maxPrice * 100) / 100;
                        } else {
                            return res.status(404).json({
                                message: 'No assets found to determine maximum PE ratio',
                                details: 'Unable to find a valid PE ratio in the database'
                            });
                        }
                    }

                    if (minPrice >= maxPrice) {
                        return res.status(400).json({ message: 'Min PE cannot be higher than or equal to max PE' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { PE: [minPrice, maxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    res.json({
                        message: 'PE range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('PE Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    // endpoint that updates screener document with PEG parameters 
    app.patch('/screener/peg', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minPrice, maxPrice, screenerName, Username;

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
                // Sanitize inputs
                minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min PEG and max PEG cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minPrice to 1 if it is not provided
                    if (isNaN(minPrice) && !isNaN(maxPrice)) {
                        minPrice = 1; // Minimum PEG typically starts at 1
                    }

                    // If maxPrice is empty, find the highest PEGRatio excluding 'None'
                    if (isNaN(maxPrice) && !isNaN(minPrice)) {
                        const highestPERDoc = await assetInfoCollection.find({ PEGRatio: { $ne: 'None' } }) // Exclude 'None'
                            .sort({ PEGRatio: -1 }) // Sort by PEGRatio descending
                            .limit(1) // Get the highest value
                            .project({ PEGRatio: 1 }) // Only return the PEGRatio field
                            .toArray();

                        if (highestPERDoc.length > 0) {
                            maxPrice = highestPERDoc[0].PEGRatio; // Set maxPrice to the highest PEGRatio
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum PEG' });
                        }
                    }

                    // Ensure minPrice is less than maxPrice
                    if (minPrice >= maxPrice) {
                        return res.status(400).json({ message: 'Min PEG cannot be higher than or equal to max PEG' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { PEG: [minPrice, maxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'PEG range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('PEG Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    // endpoint that updates screener document with PEG parameters 
    app.patch('/screener/eps', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minPrice, maxPrice, screenerName, Username;

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
                // Sanitize inputs
                minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min EPS and max EPS cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minPrice to 1 if it is not provided
                    if (isNaN(minPrice) && !isNaN(maxPrice)) {
                        minPrice = 1; // Minimum EPS typically starts at 1
                    }

                    // If maxPrice is empty, find the highest EPS excluding 'None'
                    if (isNaN(maxPrice) && !isNaN(minPrice)) {
                        const highestEPSDoc = await assetInfoCollection.find({
                            EPS: {
                                $ne: 'None',
                                $type: 'number' // Ensure it's a numeric value
                            }
                        })
                            .sort({ EPS: -1 }) // Sort by EPS descending
                            .limit(1) // Get the highest value
                            .project({ EPS: 1 }) // Only return the EPS field
                            .toArray();

                        if (highestEPSDoc.length > 0) {
                            maxPrice = highestEPSDoc[0].EPS; // Set maxPrice to the highest EPS
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum EPS' });
                        }
                    }

                    // Ensure minPrice is less than maxPrice
                    if (minPrice >= maxPrice) {
                        return res.status(400).json({ message: 'Min EPS cannot be higher than or equal to max EPS' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { EPS: [minPrice, maxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'EPS range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('EPS Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    // endpoint that updates screener document with PS Ratio parameters 
    app.patch('/screener/ps-ratio', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minPrice, maxPrice, screenerName, Username;

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
                // Sanitize inputs
                minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min PS Ratio and max PS Ratio cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minPrice to 1 if it is not provided
                    if (isNaN(minPrice) && !isNaN(maxPrice)) {
                        minPrice = 1; // Minimum PS Ratio typically starts at 1
                    }

                    // If maxPrice is empty, find the highest PriceToSalesRatioTTM excluding 'None' and '-'
                    if (isNaN(maxPrice) && !isNaN(minPrice)) {
                        const highestPSRatioDoc = await assetInfoCollection.find({
                            PriceToSalesRatioTTM: {
                                $ne: 'None',
                                $ne: '-',
                                $type: 'number' // Ensure it's a numeric value
                            }
                        })
                            .sort({ PriceToSalesRatioTTM: -1 }) // Sort by PriceToSalesRatioTTM descending
                            .limit(1) // Get the highest value
                            .project({ PriceToSalesRatioTTM: 1 }) // Only return the PriceToSalesRatioTTM field
                            .toArray();

                        if (highestPSRatioDoc.length > 0) {
                            maxPrice = highestPSRatioDoc[0].PriceToSalesRatioTTM; // Set maxPrice to the highest PriceToSalesRatioTTM
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum PS Ratio' });
                        }
                    }

                    // Ensure minPrice is less than maxPrice
                    if (minPrice >= maxPrice) {
                        return res.status(400).json({ message: 'Min PS Ratio cannot be higher than or equal to max PS Ratio' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { PS: [minPrice, maxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Price to Sales Ratio range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('PS Ratio Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    // endpoint that updates screener document with PB Ratio parameters 
    app.patch('/screener/pb-ratio', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minPrice, maxPrice, screenerName, Username;

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
                // Sanitize inputs
                minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min PB Ratio and max PB Ratio cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minPrice to 1 if it is not provided
                    if (isNaN(minPrice) && !isNaN(maxPrice)) {
                        minPrice = 1; // Minimum PB Ratio typically starts at 1
                    }

                    // If maxPrice is empty, find the highest PriceToBookRatio excluding 'None' and '-'
                    if (isNaN(maxPrice) && !isNaN(minPrice)) {
                        const highestPBRatioDoc = await assetInfoCollection.find({
                            PriceToBookRatio: {
                                $ne: 'None',
                                $ne: '-',
                                $type: 'number' // Ensure it's a numeric value
                            }
                        })
                            .sort({ PriceToBookRatio: -1 }) // Sort by PriceToBookRatio descending
                            .limit(1) // Get the highest value
                            .project({ PriceToBookRatio: 1 }) // Only return the PriceToBookRatio field
                            .toArray();

                        if (highestPBRatioDoc.length > 0) {
                            maxPrice = highestPBRatioDoc[0].PriceToBookRatio; // Set maxPrice to the highest PriceToBookRatio
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum PB Ratio' });
                        }
                    }

                    // Ensure minPrice is less than maxPrice
                    if (minPrice >= maxPrice) {
                        return res.status(400).json({ message: 'Min PB Ratio cannot be higher than or equal to max PB Ratio' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { PB: [minPrice, maxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Price to Book Ratio range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('PB Ratio Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    // endpoint that updates screener document with dividend yield parameters 
    app.patch('/screener/div-yield', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minPrice, maxPrice, screenerName, Username;

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
                // Sanitize and convert inputs (dividing by 100 to convert percentage)
                minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) / 100 : NaN;
                maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) / 100 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min and max Dividend Yield cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set a minimum dividend yield of 0.1% (0.001) if not provided
                    let effectiveMinPrice = isNaN(minPrice) ? 0.001 : minPrice;

                    // If maxPrice is empty, find the highest DividendYield
                    let effectiveMaxPrice = maxPrice;
                    if (isNaN(maxPrice)) {
                        const highestDividendYieldDoc = await assetInfoCollection.find({
                            DividendYield: {
                                $ne: 'None',
                                $ne: '-',
                                $exists: true,
                                $type: 'number' // Ensure it's a numeric value
                            }
                        })
                            .sort({ DividendYield: -1 }) // Sort by DividendYield descending
                            .limit(1) // Get the highest value
                            .project({ DividendYield: 1 }) // Only return the DividendYield field
                            .toArray();

                        if (highestDividendYieldDoc.length > 0) {
                            effectiveMaxPrice = highestDividendYieldDoc[0].DividendYield; // Set maxPrice to the highest DividendYield
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Dividend Yield' });
                        }
                    }

                    // Validate the effective min and max prices
                    if (effectiveMinPrice >= effectiveMaxPrice) {
                        return res.status(400).json({
                            message: 'Minimum Dividend Yield cannot be higher than or equal to maximum Dividend Yield',
                            details: {
                                minDividendYield: effectiveMinPrice,
                                maxDividendYield: effectiveMaxPrice
                            }
                        });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { DivYield: [effectiveMinPrice, effectiveMaxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Dividend Yield range updated successfully',
                        updatedScreener: result.value,
                        details: {
                            minDividendYield: effectiveMinPrice * 100 + '%',
                            maxDividendYield: effectiveMaxPrice * 100 + '%'
                        }
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Dividend Yield Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    //endpoint is supposed to update document with growth % 
    app.patch('/screener/fundamental-growth', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
    ]), async (req, res) => {
        let client;
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
            // Sanitize inputs
            const screenerName = sanitizeInput(req.body.screenerName || '');
            const Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                return res.status(400).json({ message: 'Username is required' });
            }

            client = new MongoClient(uri);
            await client.connect();

            const db = client.db('EreunaDB');
            const collection = db.collection('Screeners');
            const assetInfoCollection = db.collection('AssetInfo');

            const updateDoc = { $set: {} };

            const pairs = [
                { min: req.body.minRevYoY, max: req.body.maxRevYoY, attribute: 'RevYoY' },
                { min: req.body.minRevQoQ, max: req.body.maxRevQoQ, attribute: 'RevQoQ' },
                { min: req.body.minEarningsYoY, max: req.body.maxEarningsYoY, attribute: 'EarningsYoY' },
                { min: req.body.minEarningsQoQ, max: req.body.maxEarningsQoQ, attribute: 'EarningsQoQ' },
                { min: req.body.minEPSYoY, max: req.body.maxEPSYoY, attribute: 'EPSYoY' },
                { min: req.body.minEPSQoQ, max: req.body.maxEPSQoQ, attribute: 'EPSQoQ' }
            ];

            for (const pair of pairs) {
                const { min, max, attribute } = pair;

                // Skip if both values are empty
                if (min === null && max === null) {
                    continue;
                }

                // Sanitize and parse min and max values
                const sanitizedMin = min !== null ? parseFloat(sanitizeInput(min.toString())) : null;
                const sanitizedMax = max !== null ? parseFloat(sanitizeInput(max.toString())) : null;

                // If min value is empty and max value is filled
                if (sanitizedMin === null && sanitizedMax !== null) {
                    const lowestDoc = await assetInfoCollection.find({
                        [attribute]: {
                            $ne: 'None',
                            $ne: '-',
                            $type: 'number'
                        }
                    })
                        .sort({ [attribute]: 1 })
                        .limit(1)
                        .project({ [attribute]: 1 })
                        .toArray();

                    if (lowestDoc.length > 0) {
                        updateDoc.$set[attribute] = [lowestDoc[0][attribute], sanitizedMax / 100];
                    } else {
                        return res.status(404).json({
                            message: `No assets found to determine minimum ${attribute}`,
                            details: `Unable to find valid ${attribute} values`
                        });
                    }
                }

                // If max value is empty and min value is filled
                if (sanitizedMax === null && sanitizedMin !== null) {
                    const highestDoc = await assetInfoCollection.find({
                        [attribute]: {
                            $ne: 'None',
                            $ne: '-',
                            $type: 'number'
                        }
                    })
                        .sort({ [attribute]: -1 })
                        .limit(1)
                        .project({ [attribute]: 1 })
                        .toArray();

                    if (highestDoc.length > 0) {
                        updateDoc.$set[attribute] = [sanitizedMin / 100, highestDoc[0][attribute]];
                    } else {
                        return res.status(404).json({
                            message: `No assets found to determine maximum ${attribute}`,
                            details: `Unable to find valid ${attribute} values`
                        });
                    }
                }

                // If both values are provided
                if (sanitizedMin !== null && sanitizedMax !== null) {
                    // Validate min is less than max
                    if (sanitizedMin / 100 >= sanitizedMax / 100) {
                        return res.status(400).json({
                            message: `Invalid ${attribute} range`,
                            details: `Minimum ${attribute} must be less than maximum ${attribute}`
                        });
                    }

                    updateDoc.$set[attribute] = [sanitizedMin / 100, sanitizedMax / 100];
                }
            }

            // Prepare filter with case-insensitive matching
            const filter = {
                UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
            };

            // Verify screener exists before updating
            const existingScreener = await collection.findOne(filter);
            if (!existingScreener) {
                return res.status(404).json({
                    message: 'Screener not found',
                    details: 'No matching screener exists for the given user and name'
                });
            }

            // Perform update
            const result = await collection.findOneAndUpdate(
                filter,
                updateDoc,
                { returnOriginal: false }
            );

            if (!result) {
                return res.status(404).json({
                    message: 'Screener update failed',
                    details: 'Unable to update screener document'
                });
            }

            res.json({
                message: 'Fundamental growth parameters updated successfully',
                updatedScreener: result.value,
                updatedAttributes: Object.keys(updateDoc.$set)
            });

        } catch (error) {
            logger.error('Fundamental Growth Update Error', {
                message: error.message,
                stack: error.stack,
                username: Username,
                screenerName: screenerName
            });

            res.status(500).json({
                message: 'Internal Server Error',
                error: error.message
            });
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    logger.warn('Error closing database connection', {
                        error: closeError.message
                    });
                }
            }
        }
    });

    // endpoint that updates screener document with volume parameters 
    app.patch('/screener/volume', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.relativeVolumeOption(),
        validationSchemas.averageVolumeOption(), ,
        ...validationSchemas.volumeValues()
    ]), async (req, res) => {
        let client;
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
            // Sanitize and parse inputs
            const value1 = req.body.value1 ? Math.max(parseFloat(sanitizeInput(req.body.value1.toString())), 0.1) : null;
            const value2 = req.body.value2 ? parseFloat(sanitizeInput(req.body.value2.toString())) : null;
            const value3 = req.body.value3 ? Math.max(parseFloat(sanitizeInput(req.body.value3.toString())), 1) : null;
            const value4 = req.body.value4 ? parseFloat(sanitizeInput(req.body.value4.toString())) : null;
            const relVolOption = sanitizeInput(req.body.relVolOption);
            const avgVolOption = sanitizeInput(req.body.avgVolOption);
            const screenerName = sanitizeInput(req.body.screenerName);
            const Username = sanitizeInput(req.body.user);

            // Obfuscate username for logging
            const obfuscatedUsername = obfuscateUsername(Username);

            client = new MongoClient(uri);
            await client.connect();

            const db = client.db('EreunaDB');
            const screenersCollection = db.collection('Screeners');
            const assetInfoCollection = db.collection('AssetInfo');

            const filter = { UsernameID: Username, Name: screenerName };
            let updateDoc = {};

            async function getMaxValue(attribute) {
                const result = await assetInfoCollection.aggregate([
                    { $group: { _id: null, value: { $max: `$${attribute}` } } }
                ]).toArray();
                return result[0]?.value;
            }

            // Process Relative Volume
            if (relVolOption !== '-') {
                const relVolAttributeName = `RelVolume${relVolOption}`;
                let relVolValues = [value1, value2];

                if (value1 !== null && value2 === null) {
                    const maxValue = await getMaxValue(relVolAttributeName);
                    relVolValues[1] = maxValue;
                } else if (value1 === null && value2 !== null) {
                    relVolValues[0] = 0.1; // Fixed minimum value for RelVolume
                }

                if (relVolValues[0] !== null || relVolValues[1] !== null) {
                    updateDoc[relVolAttributeName] = relVolValues;
                }
            }

            // Process Average Volume
            if (avgVolOption !== '-') {
                const avgVolAttributeName = `AvgVolume${avgVolOption}`;
                let avgVolValues = [value3, value4];

                if (value3 !== null && value4 === null) {
                    const maxValue = await getMaxValue(avgVolAttributeName);
                    avgVolValues[1] = maxValue;
                } else if (value3 === null && value4 !== null) {
                    avgVolValues[0] = 1; // Fixed minimum value for AvgVolume
                }

                if (avgVolValues[0] !== null || avgVolValues[1] !== null) {
                    updateDoc[avgVolAttributeName] = avgVolValues;
                }
            }

            // Check if there are any updates to apply
            if (Object.keys(updateDoc).length === 0) {
                return res.status(200).json({ message: 'No updates to apply' });
            }

            // Perform the update
            const options = { returnOriginal: false };
            const result = await screenersCollection.findOneAndUpdate(filter, { $set: updateDoc }, options);

            // Check if the screener document was found
            if (!result) {
                logger.warn('Screener not found', {
                    user: obfuscatedUsername,
                    screenerName: screenerName
                });
                return res.status(404).json({ message: 'Screener not found' });
            }

            res.json({ message: 'Document updated successfully', updatedFields: Object.keys(updateDoc) });

        } catch (error) {
            // Log error with obfuscated username and minimal details
            logger.error('Error updating screener', {
                user: obfuscatedUsername,
                errorType: error.constructor.name,
                errorMessage: error.message
            });

            res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            if (client) {
                try {
                    await client.close(); // Ensure client is closed if it was initialized
                } catch (closeError) {
                    logger.warn('Error closing database connection', {
                        user: obfuscatedUsername,
                        error: closeError.message
                    });
                }
            }
        }
    });

    // endpoint that updates screener document with RS Score parameters 
    app.patch('/screener/rs-score', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        // Custom validation for RS Score values
        body('value1')
            .optional({ nullable: true }) // Allow null values
            .custom((value) => {
                // If value is null or empty, return true (valid)
                if (value === null || value === '') return true;

                // Validate float between 1 and 100
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value1 must be a float between 1 and 100 or null'),

        body('value2')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value2 must be a float between 1 and 100 or null'),

        body('value3')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value3 must be a float between 1 and 100 or null'),

        body('value4')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value4 must be a float between 1 and 100 or null'),

        body('value5')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value5 must be a float between 1 and 100 or null'),

        body('value6')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
            })
            .withMessage('Value6 must be a float between 1 and 100 or null')
    ]), async (req, res) => {
        let client;
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
            // Sanitize and parse inputs
            const value1 = req.body.value1 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value1.toString())), 1), 100) : null;
            const value2 = req.body.value2 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value2.toString())), 1), 100) : null;
            const value3 = req.body.value3 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value3.toString())), 1), 100) : null;
            const value4 = req.body.value4 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value4.toString())), 1), 100) : null;
            const value5 = req.body.value5 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value5.toString())), 1), 100) : null;
            const value6 = req.body.value6 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value6.toString())), 1), 100) : null;

            const screenerName = sanitizeInput(req.body.screenerName);
            const Username = sanitizeInput(req.body.user);

            // Obfuscate username for logging
            const obfuscatedUsername = obfuscateUsername(Username);

            client = new MongoClient(uri);
            await client.connect();

            const db = client.db('EreunaDB');
            const collection = db.collection('Screeners');

            const filter = { UsernameID: Username, Name: screenerName };
            const updateDoc = { $set: {} };

            // Define pairs and default values
            const pairs = [
                { key: 'RSScore1M', values: [value1, value2], defaults: [1, 100] },
                { key: 'RSScore4M', values: [value3, value4], defaults: [1, 100] },
                { key: 'RSScore1W', values: [value5, value6], defaults: [1, 100] },
            ];

            // Process pairs
            pairs.forEach((pair) => {
                const values = pair.values;
                const defaults = pair.defaults;

                // Check if at least one value is present
                if (values.some((value) => value !== null)) {
                    // Create a new array with default values for missing pairs
                    const newArray = values.map((value, index) => value !== null ? value : defaults[index]);

                    // Add the new array to the update document
                    updateDoc.$set[pair.key] = newArray;
                }
            });

            // Check if any updates are present
            if (Object.keys(updateDoc.$set).length === 0) {
                return res.status(200).json({ message: 'No RS Score values to update' });
            }

            const options = { returnOriginal: false };
            const result = await collection.findOneAndUpdate(filter, updateDoc, options);

            // Check if the screener document was found
            if (!result) {
                logger.warn('Screener not found for RS Score update', {
                    user: obfuscatedUsername,
                    screenerName: screenerName
                });
                return res.status(404).json({ message: 'Screener not found' });
            }

            res.json({
                message: 'RS Score updated successfully',
                updatedFields: Object.keys(updateDoc.$set)
            });

        } catch (error) {
            // Log error with obfuscated username and minimal details
            logger.error('Error updating RS Score', {
                user: obfuscatedUsername,
                errorType: error.constructor.name,
                errorMessage: error.message
            });

            res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            if (client) {
                try {
                    await client.close(); // Ensure client is closed if it was initialized
                } catch (closeError) {
                    logger.warn('Error closing database connection', {
                        user: obfuscatedUsername,
                        error: closeError.message
                    });
                }
            }
        }
    });

    // endpoint that updates screener document with Average Daily Volatility (ADV) parameters 
    app.patch('/screener/adv', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        // Custom validation for ADV values
        body('value1')
            .optional({ nullable: true }) // Allow null values
            .custom((value) => {
                // If value is null or empty, return true (valid)
                if (value === null || value === '') return true;

                // Validate float
                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value1 must be a float, NaN, or null'),

        body('value2')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value2 must be a float, NaN, or null'),

        body('value3')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value3 must be a float, NaN, or null'),

        body('value4')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value4 must be a float, NaN, or null'),

        body('value5')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value5 must be a float, NaN, or null'),

        body('value6')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value6 must be a float, NaN, or null'),

        body('value7')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value7 must be a float, NaN, or null'),

        body('value8')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;

                const parsedValue = parseFloat(value);
                return isNaN(parsedValue) || !isNaN(parsedValue);
            })
            .withMessage('Value8 must be a float, NaN, or null')
    ]), async (req, res) => {
        let client;
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
            // Sanitize and parse inputs
            const value1 = req.body.value1 ? parseFloat(sanitizeInput(req.body.value1.toString())) : null;
            const value2 = req.body.value2 ? parseFloat(sanitizeInput(req.body.value2.toString())) : null;
            const value3 = req.body.value3 ? parseFloat(sanitizeInput(req.body.value3.toString())) : null;
            const value4 = req.body.value4 ? parseFloat(sanitizeInput(req.body.value4.toString())) : null;
            const value5 = req.body.value5 ? parseFloat(sanitizeInput(req.body.value5.toString())) : null;
            const value6 = req.body.value6 ? parseFloat(sanitizeInput(req.body.value6.toString())) : null;
            const value7 = req.body.value7 ? parseFloat(sanitizeInput(req.body.value7.toString())) : null;
            const value8 = req.body.value8 ? parseFloat(sanitizeInput(req.body.value8.toString())) : null;

            const screenerName = sanitizeInput(req.body.screenerName);
            const Username = sanitizeInput(req.body.user);

            // Obfuscate username for logging
            const obfuscatedUsername = obfuscateUsername(Username);

            client = new MongoClient(uri);
            await client.connect();

            const db = client.db('EreunaDB');
            const assetInfoCollection = db.collection('AssetInfo');
            const screenersCollection = db.collection('Screeners');

            const maxValues = await assetInfoCollection.aggregate([
                { $group: { _id: null, ADV1M: { $max: '$ADV1M' }, ADV1W: { $max: '$ADV1W' }, ADV1Y: { $max: '$ADV1Y' }, ADV4M: { $max: '$ADV4M' } } }
            ]).toArray();

            const filter = { UsernameID: Username, Name: screenerName };
            const updateDoc = { $set: {} };

            // Define pairs and default values
            const pairs = [
                { key: 'ADV1W', values: [value1, value2], attribute: 'ADV1W' },
                { key: 'ADV1M', values: [value3, value4], attribute: 'ADV1M' },
                { key: 'ADV4M', values: [value5, value6], attribute: 'ADV4M' },
                { key: 'ADV1Y', values: [value7, value8], attribute: 'ADV1Y' },
            ];

            // Process pairs
            pairs.forEach((pair) => {
                const values = pair.values;
                const attribute = pair.attribute;

                // Check if at least one value is present
                if (values.some((value) => value !== null && !isNaN(value))) {
                    // Create a new array with default values for missing pairs
                    const max = maxValues[0][attribute];

                    const newArray = values.map((value, index) => value !== null && !isNaN(value) ? value : (index === 0 ? 0.01 : max));

                    // Add the new array to the update document
                    updateDoc.$set[pair.key] = newArray;
                }
            });

            // Check if any updates are present
            if (Object.keys(updateDoc.$set).length === 0) {
                return res.status(200).json({ message: 'No ADV values to update' });
            }

            const options = { returnOriginal: false };
            const result = await screenersCollection.findOneAndUpdate(filter, updateDoc, options);

            // Check if the screener document was found
            if (!result) {
                logger.warn('Screener not found for ADV update', {
                    user: obfuscatedUsername,
                    screenerName: screenerName
                });
                return res.status(404).json({ message: 'Screener not found' });
            }

            res.json({
                message: 'ADV updated successfully',
                updatedFields: Object.keys(updateDoc.$set)
            });

        } catch (error) {
            // Log error with obfuscated username and minimal details
            logger.error('Error updating ADV', {
                user: obfuscatedUsername,
                errorType: error.constructor.name,
                errorMessage: error.message
            });

            res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            if (client) {
                try {
                    await client.close(); // Ensure client is closed if it was initialized
                } catch (closeError) {
                    logger.warn('Error closing database connection', {
                        user: obfuscatedUsername,
                        error: closeError.message
                    });
                }
            }
        }
    });

    // endpoint that updates screener document with price peformance parameters 
    app.patch('/screener/price-performance', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),

        // Validation for changePerc values
        body('value1')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value1 must be a valid number or null'),

        body('value2')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value2 must be a valid number or null'),

        body('value3')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '' || value === '-') return true;
                const validOptions = ['1D', '1W', '1M', '4M', '6M', '1Y', 'YTD'];
                return validOptions.includes(value.trim());
            })
            .withMessage('Value3 must be a valid time period or null'),

        // Validation for percentage off week high/low
        body('value4')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value4 must be a valid number or null'),

        body('value5')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value5 must be a valid number or null'),

        body('value6')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value6 must be a valid number or null'),

        body('value7')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                const parsedValue = parseFloat(value);
                return !isNaN(parsedValue);
            })
            .withMessage('Value7 must be a valid number or null'),

        // Validation for NewHigh and NewLow
        body('value8')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                // Allow specific values or return true
                const allowedValues = ['yes', 'no', 'Yes', 'No'];
                return allowedValues.includes(value.trim());
            })
            .withMessage('Value8 must be "yes" or "no"'),

        body('value9')
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === '') return true;
                // Allow specific values or return true
                const allowedValues = ['yes', 'no', 'Yes', 'No'];
                return allowedValues.includes(value.trim());
            })
            .withMessage('Value9 must be "yes" or "no"'),
    ]), async (req, res) => {
        let client;
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
            // Sanitize and parse inputs
            const value1 = req.body.value1 ? parseFloat(sanitizeInput(req.body.value1.toString())) : null;
            const value2 = req.body.value2 ? parseFloat(sanitizeInput(req.body.value2.toString())) : null;
            const value3 = req.body.value3 ? sanitizeInput(req.body.value3.trim()) : null;
            const value4 = req.body.value4 ? parseFloat(sanitizeInput(req.body.value4.toString())) : null;
            const value5 = req.body.value5 ? parseFloat(sanitizeInput(req.body.value5.toString())) : null;
            const value6 = req.body.value6 ? parseFloat(sanitizeInput(req.body.value6.toString())) : null;
            const value7 = req.body.value7 ? parseFloat(sanitizeInput(req.body.value7.toString())) : null;
            const value8 = req.body.value8 ? sanitizeInput(req.body.value8.trim()) : null;
            const value9 = req.body.value9 ? sanitizeInput(req.body.value9.trim()) : null;
            const value10 = req.body.value10 ? sanitizeInput(req.body.value10) : null;
            const value11 = req.body.value11 ? sanitizeInput(req.body.value11) : null;
            const value12 = req.body.value12 ? sanitizeInput(req.body.value12) : null;
            const value13 = req.body.value13 ? sanitizeInput(req.body.value13) : null;
            const value14 = req.body.value14 ? sanitizeInput(req.body.value14) : null;

            const screenerName = sanitizeInput(req.body.screenerName);
            const Username = sanitizeInput(req.body.user);

            // Obfuscate username for logging
            const obfuscatedUsername = obfuscateUsername(Username);

            client = new MongoClient(uri);
            await client.connect();

            const db = client.db('EreunaDB');
            const collection = db.collection('Screeners');
            const assetInfoCollection = db.collection('AssetInfo');

            const filter = { UsernameID: Username, Name: screenerName };
            const updateDoc = { $set: {} };

            // New logic for changePerc
            if (value1 !== null || value2 !== null) {
                updateDoc.$set.changePerc = [];

                if (value1 === null && value2 !== null) {
                    updateDoc.$set.changePerc.push(0.01);
                    updateDoc.$set.changePerc.push(value2);
                } else if (value1 !== null && value2 === null) {
                    updateDoc.$set.changePerc.push(value1);

                    let attributeToCheck;
                    switch (value3) {
                        case '1D': attributeToCheck = 'todaychange'; break;
                        case '1W': attributeToCheck = 'weekchange'; break;
                        case '1M': attributeToCheck = 'Imchange'; break;
                        case '4M': attributeToCheck = '4mchange'; break;
                        case '6M': attributeToCheck = '6mchange'; break;
                        case '1Y': attributeToCheck = 'lychange'; break;
                        case 'YTD': attributeToCheck = 'ytdchange'; break;
                        default: attributeToCheck = 'todaychange';
                    }

                    const maxValue = await assetInfoCollection.aggregate([
                        {
                            $match: {
                                [attributeToCheck]: { $ne: 'N/A', $type: 'number' }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                value: { $max: { $toDouble: `$${attributeToCheck}` } }
                            }
                        }
                    ]).toArray();

                    updateDoc.$set.changePerc.push(maxValue[0]?.value || value1);
                } else if (value1 !== null && value2 !== null) {
                    updateDoc.$set.changePerc.push(value1);
                    updateDoc.$set.changePerc.push(value2);
                }

                if (value3 !== null && value3 !== '') {
                    updateDoc.$set.changePerc.push(value3);
                }
            }

            if (value4 !== null || value5 !== null) {
                updateDoc.$set.PercOffWeekHigh = [];
                if (value4 !== null && value5 === null) {
                    updateDoc.$set.PercOffWeekHigh.push(value4);
                    const maxValue = await assetInfoCollection.aggregate([
                        { $group: { _id: null, value: { $max: '$percoff52WeekHigh' } } }
                    ]).toArray();
                    updateDoc.$set.PercOffWeekHigh.push(maxValue[0]?.value);
                } else if (value4 === null && value5 !== null) {
                    const minValue = await assetInfoCollection.aggregate([
                        { $group: { _id: null, value: { $min: '$percoff52WeekHigh' } } }
                    ]).toArray();
                    updateDoc.$set.PercOffWeekHigh.push(minValue[0]?.value);
                    updateDoc.$set.PercOffWeekHigh.push(value5);
                } else {
                    updateDoc.$set.PercOffWeekHigh.push(value4);
                    updateDoc.$set.PercOffWeekHigh.push(value5);
                }
            }

            // New logic for PercOffWeekLow
            if (value6 !== null || value7 !== null) {
                updateDoc.$set.PercOffWeekLow = [];
                if (value6 !== null && value7 === null) {
                    updateDoc.$set.PercOffWeekLow.push(value6);
                    const maxValue = await assetInfoCollection.aggregate([
                        { $group: { _id: null, value: { $max: '$percoff52WeekLow' } } }
                    ]).toArray();
                    updateDoc.$set.PercOffWeekLow.push(maxValue[0]?.value);
                } else if (value6 === null && value7 !== null) {
                    const minValue = await assetInfoCollection.aggregate([
                        { $group: { _id: null, value: { $min: '$percoff52WeekLow' } } }
                    ]).toArray();
                    updateDoc.$set.PercOffWeekLow.push(minValue[0]?.value);
                    updateDoc.$set.PercOffWeekLow.push(value7);
                } else {
                    updateDoc.$set.PercOffWeekLow.push(value6);
                    updateDoc.$set.PercOffWeekLow.push(value7);
                }
            }

            // Update NewHigh
            if (value8 !== null && value8 !== 'no') {
                updateDoc.$set.NewHigh = value8;
            }

            // Update NewLow
            if (value9 !== null && value9 !== 'no') {
                updateDoc.$set.NewLow = value9;
            }

            // Update Moving Averages
            if (value10 !== null && value10 !== '-') {
                updateDoc.$set.MA200 = value10;
            }

            if (value11 !== null && value11 !== '-') {
                updateDoc.$set.MA50 = value11;
            }

            if (value12 !== null && value12 !== '-') {
                updateDoc.$set.MA20 = value12;
            }

            if (value13 !== null && value13 !== '-') {
                updateDoc.$set.MA10 = value13;
            }

            if (value14 !== null && value14 !== '-') {
                updateDoc.$set.CurrentPrice = value14;
            }

            // Check if there are any updates to apply
            if (Object.keys(updateDoc.$set).length === 0) {
                return res.status(200).json({ message: 'No price performance values to update' });
            }

            // Perform the update
            const options = { returnOriginal: false };
            const result = await collection.findOneAndUpdate(filter, updateDoc, options);

            // Check if the screener document was found
            if (!result) {
                logger.warn('Screener not found for price performance update', {
                    user: obfuscatedUsername,
                    screenerName: screenerName
                });
                return res.status(404).json({ message: 'Screener not found' });
            }

            res.json({
                message: 'Price performance updated successfully',
                updatedFields: Object.keys(updateDoc.$set)
            });

        } catch (error) {
            // Log error with obfuscated username and minimal details
            logger.error('Error updating price performance', {
                user: obfuscatedUsername,
                errorType: error.constructor.name,
                errorMessage: error.message
            });

            res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            if (client) {
                try {
                    await client.close(); // Ensure client is closed if it was initialized
                } catch (closeError) {
                    logger.warn('Error closing database connection', {
                        user: obfuscatedUsername,
                        error: closeError.message
                    });
                }
            }
        }
    });

    // i don't think this endpoint is used at the moment...great fucking mess 
    app.get('/screener/performance/:ticker', [
        validationSchemas.chartData('ticker')
    ], validate([validationSchemas.chartData('ticker')]), async (req, res) => {
        const obfuscatedUsername = req.user ? obfuscateUsername(req.user.username) : 'unknown';
        let client;

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
            const symbol = req.params.ticker.toUpperCase();

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const assetInfoCollection = db.collection('AssetInfo');

            // Filter by 'Symbol' and retrieve the specified attributes
            const filter = { Symbol: symbol };
            const projection = {
                _id: 0,
                '1mchange': 1,
                '1ychange': 1,
                '4mchange': 1,
                '6mchange': 1,
                'todaychange': 1,
                'weekchange': 1,
                'ytdchange': 1
            };

            const performanceData = await assetInfoCollection.findOne(filter, { projection });

            // Handle case when no data is found
            if (!performanceData) {
                logger.warn('Performance data not found', {
                    user: obfuscatedUsername,
                    symbol: symbol
                });
                return res.status(404).json({ message: `No performance data found for ${symbol}` });
            }

            res.json(performanceData);

        } catch (error) {
            // Log error with obfuscated username
            logger.error('Error retrieving performance data', {
                user: obfuscatedUsername,
                symbol: symbol,
                errorMessage: error.message,
                errorStack: error.stack
            });

            res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    logger.warn('Error closing database connection', {
                        user: obfuscatedUsername,
                        errorMessage: closeError.message
                    });
                }
            }
        }
    });

    // Full Reset screener parameters 
    app.patch('/screener/reset/:user/:name',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.screenerNameParam()
        ]),
        async (req, res) => {
            const obfuscatedUsername = req.user ? obfuscateUsername(req.user.username) : 'unknown';
            let client;

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
                // Sanitize input parameters
                const UsernameID = sanitizeInput(req.params.user);
                const Name = sanitizeInput(req.params.name); // Sanitize the name parameter

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                const filter = { UsernameID: UsernameID, Name: Name };
                logger.debug('Resetting screener parameters', {
                    user: obfuscatedUsername,
                    screenerName: Name
                });

                const updateDoc = {
                    $set: {
                        UsernameID: UsernameID,
                        Name: Name,
                    },
                    $unset: {}
                };

                // Find existing fields to unset
                const fields = await collection.findOne(filter, { projection: { _id: 0 } });

                if (!fields) {
                    logger.warn('Screener not found during reset', {
                        user: obfuscatedUsername,
                        screenerName: Name
                    });
                    return res.status(404).json({ message: 'Screener not found' });
                }

                Object.keys(fields).forEach(field => {
                    if (field !== 'UsernameID' && field !== 'Name') {
                        updateDoc.$unset[field] = '';
                    }
                });

                const options = { returnDocument: 'after' };

                const result = await collection.findOneAndUpdate(filter, updateDoc, options);

                if (result) {
                    res.json({ message: 'Screener parameters reset successfully' });
                } else {
                    logger.warn('Screener update failed', {
                        user: obfuscatedUsername,
                        screenerName: Name
                    });
                    res.status(500).json({ message: 'Failed to reset screener parameters' });
                }
            } catch (error) {
                logger.error('Error resetting screener parameters', {
                    user: obfuscatedUsername,
                    errorMessage: error.message,
                    errorStack: error.stack
                });
                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            user: obfuscatedUsername,
                            errorMessage: closeError.message
                        });
                    }
                }
            }
        }
    );

    // Reset Individual screener parameter 
    app.patch('/reset/screener/param',
        validate([
            validationSchemas.user(),
            body('Name')
                .trim()
                .isLength({ min: 1, max: 20 })
                .withMessage('Screener name must be between 1 and 20 characters')
                .matches(/^[a-zA-Z0-9\s_-]+$/)
                .withMessage('Screener name can only contain letters, numbers, spaces, underscores, and hyphens'), // Validate screener name
            body('stringValue')
                .trim()
                .isIn([
                    'price', 'marketCap', 'IPO', 'Sector', 'Exchange', 'Country',
                    'PE', 'ForwardPE', 'PEG', 'EPS', 'PS', 'PB', 'Beta',
                    'DivYield', 'FundGrowth', 'PricePerformance', 'RSscore', 'Volume', 'ADV', 'ROE', 'ROA', 'CurrentRatio', 'CurrentAssets',
                    'CurrentLiabilities', 'CurrentDebt', 'CashEquivalents', 'FCF', 'ProfitMargin', 'GrossMargin',
                    'DebtEquity', 'BookValue', 'EV', 'RSI', 'Gap', 'AssetType', 'IV'
                ])
                .withMessage('Invalid parameter to reset')
        ]),
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                user: obfuscateUsername(req.body.user),
                method: req.method,
                path: req.path
            });

            let client;
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
                // Sanitize inputs
                const UsernameID = sanitizeInput(req.body.user);
                const Name = sanitizeInput(req.body.Name);
                const value = sanitizeInput(req.body.stringValue);

                // Log the reset parameter attempt
                requestLogger.info('Attempting to reset screener parameter', {
                    parameter: value,
                    username: obfuscateUsername(UsernameID),
                    screenerName: Name
                });

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                const filter = { UsernameID: UsernameID, Name: Name };

                const updateDoc = {
                    $unset: {}
                };

                switch (value) {
                    case 'price':
                        updateDoc.$unset.Price = '';
                        break;
                    case 'marketCap':
                        updateDoc.$unset.MarketCap = '';
                        break;
                    case 'IPO':
                        updateDoc.$unset.IPO = '';
                        break;
                    case 'Sector':
                        updateDoc.$unset.Sectors = '';
                        break;
                    case 'AssetType':
                        updateDoc.$unset.AssetTypes = '';
                        break;
                    case 'Exchange':
                        updateDoc.$unset.Exchanges = '';
                        break;
                    case 'Country':
                        updateDoc.$unset.Countries = '';
                        break;
                    case 'PE':
                        updateDoc.$unset.PE = '';
                        break;
                    case 'ForwardPE':
                        updateDoc.$unset.ForwardPE = '';
                        break;
                    case 'PEG':
                        updateDoc.$unset.PEG = '';
                        break;
                    case 'EPS':
                        updateDoc.$unset.EPS = '';
                        break;
                    case 'PS':
                        updateDoc.$unset.PS = '';
                        break;
                    case 'PB':
                        updateDoc.$unset.PB = '';
                        break;
                    case 'Beta':
                        updateDoc.$unset.Beta = '';
                        break;
                    case 'DivYield':
                        updateDoc.$unset.DivYield = '';
                        break;
                    case 'FundGrowth':
                        updateDoc.$unset.EPSQoQ = '';
                        updateDoc.$unset.EPSYoY = '';
                        updateDoc.$unset.EarningsQoQ = '';
                        updateDoc.$unset.EarningsYoY = '';
                        updateDoc.$unset.RevQoQ = '';
                        updateDoc.$unset.RevYoY = '';
                        break;
                    case 'PricePerformance':
                        updateDoc.$unset.MA10 = '';
                        updateDoc.$unset.MA20 = '';
                        updateDoc.$unset.MA50 = '';
                        updateDoc.$unset.MA200 = '';
                        updateDoc.$unset.CurrentPrice = '';
                        updateDoc.$unset.NewHigh = '';
                        updateDoc.$unset.NewLow = '';
                        updateDoc.$unset.PercOffWeekHigh = '';
                        updateDoc.$unset.PercOffWeekLow = '';
                        updateDoc.$unset.changePerc = '';
                        break;
                    case 'RSscore':
                        updateDoc.$unset.RSScore1M = '';
                        updateDoc.$unset.RSScore4M = '';
                        updateDoc.$unset.RSScore1W = '';
                        break;
                    case 'Volume':
                        updateDoc.$unset.AvgVolume1W = '';
                        updateDoc.$unset.RelVolume1W = '';
                        updateDoc.$unset.AvgVolume1M = '';
                        updateDoc.$unset.RelVolume1M = '';
                        updateDoc.$unset.AvgVolume6M = '';
                        updateDoc.$unset.RelVolume6M = '';
                        updateDoc.$unset.AvgVolume1Y = '';
                        updateDoc.$unset.RelVolume1Y = '';
                        break;
                    case 'ADV':
                        updateDoc.$unset.ADV1W = '';
                        updateDoc.$unset.ADV1M = '';
                        updateDoc.$unset.ADV4M = '';
                        updateDoc.$unset.ADV1Y = '';
                        break;
                    case 'ROE':
                        updateDoc.$unset.ROE = '';
                        break;
                    case 'ROA':
                        updateDoc.$unset.ROA = '';
                        break;
                    case 'CurrentRatio':
                        updateDoc.$unset.currentRatio = '';
                        break;
                    case 'CurrentAssets':
                        updateDoc.$unset.assetsCurrent = '';
                        break;
                    case 'CurrentLiabilities':
                        updateDoc.$unset.liabilitiesCurrent = '';
                        break;
                    case 'CurrentDebt':
                        updateDoc.$unset.debtCurrent = '';
                        break;
                    case 'CashEquivalents':
                        updateDoc.$unset.cashAndEq = '';
                        break;
                    case 'FCF':
                        updateDoc.$unset.freeCashFlow = '';
                        break;
                    case 'ProfitMargin':
                        updateDoc.$unset.profitMargin = '';
                        break;
                    case 'GrossMargin':
                        updateDoc.$unset.grossMargin = '';
                        break;
                    case 'DebtEquity':
                        updateDoc.$unset.debtEquity = '';
                        break;
                    case 'BookValue':
                        updateDoc.$unset.bookVal = '';
                        break;
                    case 'EV':
                        updateDoc.$unset.EV = '';
                        break;
                    case 'RSI':
                        updateDoc.$unset.RSI = '';
                        break;
                    case 'Gap':
                        updateDoc.$unset.Gap = '';
                        break;
                    case 'IV':
                        updateDoc.$unset.IV = '';
                        break;
                    default:
                        // Log unknown value attempt
                        requestLogger.warn('Attempted to reset with unknown parameter', {
                            parameter: value,
                            username: obfuscateUsername(UsernameID),
                            screenerName: Name
                        });

                        return res.status(400).json({
                            message: `Unknown reset parameter: ${value}`
                        });
                }

                const options = { returnOriginal: false };

                const result = await collection.findOneAndUpdate(filter, updateDoc, options);

                if (result) { // Check if the document was found and updated

                    res.json({
                        message: 'Parameter reset successfully',
                        resetParameter: value
                    });
                } else {
                    // Log when no document is found
                    requestLogger.warn('No screener found for reset', {
                        username: obfuscateUsername(UsernameID),
                        screenerName: Name
                    });

                    res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to reset parameter'
                    });
                }

            } catch (error) {
                // Log any unexpected errors
                requestLogger.error('Error resetting screener parameter', {
                    errorMessage: error.message,
                    errorName: error.name,
                    username: obfuscateUsername(req.body.user),
                    screenerName: sanitizeInput(req.body.Name)
                });

                // Security event logging
                securityLogger.logSecurityEvent('screener_parameter_reset_failed', {
                    username: obfuscateUsername(req.body.user),
                    errorType: error.constructor.name
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        requestLogger.warn('Error closing database connection', {
                            errorMessage: closeError.message
                        });
                    }
                }
            }
        });

    // retrieves params from individual screener document 
    app.get('/screener/datavalues/:user/:name',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.screenerNameParam(),
        ]),
        async (req, res) => {
            const usernameID = req.params.user;
            const name = req.params.name;

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
                const client = new MongoClient(uri);
                try {
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const assetInfoCollection = db.collection('Screeners');

                    const query = { UsernameID: usernameID, Name: name };
                    const projection = {
                        Price: 1, MarketCap: 1, Sectors: 1, Exchanges: 1, Countries: 1, PE: 1,
                        ForwardPE: 1, PEG: 1, EPS: 1, PS: 1, PB: 1, Beta: 1, DivYield: 1, EPSQoQ: 1, EPSYoY: 1,
                        EarningsQoQ: 1, EarningsYoY: 1, RevQoQ: 1, RevYoY: 1, AvgVolume1W: 1, AvgVolume1M: 1,
                        AvgVolume6M: 1, AvgVolume1Y: 1, RelVolume1W: 1, RelVolume1M: 1, RelVolume6M: 1, RelVolume1Y: 1,
                        RSScore1W: 1, RSScore1M: 1, RSScore4M: 1, MA10: 1, MA20: 1, MA50: 1, MA200: 1, CurrentPrice: 1, NewHigh: 1, NewLow: 1, PercOffWeekHigh: 1,
                        PercOffWeekLow: 1, changePerc: 1, IPO: 1, ADV1W: 1, ADV1M: 1, ADV4M: 1, ADV1Y: 1, ROE: 1, ROA: 1, currentRatio: 1,
                        assetsCurrent: 1, liabilitiesCurrent: 1, debtCurrent: 1, cashAndEq: 1, freeCashFlow: 1, profitMargin: 1, grossMargin: 1,
                        debtEquity: 1, bookVal: 1, EV: 1, RSI: 1, Gap: 1, AssetType: 1, IV: 1,
                    };

                    const cursor = assetInfoCollection.find(query, { projection: projection });
                    const result = await cursor.toArray();

                    if (result.length === 0) {
                        // Log the not found scenario
                        logger.warn('Screener data not found', {
                            usernameID: obfuscateUsername(usernameID),
                            screenerName: name
                        });

                        return res.status(404).json({
                            message: 'No document found',
                            details: 'Screener data could not be retrieved'
                        });
                    }

                    const document = result[0];
                    const response = {
                        Price: document.Price,
                        MarketCap: document.MarketCap,
                        Sectors: document.Sectors,
                        AssetType: document.AssetTypes,
                        Exchanges: document.Exchanges,
                        Countries: document.Countries,
                        PE: document.PE,
                        ForwardPE: document.ForwardPE,
                        PEG: document.PEG,
                        EPS: document.EPS,
                        PS: document.PS,
                        PB: document.PB,
                        Beta: document.Beta,
                        DivYield: document.DivYield,
                        EPSQoQ: document.EPSQoQ,
                        EPSYoY: document.EPSYoY,
                        EarningsQoQ: document.EarningsQoQ,
                        EarningsYoY: document.EarningsYoY,
                        RevQoQ: document.RevQoQ,
                        RevYoY: document.RevYoY,
                        AvgVolume1W: document.AvgVolume1W,
                        AvgVolume1M: document.AvgVolume1M,
                        AvgVolume6M: document.AvgVolume6M,
                        AvgVolume1Y: document.AvgVolume1Y,
                        RelVolume1W: document.RelVolume1W,
                        RelVolume1M: document.RelVolume1M,
                        RelVolume6M: document.RelVolume6M,
                        RelVolume1Y: document.RelVolume1Y,
                        RSScore1W: document.RSScore1W,
                        RSScore1M: document.RSScore1M,
                        RSScore4M: document.RSScore4M,
                        ADV1W: document.ADV1W,
                        ADV1M: document.ADV1M,
                        ADV4M: document.ADV4M,
                        ADV1Y: document.ADV1Y,
                        todaychange: document.todaychange,
                        ytdchange: document.ytdchange,
                        MA10: document.MA10,
                        MA20: document.MA20,
                        MA50: document.MA50,
                        MA200: document.MA200,
                        CurrentPrice: document.CurrentPrice,
                        NewHigh: document.NewHigh,
                        NewLow: document.NewLow,
                        PercOffWeekHigh: document.PercOffWeekHigh,
                        PercOffWeekLow: document.PercOffWeekLow,
                        changePerc: document.changePerc,
                        IPO: document.IPO,
                        ROE: document.ROE,
                        ROA: document.ROA,
                        currentRatio: document.currentRatio,
                        assetsCurrent: document.assetsCurrent,
                        liabilitiesCurrent: document.liabilitiesCurrent,
                        debtCurrent: document.debtCurrent,
                        cashAndEq: document.cashAndEq,
                        freeCashFlow: document.freeCashFlow,
                        profitMargin: document.profitMargin,
                        grossMargin: document.grossMargin,
                        debtEquity: document.debtEquity,
                        bookVal: document.bookVal,
                        EV: document.EV,
                        RSI: document.RSI,
                        Gap: document.Gap,
                        IV: document.IV
                    };

                    res.json(response);
                } finally {
                    await client.close();
                }
            } catch (err) {
                // Log the error
                logger.error('Error retrieving screener data', {
                    errorMessage: err.message,
                    usernameID: obfuscateUsername(usernameID),
                    screenerName: name
                });

                // Security event logging
                securityLogger.logSecurityEvent('screener_data_retrieval_failed', {
                    username: obfuscateUsername(usernameID),
                    errorType: err.constructor.name
                });

                res.status(500).json({
                    message: 'Error connecting to database',
                    details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
                });
            }
        }
    );

    // endpoint that sends filtered results for screener
    app.get('/screener/:user/results/filtered/:name',
        validate([
            param('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

            param('name')
                .trim()
                .notEmpty().withMessage('Screener name is required')
                .isLength({ min: 1, max: 20 }).withMessage('Screener name must be between 1 and 20 characters')
                .matches(/^[a-zA-Z0-9\s_\-+()]+$/).withMessage('Screener name can only contain letters, numbers, spaces, underscores, hyphens, plus, and parentheses')
        ]),
        async (req, res) => {
            const user = sanitizeInput(req.params.user); // Sanitize user input
            const screenerName = sanitizeInput(req.params.name); // Sanitize screener name input

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
                const client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');

                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: user });
                if (!userDoc) {
                    logger.warn('User  not found', { user: obfuscateUsername(user) });
                    return res.status(404).json({ message: 'User  not found' });
                }

                const hiddenSymbols = userDoc.Hidden;

                const screenersCollection = db.collection('Screeners');
                const screenerData = await screenersCollection.findOne({ UsernameID: user, Name: screenerName });
                if (!screenerData) {
                    logger.warn('Screener data not found', { user: obfuscateUsername(user), screenerName: screenerName });
                    return res.status(404).json({ message: 'Screener data not found' });
                }

                // Extract filters from screenerData
                const screenerFilters = {};

                if (screenerData.Price && screenerData.Price[0] !== 0 && screenerData.Price[1] !== 0) {
                    screenerFilters.Price = screenerData.Price;
                }

                if (screenerData.MarketCap && screenerData.MarketCap[0] !== 0 && screenerData.MarketCap[1] !== 0) {
                    screenerFilters.MarketCap = screenerData.MarketCap;
                }

                if (screenerData.Sectors && screenerData.Sectors.length > 0) {
                    screenerFilters.sectors = screenerData.Sectors;
                }

                if (screenerData.AssetTypes && screenerData.AssetTypes.length > 0) {
                    screenerFilters.assetTypes = screenerData.AssetTypes;
                }

                if (screenerData.Exchanges && screenerData.Exchanges.length > 0) {
                    screenerFilters.exchanges = screenerData.Exchanges;
                }

                if (screenerData.Countries && screenerData.Countries.length > 0) {
                    screenerFilters.countries = screenerData.Countries;
                }

                if (screenerData.NewHigh && screenerData.NewHigh.length > 0) {
                    screenerFilters.NewHigh = screenerData.NewHigh;
                }

                if (screenerData.NewLow && screenerData.NewLow.length > 0) {
                    screenerFilters.NewLow = screenerData.NewLow;
                }

                if (screenerData.MA200 && screenerData.MA200.length > 0) {
                    screenerFilters.MA200 = screenerData.MA200;
                }

                if (screenerData.MA50 && screenerData.MA50.length > 0) {
                    screenerFilters.MA50 = screenerData.MA50;
                }

                if (screenerData.MA20 && screenerData.MA20.length > 0) {
                    screenerFilters.MA20 = screenerData.MA20;
                }

                if (screenerData.MA10 && screenerData.MA10.length > 0) {
                    screenerFilters.MA10 = screenerData.MA10;
                }

                if (screenerData.CurrentPrice && screenerData.CurrentPrice.length > 0) {
                    screenerFilters.CurrentPrice = screenerData.CurrentPrice;
                }

                if (screenerData.PE && screenerData.PE[0] !== 0 && screenerData.PE[1] !== 0) {
                    screenerFilters.PE = screenerData.PE;
                }

                if (screenerData.ForwardPE && screenerData.ForwardPE[0] !== 0 && screenerData.ForwardPE[1] !== 0) {
                    screenerFilters.ForwardPE = screenerData.ForwardPE;
                }

                if (screenerData.PEG && screenerData.PEG[0] !== 0 && screenerData.PEG[1] !== 0) {
                    screenerFilters.PEG = screenerData.PEG;
                }

                if (screenerData.EPS && screenerData.EPS[0] !== 0 && screenerData.EPS[1] !== 0) {
                    screenerFilters.EPS = screenerData.EPS;
                }

                if (screenerData.PS && screenerData.PS[0] !== 0 && screenerData.PS[1] !== 0) {
                    screenerFilters.PS = screenerData.PS;
                }

                if (screenerData.PB && screenerData.PB[0] !== 0 && screenerData.PB[1] !== 0) {
                    screenerFilters.PB = screenerData.PB;
                }

                if (screenerData.Beta && screenerData.Beta[0] !== 0 && screenerData.Beta[1] !== 0) {
                    screenerFilters.Beta = screenerData.Beta;
                }

                if (screenerData.DivYield && screenerData.DivYield[0] !== 0 && screenerData.DivYield[1] !== 0) {
                    screenerFilters.DivYield = screenerData.DivYield;
                }

                if (screenerData.EPSQoQ && screenerData.EPSQoQ[0] !== 0 && screenerData.EPSQoQ[1] !== 0) {
                    screenerFilters.EPSQoQ = screenerData.EPSQoQ;
                }

                if (screenerData.EPSYoY && screenerData.EPSYoY[0] !== 0 && screenerData.EPSYoY[1] !== 0) {
                    screenerFilters.EPSYoY = screenerData.EPSYoY;
                }

                if (screenerData.EarningsQoQ && screenerData.EarningsQoQ[0] !== 0 && screenerData.EarningsQoQ[1] !== 0) {
                    screenerFilters.EarningsQoQ = screenerData.EarningsQoQ;
                }

                if (screenerData.EarningsYoY && screenerData.EarningsYoY[0] !== 0 && screenerData.EarningsYoY[1] !== 0) {
                    screenerFilters.EarningsYoY = screenerData.EarningsYoY;
                }

                if (screenerData.RevQoQ && screenerData.RevQoQ[0] !== 0 && screenerData.RevQoQ[1] !== 0) {
                    screenerFilters.RevQoQ = screenerData.RevQoQ;
                }

                if (screenerData.RevYoY && screenerData.RevYoY[0] !== 0 && screenerData.RevYoY[1] !== 0) {
                    screenerFilters.RevYoY = screenerData.RevYoY;
                }

                if (screenerData.AvgVolume1W && screenerData.AvgVolume1W[0] !== 0 && screenerData.AvgVolume1W[1] !== 0) {
                    screenerFilters.AvgVolume1W = screenerData.AvgVolume1W;
                }

                if (screenerData.AvgVolume1M && screenerData.AvgVolume1M[0] !== 0 && screenerData.AvgVolume1M[1] !== 0) {
                    screenerFilters.AvgVolume1M = screenerData.AvgVolume1M;
                }

                if (screenerData.AvgVolume6M && screenerData.AvgVolume6M[0] !== 0 && screenerData.AvgVolume6M[1] !== 0) {
                    screenerFilters.AvgVolume6M = screenerData.AvgVolume6M;
                }

                if (screenerData.AvgVolume1Y && screenerData.AvgVolume1Y[0] !== 0 && screenerData.AvgVolume1Y[1] !== 0) {
                    screenerFilters.AvgVolume1Y = screenerData.AvgVolume1Y;
                }

                if (screenerData.RelVolume1W && screenerData.RelVolume1W[0] !== 0 && screenerData.RelVolume1W[1] !== 0) {
                    screenerFilters.RelVolume1W = screenerData.RelVolume1W;
                }

                if (screenerData.RelVolume1M && screenerData.RelVolume1M[0] !== 0 && screenerData.RelVolume1M[1] !== 0) {
                    screenerFilters.RelVolume1M = screenerData.RelVolume1M;
                }

                if (screenerData.RelVolume6M && screenerData.RelVolume6M[0] !== 0 && screenerData.RelVolume6M[1] !== 0) {
                    screenerFilters.RelVolume6M = screenerData.RelVolume6M;
                }

                if (screenerData.RelVolume1Y && screenerData.RelVolume1Y[0] !== 0 && screenerData.RelVolume1Y[1] !== 0) {
                    screenerFilters.RelVolume1Y = screenerData.RelVolume1Y;
                }

                if (screenerData.RSScore1W && screenerData.RSScore1W[0] !== 0 && screenerData.RSScore1W[1] !== 0) {
                    screenerFilters.RSScore1W = screenerData.RSScore1W;
                }

                if (screenerData.RSScore1M && screenerData.RSScore1M[0] !== 0 && screenerData.RSScore1M[1] !== 0) {
                    screenerFilters.RSScore1M = screenerData.RSScore1M;
                }

                if (screenerData.RSScore4M && screenerData.RSScore4M[0] !== 0 && screenerData.RSScore4M[1] !== 0) {
                    screenerFilters.RSScore4M = screenerData.RSScore4M;
                }

                if (screenerData.ADV1W && screenerData.ADV1W[0] !== 0 && screenerData.ADV1W[1] !== 0) {
                    screenerFilters.ADV1W = screenerData.ADV1W;
                }

                if (screenerData.ADV1M && screenerData.ADV1M[0] !== 0 && screenerData.ADV1M[1] !== 0) {
                    screenerFilters.ADV1M = screenerData.ADV1M;
                }

                if (screenerData.ADV4M && screenerData.ADV4M[0] !== 0 && screenerData.ADV4M[1] !== 0) {
                    screenerFilters.ADV4M = screenerData.ADV4M;
                }

                if (screenerData.ADV1Y && screenerData.ADV1Y[0] !== 0 && screenerData.ADV1Y[1] !== 0) {
                    screenerFilters.ADV1Y = screenerData.ADV1Y;
                }

                if (screenerData.PercOffWeekHigh && screenerData.PercOffWeekHigh[0] !== 0 && screenerData.PercOffWeekHigh[1] !== 0) {
                    screenerFilters.PercOffWeekHigh = screenerData.PercOffWeekHigh;
                }

                if (screenerData.PercOffWeekLow && screenerData.PercOffWeekLow[0] !== 0 && screenerData.PercOffWeekLow[1] !== 0) {
                    screenerFilters.PercOffWeekLow = screenerData.PercOffWeekLow;
                }

                if (screenerData.IPO && screenerData.IPO[0] !== 0 && screenerData.IPO[1] !== 0) {
                    screenerFilters.IPO = screenerData.IPO;
                }

                if (screenerData.changePerc &&
                    screenerData.changePerc[0] !== 0 &&
                    screenerData.changePerc[1] !== 0) {
                    screenerFilters.changePerc = screenerData.changePerc;
                    if (screenerData.changePerc[2] && screenerData.changePerc[2].length > 0) {
                        screenerFilters.changePerc[2] = screenerData.changePerc[2];
                    }
                }

                if (screenerData.ROE && screenerData.ROE[0] !== 0 && screenerData.ROE[1] !== 0) {
                    screenerFilters.ROE = screenerData.ROE;
                }

                if (screenerData.ROA && screenerData.ROA[0] !== 0 && screenerData.ROA[1] !== 0) {
                    screenerFilters.ROA = screenerData.ROA;
                }

                if (screenerData.currentRatio && screenerData.currentRatio[0] !== 0 && screenerData.currentRatio[1] !== 0) {
                    screenerFilters.currentRatio = screenerData.currentRatio;
                }

                if (screenerData.assetsCurrent && screenerData.assetsCurrent[0] !== 0 && screenerData.assetsCurrent[1] !== 0) {
                    screenerFilters.assetsCurrent = screenerData.assetsCurrent;
                }

                if (screenerData.liabilitiesCurrent && screenerData.liabilitiesCurrent[0] !== 0 && screenerData.liabilitiesCurrent[1] !== 0) {
                    screenerFilters.liabilitiesCurrent = screenerData.liabilitiesCurrent;
                }

                if (screenerData.debtCurrent && screenerData.debtCurrent[0] !== 0 && screenerData.debtCurrent[1] !== 0) {
                    screenerFilters.debtCurrent = screenerData.debtCurrent;
                }

                if (screenerData.cashAndEq && screenerData.cashAndEq[0] !== 0 && screenerData.cashAndEq[1] !== 0) {
                    screenerFilters.cashAndEq = screenerData.cashAndEq;
                }

                if (screenerData.freeCashFlow && screenerData.freeCashFlow[0] !== 0 && screenerData.freeCashFlow[1] !== 0) {
                    screenerFilters.freeCashFlow = screenerData.freeCashFlow;
                }

                if (screenerData.profitMargin && screenerData.profitMargin[0] !== 0 && screenerData.profitMargin[1] !== 0) {
                    screenerFilters.profitMargin = screenerData.profitMargin;
                }

                if (screenerData.grossMargin && screenerData.grossMargin[0] !== 0 && screenerData.grossMargin[1] !== 0) {
                    screenerFilters.grossMargin = screenerData.grossMargin;
                }

                if (screenerData.debtEquity && screenerData.debtEquity[0] !== 0 && screenerData.debtEquity[1] !== 0) {
                    screenerFilters.debtEquity = screenerData.debtEquity;
                }

                if (screenerData.bookVal && screenerData.bookVal[0] !== 0 && screenerData.bookVal[1] !== 0) {
                    screenerFilters.bookVal = screenerData.bookVal;
                }

                if (screenerData.EV && screenerData.EV[0] !== 0 && screenerData.EV[1] !== 0) {
                    screenerFilters.EV = screenerData.EV;
                }

                if (screenerData.RSI && screenerData.RSI[0] !== 0 && screenerData.RSI[1] !== 0) {
                    screenerFilters.RSI = screenerData.RSI;
                }

                if (screenerData.Gap && screenerData.Gap[0] !== 0 && screenerData.Gap[1] !== 0) {
                    screenerFilters.Gap = screenerData.Gap;
                }

                if (screenerData.IV && screenerData.IV[0] !== 0 && screenerData.IV[1] !== 0) {
                    screenerFilters.IV = screenerData.IV;
                }

                // Filter the AssetInfo collection 
                const assetInfoCollection = db.collection('AssetInfo');
                const query = {
                    Symbol: { $nin: hiddenSymbols }
                };

                Object.keys(screenerFilters).forEach((key) => {
                    switch (key) {
                        case 'Price':
                            query.$expr = {
                                $and: [
                                    { $gt: [{ $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] }, screenerFilters.Price[0]] },
                                    { $lt: [{ $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] }, screenerFilters.Price[1]] }
                                ]
                            };
                            break;
                        case 'MarketCap':
                            query.MarketCapitalization = {
                                $gt: screenerFilters.MarketCap[0],
                                $lt: screenerFilters.MarketCap[1]
                            };
                            break;
                        case 'IPO':
                            query.IPO = {
                                $gt: screenerFilters.IPO[0],
                                $lt: screenerFilters.IPO[1]
                            };
                            break;
                        case 'sectors':
                            query.Sector = { $in: screenerFilters.sectors };
                            break;
                        case 'assetTypes':
                            query.AssetType = { $in: screenerFilters.assetTypes };
                            break;
                        case 'exchanges':
                            query.Exchange = { $in: screenerFilters.exchanges };
                            break;
                        case 'countries':
                            query.Country = { $in: screenerFilters.countries };
                            break;
                        case 'PE':
                            query.PERatio = {
                                $gt: screenerFilters.PE[0],
                                $lt: screenerFilters.PE[1]
                            };
                            break;
                        case 'ForwardPE':
                            query.ForwardPE = {
                                $gt: screenerFilters.ForwardPE[0],
                                $lt: screenerFilters.ForwardPE[1]
                            };
                            break;
                        case 'PEG':
                            query.PEGRatio = {
                                $gt: screenerFilters.PEG[0],
                                $lt: screenerFilters.PEG[1]
                            };
                            break;
                        case 'EPS':
                            query.EPS = {
                                $gt: screenerFilters.EPS[0],
                                $lt: screenerFilters.EPS[1]
                            };
                            break;
                        case 'PS':
                            query.PriceToSalesRatioTTM = {
                                $gt: screenerFilters.PS[0],
                                $lt: screenerFilters.PS[1]
                            };
                            break;
                        case 'PB':
                            query.PriceToBookRatio = {
                                $gt: screenerFilters.PB[0],
                                $lt: screenerFilters.PB[1]
                            };
                            break;
                        case 'Beta':
                            query.Beta = {
                                $gt: screenerFilters.Beta[0],
                                $lt: screenerFilters.Beta[1]
                            };
                            break;
                        case 'DivYield':
                            query.DividendYield = {
                                $gt: screenerFilters.DivYield[0],
                                $lt: screenerFilters.DivYield[1]
                            };
                            break;
                        case 'EPSQoQ':
                            query.EPSQoQ = {
                                $gt: screenerFilters.EPSQoQ[0],
                                $lt: screenerFilters.EPSQoQ[1]
                            };
                            break;
                        case 'EPSYoY':
                            query.EPSYoY = {
                                $gt: screenerFilters.EPSYoY[0],
                                $lt: screenerFilters.EPSYoY[1]
                            };
                            break;
                        case 'EarningsQoQ':
                            query.EarningsQoQ = {
                                $gt: screenerFilters.EarningsQoQ[0],
                                $lt: screenerFilters.EarningsQoQ[1]
                            };
                            break;
                        case 'EarningsYoY':
                            query.EarningsYoY = {
                                $gt: screenerFilters.EarningsYoY[0],
                                $lt: screenerFilters.EarningsYoY[1]
                            };
                            break;
                        case 'RevQoQ':
                            query.RevQoQ = {
                                $gt: screenerFilters.RevQoQ[0],
                                $lt: screenerFilters.RevQoQ[1]
                            };
                            break;
                        case 'RevYoY':
                            query.RevYoY = {
                                $gt: screenerFilters.RevYoY[0],
                                $lt: screenerFilters.RevYoY[1]
                            };
                            break;
                        case 'AvgVolume1W':
                            query.AvgVolume1W = {
                                $gt: screenerFilters.AvgVolume1W[0],
                                $lt: screenerFilters.AvgVolume1W[1]
                            };
                            break;
                        case 'AvgVolume1M':
                            query.AvgVolume1M = {
                                $gt: screenerFilters.AvgVolume1M[0],
                                $lt: screenerFilters.AvgVolume1M[1]
                            };
                            break;
                        case 'AvgVolume6M':
                            query.AvgVolume6M = {
                                $gt: screenerFilters.AvgVolume6M[0],
                                $lt: screenerFilters.AvgVolume6M[1]
                            };
                            break;
                        case 'AvgVolume1Y':
                            query.AvgVolume1Y = {
                                $gt: screenerFilters.AvgVolume1Y[0],
                                $lt: screenerFilters.AvgVolume1Y[1]
                            };
                            break;
                        case 'RelVolume1W':
                            query.RelVolume1W = {
                                $gt: screenerFilters.RelVolume1W[0],
                                $lt: screenerFilters.RelVolume1W[1]
                            };
                            break;
                        case 'RelVolume1M':
                            query.RelVolume1M = {
                                $gt: screenerFilters.RelVolume1M[0],
                                $lt: screenerFilters.RelVolume1M[1]
                            };
                            break;
                        case 'RelVolume6M':
                            query.RelVolume6M = {
                                $gt: screenerFilters.RelVolume6M[0],
                                $lt: screenerFilters.RelVolume6M[1]
                            };
                            break;
                        case 'RelVolume1Y':
                            query.RelVolume1Y = {
                                $gt: screenerFilters.RelVolume1Y[0],
                                $lt: screenerFilters.RelVolume1Y[1]
                            };
                            break;
                        case 'RSScore1W':
                            query.RSScore1W = {
                                $gte: Math.max(screenerFilters.RSScore1W[0], 1),
                                $lte: Math.min(screenerFilters.RSScore1W[1], 100)
                            };
                            break;
                        case 'RSScore1M':
                            query.RSScore1M = {
                                $gte: Math.max(screenerFilters.RSScore1M[0], 1),
                                $lte: Math.min(screenerFilters.RSScore1M[1], 100)
                            };
                            break;
                        case 'RSScore4M':
                            query.RSScore4M = {
                                $gte: Math.max(screenerFilters.RSScore4M[0], 1),
                                $lte: Math.min(screenerFilters.RSScore4M[1], 100)
                            };
                            break;
                        case 'ADV1W':
                            query.ADV1W = {
                                $gt: screenerFilters.ADV1W[0],
                                $lt: screenerFilters.ADV1W[1]
                            };
                            break;
                        case 'ADV1M':
                            query.ADV1M = {
                                $gt: screenerFilters.ADV1M[0],
                                $lt: screenerFilters.ADV1M[1]
                            };
                            break;
                        case 'ADV4M':
                            query.ADV4M = {
                                $gt: screenerFilters.ADV4M[0],
                                $lt: screenerFilters.ADV4M[1]
                            };
                            break;
                        case 'ADV1Y':
                            query.ADV1Y = {
                                $gt: screenerFilters.ADV1Y[0],
                                $lt: screenerFilters.ADV1Y[1]
                            };
                            break;
                        case 'changePerc':
                            switch (screenerFilters.changePerc[2]) {
                                case '1D':
                                    query.todaychange = {
                                        $gt: screenerFilters.changePerc[0],
                                        $lt: screenerFilters.changePerc[1]
                                    };
                                    break;
                                case '1W':
                                    query.weekchange = {
                                        $gt: screenerFilters.changePerc[0],
                                        $lt: screenerFilters.changePerc[1]
                                    };
                                    break;
                                case '1M':
                                    query['1mchange'] = {
                                        $gt: screenerFilters.changePerc[0],
                                        $lt: screenerFilters.changePerc[1]
                                    };
                                    break;
                                case '4M':
                                    query['4mchange'] = {
                                        $gt: screenerFilters.changePerc[0],
                                        $lt: screenerFilters.changePerc[1]
                                    };
                                    break;
                                case '6M':
                                    query['6mchange'] = {
                                        $gt: screenerFilters.changePerc[0],
                                        $lt: screenerFilters.changePerc[1]
                                    };
                                    break;
                                case '1Y':
                                    query['1ychange'] = {
                                        $gt: screenerFilters.changePerc[0],
                                        $lt: screenerFilters.changePerc[1]
                                    };
                                    break;
                                case 'YTD':
                                    query.ytdchange = {
                                        $gt: screenerFilters.changePerc[0],
                                        $lt: screenerFilters.changePerc[1]
                                    };
                                    break;
                            }
                            break;
                        case 'PercOffWeekHigh':
                            query.percoff52WeekHigh = {
                                $gt: -screenerFilters.PercOffWeekHigh[0] / 100,
                                $lt: 0.0001
                            };
                            break;
                        case 'PercOffWeekLow':
                            query.percoff52WeekLow = {
                                $gt: screenerFilters.PercOffWeekLow[0] / 100,
                                $lt: screenerFilters.PercOffWeekLow[1] / 100
                            };
                            break;
                        case 'NewHigh':
                            if (screenerFilters.NewHigh === 'yes') {
                                query.$expr = {
                                    $gt: [
                                        { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] },
                                        "$AlltimeHigh"
                                    ]
                                };
                            }
                            break;
                        case 'NewLow':
                            if (screenerFilters.NewLow === 'yes') {
                                query.$expr = {
                                    $lt: [
                                        { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] },
                                        "$AlltimeLow"
                                    ]
                                };
                            }
                            break;
                        case 'MA200':
                            if (screenerFilters.MA200 === 'abv50') {
                                query.$expr = { $gt: ["$MA200", "$MA50"] };
                            } else if (screenerFilters.MA200 === 'abv20') {
                                query.$expr = { $gt: ["$MA200", "$MA20"] };
                            } else if (screenerFilters.MA200 === 'abv10') {
                                query.$expr = { $gt: ["$MA200", "$MA10"] };
                            } else if (screenerFilters.MA200 === 'abvPrice') {
                                query.$expr = {
                                    $gt: [
                                        "$MA200",
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    ]
                                };
                            } else if (screenerFilters.MA200 === 'blw50') {
                                query.$expr = { $lt: ["$MA200", "$MA50"] };
                            } else if (screenerFilters.MA200 === 'blw20') {
                                query.$expr = { $lt: ["$MA200", "$MA20"] };
                            } else if (screenerFilters.MA200 === 'blw10') {
                                query.$expr = { $lt: ["$MA200", "$MA10"] };
                            } else if (screenerFilters.MA200 === 'blwPrice') {
                                query.$expr = {
                                    $lt: [
                                        "$MA200",
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    ]
                                };
                            }
                            break;

                        case 'MA50':
                            if (screenerFilters.MA50 === 'abv200') {
                                query.$expr = { $gt: ["$MA50", "$MA200"] };
                            } else if (screenerFilters.MA50 === 'abv20') {
                                query.$expr = { $gt: ["$MA50", "$MA20"] };
                            } else if (screenerFilters.MA50 === 'abv10') {
                                query.$expr = { $gt: ["$MA50", "$MA10"] };
                            } else if (screenerFilters.MA50 === 'abvPrice') {
                                query.$expr = {
                                    $gt: [
                                        "$MA50",
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    ]
                                };
                            } else if (screenerFilters.MA50 === 'blw200') {
                                query.$expr = { $lt: ["$MA50", "$MA200"] };
                            } else if (screenerFilters.MA50 === 'blw20') {
                                query.$expr = { $lt: ["$MA50", "$MA20"] };
                            } else if (screenerFilters.MA50 === 'blw10') {
                                query.$expr = { $lt: ["$MA50", "$MA10"] };
                            } else if (screenerFilters.MA50 === 'blwPrice') {
                                query.$expr = {
                                    $lt: [
                                        "$MA50",
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    ]
                                };
                            }
                            break;

                        case 'MA20':
                            if (screenerFilters.MA20 === 'abv200') {
                                query.$expr = { $gt: ["$MA20", "$MA200"] };
                            } else if (screenerFilters.MA20 === 'abv50') {
                                query.$expr = { $gt: ["$MA20", "$MA50"] };
                            } else if (screenerFilters.MA20 === 'abv10') {
                                query.$expr = { $gt: ["$MA20", "$MA10"] };
                            } else if (screenerFilters.MA20 === 'abvPrice') {
                                query.$expr = {
                                    $gt: [
                                        "$MA20",
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    ]
                                };
                            } else if (screenerFilters.MA20 === 'blw200') {
                                query.$expr = { $lt: ["$MA20", "$MA200"] };
                            } else if (screenerFilters.MA20 === 'blw50') {
                                query.$expr = { $lt: ["$MA20", "$MA50"] };
                            } else if (screenerFilters.MA20 === 'blw10') {
                                query.$expr = { $lt: ["$MA20", "$MA10"] };
                            } else if (screenerFilters.MA20 === 'blwPrice') {
                                query.$expr = {
                                    $lt: [
                                        "$MA20",
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    ]
                                };
                            }
                            break;

                        case 'MA10':
                            if (screenerFilters.MA10 === 'abv200') {
                                query.$expr = { $gt: ["$MA10", "$MA200"] };
                            } else if (screenerFilters.MA10 === 'abv50') {
                                query.$expr = { $gt: ["$MA10", "$MA50"] };
                            } else if (screenerFilters.MA10 === 'abv20') {
                                query.$expr = { $gt: ["$MA10", "$MA20"] };
                            } else if (screenerFilters.MA10 === 'abvPrice') {
                                query.$expr = {
                                    $gt: [
                                        "$MA10",
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    ]
                                };
                            } else if (screenerFilters.MA10 === 'blw200') {
                                query.$expr = { $lt: ["$MA10", "$MA200"] };
                            } else if (screenerFilters.MA10 === 'blw50') {
                                query.$expr = { $lt: ["$MA10", "$MA50"] };
                            } else if (screenerFilters.MA10 === 'blw20') {
                                query.$expr = { $lt: ["$MA10", "$MA20"] };
                            } else if (screenerFilters.MA10 === 'blwPrice') {
                                query.$expr = {
                                    $lt: [
                                        "$MA10",
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    ]
                                };
                            }
                            break;

                        case 'CurrentPrice':
                            if (screenerFilters.CurrentPrice === 'abv200') {
                                query.$expr = {
                                    $gt: [
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        "$MA200"
                                    ]
                                };
                            } else if (screenerFilters.CurrentPrice === 'abv50') {
                                query.$expr = {
                                    $gt: [
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        "$MA50"
                                    ]
                                };
                            } else if (screenerFilters.CurrentPrice === 'abv20') {
                                query.$expr = {
                                    $gt: [
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        "$MA20"
                                    ]
                                };
                            } else if (screenerFilters.CurrentPrice === 'abv10') {
                                query.$expr = {
                                    $gt: [
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        "$MA10"
                                    ]
                                };
                            } else if (screenerFilters.CurrentPrice === 'blw200') {
                                query.$expr = {
                                    $lt: [
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        "$MA200"
                                    ]
                                };
                            } else if (screenerFilters.CurrentPrice === 'blw50') {
                                query.$expr = {
                                    $lt: [
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        "$MA50"
                                    ]
                                };
                            } else if (screenerFilters.CurrentPrice === 'blw20') {
                                query.$expr = {
                                    $lt: [
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        "$MA20"
                                    ]
                                };
                            } else if (screenerFilters.CurrentPrice === 'blw10') {
                                query.$expr = {
                                    $lt: [
                                        {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: { $objectToArray: "$TimeSeries" },
                                                        as: "item",
                                                        in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                        "$MA10"
                                    ]
                                };
                            }
                            break;
                        case 'ROE':
                            query['quarterlyFinancials.0.roe'] = {
                                $gt: screenerFilters.ROE[0],
                                $lt: screenerFilters.ROE[1]
                            };
                            break;
                        case 'ROA':
                            query['quarterlyFinancials.0.roa'] = {
                                $gt: screenerFilters.ROA[0],
                                $lt: screenerFilters.ROA[1]
                            };
                            break;
                        case 'currentRatio':
                            query['quarterlyFinancials.0.currentRatio'] = {
                                $gt: screenerFilters.currentRatio[0],
                                $lt: screenerFilters.currentRatio[1]
                            };
                            break;
                        case 'assetsCurrent':
                            query['quarterlyFinancials.0.assetsCurrent'] = {
                                $gt: screenerFilters.assetsCurrent[0],
                                $lt: screenerFilters.assetsCurrent[1]
                            };
                            break;
                        case 'liabilitiesCurrent':
                            query['quarterlyFinancials.0.liabilitiesCurrent'] = {
                                $gt: screenerFilters.liabilitiesCurrent[0],
                                $lt: screenerFilters.liabilitiesCurrent[1]
                            };
                            break;
                        case 'debtCurrent':
                            query['quarterlyFinancials.0.debtCurrent'] = {
                                $gt: screenerFilters.debtCurrent[0],
                                $lt: screenerFilters.debtCurrent[1]
                            };
                            break;
                        case 'cashAndEq':
                            query['quarterlyFinancials.0.cashAndEq'] = {
                                $gt: screenerFilters.cashAndEq[0],
                                $lt: screenerFilters.cashAndEq[1]
                            };
                            break;
                        case 'freeCashFlow':
                            query['quarterlyFinancials.0.freeCashFlow'] = {
                                $gt: screenerFilters.freeCashFlow[0],
                                $lt: screenerFilters.freeCashFlow[1]
                            };
                            break;
                        case 'profitMargin':
                            query['quarterlyFinancials.0.profitMargin'] = {
                                $gt: screenerFilters.profitMargin[0],
                                $lt: screenerFilters.profitMargin[1]
                            };
                            break;
                        case 'grossMargin':
                            query['quarterlyFinancials.0.grossMargin'] = {
                                $gt: screenerFilters.grossMargin[0],
                                $lt: screenerFilters.grossMargin[1]
                            };
                            break;
                        case 'debtEquity':
                            query['quarterlyFinancials.0.debtEquity'] = {
                                $gt: screenerFilters.debtEquity[0],
                                $lt: screenerFilters.debtEquity[1]
                            };
                            break;
                        case 'bookVal':
                            query['quarterlyFinancials.0.bookVal'] = {
                                $gt: screenerFilters.bookVal[0],
                                $lt: screenerFilters.bookVal[1]
                            };
                            break;
                        case 'EV':
                            query.EV = {
                                $gt: screenerFilters.EV[0],
                                $lt: screenerFilters.EV[1]
                            };
                            break;
                        case 'RSI':
                            query.RSI = {
                                $gt: screenerFilters.RSI[0],
                                $lt: screenerFilters.RSI[1]
                            };
                            break;
                        case 'Gap':
                            query.Gap = {
                                $gt: screenerFilters.Gap[0],
                                $lt: screenerFilters.Gap[1]
                            };
                            break;
                        case 'IV':
                            query.IntrinsicValue = {
                                $gt: screenerFilters.IV[0],
                                $lt: screenerFilters.IV[1]
                            };
                            break;
                        default:
                            break;
                    }
                });

                // Dynamic projection logic based on userDoc.Table (like /:user/screener/results/all)
                // fieldMap should be defined at the top of this file or imported if shared
                const usersCollection2 = db.collection('Users');
                const userDoc2 = await usersCollection2.findOne({ Username: user });
                const projection = { Symbol: 1, _id: 0 };
                const fieldMap = {
                    symbol: 'Symbol',
                    name: 'Name',
                    isin: 'ISIN',
                    market_cap: 'MarketCapitalization',
                    price: 'Close',
                    volume: 'Volume',
                    ipo: 'IPO',
                    assettype: 'AssetType',
                    pe_ratio: 'PERatio',
                    peg: 'PEGRatio',
                    pb_ratio: 'PriceToBookRatio',
                    ps_ratio: 'PriceToSalesRatioTTM',
                    dividend_yield: 'DividendYield',
                    eps: 'EPS',
                    fcf: 'freeCashFlow',
                    cash: 'cashAndEq',
                    current_debt: 'debtCurrent',
                    current_assets: 'assetsCurrent',
                    current_liabilities: 'liabilitiesCurrent',
                    current_ratio: 'currentRatio',
                    roe: 'roe',
                    roa: 'roa',
                    currency: 'Currency',
                    book_value: 'BookValue',
                    shares: 'SharesOutstanding',
                    sector: 'Sector',
                    industry: 'Industry',
                    exchange: 'Exchange',
                    country: 'Country',
                    rs_score1w: 'RSScore1W',
                    rs_score1m: 'RSScore1M',
                    rs_score4m: 'RSScore4M',
                    adv1w: 'ADV1W',
                    adv1m: 'ADV1M',
                    adv4m: 'ADV4M',
                    adv1y: 'ADV1Y',
                    perc_change: 'todaychange',
                    all_time_high: 'AlltimeHigh',
                    all_time_low: 'AlltimeLow',
                    high_52w: 'fiftytwoWeekHigh',
                    low_52w: 'fiftytwoWeekLow',
                    gap: 'Gap',
                    ev: 'EV',
                    rsi: 'RSI',
                    intrinsic_value: 'IntrinsicValue',
                };
                if (Array.isArray(userDoc2?.Table)) {
                    userDoc2.Table.forEach(key => {
                        if (fieldMap[key]) {
                            if (key === 'price') {
                                projection['Close'] = { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] };
                            } else if (key === 'volume') {
                                projection['Volume'] = { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "5. volume", input: "$$item.v" } } } }, 0] };
                            } else if ([
                                'fcf', 'cash', 'current_debt', 'current_assets', 'current_liabilities', 'current_ratio', 'roe', 'roa'
                            ].includes(key)) {
                                const qfMap = {
                                    fcf: 'freeCashFlow',
                                    cash: 'cashAndEq',
                                    current_debt: 'debtCurrent',
                                    current_assets: 'assetsCurrent',
                                    current_liabilities: 'liabilitiesCurrent',
                                    current_ratio: 'currentRatio',
                                    roe: 'roe',
                                    roa: 'roa',
                                };
                                const field = qfMap[key];
                                if (field) {
                                    projection[field] = { $ifNull: [{ $getField: { field, input: { $arrayElemAt: ['$quarterlyFinancials', 0] } } }, null] };
                                }
                            } else {
                                projection[fieldMap[key]] = 1;
                            }
                        }
                    });
                }

                const aggregation = [
                    { $match: query },
                    {
                        $addFields: {
                            Close: projection['Close'] || undefined,
                            Volume: projection['Volume'] || undefined,
                        }
                    },
                    { $project: projection }
                ];

                const filteredAssets = await assetInfoCollection.aggregate(aggregation).toArray();
                res.send(filteredAssets);
            } catch (error) {
                logger.error('Error fetching screener results', {
                    user: obfuscateUsername(user),
                    screenerName: screenerName,
                    error: error.message
                });
                res.status(500).json({ message: 'Internal Server Error' });
            }
        }
    );

    // endpoint that sends summary for selected screener 
    app.get('/screener/summary/:usernameID/:name',
        validate([
            validationSchemas.userParam2(),
            validationSchemas.screenerNameParam(),
        ]),
        async (req, res) => {
            const startTime = Date.now();
            const requestId = crypto.randomBytes(16).toString('hex');

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
                // Sanitize input parameters
                const usernameID = sanitizeInput(req.params.usernameID);
                const name = sanitizeInput(req.params.name);

                const client = new MongoClient(uri);

                try {
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const assetInfoCollection = db.collection('Screeners');
                    const filter = { UsernameID: usernameID, Name: name };

                    // Log database query
                    logger.debug({
                        msg: 'Executing Database Query',
                        requestId: requestId,
                        collection: 'Screeners',
                        filter: {
                            UsernameID: obfuscateUsername(usernameID),
                            Name: name
                        }
                    });

                    const performanceData = await assetInfoCollection.findOne(filter);

                    if (!performanceData) {
                        // Log not found scenario
                        logger.warn({
                            msg: 'Screener Summary Not Found',
                            requestId: requestId,
                            usernameID: obfuscateUsername(usernameID),
                            screenerName: name
                        });

                        return res.status(404).json({
                            message: 'Document not found',
                            requestId: requestId
                        });
                    }

                    // Maintain original attributes list and filtering logic
                    const attributes = [
                        'Price', 'MarketCap', 'Sectors', 'Exchanges', 'Countries', 'PE', 'ForwardPE', 'PEG', 'EPS', 'PS', 'PB', 'Beta', 'DivYield',
                        'EPSQoQ', 'EPSYoY', 'EarningsQoQ', 'EarningsYoY', 'RevQoQ', 'RevYoY', 'changePerc', 'PercOffWeekHigh', 'PercOffWeekLow',
                        'NewHigh', 'NewLow', 'MA10', 'MA20', 'MA50', 'MA200', 'CurrentPrice', 'RSScore1W', 'RSScore1M', 'RSScore4M', 'AvgVolume1W', 'RelVolume1W',
                        'AvgVolume1M', 'RelVolume1M', 'AvgVolume6M', 'RelVolume6M', 'AvgVolume1Y', 'RelVolume1Y', '1mchange', '1ychange', '4mchange',
                        '6mchange', 'todaychange', 'weekchange', 'ytdchange', 'IPO', 'ADV1W', 'ADV1M', 'ADV4M', 'ADV1Y', 'ROE', 'ROA', 'currentRatio',
                        'assetsCurrent', 'liabilitiesCurrent', 'debtCurrent', 'cashAndEq', 'freeCashFlow', 'profitMargin', 'grossMargin', 'debtEquity', 'bookVal', 'EV',
                        'RSI', 'Gap', 'AssetTypes', 'IV'
                    ];

                    const filteredData = attributes.reduce((acc, attribute) => {
                        if (Object.prototype.hasOwnProperty.call(performanceData, attribute)) {
                            acc[attribute] = performanceData[attribute];
                        }
                        return acc;
                    }, {});

                    // Send response exactly as in original implementation
                    res.send(filteredData);
                } catch (error) {
                    // Log database errors
                    logger.error({
                        msg: 'Database Error',
                        requestId: requestId,
                        error: error.message,
                        stack: error.stack
                    });

                    // Security logging
                    securityLogger.logSecurityEvent('database_error', {
                        usernameID: obfuscateUsername(usernameID),
                        screenerName: name,
                        error: error.message
                    });

                    res.status(500).json({ message: 'Internal Server Error' });
                } finally {
                    await client.close();
                }
            } catch (error) {
                // Catch-all error handler
                logger.error({
                    msg: 'Unexpected Error in Screener Summary',
                    requestId: requestId,
                    error: error.message,
                    stack: error.stack
                });

                res.status(500).json({ message: 'Unexpected Error' });
            }
        }
    );

    // endpoint that sends combined screener results and removes duplicate values 
    app.get('/screener/:usernameID/all',
        validate([
            param('usernameID')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
        ]),
        async (req, res) => {
            const startTime = Date.now();
            const requestId = crypto.randomBytes(16).toString('hex');
            let client;

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
                // Sanitize input
                const usernameId = sanitizeInput(req.params.usernameID);

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const screenersCollection = db.collection('Screeners');

                const screeners = await screenersCollection.find({ UsernameID: usernameId, Include: true }).toArray();
                const screenerNames = screeners.map(screener => screener.Name);

                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: usernameId });

                if (!userDoc) {
                    logger.warn({
                        msg: 'User Not Found',
                        requestId: requestId,
                        usernameID: obfuscateUsername(usernameId)
                    });
                    return res.status(404).json({ message: 'User not found' });
                }

                const tickerScreenerMap = new Map();
                const filteredAssetsArray = [];

                for (const screenerName of screenerNames) {
                    try {
                        const assetInfoCollection = db.collection('AssetInfo');
                        const query = { Symbol: { $nin: userDoc.Hidden } };
                        const aggregation = [];

                        const screenerData = await screenersCollection.findOne({ UsernameID: usernameId, Name: screenerName, Include: true });
                        if (!screenerData) {
                            logger.warn({
                                msg: 'Screener Data Not Found',
                                requestId: requestId,
                                screenerName: screenerName
                            });
                            continue;
                        }

                        // Extract filters from screenerData
                        const screenerFilters = {};

                        if (screenerData.Price && screenerData.Price[0] !== 0 && screenerData.Price[1] !== 0) {
                            screenerFilters.Price = screenerData.Price;
                        }

                        if (screenerData.MarketCap && screenerData.MarketCap[0] !== 0 && screenerData.MarketCap[1] !== 0) {
                            screenerFilters.MarketCap = screenerData.MarketCap;
                        }

                        if (screenerData.IPO && screenerData.IPO[0] !== 0 && screenerData.IPO[1] !== 0) {
                            screenerFilters.IPO = screenerData.IPO;
                        }

                        if (screenerData.Sectors && screenerData.Sectors.length > 0) {
                            screenerFilters.sectors = screenerData.Sectors;
                        }

                        if (screenerData.AssetTypes && screenerData.AssetTypes.length > 0) {
                            screenerFilters.assetTypes = screenerData.AssetTypes;
                        }

                        if (screenerData.Exchanges && screenerData.Exchanges.length > 0) {
                            screenerFilters.exchanges = screenerData.Exchanges;
                        }

                        if (screenerData.Countries && screenerData.Countries.length > 0) {
                            screenerFilters.countries = screenerData.Countries;
                        }

                        if (screenerData.NewHigh && screenerData.NewHigh.length > 0) {
                            screenerFilters.NewHigh = screenerData.NewHigh;
                        }

                        if (screenerData.NewLow && screenerData.NewLow.length > 0) {
                            screenerFilters.NewLow = screenerData.NewLow;
                        }

                        if (screenerData.MA200 && screenerData.MA200.length > 0) {
                            screenerFilters.MA200 = screenerData.MA200;
                        }

                        if (screenerData.MA50 && screenerData.MA50.length > 0) {
                            screenerFilters.MA50 = screenerData.MA50;
                        }

                        if (screenerData.MA20 && screenerData.MA20.length > 0) {
                            screenerFilters.MA20 = screenerData.MA20;
                        }

                        if (screenerData.MA10 && screenerData.MA10.length > 0) {
                            screenerFilters.MA10 = screenerData.MA10;
                        }

                        if (screenerData.CurrentPrice && screenerData.CurrentPrice.length > 0) {
                            screenerFilters.CurrentPrice = screenerData.CurrentPrice;
                        }

                        if (screenerData.PE && screenerData.PE[0] !== 0 && screenerData.PE[1] !== 0) {
                            screenerFilters.PE = screenerData.PE;
                        }

                        if (screenerData.ForwardPE && screenerData.ForwardPE[0] !== 0 && screenerData.ForwardPE[1] !== 0) {
                            screenerFilters.ForwardPE = screenerData.ForwardPE;
                        }

                        if (screenerData.PEG && screenerData.PEG[0] !== 0 && screenerData.PEG[1] !== 0) {
                            screenerFilters.PEG = screenerData.PEG;
                        }

                        if (screenerData.EPS && screenerData.EPS[0] !== 0 && screenerData.EPS[1] !== 0) {
                            screenerFilters.EPS = screenerData.EPS;
                        }

                        if (screenerData.PS && screenerData.PS[0] !== 0 && screenerData.PS[1] !== 0) {
                            screenerFilters.PS = screenerData.PS;
                        }

                        if (screenerData.PB && screenerData.PB[0] !== 0 && screenerData.PB[1] !== 0) {
                            screenerFilters.PB = screenerData.PB;
                        }

                        if (screenerData.Beta && screenerData.Beta[0] !== 0 && screenerData.Beta[1] !== 0) {
                            screenerFilters.Beta = screenerData.Beta;
                        }

                        if (screenerData.DivYield && screenerData.DivYield[0] !== 0 && screenerData.DivYield[1] !== 0) {
                            screenerFilters.DivYield = screenerData.DivYield;
                        }

                        if (screenerData.EPSQoQ && screenerData.EPSQoQ[0] !== 0 && screenerData.EPSQoQ[1] !== 0) {
                            screenerFilters.EPSQoQ = screenerData.EPSQoQ;
                        }

                        if (screenerData.EPSYoY && screenerData.EPSYoY[0] !== 0 && screenerData.EPSYoY[1] !== 0) {
                            screenerFilters.EPSYoY = screenerData.EPSYoY;
                        }

                        if (screenerData.EarningsQoQ && screenerData.EarningsQoQ[0] !== 0 && screenerData.EarningsQoQ[1] !== 0) {
                            screenerFilters.EarningsQoQ = screenerData.EarningsQoQ;
                        }

                        if (screenerData.EarningsYoY && screenerData.EarningsYoY[0] !== 0 && screenerData.EarningsYoY[1] !== 0) {
                            screenerFilters.EarningsYoY = screenerData.EarningsYoY;
                        }

                        if (screenerData.RevQoQ && screenerData.RevQoQ[0] !== 0 && screenerData.RevQoQ[1] !== 0) {
                            screenerFilters.RevQoQ = screenerData.RevQoQ;
                        }

                        if (screenerData.RevYoY && screenerData.RevYoY[0] !== 0 && screenerData.RevYoY[1] !== 0) {
                            screenerFilters.RevYoY = screenerData.RevYoY;
                        }

                        if (screenerData.AvgVolume1W && screenerData.AvgVolume1W[0] !== 0 && screenerData.AvgVolume1W[1] !== 0) {
                            screenerFilters.AvgVolume1W = screenerData.AvgVolume1W;
                        }

                        if (screenerData.AvgVolume1M && screenerData.AvgVolume1M[0] !== 0 && screenerData.AvgVolume1M[1] !== 0) {
                            screenerFilters.AvgVolume1M = screenerData.AvgVolume1M;
                        }

                        if (screenerData.AvgVolume6M && screenerData.AvgVolume6M[0] !== 0 && screenerData.AvgVolume6M[1] !== 0) {
                            screenerFilters.AvgVolume6M = screenerData.AvgVolume6M;
                        }

                        if (screenerData.AvgVolume1Y && screenerData.AvgVolume1Y[0] !== 0 && screenerData.AvgVolume1Y[1] !== 0) {
                            screenerFilters.AvgVolume1Y = screenerData.AvgVolume1Y;
                        }

                        if (screenerData.RelVolume1W && screenerData.RelVolume1W[0] !== 0 && screenerData.RelVolume1W[1] !== 0) {
                            screenerFilters.RelVolume1W = screenerData.RelVolume1W;
                        }

                        if (screenerData.RelVolume1M && screenerData.RelVolume1M[0] !== 0 && screenerData.RelVolume1M[1] !== 0) {
                            screenerFilters.RelVolume1M = screenerData.RelVolume1M;
                        }

                        if (screenerData.RelVolume6M && screenerData.RelVolume6M[0] !== 0 && screenerData.RelVolume6M[1] !== 0) {
                            screenerFilters.RelVolume6M = screenerData.RelVolume6M;
                        }

                        if (screenerData.RSScore1W && screenerData.RSScore1W[0] !== 0 && screenerData.RSScore1W[1] !== 0) {
                            screenerFilters.RSScore1W = screenerData.RSScore1W;
                        }

                        if (screenerData.RSScore1M && screenerData.RSScore1M[0] !== 0 && screenerData.RSScore1M[1] !== 0) {
                            screenerFilters.RSScore1M = screenerData.RSScore1M;
                        }

                        if (screenerData.RSScore4M && screenerData.RSScore4M[0] !== 0 && screenerData.RSScore4M[1] !== 0) {
                            screenerFilters.RSScore4M = screenerData.RSScore4M;
                        }

                        if (screenerData.ADV1W && screenerData.ADV1W[0] !== 0 && screenerData.ADV1W[1] !== 0) {
                            screenerFilters.ADV1W = screenerData.ADV1W;
                        }

                        if (screenerData.ADV1M && screenerData.ADV1M[0] !== 0 && screenerData.ADV1M[1] !== 0) {
                            screenerFilters.ADV1M = screenerData.ADV1M;
                        }

                        if (screenerData.ADV4M && screenerData.ADV4M[0] !== 0 && screenerData.ADV4M[1] !== 0) {
                            screenerFilters.ADV4M = screenerData.ADV4M;
                        }

                        if (screenerData.ADV1Y && screenerData.ADV1Y[0] !== 0 && screenerData.ADV1Y[1] !== 0) {
                            screenerFilters.ADV1Y = screenerData.ADV1Y;
                        }

                        if (screenerData.PercOffWeekHigh && screenerData.PercOffWeekHigh[0] !== 0 && screenerData.PercOffWeekHigh[1] !== 0) {
                            screenerFilters.PercOffWeekHigh = screenerData.PercOffWeekHigh;
                        }

                        if (screenerData.PercOffWeekLow && screenerData.PercOffWeekLow[0] !== 0 && screenerData.PercOffWeekLow[1] !== 0) {
                            screenerFilters.PercOffWeekLow = screenerData.PercOffWeekLow;
                        }

                        if (screenerData.changePerc &&
                            screenerData.changePerc[0] !== 0 &&
                            screenerData.changePerc[1] !== 0) {
                            screenerFilters.changePerc = screenerData.changePerc;
                            if (screenerData.changePerc[2] && screenerData.changePerc[2].length > 0) {
                                screenerFilters.changePerc[2] = screenerData.changePerc[2];
                            }
                        }

                        if (screenerData.ROE && screenerData.ROE[0] !== 0 && screenerData.ROE[1] !== 0) {
                            screenerFilters.ROE = screenerData.ROE;
                        }

                        if (screenerData.ROA && screenerData.ROA[0] !== 0 && screenerData.ROA[1] !== 0) {
                            screenerFilters.ROA = screenerData.ROA;
                        }

                        if (screenerData.currentRatio && screenerData.currentRatio[0] !== 0 && screenerData.currentRatio[1] !== 0) {
                            screenerFilters.currentRatio = screenerData.currentRatio;
                        }

                        if (screenerData.assetsCurrent && screenerData.assetsCurrent[0] !== 0 && screenerData.assetsCurrent[1] !== 0) {
                            screenerFilters.assetsCurrent = screenerData.assetsCurrent;
                        }

                        if (screenerData.liabilitiesCurrent && screenerData.liabilitiesCurrent[0] !== 0 && screenerData.liabilitiesCurrent[1] !== 0) {
                            screenerFilters.liabilitiesCurrent = screenerData.liabilitiesCurrent;
                        }

                        if (screenerData.debtCurrent && screenerData.debtCurrent[0] !== 0 && screenerData.debtCurrent[1] !== 0) {
                            screenerFilters.debtCurrent = screenerData.debtCurrent;
                        }

                        if (screenerData.cashAndEq && screenerData.cashAndEq[0] !== 0 && screenerData.cashAndEq[1] !== 0) {
                            screenerFilters.cashAndEq = screenerData.cashAndEq;
                        }

                        if (screenerData.freeCashFlow && screenerData.freeCashFlow[0] !== 0 && screenerData.freeCashFlow[1] !== 0) {
                            screenerFilters.freeCashFlow = screenerData.freeCashFlow;
                        }

                        if (screenerData.profitMargin && screenerData.profitMargin[0] !== 0 && screenerData.profitMargin[1] !== 0) {
                            screenerFilters.profitMargin = screenerData.profitMargin;
                        }

                        if (screenerData.grossMargin && screenerData.grossMargin[0] !== 0 && screenerData.grossMargin[1] !== 0) {
                            screenerFilters.grossMargin = screenerData.grossMargin;
                        }

                        if (screenerData.debtEquity && screenerData.debtEquity[0] !== 0 && screenerData.debtEquity[1] !== 0) {
                            screenerFilters.debtEquity = screenerData.debtEquity;
                        }

                        if (screenerData.bookVal && screenerData.bookVal[0] !== 0 && screenerData.bookVal[1] !== 0) {
                            screenerFilters.bookVal = screenerData.bookVal;
                        }

                        if (screenerData.EV && screenerData.EV[0] !== 0 && screenerData.EV[1] !== 0) {
                            screenerFilters.EV = screenerData.EV;
                        }

                        if (screenerData.RSI && screenerData.RSI[0] !== 0 && screenerData.RSI[1] !== 0) {
                            screenerFilters.RSI = screenerData.RSI;
                        }

                        if (screenerData.Gap && screenerData.Gap[0] !== 0 && screenerData.Gap[1] !== 0) {
                            screenerFilters.Gap = screenerData.Gap;
                        }

                        if (screenerData.IV && screenerData.IV[0] !== 0 && screenerData.IV[1] !== 0) {
                            screenerFilters.IV = screenerData.IV;
                        }

                        Object.keys(screenerFilters).forEach((key) => {
                            switch (key) {
                                case 'Price':
                                    query.$expr = {
                                        $and: [
                                            { $gt: [{ $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] }, screenerFilters.Price[0]] },
                                            { $lt: [{ $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] }, screenerFilters.Price[1]] }
                                        ]
                                    };
                                    break;
                                case 'MarketCap':
                                    query.MarketCapitalization = {
                                        $gt: screenerFilters.MarketCap[0],
                                        $lt: screenerFilters.MarketCap[1]
                                    };
                                    break;
                                case 'IPO':
                                    query.IPO = {
                                        $gt: screenerFilters.IPO[0],
                                        $lt: screenerFilters.IPO[1]
                                    };
                                    break;
                                case 'sectors':
                                    query.Sector = { $in: screenerFilters.sectors };
                                    break;
                                case 'assetTypes':
                                    query.AssetType = { $in: screenerFilters.assetTypes };
                                    break;
                                case 'exchanges':
                                    query.Exchange = { $in: screenerFilters.exchanges };
                                    break;
                                case 'countries':
                                    query.Country = { $in: screenerFilters.countries };
                                    break;
                                case 'PE':
                                    query.PERatio = {
                                        $gt: screenerFilters.PE[0],
                                        $lt: screenerFilters.PE[1]
                                    };
                                    break;
                                case 'ForwardPE':
                                    query.ForwardPE = {
                                        $gt: screenerFilters.ForwardPE[0],
                                        $lt: screenerFilters.ForwardPE[1]
                                    };
                                    break;
                                case 'PEG':
                                    query.PEGRatio = {
                                        $gt: screenerFilters.PEG[0],
                                        $lt: screenerFilters.PEG[1]
                                    };
                                    break;
                                case 'EPS':
                                    query.EPS = {
                                        $gt: screenerFilters.EPS[0],
                                        $lt: screenerFilters.EPS[1]
                                    };
                                    break;
                                case 'PS':
                                    query.PriceToSalesRatioTTM = {
                                        $gt: screenerFilters.PS[0],
                                        $lt: screenerFilters.PS[1]
                                    };
                                    break;
                                case 'PB':
                                    query.PriceToBookRatio = {
                                        $gt: screenerFilters.PB[0],
                                        $lt: screenerFilters.PB[1]
                                    };
                                    break;
                                case 'Beta':
                                    query.Beta = {
                                        $gt: screenerFilters.Beta[0],
                                        $lt: screenerFilters.Beta[1]
                                    };
                                    break;
                                case 'DivYield':
                                    query.DividendYield = {
                                        $gt: screenerFilters.DivYield[0],
                                        $lt: screenerFilters.DivYield[1]
                                    };
                                    break;
                                case 'EPSQoQ':
                                    query.EPSQoQ = {
                                        $gt: screenerFilters.EPSQoQ[0],
                                        $lt: screenerFilters.EPSQoQ[1]
                                    };
                                    break;
                                case 'EPSYoY':
                                    query.EPSYoY = {
                                        $gt: screenerFilters.EPSYoY[0],
                                        $lt: screenerFilters.EPSYoY[1]
                                    };
                                    break;
                                case 'EarningsQoQ':
                                    query.EarningsQoQ = {
                                        $gt: screenerFilters.EarningsQoQ[0],
                                        $lt: screenerFilters.EarningsQoQ[1]
                                    };
                                    break;
                                case 'EarningsYoY':
                                    query.EarningsYoY = {
                                        $gt: screenerFilters.EarningsYoY[0],
                                        $lt: screenerFilters.EarningsYoY[1]
                                    };
                                    break;
                                case 'RevQoQ':
                                    query.RevenueQoQ = {
                                        $gt: screenerFilters.RevQoQ[0],
                                        $lt: screenerFilters.RevQoQ[1]
                                    };
                                    break;
                                case 'RevYoY':
                                    query.RevenueYoY = {
                                        $gt: screenerFilters.RevYoY[0],
                                        $lt: screenerFilters.RevYoY[1]
                                    };
                                    break;
                                case 'AvgVolume1W':
                                    query.AvgVolume1W = {
                                        $gt: screenerFilters.AvgVolume1W[0],
                                        $lt: screenerFilters.AvgVolume1W[1]
                                    };
                                    break;
                                case 'AvgVolume1M':
                                    query.AvgVolume1M = {
                                        $gt: screenerFilters.AvgVolume1M[0],
                                        $lt: screenerFilters.AvgVolume1M[1]
                                    };
                                    break;
                                case 'AvgVolume6M':
                                    query.AvgVolume6M = {
                                        $gt: screenerFilters.AvgVolume6M[0],
                                        $lt: screenerFilters.AvgVolume6M[1]
                                    };
                                    break;
                                case 'AvgVolume1Y':
                                    query.AvgVolume1Y = {
                                        $gt: screenerFilters.AvgVolume1Y[0],
                                        $lt: screenerFilters.AvgVolume1Y[1]
                                    };
                                    break;
                                case 'RelVolume1W':
                                    query.RelVolume1W = {
                                        $gt: screenerFilters.RelVolume1W[0],
                                        $lt: screenerFilters.RelVolume1W[1]
                                    };
                                    break;
                                case 'RelVolume1M':
                                    query.RelVolume1M = {
                                        $gt: screenerFilters.RelVolume1M[0],
                                        $lt: screenerFilters.RelVolume1M[1]
                                    };
                                    break;
                                case 'RelVolume6M':
                                    query.RelVolume6M = {
                                        $gt: screenerFilters.RelVolume6M[0],
                                        $lt: screenerFilters.RelVolume6M[1]
                                    };
                                    break;
                                case 'RelVolume1Y':
                                    query.RelVolume1Y = {
                                        $gt: screenerFilters.RelVolume1Y[0],
                                        $lt: screenerFilters.RelVolume1Y[1]
                                    };
                                    break;
                                case 'RSScore1W':
                                    query.RSScore1W = {
                                        $gte: Math.max(screenerFilters.RSScore1W[0], 1),
                                        $lte: Math.min(screenerFilters.RSScore1W[1], 100)
                                    };
                                    break;
                                case 'RSScore1M':
                                    query.RSScore1M = {
                                        $gte: Math.max(screenerFilters.RSScore1M[0], 1),
                                        $lte: Math.min(screenerFilters.RSScore1M[1], 100)
                                    };
                                    break;
                                case 'RSScore4M':
                                    query.RSScore4M = {
                                        $gte: Math.max(screenerFilters.RSScore4M[0], 1),
                                        $lte: Math.min(screenerFilters.RSScore4M[1], 100)
                                    };
                                    break;
                                case 'ADV1W':
                                    query.ADV1W = {
                                        $gt: screenerFilters.ADV1W[0],
                                        $lt: screenerFilters.ADV1W[1]
                                    };
                                    break;
                                case 'ADV1M':
                                    query.ADV1M = {
                                        $gt: screenerFilters.ADV1M[0],
                                        $lt: screenerFilters.ADV1M[1]
                                    };
                                    break;
                                case 'ADV4M':
                                    query.ADV4M = {
                                        $gt: screenerFilters.ADV4M[0],
                                        $lt: screenerFilters.ADV4M[1]
                                    };
                                    break;
                                case 'ADV1Y':
                                    query.ADV1Y = {
                                        $gt: screenerFilters.ADV1Y[0],
                                        $lt: screenerFilters.ADV1Y[1]
                                    };
                                    break;
                                case 'changePerc':
                                    switch (screenerFilters.changePerc[2]) {
                                        case '1D':
                                            query.todaychange = {
                                                $gt: screenerFilters.changePerc[0] / 100,
                                                $lt: screenerFilters.changePerc[1] / 100
                                            };
                                            break;
                                        case '1W':
                                            query.weekchange = {
                                                $gt: screenerFilters.changePerc[0] / 100,
                                                $lt: screenerFilters.changePerc[1] / 100
                                            };
                                            break;
                                        case '1M':
                                            query['1mchange'] = {
                                                $gt: screenerFilters.changePerc[0] / 100,
                                                $lt: screenerFilters.changePerc[1] / 100
                                            };
                                            break;
                                        case '4M':
                                            query['4mchange'] = {
                                                $gt: screenerFilters.changePerc[0] / 100,
                                                $lt: screenerFilters.changePerc[1] / 100
                                            };
                                            break;
                                        case '6M':
                                            query['6mchange'] = {
                                                $gt: screenerFilters.changePerc[0] / 100,
                                                $lt: screenerFilters.changePerc[1] / 100
                                            };
                                            break;
                                        case '1Y':
                                            query['1ychange'] = {
                                                $gt: screenerFilters.changePerc[0] / 100,
                                                $lt: screenerFilters.changePerc[1] / 100
                                            };
                                            break;
                                        case 'YTD':
                                            query.ytdchange = {
                                                $gt: screenerFilters.changePerc[0] / 100,
                                                $lt: screenerFilters.changePerc[1] / 100
                                            };
                                            break;
                                    }
                                    break;
                                case 'PercOffWeekHigh':
                                    query.percoff52WeekHigh = {
                                        $gt: -screenerFilters.PercOffWeekHigh[0] / 100,
                                        $lt: -screenerFilters.PercOffWeekHigh[1] / 100
                                    };
                                    break;
                                case 'PercOffWeekLow':
                                    query.percoff52WeekLow = {
                                        $gt: screenerFilters.PercOffWeekLow[0] / 100,
                                        $lt: screenerFilters.PercOffWeekLow[1] / 100
                                    };
                                    break;
                                case 'NewHigh':
                                    if (screenerFilters.NewHigh === 'yes') {
                                        query.$expr = {
                                            $gt: [
                                                { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] },
                                                "$AlltimeHigh"
                                            ]
                                        };
                                    }
                                    break;
                                case 'NewLow':
                                    if (screenerFilters.NewLow === 'yes') {
                                        query.$expr = {
                                            $lt: [
                                                { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] },
                                                "$AlltimeLow"
                                            ]
                                        };
                                    }
                                    break;
                                case 'MA200':
                                    if (screenerFilters.MA200 === 'abv50') {
                                        query.$expr = { $gt: ["$MA200", "$MA50"] };
                                    } else if (screenerFilters.MA200 === 'abv20') {
                                        query.$expr = { $gt: ["$MA200", "$MA20"] };
                                    } else if (screenerFilters.MA200 === 'abv10') {
                                        query.$expr = { $gt: ["$MA200", "$MA10"] };
                                    } else if (screenerFilters.MA200 === 'abvPrice') {
                                        query.$expr = {
                                            $gt: [
                                                "$MA200",
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            ]
                                        };
                                    } else if (screenerFilters.MA200 === 'blw50') {
                                        query.$expr = { $lt: ["$MA200", "$MA50"] };
                                    } else if (screenerFilters.MA200 === 'blw20') {
                                        query.$expr = { $lt: ["$MA200", "$MA20"] };
                                    } else if (screenerFilters.MA200 === 'blw10') {
                                        query.$expr = { $lt: ["$MA200", "$MA10"] };
                                    } else if (screenerFilters.MA200 === 'blwPrice') {
                                        query.$expr = {
                                            $lt: [
                                                "$MA200",
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            ]
                                        };
                                    }
                                    break;

                                case 'MA50':
                                    if (screenerFilters.MA50 === 'abv200') {
                                        query.$expr = { $gt: ["$MA50", "$MA200"] };
                                    } else if (screenerFilters.MA50 === 'abv20') {
                                        query.$expr = { $gt: ["$MA50", "$MA20"] };
                                    } else if (screenerFilters.MA50 === 'abv10') {
                                        query.$expr = { $gt: ["$MA50", "$MA10"] };
                                    } else if (screenerFilters.MA50 === 'abvPrice') {
                                        query.$expr = {
                                            $gt: [
                                                "$MA50",
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            ]
                                        };
                                    } else if (screenerFilters.MA50 === 'blw200') {
                                        query.$expr = { $lt: ["$MA50", "$MA200"] };
                                    } else if (screenerFilters.MA50 === 'blw20') {
                                        query.$expr = { $lt: ["$MA50", "$MA20"] };
                                    } else if (screenerFilters.MA50 === 'blw10') {
                                        query.$expr = { $lt: ["$MA50", "$MA10"] };
                                    } else if (screenerFilters.MA50 === 'blwPrice') {
                                        query.$expr = {
                                            $lt: [
                                                "$MA50",
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            ]
                                        };
                                    }
                                    break;

                                case 'MA20':
                                    if (screenerFilters.MA20 === 'abv200') {
                                        query.$expr = { $gt: ["$MA20", "$MA200"] };
                                    } else if (screenerFilters.MA20 === 'abv50') {
                                        query.$expr = { $gt: ["$MA20", "$MA50"] };
                                    } else if (screenerFilters.MA20 === 'abv10') {
                                        query.$expr = { $gt: ["$MA20", "$MA10"] };
                                    } else if (screenerFilters.MA20 === 'abvPrice') {
                                        query.$expr = {
                                            $gt: [
                                                "$MA20",
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            ]
                                        };
                                    } else if (screenerFilters.MA20 === 'blw200') {
                                        query.$expr = { $lt: ["$MA20", "$MA200"] };
                                    } else if (screenerFilters.MA20 === 'blw50') {
                                        query.$expr = { $lt: ["$MA20", "$MA50"] };
                                    } else if (screenerFilters.MA20 === 'blw10') {
                                        query.$expr = { $lt: ["$MA20", "$MA10"] };
                                    } else if (screenerFilters.MA20 === 'blwPrice') {
                                        query.$expr = {
                                            $lt: [
                                                "$MA20",
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            ]
                                        };
                                    }
                                    break;

                                case 'MA10':
                                    if (screenerFilters.MA10 === 'abv200') {
                                        query.$expr = { $gt: ["$MA10", "$MA200"] };
                                    } else if (screenerFilters.MA10 === 'abv50') {
                                        query.$expr = { $gt: ["$MA10", "$MA50"] };
                                    } else if (screenerFilters.MA10 === 'abv20') {
                                        query.$expr = { $gt: ["$MA10", "$MA20"] };
                                    } else if (screenerFilters.MA10 === 'abvPrice') {
                                        query.$expr = {
                                            $gt: [
                                                "$MA10",
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            ]
                                        };
                                    } else if (screenerFilters.MA10 === 'blw200') {
                                        query.$expr = { $lt: ["$MA10", "$MA200"] };
                                    } else if (screenerFilters.MA10 === 'blw50') {
                                        query.$expr = { $lt: ["$MA10", "$MA50"] };
                                    } else if (screenerFilters.MA10 === 'blw20') {
                                        query.$expr = { $lt: ["$MA10", "$MA20"] };
                                    } else if (screenerFilters.MA10 === 'blwPrice') {
                                        query.$expr = {
                                            $lt: [
                                                "$MA10",
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            ]
                                        };
                                    }
                                    break;

                                case 'CurrentPrice':
                                    if (screenerFilters.CurrentPrice === 'abv200') {
                                        query.$expr = {
                                            $gt: [
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                "$MA200"
                                            ]
                                        };
                                    } else if (screenerFilters.CurrentPrice === 'abv50') {
                                        query.$expr = {
                                            $gt: [
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                "$MA50"
                                            ]
                                        };
                                    } else if (screenerFilters.CurrentPrice === 'abv20') {
                                        query.$expr = {
                                            $gt: [
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                "$MA20"
                                            ]
                                        };
                                    } else if (screenerFilters.CurrentPrice === 'abv10') {
                                        query.$expr = {
                                            $gt: [
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                "$MA10"
                                            ]
                                        };
                                    } else if (screenerFilters.CurrentPrice === 'blw200') {
                                        query.$expr = {
                                            $lt: [
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                "$MA200"
                                            ]
                                        };
                                    } else if (screenerFilters.CurrentPrice === 'blw50') {
                                        query.$expr = {
                                            $lt: [
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                "$MA50"
                                            ]
                                        };
                                    } else if (screenerFilters.CurrentPrice === 'blw20') {
                                        query.$expr = {
                                            $lt: [
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                "$MA20"
                                            ]
                                        };
                                    } else if (screenerFilters.CurrentPrice === 'blw10') {
                                        query.$expr = {
                                            $lt: [
                                                {
                                                    $arrayElemAt: [
                                                        {
                                                            $map: {
                                                                input: { $objectToArray: "$TimeSeries" },
                                                                as: "item",
                                                                in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                "$MA10"
                                            ]
                                        };
                                    }
                                    break;
                                case 'ROE':
                                    query['quarterlyFinancials.0.roe'] = {
                                        $gt: screenerFilters.ROE[0],
                                        $lt: screenerFilters.ROE[1]
                                    };
                                    break;
                                case 'ROA':
                                    query['quarterlyFinancials.0.roa'] = {
                                        $gt: screenerFilters.ROA[0],
                                        $lt: screenerFilters.ROA[1]
                                    };
                                    break;
                                case 'currentRatio':
                                    query['quarterlyFinancials.0.currentRatio'] = {
                                        $gt: screenerFilters.currentRatio[0],
                                        $lt: screenerFilters.currentRatio[1]
                                    };
                                    break;
                                case 'assetsCurrent':
                                    query['quarterlyFinancials.0.assetsCurrent'] = {
                                        $gt: screenerFilters.assetsCurrent[0],
                                        $lt: screenerFilters.assetsCurrent[1]
                                    };
                                    break;
                                case 'liabilitiesCurrent':
                                    query['quarterlyFinancials.0.liabilitiesCurrent'] = {
                                        $gt: screenerFilters.liabilitiesCurrent[0],
                                        $lt: screenerFilters.liabilitiesCurrent[1]
                                    };
                                    break;
                                case 'debtCurrent':
                                    query['quarterlyFinancials.0.debtCurrent'] = {
                                        $gt: screenerFilters.debtCurrent[0],
                                        $lt: screenerFilters.debtCurrent[1]
                                    };
                                    break;
                                case 'cashAndEq':
                                    query['quarterlyFinancials.0.cashAndEq'] = {
                                        $gt: screenerFilters.cashAndEq[0],
                                        $lt: screenerFilters.cashAndEq[1]
                                    };
                                    break;
                                case 'freeCashFlow':
                                    query['quarterlyFinancials.0.freeCashFlow'] = {
                                        $gt: screenerFilters.freeCashFlow[0],
                                        $lt: screenerFilters.freeCashFlow[1]
                                    };
                                    break;
                                case 'profitMargin':
                                    query['quarterlyFinancials.0.profitMargin'] = {
                                        $gt: screenerFilters.profitMargin[0],
                                        $lt: screenerFilters.profitMargin[1]
                                    };
                                    break;
                                case 'grossMargin':
                                    query['quarterlyFinancials.0.grossMargin'] = {
                                        $gt: screenerFilters.grossMargin[0],
                                        $lt: screenerFilters.grossMargin[1]
                                    };
                                    break;
                                case 'debtEquity':
                                    query['quarterlyFinancials.0.debtEquity'] = {
                                        $gt: screenerFilters.debtEquity[0],
                                        $lt: screenerFilters.debtEquity[1]
                                    };
                                    break;
                                case 'bookVal':
                                    query['quarterlyFinancials.0.bookVal'] = {
                                        $gt: screenerFilters.bookVal[0],
                                        $lt: screenerFilters.bookVal[1]
                                    };
                                    break;
                                case 'EV':
                                    query.EV = {
                                        $gt: screenerFilters.EV[0],
                                        $lt: screenerFilters.EV[1]
                                    };
                                    break;
                                case 'RSI':
                                    query.RSI = {
                                        $gt: screenerFilters.RSI[0],
                                        $lt: screenerFilters.RSI[1]
                                    };
                                    break;
                                case 'Gap':
                                    query.Gap = {
                                        $gt: screenerFilters.Gap[0],
                                        $lt: screenerFilters.Gap[1]
                                    };
                                    break;
                                case 'IV':
                                    query.IntrinsicValue = {
                                        $gt: screenerFilters.IV[0],
                                        $lt: screenerFilters.IV[1]
                                    };
                                    break;
                                default:
                                    break;
                            }
                        });

                        aggregation.push({ $match: query });


                        // Improved dynamic projection and flattening logic
                        const fieldMap = {
                            symbol: 'Symbol',
                            name: 'Name',
                            isin: 'ISIN',
                            market_cap: 'MarketCapitalization',
                            price: 'Close',
                            volume: 'Volume',
                            ipo: 'IPO',
                            assettype: 'AssetType',
                            pe_ratio: 'PERatio',
                            peg: 'PEGRatio',
                            pb_ratio: 'PriceToBookRatio',
                            ps_ratio: 'PriceToSalesRatioTTM',
                            dividend_yield: 'DividendYield',
                            eps: 'EPS',
                            fcf: 'freeCashFlow',
                            cash: 'cashAndEq',
                            current_debt: 'debtCurrent',
                            current_assets: 'assetsCurrent',
                            current_liabilities: 'liabilitiesCurrent',
                            current_ratio: 'currentRatio',
                            roe: 'roe',
                            roa: 'roa',
                            currency: 'Currency',
                            book_value: 'BookValue',
                            shares: 'SharesOutstanding',
                            sector: 'Sector',
                            industry: 'Industry',
                            exchange: 'Exchange',
                            country: 'Country',
                            rs_score1w: 'RSScore1W',
                            rs_score1m: 'RSScore1M',
                            rs_score4m: 'RSScore4M',
                            adv1w: 'ADV1W',
                            adv1m: 'ADV1M',
                            adv4m: 'ADV4M',
                            adv1y: 'ADV1Y',
                            perc_change: 'todaychange',
                            all_time_high: 'AlltimeHigh',
                            all_time_low: 'AlltimeLow',
                            high_52w: 'fiftytwoWeekHigh',
                            low_52w: 'fiftytwoWeekLow',
                            gap: 'Gap',
                            ev: 'EV',
                            rsi: 'RSI',
                            intrinsic_value: 'IntrinsicValue',
                        };

                        // Always include Symbol for frontend keying
                        let projection = { Symbol: 1, _id: 0 };
                        let addFields = {};

                        if (userDoc && Array.isArray(userDoc.Table)) {
                            userDoc.Table.forEach(attr => {
                                const backendField = fieldMap[attr] || attr;
                                // Special handling for 'price'/'Close'
                                if (attr === 'price' || attr === 'Close') {
                                    addFields['Close'] = {
                                        $arrayElemAt: [
                                            {
                                                $map: {
                                                    input: { $objectToArray: "$TimeSeries" },
                                                    as: "item",
                                                    in: { $getField: { field: "4. close", input: "$$item.v" } }
                                                }
                                            },
                                            0
                                        ]
                                    };
                                    projection['Close'] = 1;
                                    return;
                                }
                                // Special handling for 'volume'
                                if (attr === 'volume' || attr === 'Volume') {
                                    addFields['Volume'] = {
                                        $arrayElemAt: [
                                            {
                                                $map: {
                                                    input: { $objectToArray: "$TimeSeries" },
                                                    as: "item",
                                                    in: { $getField: { field: "5. volume", input: "$$item.v" } }
                                                }
                                            },
                                            0
                                        ]
                                    };
                                    projection['Volume'] = 1;
                                    return;
                                }
                                // Special handling for quarterly fields
                                const quarterlyFields = [
                                    'roe', 'roa', 'currentRatio', 'assetsCurrent', 'liabilitiesCurrent',
                                    'debtCurrent', 'cashAndEq', 'freeCashFlow', 'profitMargin', 'grossMargin',
                                    'debtEquity', 'bookVal'
                                ];
                                if (quarterlyFields.includes(backendField)) {
                                    addFields[backendField] = { $ifNull: [{ $getField: { field: backendField, input: { $arrayElemAt: ['$quarterlyFinancials', 0] } } }, null] };
                                    projection[backendField] = 1;
                                    return;
                                }
                                projection[backendField] = 1;
                            });
                        }

                        // Build aggregation pipeline
                        if (Object.keys(addFields).length > 0) {
                            aggregation.push({ $addFields: addFields });
                        }
                        aggregation.push({ $project: projection });

                        const filteredAssets = await assetInfoCollection.aggregate(aggregation).toArray();

                        filteredAssets.forEach(asset => {
                            const key = asset.Symbol;
                            if (!tickerScreenerMap.has(key)) {
                                tickerScreenerMap.set(key, []);
                            }
                            tickerScreenerMap.get(key).push(screenerName);
                        });

                        filteredAssetsArray.push(...filteredAssets);
                    } catch (error) {
                        logger.error({
                            msg: 'Error Processing Screener',
                            requestId: requestId,
                            screenerName: screenerName,
                            error: error.message
                        });
                        // Continue to next screener instead of stopping entire process
                        continue;
                    }
                }

                // Existing deduplication logic remains unchanged
                const uniqueFilteredAssetsArray = Array.from(new Set(filteredAssetsArray.map(a => JSON.stringify(a)))).map(a => JSON.parse(a));

                // Add screener information to the unique assets
                const finalResults = uniqueFilteredAssetsArray.map(asset => {
                    const screenerNames = tickerScreenerMap.get(asset.Symbol) || [];
                    return {
                        ...asset,
                        screenerNames: screenerNames,
                        isDuplicate: screenerNames.length > 1,
                        duplicateCount: screenerNames.length // Add this for sorting
                    };
                });

                // Sort: duplicates first, then by how many times they appear (descending)
                finalResults.sort((a, b) => {
                    // First, sort by duplicate count descending
                    if (b.duplicateCount !== a.duplicateCount) {
                        return b.duplicateCount - a.duplicateCount;
                    }
                    // Optionally, add a secondary sort (e.g., by Symbol)
                    return a.Symbol.localeCompare(b.Symbol);
                });

                // Remove duplicateCount from the response if you don't want to expose it
                finalResults.forEach(asset => { delete asset.duplicateCount; });

                res.send(finalResults);

            } catch (error) {
                // Comprehensive error logging
                logger.error({
                    msg: 'Unexpected Error in Combined Screener Results',
                    requestId: requestId,
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                // Ensure client is closed
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

    // endpoint that toggles value for screener, to include or exclude from combined list
    app.patch('/:user/toggle/screener/:list',
        validate([
            param('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

            param('list')
                .trim()
                .notEmpty().withMessage('Screener name is required')
                .isLength({ min: 1, max: 50 }).withMessage('Screener name must be between 1 and 50 characters')
                .matches(/^[a-zA-Z0-9\s_\-+()]+$/).withMessage('Screener name can only contain letters, numbers, spaces, underscores, hyphens, plus signs, and parentheses')
        ]),
        async (req, res) => {
            const requestId = crypto.randomBytes(16).toString('hex');
            let client;

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
                // Sanitize inputs
                const user = sanitizeInput(req.params.user);
                const list = sanitizeInput(req.params.list);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                // Find the screener document
                const filter = { Name: list, UsernameID: user };
                const screener = await collection.findOne(filter);

                if (!screener) {
                    logger.warn({
                        msg: 'Screener Not Found',
                        requestId: requestId,
                        user: obfuscateUsername(user),
                        screenerName: list
                    });
                    return res.status(404).json({ message: 'Screener not found' });
                }

                // Toggle the Include attribute
                const updatedIncludeValue = !screener.Include; // Switch the boolean value

                // Update the document in the database
                const updateResult = await collection.updateOne(filter, {
                    $set: { Include: updatedIncludeValue }
                });

                if (updateResult.modifiedCount === 0) {
                    logger.error({
                        msg: 'Failed to Update Screener',
                        requestId: requestId,
                        user: obfuscateUsername(user),
                        screenerName: list
                    });
                    return res.status(500).json({ message: 'Failed to update screener' });
                }

                res.send({
                    message: 'Screener updated successfully',
                    Include: updatedIncludeValue,
                    requestId: requestId
                });

            } catch (error) {
                // Comprehensive error logging
                logger.error({
                    msg: 'Error Toggling Screener',
                    requestId: requestId,
                    user: req.params.user ? obfuscateUsername(req.params.user) : 'Unknown',
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    requestId: requestId
                });
            } finally {
                // Ensure client is closed
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            requestId: requestId,
                            error: closeError.message
                        });
                    }
                }
            }
        }
    );

    // endpoint that updates screener document with ROE parameters
    app.patch('/screener/roe', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minROE, maxROE, screenerName, Username;

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
                // Sanitize inputs
                minROE = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxROE = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minROE) && isNaN(maxROE)) {
                    return res.status(400).json({ message: 'Both min ROE and max ROE cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minROE to minimum ROE if it is not provided
                    if (isNaN(minROE) && !isNaN(maxROE)) {
                        const minROEDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    roe: { $ifNull: [{ $first: "$quarterlyFinancials.roe" }, null] },
                                },
                            },
                            {
                                $match: { roe: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minROE: { $min: "$roe" },
                                },
                            },
                        ]).toArray();

                        if (minROEDoc.length > 0) {
                            minROE = minROEDoc[0].minROE;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum ROE' });
                        }
                    }

                    // If maxROE is empty, find the highest ROE excluding 'None'
                    if (isNaN(maxROE) && !isNaN(minROE)) {
                        const maxROEDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    roe: { $ifNull: [{ $first: "$quarterlyFinancials.roe" }, null] },
                                },
                            },
                            {
                                $match: { roe: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxROE: { $max: "$roe" },
                                },
                            },
                        ]).toArray();

                        if (maxROEDoc.length > 0) {
                            maxROE = maxROEDoc[0].maxROE;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum ROE' });
                        }
                    }

                    // Ensure minROE is less than maxROE
                    if (minROE >= maxROE) {
                        return res.status(400).json({ message: 'Min ROE cannot be higher than or equal to max ROE' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { ROE: [minROE, maxROE] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'ROE range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('ROE Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/roa', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minROA, maxROA, screenerName, Username;

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
                // Sanitize inputs
                minROA = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxROA = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minROA) && isNaN(maxROA)) {
                    return res.status(400).json({ message: 'Both min ROA and max ROA cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minROA to minimum ROA if it is not provided
                    if (isNaN(minROA) && !isNaN(maxROA)) {
                        const minROADoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    roa: { $ifNull: [{ $first: "$quarterlyFinancials.roa" }, null] },
                                },
                            },
                            {
                                $match: { roa: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minROA: { $min: "$roa" },
                                },
                            },
                        ]).toArray();

                        if (minROADoc.length > 0) {
                            minROA = minROADoc[0].minROA;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum ROA' });
                        }
                    }

                    // If maxROA is empty, find the highest ROA excluding 'None'
                    if (isNaN(maxROA) && !isNaN(minROA)) {
                        const maxROADoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    roa: { $ifNull: [{ $first: "$quarterlyFinancials.roa" }, null] },
                                },
                            },
                            {
                                $match: { roa: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxROA: { $max: "$roa" },
                                },
                            },
                        ]).toArray();

                        if (maxROADoc.length > 0) {
                            maxROA = maxROADoc[0].maxROA;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum ROA' });
                        }
                    }

                    // Ensure minROA is less than maxROA
                    if (minROA >= maxROA) {
                        return res.status(400).json({ message: 'Min ROA cannot be higher than or equal to max ROA' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { ROA: [minROA, maxROA] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'ROA range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('ROA Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/current-ratio', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minCurrentRatio, maxCurrentRatio, screenerName, Username;

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
                // Sanitize inputs
                minCurrentRatio = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxCurrentRatio = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minCurrentRatio) && isNaN(maxCurrentRatio)) {
                    return res.status(400).json({ message: 'Both min Current Ratio and max Current Ratio cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minCurrentRatio to minimum Current Ratio if it is not provided
                    if (isNaN(minCurrentRatio) && !isNaN(maxCurrentRatio)) {
                        const minCurrentRatioDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    currentRatio: { $ifNull: [{ $first: "$quarterlyFinancials.currentRatio" }, null] },
                                },
                            },
                            {
                                $match: { currentRatio: { $ne: NaN } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minCurrentRatio: { $min: "$currentRatio" },
                                },
                            },
                        ]).toArray();

                        if (minCurrentRatioDoc.length > 0) {
                            minCurrentRatio = minCurrentRatioDoc[0].minCurrentRatio;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum Current Ratio' });
                        }
                    }

                    // If maxCurrentRatio is empty, find the highest Current Ratio excluding 'None'
                    if (isNaN(maxCurrentRatio) && !isNaN(minCurrentRatio)) {
                        const maxCurrentRatioDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    currentRatio: { $ifNull: [{ $first: "$quarterlyFinancials.currentRatio" }, null] },
                                },
                            },
                            {
                                $match: { currentRatio: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxCurrentRatio: { $max: "$currentRatio" },
                                },
                            },
                        ]).toArray();

                        if (maxCurrentRatioDoc.length > 0) {
                            maxCurrentRatio = maxCurrentRatioDoc[0].maxCurrentRatio;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Current Ratio' });
                        }
                    }

                    // Ensure minCurrentRatio is less than maxCurrentRatio
                    if (minCurrentRatio >= maxCurrentRatio) {
                        return res.status(400).json({ message: 'Min Current Ratio cannot be higher than or equal to max Current Ratio' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { currentRatio: [minCurrentRatio, maxCurrentRatio] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Current Ratio range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Current Ratio Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/current-assets', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minCurrentAssets, maxCurrentAssets, screenerName, Username;

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
                // Sanitize inputs
                minCurrentAssets = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                maxCurrentAssets = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minCurrentAssets) && isNaN(maxCurrentAssets)) {
                    return res.status(400).json({ message: 'Both min Current Assets and max Current Assets cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minCurrentAssets to minimum Current Assets if it is not provided
                    if (isNaN(minCurrentAssets) && !isNaN(maxCurrentAssets)) {
                        const minCurrentAssetsDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    assetsCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.assetsCurrent" }, null] },
                                },
                            },
                            {
                                $match: { assetsCurrent: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minCurrentAssets: { $min: "$assetsCurrent" },
                                },
                            },
                        ]).toArray();

                        if (minCurrentAssetsDoc.length > 0) {
                            minCurrentAssets = minCurrentAssetsDoc[0].minCurrentAssets;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum Current Assets' });
                        }
                    }

                    // If maxCurrentAssets is empty, find the highest Current Assets excluding 'None'
                    if (isNaN(maxCurrentAssets) && !isNaN(minCurrentAssets)) {
                        const maxCurrentAssetsDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    assetsCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.assetsCurrent" }, null] },
                                },
                            },
                            {
                                $match: { assetsCurrent: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxCurrentAssets: { $max: "$assetsCurrent" },
                                },
                            },
                        ]).toArray();

                        if (maxCurrentAssetsDoc.length > 0) {
                            maxCurrentAssets = maxCurrentAssetsDoc[0].maxCurrentAssets;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Current Assets' });
                        }
                    }

                    // Ensure minCurrentAssets is less than maxCurrentAssets
                    if (minCurrentAssets >= maxCurrentAssets) {
                        return res.status(400).json({ message: 'Min Current Assets cannot be higher than or equal to max Current Assets' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { assetsCurrent: [minCurrentAssets, maxCurrentAssets] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Current Assets range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Current Assets Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/current-liabilities', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minCurrentLiabilities, maxCurrentLiabilities, screenerName, Username;

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
                // Sanitize inputs
                minCurrentLiabilities = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                maxCurrentLiabilities = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minCurrentLiabilities) && isNaN(maxCurrentLiabilities)) {
                    return res.status(400).json({ message: 'Both min Current Liabilities and max Current Liabilities cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minCurrentLiabilities to minimum Current Liabilities if it is not provided
                    if (isNaN(minCurrentLiabilities) && !isNaN(maxCurrentLiabilities)) {
                        const minCurrentLiabilitiesDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    liabilitiesCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.liabilitiesCurrent" }, null] },
                                },
                            },
                            {
                                $match: { liabilitiesCurrent: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minCurrentLiabilities: { $min: "$liabilitiesCurrent" },
                                },
                            },
                        ]).toArray();

                        if (minCurrentLiabilitiesDoc.length > 0) {
                            minCurrentLiabilities = minCurrentLiabilitiesDoc[0].minCurrentLiabilities;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum Current Liabilities' });
                        }
                    }

                    // If maxCurrentLiabilities is empty, find the highest Current Liabilities excluding 'None'
                    if (isNaN(maxCurrentLiabilities) && !isNaN(minCurrentLiabilities)) {
                        const maxCurrentLiabilitiesDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    liabilitiesCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.liabilitiesCurrent" }, null] },
                                },
                            },
                            {
                                $match: { liabilitiesCurrent: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxCurrentLiabilities: { $max: "$liabilitiesCurrent" },
                                },
                            },
                        ]).toArray();

                        if (maxCurrentLiabilitiesDoc.length > 0) {
                            maxCurrentLiabilities = maxCurrentLiabilitiesDoc[0].maxCurrentLiabilities;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Current Liabilities' });
                        }
                    }

                    // Ensure minCurrentLiabilities is less than maxCurrentLiabilities
                    if (minCurrentLiabilities >= maxCurrentLiabilities) {
                        return res.status(400).json({ message: 'Min Current Liabilities cannot be higher than or equal to max Current Liabilities' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { liabilitiesCurrent: [minCurrentLiabilities, maxCurrentLiabilities] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Current Liabilities range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Current Liabilities Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/current-debt', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minCurrentDebt, maxCurrentDebt, screenerName, Username;

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
                // Sanitize inputs
                minCurrentDebt = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                maxCurrentDebt = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minCurrentDebt) && isNaN(maxCurrentDebt)) {
                    return res.status(400).json({ message: 'Both min Current Debt and max Current Debt cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minCurrentDebt to minimum Current Debt if it is not provided
                    if (isNaN(minCurrentDebt) && !isNaN(maxCurrentDebt)) {
                        const minCurrentDebtDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    debtCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.debtCurrent" }, null] },
                                },
                            },
                            {
                                $match: { debtCurrent: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minCurrentDebt: { $min: "$debtCurrent" },
                                },
                            },
                        ]).toArray();

                        if (minCurrentDebtDoc.length > 0) {
                            minCurrentDebt = minCurrentDebtDoc[0].minCurrentDebt;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum Current Debt' });
                        }
                    }

                    // If maxCurrentDebt is empty, find the highest Current Debt excluding 'None'
                    if (isNaN(maxCurrentDebt) && !isNaN(minCurrentDebt)) {
                        const maxCurrentDebtDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    debtCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.debtCurrent" }, null] },
                                },
                            },
                            {
                                $match: { debtCurrent: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxCurrentDebt: { $max: "$debtCurrent" },
                                },
                            },
                        ]).toArray();

                        if (maxCurrentDebtDoc.length > 0) {
                            maxCurrentDebt = maxCurrentDebtDoc[0].maxCurrentDebt;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Current Debt' });
                        }
                    }

                    // Ensure minCurrentDebt is less than maxCurrentDebt
                    if (minCurrentDebt >= maxCurrentDebt) {
                        return res.status(400).json({ message: 'Min Current Debt cannot be higher than or equal to max Current Debt' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { debtCurrent: [minCurrentDebt, maxCurrentDebt] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Current Debt range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Current Debt Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/cash-equivalents', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minCashEquivalents, maxCashEquivalents, screenerName, Username;

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
                // Sanitize inputs
                minCashEquivalents = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                maxCashEquivalents = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minCashEquivalents) && isNaN(maxCashEquivalents)) {
                    return res.status(400).json({ message: 'Both min Cash Equivalents and max Cash Equivalents cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minCashEquivalents to minimum Cash Equivalents if it is not provided
                    if (isNaN(minCashEquivalents) && !isNaN(maxCashEquivalents)) {
                        const minCashEquivalentsDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    cashAndEq: { $ifNull: [{ $first: "$quarterlyFinancials.cashAndEq" }, null] },
                                },
                            },
                            {
                                $match: { cashAndEq: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minCashEquivalents: { $min: "$cashAndEq" },
                                },
                            },
                        ]).toArray();

                        if (minCashEquivalentsDoc.length > 0) {
                            minCashEquivalents = minCashEquivalentsDoc[0].minCashEquivalents;
                            if (minCashEquivalents === 0) {
                                minCashEquivalents = 0.001; // Set minimum value to 0.001 if it's 0
                            }
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum Cash Equivalents' });
                        }
                    }

                    // If maxCashEquivalents is empty, find the highest Cash Equivalents excluding 'None'
                    if (isNaN(maxCashEquivalents) && !isNaN(minCashEquivalents)) {
                        const maxCashEquivalentsDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    cashAndEq: { $ifNull: [{ $first: "$quarterlyFinancials.cashAndEq" }, null] },
                                },
                            },
                            {
                                $match: { cashAndEq: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxCashEquivalents: { $max: "$cashAndEq" },
                                },
                            },
                        ]).toArray();

                        if (maxCashEquivalentsDoc.length > 0) {
                            maxCashEquivalents = maxCashEquivalentsDoc[0].maxCashEquivalents;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Cash Equivalents' });
                        }
                    }

                    // Ensure minCashEquivalents is less than maxCashEquivalents
                    if (minCashEquivalents >= maxCashEquivalents) {
                        return res.status(400).json({ message: 'Min Cash Equivalents cannot be higher than or equal to max Cash Equivalents' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { cashAndEq: [minCashEquivalents, maxCashEquivalents] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Cash Equivalents range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Cash Equivalents Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/free-cash-flow', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minFreeCashFlow, maxFreeCashFlow, screenerName, Username;

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
                // Sanitize inputs
                minFreeCashFlow = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                maxFreeCashFlow = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minFreeCashFlow) && isNaN(maxFreeCashFlow)) {
                    return res.status(400).json({ message: 'Both min Free Cash Flow and max Free Cash Flow cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minFreeCashFlow to minimum Free Cash Flow if it is not provided
                    if (isNaN(minFreeCashFlow) && !isNaN(maxFreeCashFlow)) {
                        const minFreeCashFlowDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    freeCashFlow: { $ifNull: [{ $first: "$quarterlyFinancials.freeCashFlow" }, null] },
                                },
                            },
                            {
                                $match: { freeCashFlow: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minFreeCashFlow: { $min: "$freeCashFlow" },
                                },
                            },
                        ]).toArray();

                        if (minFreeCashFlowDoc.length > 0) {
                            minFreeCashFlow = minFreeCashFlowDoc[0].minFreeCashFlow;
                            if (minFreeCashFlow === 0) {
                                minFreeCashFlow = 0.001; // Set minimum value to 0.001 if it's 0
                            }
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum Free Cash Flow' });
                        }
                    }

                    // If maxFreeCashFlow is empty, find the highest Free Cash Flow excluding 'None'
                    if (isNaN(maxFreeCashFlow) && !isNaN(minFreeCashFlow)) {
                        const maxFreeCashFlowDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    freeCashFlow: { $ifNull: [{ $first: "$quarterlyFinancials.freeCashFlow" }, null] },
                                },
                            },
                            {
                                $match: { freeCashFlow: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxFreeCashFlow: { $max: "$freeCashFlow" },
                                },
                            },
                        ]).toArray();

                        if (maxFreeCashFlowDoc.length > 0) {
                            maxFreeCashFlow = maxFreeCashFlowDoc[0].maxFreeCashFlow;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Free Cash Flow' });
                        }
                    }

                    // Ensure minFreeCashFlow is less than maxFreeCashFlow
                    if (minFreeCashFlow >= maxFreeCashFlow) {
                        return res.status(400).json({ message: 'Min Free Cash Flow cannot be higher than or equal to max Free Cash Flow' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { freeCashFlow: [minFreeCashFlow, maxFreeCashFlow] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Free Cash Flow range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Free Cash Flow Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/profit-margin', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minProfitMargin, maxProfitMargin, screenerName, Username;

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
                // Sanitize inputs
                minProfitMargin = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxProfitMargin = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minProfitMargin) && isNaN(maxProfitMargin)) {
                    return res.status(400).json({ message: 'Both min Profit Margin and max Profit Margin cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minProfitMargin to minimum Profit Margin if it is not provided
                    if (isNaN(minProfitMargin) && !isNaN(maxProfitMargin)) {
                        const minProfitMarginDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    profitMargin: { $ifNull: [{ $first: "$quarterlyFinancials.profitMargin" }, null] },
                                },
                            },
                            {
                                $match: { profitMargin: { $ne: NaN } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minProfitMargin: { $min: "$profitMargin" },
                                },
                            },
                        ]).toArray();

                        if (minProfitMarginDoc.length > 0) {
                            minProfitMargin = minProfitMarginDoc[0].minProfitMargin;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum Profit Margin' });
                        }
                    }

                    // If maxProfitMargin is empty, find the highest Profit Margin excluding 'None'
                    if (isNaN(maxProfitMargin) && !isNaN(minProfitMargin)) {
                        const maxProfitMarginDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    profitMargin: { $ifNull: [{ $first: "$quarterlyFinancials.profitMargin" }, null] },
                                },
                            },
                            {
                                $match: { profitMargin: { $ne: NaN } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxProfitMargin: { $max: "$profitMargin" },
                                },
                            },
                        ]).toArray();

                        if (maxProfitMarginDoc.length > 0) {
                            maxProfitMargin = maxProfitMarginDoc[0].maxProfitMargin;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Profit Margin' });
                        }
                    }

                    // Ensure minProfitMargin is less than maxProfitMargin
                    if (minProfitMargin >= maxProfitMargin) {
                        return res.status(400).json({ message: 'Min Profit Margin cannot be higher than or equal to max Profit Margin' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { profitMargin: [minProfitMargin, maxProfitMargin] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Profit Margin range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Profit Margin Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/gross-margin', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minGrossMargin, maxGrossMargin, screenerName, Username;

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
                // Sanitize inputs
                minGrossMargin = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxGrossMargin = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minGrossMargin) && isNaN(maxGrossMargin)) {
                    return res.status(400).json({ message: 'Both min Gross Margin and max Gross Margin cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minGrossMargin to minimum Gross Margin if it is not provided
                    if (isNaN(minGrossMargin) && !isNaN(maxGrossMargin)) {
                        const minGrossMarginDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    grossMargin: { $ifNull: [{ $first: "$quarterlyFinancials.grossMargin" }, null] },
                                },
                            },
                            {
                                $match: { grossMargin: { $ne: NaN } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minGrossMargin: { $min: "$grossMargin" },
                                },
                            },
                        ]).toArray();

                        if (minGrossMarginDoc.length > 0) {
                            minGrossMargin = minGrossMarginDoc[0].minGrossMargin;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum Gross Margin' });
                        }
                    }

                    // If maxGrossMargin is empty, find the highest Gross Margin excluding 'None'
                    if (isNaN(maxGrossMargin) && !isNaN(minGrossMargin)) {
                        const maxGrossMarginDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    grossMargin: { $ifNull: [{ $first: "$quarterlyFinancials.grossMargin" }, null] },
                                },
                            },
                            {
                                $match: { grossMargin: { $ne: NaN } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxGrossMargin: { $max: "$grossMargin" },
                                },
                            },
                        ]).toArray();

                        if (maxGrossMarginDoc.length > 0) {
                            maxGrossMargin = maxGrossMarginDoc[0].maxGrossMargin;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Gross Margin' });
                        }
                    }

                    // Ensure minGrossMargin is less than maxGrossMargin
                    if (minGrossMargin >= maxGrossMargin) {
                        return res.status(400).json({ message: 'Min Gross Margin cannot be higher than or equal to max Gross Margin' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { grossMargin: [minGrossMargin, maxGrossMargin] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Gross Margin range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Gross Margin Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/debt-to-equity-ratio', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minDebtToEquityRatio, maxDebtToEquityRatio, screenerName, Username;

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
                // Sanitize inputs
                minDebtToEquityRatio = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxDebtToEquityRatio = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minDebtToEquityRatio) && isNaN(maxDebtToEquityRatio)) {
                    return res.status(400).json({ message: 'Both min Debt to Equity Ratio and max Debt to Equity Ratio cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minDebtToEquityRatio to minimum Debt to Equity Ratio if it is not provided
                    if (isNaN(minDebtToEquityRatio) && !isNaN(maxDebtToEquityRatio)) {
                        const minDebtToEquityRatioDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    debtEquity: { $ifNull: [{ $first: "$quarterlyFinancials.debtEquity" }, null] },
                                },
                            },
                            {
                                $match: { debtEquity: { $ne: NaN } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minDebtToEquityRatio: { $min: "$debtEquity" },
                                },
                            },
                        ]).toArray();

                        if (minDebtToEquityRatioDoc.length > 0) {
                            minDebtToEquityRatio = minDebtToEquityRatioDoc[0].minDebtToEquityRatio;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum Debt to Equity Ratio' });
                        }
                    }

                    // If maxDebtToEquityRatio is empty, find the highest Debt to Equity Ratio excluding 'None'
                    if (isNaN(maxDebtToEquityRatio) && !isNaN(minDebtToEquityRatio)) {
                        const maxDebtToEquityRatioDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    debtEquity: { $ifNull: [{ $first: "$quarterlyFinancials.debtEquity" }, null] },
                                },
                            },
                            {
                                $match: { debtEquity: { $ne: NaN } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxDebtToEquityRatio: { $max: "$debtEquity" },
                                },
                            },
                        ]).toArray();

                        if (maxDebtToEquityRatioDoc.length > 0) {
                            maxDebtToEquityRatio = maxDebtToEquityRatioDoc[0].maxDebtToEquityRatio;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Debt to Equity Ratio' });
                        }
                    }

                    // Ensure minDebtToEquityRatio is less than maxDebtToEquityRatio
                    if (minDebtToEquityRatio >= maxDebtToEquityRatio) {
                        return res.status(400).json({ message: 'Min Debt to Equity Ratio cannot be higher than or equal to max Debt to Equity Ratio' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { debtEquity: [minDebtToEquityRatio, maxDebtToEquityRatio] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Debt to Equity Ratio range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Debt to Equity Ratio Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/book-value', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minBookValue, maxBookValue, screenerName, Username;

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
                // Sanitize inputs
                minBookValue = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                maxBookValue = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minBookValue) && isNaN(maxBookValue)) {
                    return res.status(400).json({ message: 'Both min Book Value and max Book Value cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // Set default minBookValue to minimum Book Value if it is not provided
                    if (isNaN(minBookValue) && !isNaN(maxBookValue)) {
                        const minBookValueDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    bookVal: { $ifNull: [{ $first: "$quarterlyFinancials.bookVal" }, null] },
                                },
                            },
                            {
                                $match: { bookVal: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    minBookValue: { $min: "$bookVal" },
                                },
                            },
                        ]).toArray();

                        if (minBookValueDoc.length > 0) {
                            minBookValue = minBookValueDoc[0].minBookValue;
                            if (minBookValue === 0) {
                                minBookValue = 0.001; // Set minimum value to 0.001 if it's 0
                            }
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine minimum Book Value' });
                        }
                    }

                    // If maxBookValue is empty, find the highest Book Value excluding 'None'
                    if (isNaN(maxBookValue) && !isNaN(minBookValue)) {
                        const maxBookValueDoc = await assetInfoCollection.aggregate([
                            {
                                $project: {
                                    bookVal: { $ifNull: [{ $first: "$quarterlyFinancials.bookVal" }, null] },
                                },
                            },
                            {
                                $match: { bookVal: { $ne: null } },
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxBookValue: { $max: "$bookVal" },
                                },
                            },
                        ]).toArray();

                        if (maxBookValueDoc.length > 0) {
                            maxBookValue = maxBookValueDoc[0].maxBookValue;
                        } else {
                            return res.status(404).json({ message: 'No assets found to determine maximum Book Value' });
                        }
                    }

                    // Ensure minBookValue is less than maxBookValue
                    if (minBookValue >= maxBookValue) {
                        return res.status(400).json({ message: 'Min Book Value cannot be higher than or equal to max Book Value' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { bookVal: [minBookValue, maxBookValue] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'Unable to update screener'
                        });
                    }

                    res.json({
                        message: 'Book Value range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Book Value Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/ev', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minPrice, maxPrice, screenerName, Username;

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
                // Sanitize inputs
                minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min EV and max EV cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    if (isNaN(minPrice)) {
                        const minEV = await assetInfoCollection.aggregate([
                            {
                                $match: {
                                    EV: { $ne: 'None', $ne: null, $ne: undefined }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    minEV: { $min: '$EV' }
                                }
                            }
                        ]).toArray();

                        if (minEV.length > 0) {
                            minPrice = minEV[0].minEV;
                        } else {
                            return res.status(404).json({
                                message: 'No assets found to determine minimum EV',
                                details: 'Unable to find a valid EV in the database'
                            });
                        }
                    }

                    if (isNaN(maxPrice)) {
                        const maxEV = await assetInfoCollection.aggregate([
                            {
                                $match: {
                                    EV: { $ne: 'None', $ne: null, $ne: undefined }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxEV: { $max: '$EV' }
                                }
                            }
                        ]).toArray();

                        if (maxEV.length > 0) {
                            maxPrice = maxEV[0].maxEV;
                        } else {
                            return res.status(404).json({
                                message: 'No assets found to determine maximum EV',
                                details: 'Unable to find a valid EV in the database'
                            });
                        }
                    }

                    if (minPrice >= maxPrice) {
                        return res.status(400).json({ message: 'Min EV cannot be higher than or equal to max EV' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { EV: [minPrice, maxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    res.json({
                        message: 'EV range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('EV Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/rsi', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minRSI, maxRSI, screenerName, Username;

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
                // Sanitize inputs
                minRSI = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxRSI = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minRSI) && isNaN(maxRSI)) {
                    return res.status(400).json({ message: 'Both min RSI and max RSI cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    if (isNaN(minRSI)) {
                        minRSI = 1;
                    }
                    if (isNaN(maxRSI)) {
                        maxRSI = 100;
                    }

                    if (minRSI >= maxRSI) {
                        return res.status(400).json({ message: 'Min RSI cannot be higher than or equal to max RSI' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { RSI: [minRSI, maxRSI] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    res.json({
                        message: 'RSI range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('RSI Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    app.patch('/screener/gap-percent', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minPrice, maxPrice, screenerName, Username;

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
                // Sanitize inputs
                minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min Gap and max Gap cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    if (isNaN(minPrice)) {
                        const minGap = await assetInfoCollection.aggregate([
                            {
                                $match: {
                                    Gap: { $ne: 'None', $ne: null, $ne: undefined, $ne: NaN }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    minGap: { $min: '$Gap' }
                                }
                            }
                        ]).toArray();

                        if (minGap.length > 0) {
                            minPrice = minGap[0].minGap;
                        } else {
                            return res.status(404).json({
                                message: 'No assets found to determine minimum Gap',
                                details: 'Unable to find a valid Gap in the database'
                            });
                        }
                    }

                    if (isNaN(maxPrice)) {
                        const maxGap = await assetInfoCollection.aggregate([
                            {
                                $match: {
                                    Gap: { $ne: 'None', $ne: null, $ne: undefined, $ne: NaN }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    maxGap: { $max: '$Gap' }
                                }
                            }
                        ]).toArray();

                        if (maxGap.length > 0) {
                            maxPrice = maxGap[0].maxGap;
                        } else {
                            return res.status(404).json({
                                message: 'No assets found to determine maximum Gap',
                                details: 'Unable to find a valid Gap in the database'
                            });
                        }
                    }

                    if (minPrice >= maxPrice) {
                        return res.status(400).json({ message: 'Min Gap cannot be higher than or equal to max Gap' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { Gap: [minPrice, maxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    res.json({
                        message: 'Gap range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Gap Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });

    // --- PATCH update table columns for a user ---
    app.patch('/update/columns', validate([
        body('columns').isArray({ min: 1 }).withMessage('Columns must be a non-empty array'),
        body('user').isString().trim().notEmpty().withMessage('User is required')
    ]), async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            const { user, columns } = req.body;
            const sanitizedUser = sanitizeInput(user);

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');

            // Update or insert the Table array for the user
            const updateResult = await usersCollection.updateOne(
                { Username: sanitizedUser },
                { $set: { Table: columns } },
                { upsert: true }
            );

            if (updateResult.matchedCount === 0 && updateResult.upsertedCount === 1) {
                return res.status(201).json({ message: 'Table created for user' });
            } else if (updateResult.modifiedCount === 1) {
                return res.status(200).json({ message: 'Table updated for user' });
            } else {
                return res.status(200).json({ message: 'No changes made to Table' });
            }
        } catch (error) {
            logger.error({
                msg: 'An error occurred while updating Table columns',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.body?.user
            });
            return res.status(500).json({ message: 'An error occurred while updating Table columns' });
        } finally {
            if (client) await client.close();
        }
    });

    // --- GET table columns for a user ---
    app.get('/get/columns', validate([
        query('user').isString().trim().notEmpty().withMessage('User is required')
    ]), async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            const user = req.query.user;
            const sanitizedUser = sanitizeInput(user);

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');

            const userDoc = await usersCollection.findOne(
                { Username: sanitizedUser },
                { projection: { Table: 1 } }
            );

            if (!userDoc || !Array.isArray(userDoc.Table)) {
                return res.status(404).json({ message: 'No columns found for user' });
            }

            return res.status(200).json({ columns: userDoc.Table });
        } catch (error) {
            logger.error({
                msg: 'An error occurred while retrieving Table columns',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.query?.user
            });
            return res.status(500).json({ message: 'An error occurred while retrieving Table columns' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint that updates screener document with Intrinsic Value (IV) parameters
    app.patch('/screener/intrinsic-value', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req, res) => {
            let minPrice, maxPrice, screenerName, Username;

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
                // Sanitize inputs
                minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    return res.status(400).json({ message: 'Both min IV and max IV cannot be empty' });
                }

                let client;
                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // If minPrice is not provided, set to the minimum IV in the database
                    if (isNaN(minPrice)) {
                        const lowestIVDoc = await assetInfoCollection.find({
                            IntrinsicValue: { $ne: 'None', $ne: null, $ne: undefined },
                            IntrinsicValue: { $gt: 0 }
                        })
                            .sort({ IntrinsicValue: 1 })
                            .limit(1)
                            .project({ IntrinsicValue: 1 })
                            .toArray();

                        if (lowestIVDoc.length > 0) {
                            minPrice = Math.floor(lowestIVDoc[0].IntrinsicValue * 100) / 100;
                        } else {
                            return res.status(404).json({
                                message: 'No assets found to determine minimum Intrinsic Value',
                                details: 'Unable to find a valid Intrinsic Value in the database'
                            });
                        }
                    }

                    // If maxPrice is not provided, set to the maximum IV in the database
                    if (isNaN(maxPrice)) {
                        const highestIVDoc = await assetInfoCollection.find({
                            IntrinsicValue: { $ne: 'None', $ne: null, $ne: undefined },
                            IntrinsicValue: { $gt: 0 }
                        })
                            .sort({ IntrinsicValue: -1 })
                            .limit(1)
                            .project({ IntrinsicValue: 1 })
                            .toArray();

                        if (highestIVDoc.length > 0) {
                            maxPrice = Math.ceil(highestIVDoc[0].IntrinsicValue * 100) / 100;
                        } else {
                            return res.status(404).json({
                                message: 'No assets found to determine maximum Intrinsic Value',
                                details: 'Unable to find a valid Intrinsic Value in the database'
                            });
                        }
                    }

                    if (minPrice >= maxPrice) {
                        return res.status(400).json({ message: 'Min IV cannot be higher than or equal to max IV' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { IV: [minPrice, maxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    res.json({
                        message: 'Intrinsic Value range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError) {
                    logger.error('Database Operation Error', {
                        error: dbError.message,
                        stack: dbError.stack,
                        Username,
                        screenerName
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: dbError.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn('Error closing database connection', {
                                error: closeError.message
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error('Intrinsic Value Update Error', {
                    message: error.message,
                    stack: error.stack
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        });
};
