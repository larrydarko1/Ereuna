import { body, param } from '../utils/validationUtils.js';
import { Request, Response } from 'express';
import { handleError } from '../utils/logger.js';

export default function (app: any, deps: any) {
    const {
        validate,
        validationSchemas,
        sanitizeInput,
        logger,
        obfuscateUsername,
        MongoClient,
        uri,
        crypto,
        query
    } = deps;

    function isMarketHoursUTC() {
        const now = new Date();
        const day = now.getUTCDay(); // Sunday=0, Saturday=6
        const hour = now.getUTCHours();
        const minute = now.getUTCMinutes();
        // Market open: 13:30 UTC, close: 23:00 UTC
        const isWeekday = day >= 1 && day <= 5;
        const afterOpen = hour > 13 || (hour === 13 && minute >= 30);
        const beforeClose = hour < 23;
        return isWeekday && afterOpen && beforeClose;
    }

    // endpoint that handles creation of new screeners 
    app.post('/:user/create/screener/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.screenerName()
        ]),
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'POST /:user/create/screener/:list',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const user = sanitizeInput(req.params.user);
                const list = sanitizeInput(req.params.list);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const screenerCount = await collection.countDocuments({ UsernameID: user });
                if (screenerCount >= 20) {
                    logger.warn({
                        msg: 'Attempt to create screener beyond limit',
                        user: user,
                        screenerCount,
                        context: 'POST /:user/create/screener/:list',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Maximum number of screeners (20) has been reached' });
                }
                const existingScreener = await collection.findOne({ UsernameID: user, Name: list });
                if (existingScreener) {
                    logger.warn({
                        msg: 'Attempt to create duplicate screener',
                        user: user,
                        screenerName: '[masked]',
                        context: 'POST /:user/create/screener/:list',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Screener with the same name already exists' });
                }
                const screenerDoc = {
                    UsernameID: user,
                    Name: list,
                    Include: true,
                    CreatedAt: new Date(),
                };
                const result = await collection.insertOne(screenerDoc);
                if (result.insertedCount === 1 || result.acknowledged) {
                    return res.json({
                        message: 'Screener created successfully',
                        screenerCount: screenerCount + 1
                    });
                } else {
                    logger.error({
                        msg: 'Failed to create screener',
                        user: user,
                        screenerName: '[masked]',
                        context: 'POST /:user/create/screener/:list',
                        statusCode: 500
                    });
                    return res.status(500).json({ message: 'Failed to create screener' });
                }
            } catch (error) {
                const errObj = handleError(error, 'POST /:user/create/screener/:list', {
                    user: req.params.user,
                    list: req.params.list
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'POST /:user/create/screener/:list'
                        });
                    }
                }
            }
        }
    );

    // endpoint that renames selected screener
    app.patch('/:user/rename/screener',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.oldname(),
            validationSchemas.newname()
        ]),
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /:user/rename/screener',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const oldname = sanitizeInput(req.body.oldname);
                const newname = sanitizeInput(req.body.newname);
                const Username = sanitizeInput(req.params.user);
                if (!newname) {
                    logger.warn({
                        msg: 'Attempt to rename screener with empty name',
                        user: Username,
                        oldname: '[masked]',
                        context: 'PATCH /:user/rename/screener',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Please provide a new name' });
                }
                if (oldname === newname) {
                    logger.warn({
                        msg: 'Attempt to rename screener with same name',
                        user: Username,
                        screenerName: '[masked]',
                        context: 'PATCH /:user/rename/screener',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'New name must be different from the current name' });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const existingScreener = await collection.findOne({ UsernameID: Username, Name: newname });
                if (existingScreener) {
                    logger.warn({
                        msg: 'Attempt to create duplicate screener name',
                        user: Username,
                        screenerName: '[masked]',
                        context: 'PATCH /:user/rename/screener',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'A screener with this name already exists' });
                }
                const filter = { UsernameID: Username, Name: oldname };
                const updateDoc = { $set: { Name: newname } };
                const result = await collection.updateOne(filter, updateDoc);
                if (result.modifiedCount === 0) {
                    logger.warn({
                        msg: 'Screener not found for renaming',
                        user: Username,
                        oldname: '[masked]',
                        context: 'PATCH /:user/rename/screener',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Screener not found' });
                }
                return res.json({ message: 'Screener renamed successfully' });
            } catch (error) {
                const errObj = handleError(error, 'PATCH /:user/rename/screener', {
                    user: req.params.user,
                    oldname: req.body.oldname,
                    newname: req.body.newname
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'PATCH /:user/rename/screener'
                        });
                    }
                }
            }
        }
    );

    // endpoint that deletes selected screener 
    app.delete('/:user/delete/screener/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.screenerName()
        ]),
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'DELETE /:user/delete/screener/:list',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
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
                    logger.warn({
                        msg: 'Screener not found for deletion',
                        user: user,
                        screenerName: '[masked]',
                        context: 'DELETE /:user/delete/screener/:list',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Screener not found' });
                }
                res.json({ message: 'Screener deleted successfully' });
            } catch (error) {
                const errObj = handleError(error, 'DELETE /:user/delete/screener/:list', {
                    user: req.params.user,
                    list: req.params.list
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'DELETE /:user/delete/screener/:list'
                        });
                    }
                }
            }
        }
    );

    // Map frontend keys to backend fields
    const fieldMap: Record<string, string> = {
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
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /:user/screener/results/all',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const user = sanitizeInput(req.params.user);
                // Pagination parameters
                let page = parseInt(String(req.query.page), 10) || 1;
                let limit = parseInt(String(req.query.limit), 10) || 100;
                if (limit > 500) limit = 500; // Prevent excessive load
                if (page < 1) page = 1;
                const skip = (page - 1) * limit;
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                // Find the user document and extract the 'Hidden' array
                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: user });
                if (!userDoc) {
                    logger.warn({
                        msg: 'User not found',
                        user: user,
                        context: 'GET /:user/screener/results/all',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'User not found' });
                }
                const hiddenSymbols = userDoc.Hidden || [];
                // Build projection based on Table array
                // Add index signature to projection for dynamic keys
                const projection: { [key: string]: any } = { Symbol: 1, _id: 0 };
                if (Array.isArray(userDoc.Table)) {
                    userDoc.Table.forEach((key: string) => {
                        if (fieldMap[key]) {
                            if (key === 'price') {
                                // We'll fetch price from OHCLVData1m later
                            } else if (key === 'volume') {
                                // We'll fetch volume from OHCLVData after market close
                            } else if ([
                                'fcf', 'cash', 'current_debt', 'current_assets', 'current_liabilities', 'current_ratio', 'roe', 'roa'
                            ].includes(key)) {
                                // Add index signature to qfMap for dynamic keys
                                const qfMap: { [key: string]: string } = {
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
                                    projection[field] = { $ifNull: [{ $getField: { field: field, input: { $arrayElemAt: ['$quarterlyFinancials', 0] } } }, null] };
                                }
                            } else {
                                projection[fieldMap[key]] = 1;
                            }
                        }
                    });
                }
                // Filter the AssetInfo collection using the 'Hidden' array
                const assetInfoCollection = db.collection('AssetInfo');
                const totalCount = await assetInfoCollection.countDocuments({ Symbol: { $nin: hiddenSymbols } });
                const filteredAssets = await assetInfoCollection.find(
                    { Symbol: { $nin: hiddenSymbols } },
                    { projection }
                )
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                // Collections for price and volume
                const ohclvCollection = db.collection('OHCLVData1m');
                const dailyCollection = db.collection('OHCLVData');
                // Build response with price, volume, and todaychange logic
                const assetsWithPriceAndVolume = await Promise.all(filteredAssets.map(async (asset: any) => {
                    let price = null;
                    let volume = null;
                    let volume_message = null;
                    let todaychange = null;
                    // Fetch latest price from OHCLVData1m
                    let latestCandle: any[] = [];
                    try {
                        latestCandle = await ohclvCollection.find({ tickerID: asset.Symbol })
                            .sort({ timestamp: -1 })
                            .limit(1)
                            .toArray();
                        if (latestCandle.length > 0) {
                            price = latestCandle[0].close;
                        }
                    } catch (err) {
                        if (err instanceof Error) {
                            logger.warn({
                                msg: 'Error fetching OHCLVData1m for symbol',
                                symbol: asset.Symbol,
                                error: err.message,
                                context: 'GET /:user/screener/results/all'
                            });
                        }
                    }
                    if (isMarketHoursUTC()) {
                        volume = null;
                        volume_message = "Intraday volume is unavailable during market hours. Final volume will be available after market close.";
                        // Calculate todaychange using 1m close and previous day close
                        try {
                            const prevDayCandle: any[] = await dailyCollection.find({ tickerID: asset.Symbol })
                                .sort({ timestamp: -1 })
                                .limit(1)
                                .toArray();
                            if (latestCandle.length > 0 && prevDayCandle.length > 0 && prevDayCandle[0].close) {
                                const prevClose = prevDayCandle[0].close;
                                todaychange = (price - prevClose) / prevClose;
                            } else {
                                todaychange = null;
                            }
                        } catch (err) {
                            if (err instanceof Error) {
                                logger.warn({
                                    msg: 'Error fetching previous day close for todaychange',
                                    symbol: asset.Symbol,
                                    error: err.message,
                                    context: 'GET /:user/screener/results/all'
                                });
                            }
                            todaychange = null;
                        }
                    } else {
                        try {
                            const dailyCandle: any[] = await dailyCollection.find({ tickerID: asset.Symbol })
                                .sort({ timestamp: -1 })
                                .limit(1)
                                .toArray();
                            if (dailyCandle.length > 0) {
                                volume = dailyCandle[0].volume;
                            }
                        } catch (err) {
                            if (err instanceof Error) {
                                logger.warn({
                                    msg: 'Error fetching OHCLVData for volume',
                                    symbol: asset.Symbol,
                                    error: err.message,
                                    context: 'GET /:user/screener/results/all'
                                });
                            }
                        }
                        volume_message = null;
                        todaychange = asset.todaychange !== undefined ? asset.todaychange : null;
                    }
                    return {
                        ...asset,
                        Close: price,
                        Volume: volume,
                        volume_message,
                        todaychange
                    };
                }));
                res.json({
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                    data: assetsWithPriceAndVolume
                });
            } catch (error) {
                const errObj = handleError(error, 'GET /:user/screener/results/all', {
                    user: req.params.user
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'GET /:user/screener/results/all'
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
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /:user/screener/results/hidden',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const user = sanitizeInput(req.params.user);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                // Find the user document and extract the 'Hidden' array
                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: user });
                if (!userDoc) {
                    logger.warn({
                        msg: 'Hidden Results - User Not Found',
                        username: user,
                        context: 'GET /:user/screener/results/hidden',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'User not found',
                        username: user
                    });
                }
                // Check if hidden symbols exist
                const hiddenSymbols: string[] = userDoc.Hidden || [];
                if (hiddenSymbols.length === 0) {
                    return res.json({
                        page: 1,
                        limit: 100,
                        totalCount: 0,
                        totalPages: 1,
                        data: []
                    });
                }
                // Pagination parameters
                let page = parseInt(String(req.query.page), 10) || 1;
                let limit = parseInt(String(req.query.limit), 10) || 100;
                if (limit > 500) limit = 500;
                if (page < 1) page = 1;
                const skip = (page - 1) * limit;
                // Build projection based on Table array (same as /results/all)
                const projection: Record<string, any> = { Symbol: 1, _id: 0 };
                if (Array.isArray(userDoc.Table)) {
                    userDoc.Table.forEach((key: string) => {
                        if (fieldMap[key]) {
                            if (key === 'price') {
                                // We'll fetch price from OHCLVData1m later
                            } else if (key === 'volume') {
                                // We'll fetch volume from OHCLVData after market close
                            } else if ([
                                'fcf', 'cash', 'current_debt', 'current_assets', 'current_liabilities', 'current_ratio', 'roe', 'roa'
                            ].includes(key)) {
                                const qfMap: Record<string, string> = {
                                    fcf: 'freeCashFlow',
                                    cash: 'cashAndEq',
                                    current_debt: 'debtCurrent',
                                    current_assets: 'assetsCurrent',
                                    current_liabilities: 'liabilitiesCurrent',
                                    current_ratio: 'currentRatio',
                                    roe: 'roe',
                                    roa: 'roa',
                                };
                                const field = qfMap[key as keyof typeof qfMap];
                                if (field) {
                                    projection[qfMap[key as keyof typeof qfMap]] = { $ifNull: [{ $getField: { field: qfMap[key as keyof typeof qfMap], input: { $arrayElemAt: ['$quarterlyFinancials', 0] } } }, null] };
                                }
                            } else {
                                projection[fieldMap[key]] = 1;
                            }
                        }
                    });
                }
                const assetInfoCollection = db.collection('AssetInfo');
                const totalCount = await assetInfoCollection.countDocuments({ Symbol: { $in: hiddenSymbols } });
                const filteredAssets = await assetInfoCollection.find(
                    { Symbol: { $in: hiddenSymbols } },
                    { projection }
                )
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                // Collections for price and volume
                const ohclvCollection = db.collection('OHCLVData1m');
                const dailyCollection = db.collection('OHCLVData');
                // Build response with price, volume, and todaychange logic (same as /results/all)
                const assetsWithPriceAndVolume = await Promise.all(filteredAssets.map(async (asset: any) => {
                    let price = null;
                    let volume = null;
                    let volume_message = null;
                    let todaychange = null;
                    // Fetch latest price from OHCLVData1m
                    let latestCandle: any[] = [];
                    try {
                        latestCandle = await ohclvCollection.find({ tickerID: asset.Symbol })
                            .sort({ timestamp: -1 })
                            .limit(1)
                            .toArray();
                        if (latestCandle.length > 0) {
                            price = latestCandle[0].close;
                        }
                    } catch (err) {
                        if (err instanceof Error) {
                            logger.warn({
                                msg: 'Error fetching OHCLVData1m for symbol',
                                symbol: asset.Symbol,
                                error: err.message,
                                context: 'GET /:user/screener/results/hidden'
                            });
                        }
                    }
                    if (isMarketHoursUTC()) {
                        volume = null;
                        volume_message = "Intraday volume is unavailable during market hours. Final volume will be available after market close.";
                        // Calculate todaychange using 1m close and previous day close
                        try {
                            const prevDayCandle: any[] = await dailyCollection.find({ tickerID: asset.Symbol })
                                .sort({ timestamp: -1 })
                                .limit(1)
                                .toArray();
                            if (latestCandle.length > 0 && prevDayCandle.length > 0 && prevDayCandle[0].close) {
                                const prevClose = prevDayCandle[0].close;
                                todaychange = (price - prevClose) / prevClose;
                            } else {
                                todaychange = null;
                            }
                        } catch (err) {
                            if (err instanceof Error) {
                                logger.warn({
                                    msg: 'Error fetching previous day close for todaychange',
                                    symbol: asset.Symbol,
                                    error: err.message,
                                    context: 'GET /:user/screener/results/hidden'
                                });
                            }
                            todaychange = null;
                        }
                    } else {
                        try {
                            const dailyCandle: any[] = await dailyCollection.find({ tickerID: asset.Symbol })
                                .sort({ timestamp: -1 })
                                .limit(1)
                                .toArray();
                            if (dailyCandle.length > 0) {
                                volume = dailyCandle[0].volume;
                            }
                        } catch (err) {
                            if (err instanceof Error) {
                                logger.warn({
                                    msg: 'Error fetching OHCLVData for volume',
                                    symbol: asset.Symbol,
                                    error: err.message,
                                    context: 'GET /:user/screener/results/hidden'
                                });
                            }
                        }
                        volume_message = null;
                        todaychange = asset.todaychange !== undefined ? asset.todaychange : null;
                    }
                    return {
                        ...asset,
                        Close: price,
                        Volume: volume,
                        volume_message,
                        todaychange
                    };
                }));
                res.json({
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                    data: assetsWithPriceAndVolume
                });
            } catch (error) {
                const errObj = handleError(error, 'GET /:user/screener/results/hidden', {
                    user: req.params.user
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'GET /:user/screener/results/hidden'
                        });
                    }
                }
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
        async (req: Request, res: Response) => {
            const user = sanitizeInput(req.params.user);
            const screenerName = sanitizeInput(req.params.name);
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /screener/:user/results/filtered/:name',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');

                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: user });
                if (!userDoc) {
                    logger.warn({
                        msg: 'User not found',
                        user: user,
                        context: 'GET /screener/:user/results/filtered/:name',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'User not found' });
                }

                const hiddenSymbols = userDoc.Hidden || [];

                const screenersCollection = db.collection('Screeners');
                const screenerData = await screenersCollection.findOne({ UsernameID: user, Name: screenerName }) as {
                    Price?: [number, number];
                    MarketCap?: [number, number];
                    Sectors?: string[];
                    AssetTypes?: string[];
                    Exchanges?: string[];
                    Countries?: string[];
                    NewHigh?: any;
                    NewLow?: any;
                    MA200?: any;
                    MA50?: any;
                    MA20?: any;
                    MA10?: any;
                    CurrentPrice?: any;
                    PE?: [number, number];
                    ForwardPE?: [number, number];
                    PEG?: [number, number];
                    EPS?: [number, number];
                    PS?: [number, number];
                    PB?: [number, number];
                    Beta?: [number, number];
                    DivYield?: [number, number];
                    EPSQoQ?: [number, number];
                    EPSYoY?: [number, number];
                    EarningsQoQ?: [number, number];
                    EarningsYoY?: [number, number];
                    RevQoQ?: [number, number];
                    RevYoY?: [number, number];
                    AvgVolume1W?: [number, number];
                    AvgVolume1M?: [number, number];
                    AvgVolume6M?: [number, number];
                    AvgVolume1Y?: [number, number];
                    RelVolume1W?: [number, number];
                    RelVolume1M?: [number, number];
                    RelVolume6M?: [number, number];
                    RelVolume1Y?: [number, number];
                    RSScore1W?: [number, number];
                    RSScore1M?: [number, number];
                    RSScore4M?: [number, number];
                    ADV1W?: [number, number];
                    ADV1M?: [number, number];
                    ADV4M?: [number, number];
                    ADV1Y?: [number, number];
                    PercOffWeekHigh?: [number, number];
                    PercOffWeekLow?: [number, number];
                    IPO?: [number, number];
                    changePerc?: [number, number, string[]?];
                    ROE?: [number, number];
                    ROA?: [number, number];
                    currentRatio?: [number, number];
                    assetsCurrent?: [number, number];
                    liabilitiesCurrent?: [number, number];
                    debtCurrent?: [number, number];
                    cashAndEq?: [number, number];
                    freeCashFlow?: [number, number];
                    profitMargin?: [number, number];
                    grossMargin?: [number, number];
                    debtEquity?: [number, number];
                    bookVal?: [number, number];
                    EV?: [number, number];
                    RSI?: [number, number];
                    Gap?: [number, number];
                    IV?: [number, number];
                } | null;
                if (!screenerData) {
                    logger.warn({
                        msg: 'Screener data not found',
                        user: user,
                        screenerName,
                        context: 'GET /screener/:user/results/filtered/:name',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Screener data not found' });
                }

                // Extract filters from screenerData (same as before)
                const screenerFilters: Record<string, any> = {};

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
                const query: any = { Symbol: { $nin: hiddenSymbols } };

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

                const usersCollection2 = db.collection('Users');
                const userDoc2 = await usersCollection2.findOne({ Username: user });
                // Add index signature to projection for dynamic keys
                const projection: { [key: string]: any } = { Symbol: 1, _id: 0 };
                if (Array.isArray(userDoc.Table)) {
                    userDoc.Table.forEach((key: string) => {
                        if (fieldMap[key]) {
                            if (key === 'price') {
                                // We'll fetch price from OHCLVData1m later
                            } else if (key === 'volume') {
                                // We'll fetch volume from OHCLVData after market close
                            } else if ([
                                'fcf', 'cash', 'current_debt', 'current_assets', 'current_liabilities', 'current_ratio', 'roe', 'roa'
                            ].includes(key)) {
                                // Add index signature to qfMap for dynamic keys
                                const qfMap: { [key: string]: string } = {
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
                                    projection[field] = { $ifNull: [{ $getField: { field: field, input: { $arrayElemAt: ['$quarterlyFinancials', 0] } } }, null] };
                                }
                            } else {
                                projection[fieldMap[key]] = 1;
                            }
                        }
                    });
                }

                // Pagination parameters
                let page = parseInt(String(req.query.page), 10) || 1;
                let limit = parseInt(String(req.query.limit), 10) || 100;
                if (limit > 500) limit = 500;
                if (page < 1) page = 1;
                const skip = (page - 1) * limit;

                const assetInfoCollection = db.collection('AssetInfo');
                const totalCount = await assetInfoCollection.countDocuments(query);
                const filteredAssets = await assetInfoCollection.find(
                    query,
                    { projection }
                )
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                // Collections for price and volume
                const ohclvCollection = db.collection('OHCLVData1m');
                const dailyCollection = db.collection('OHCLVData');

                // Build response with price, volume, and todaychange logic
                const assetsWithPriceAndVolume = await Promise.all(filteredAssets.map(async (asset: any) => {
                    let price = null;
                    let volume = null;
                    let volume_message = null;
                    let todaychange = null;

                    // Fetch latest price from OHCLVData1m during market hours, otherwise use daily close
                    let latestCandle = [];
                    try {
                        latestCandle = await ohclvCollection.find({ tickerID: asset.Symbol })
                            .sort({ timestamp: -1 })
                            .limit(1)
                            .toArray();
                        if (latestCandle.length > 0) {
                            price = latestCandle[0].close;
                        }
                    } catch (err: any) {
                        logger.warn('Error fetching OHCLVData1m for symbol', { symbol: asset.Symbol, error: err?.message || String(err) });
                    }

                    if (isMarketHoursUTC()) {
                        volume = null;
                        volume_message = "Intraday volume is unavailable during market hours. Final volume will be available after market close.";
                        // Calculate todaychange using 1m close and previous day close
                        try {
                            const prevDayCandle = await dailyCollection.find({ tickerID: asset.Symbol })
                                .sort({ timestamp: -1 })
                                .limit(1)
                                .toArray();
                            if (latestCandle.length > 0 && prevDayCandle.length > 0 && prevDayCandle[0].close) {
                                const prevClose = prevDayCandle[0].close;
                                todaychange = (price - prevClose) / prevClose;
                            } else {
                                todaychange = null;
                            }
                        } catch (err: any) {
                            logger.warn('Error fetching previous day close for todaychange', { symbol: asset.Symbol, error: err?.message || String(err) });
                            todaychange = null;
                        }
                    } else {
                        try {
                            const dailyCandle = await dailyCollection.find({ tickerID: asset.Symbol })
                                .sort({ timestamp: -1 })
                                .limit(1)
                                .toArray();
                            if (dailyCandle.length > 0) {
                                volume = dailyCandle[0].volume;
                            }
                        } catch (err: any) {
                            logger.warn('Error fetching OHCLVData for volume', { symbol: asset.Symbol, error: err?.message || String(err) });
                        }
                        volume_message = null;
                        todaychange = asset.todaychange !== undefined ? asset.todaychange : null;
                    }

                    return {
                        ...asset,
                        Close: price,
                        Volume: volume,
                        volume_message,
                        todaychange
                    };
                }));

                res.json({
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                    data: assetsWithPriceAndVolume
                });
            } catch (error: any) {
                const errObj = handleError(error, 'GET /screener/:user/results/filtered/:name', {
                    user,
                    screenerName
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeErr: any) {
                        logger.error('Error closing MongoDB client', { error: closeErr?.message || String(closeErr) });
                    }
                }
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
        async (req: Request, res: Response) => {
            let client;
            // Generate requestId for logging
            const requestId = crypto.randomBytes(16).toString('hex');
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /screener/:usernameID/all',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                // Sanitize input
                const usernameId = sanitizeInput(req.params.usernameID);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const screenersCollection = db.collection('Screeners');
                const screeners = await screenersCollection.find({ UsernameID: usernameId, Include: true }).toArray();
                const screenerNames = screeners.map((screener: any) => screener.Name);
                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: usernameId });
                if (!userDoc) {
                    logger.warn({
                        msg: 'User Not Found',
                        usernameID: usernameId,
                        context: 'GET /screener/:usernameID/all',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'User not found' });
                }
                const tickerScreenerMap = new Map();
                const filteredAssetsArray = [];
                for (const screenerName of screenerNames) {
                    try {
                        const assetInfoCollection = db.collection('AssetInfo');
                        const query: { [key: string]: any } = { Symbol: { $nin: userDoc.Hidden } };
                        const aggregation = [];
                        const screenerData = await screenersCollection.findOne({ UsernameID: usernameId, Name: screenerName, Include: true });
                        if (!screenerData) {
                            logger.warn({
                                msg: 'Screener Data Not Found',
                                screenerName: screenerName,
                                context: 'GET /screener/:usernameID/all',
                                statusCode: 404
                            });
                            continue;
                        }

                        // Extract filters from screenerData
                        const screenerFilters: Record<string, any> = {};

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
                        const fieldMap: Record<string, string> = {
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
                        const qfMap: Record<string, string> = {
                            fcf: 'freeCashFlow',
                            cash: 'cashAndEq',
                            current_debt: 'debtCurrent',
                            current_assets: 'assetsCurrent',
                            current_liabilities: 'liabilitiesCurrent',
                            current_ratio: 'currentRatio',
                            roe: 'roe',
                            roa: 'roa'
                        };
                        let projection: Record<string, any> = { Symbol: 1, _id: 0 };
                        if (userDoc && Array.isArray(userDoc.Table)) {
                            userDoc.Table.forEach((key: string) => {
                                if (fieldMap[key]) {
                                    if (key === 'price') {
                                        projection['Close'] = { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] };
                                    } else if (key === 'volume') {
                                        projection['Volume'] = { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "5. volume", input: "$$item.v" } } } }, 0] };
                                    } else if (Object.keys(qfMap).includes(key)) {
                                        const field = qfMap[key];
                                        projection[field] = { $ifNull: [{ $getField: { field, input: { $arrayElemAt: ['$quarterlyFinancials', 0] } } }, null] };
                                    } else {
                                        projection[fieldMap[key]] = 1;
                                    }
                                }
                            });
                        }
                        // Query AssetInfo
                        const filteredAssets = await assetInfoCollection.find(query, { projection }).toArray();
                        // Collections for price and volume
                        const ohclvCollection = db.collection('OHCLVData1m');
                        const dailyCollection = db.collection('OHCLVData');
                        // Market hour logic
                        const isMarketHoursUTC = () => {
                            const now = new Date();
                            const day = now.getUTCDay();
                            const hour = now.getUTCHours();
                            return day >= 1 && day <= 5 && hour >= 13 && hour < 20;
                        };
                        // Enrich assets with price, volume, todaychange
                        const enrichedAssets = await Promise.all(filteredAssets.map(async (asset: any) => {
                            let price = null;
                            let volume = null;
                            let volume_message = null;
                            let todaychange = null;
                            let latestCandle = [];
                            try {
                                latestCandle = await ohclvCollection.find({ tickerID: asset.Symbol }).sort({ timestamp: -1 }).limit(1).toArray();
                                if (latestCandle.length > 0) {
                                    price = latestCandle[0].close;
                                }
                            } catch (err) {
                                logger.warn({ msg: 'Error fetching OHCLVData1m', symbol: asset.Symbol, error: (err as Error).message });
                            }
                            if (isMarketHoursUTC()) {
                                volume = null;
                                volume_message = "Intraday volume is unavailable during market hours. Final volume will be available after market close.";
                                try {
                                    const prevDayCandle = await dailyCollection.find({ tickerID: asset.Symbol }).sort({ timestamp: -1 }).limit(1).toArray();
                                    if (latestCandle.length > 0 && prevDayCandle.length > 0 && prevDayCandle[0].close) {
                                        const prevClose = prevDayCandle[0].close;
                                        todaychange = (price - prevClose) / prevClose;
                                    } else {
                                        todaychange = null;
                                    }
                                } catch (err) {
                                    logger.warn({ msg: 'Error fetching previous day close for todaychange', symbol: asset.Symbol, error: (err as Error).message });
                                    todaychange = null;
                                }
                            } else {
                                try {
                                    const dailyCandle = await dailyCollection.find({ tickerID: asset.Symbol }).sort({ timestamp: -1 }).limit(1).toArray();
                                    if (dailyCandle.length > 0) {
                                        volume = dailyCandle[0].volume;
                                    }
                                } catch (err) {
                                    logger.warn({ msg: 'Error fetching OHCLVData for volume', symbol: asset.Symbol, error: (err as Error).message });
                                }
                                volume_message = null;
                                todaychange = asset.todaychange !== undefined ? asset.todaychange : null;
                            }
                            return {
                                ...asset,
                                Close: price,
                                Volume: volume,
                                volume_message,
                                todaychange
                            };
                        }));

                        enrichedAssets.forEach(asset => {
                            const key = asset.Symbol;
                            if (!tickerScreenerMap.has(key)) {
                                tickerScreenerMap.set(key, []);
                            }
                            tickerScreenerMap.get(key)?.push(screenerName);
                        });
                        filteredAssetsArray.push(...enrichedAssets);
                    } catch (error) {
                        logger.error({
                            msg: 'Error Processing Screener',
                            requestId,
                            screenerName,
                            error: (error as Error).message,
                            context: 'GET /screener/:usernameID/all',
                            statusCode: 500
                        });
                        // Continue to next screener instead of stopping entire process
                        continue;
                    }
                }

                // Existing deduplication logic remains unchanged
                const uniqueFilteredAssetsArray = Array.from(new Set(filteredAssetsArray.map(a => JSON.stringify(a)))).map(a => JSON.parse(a));

                // Add screener information to the unique assets
                const finalResults = uniqueFilteredAssetsArray.map((asset: any) => {
                    const screenerNames = tickerScreenerMap.get(asset.Symbol) || [];
                    return {
                        ...asset,
                        screenerNames: screenerNames,
                        isDuplicate: screenerNames.length > 1,
                        duplicateCount: screenerNames.length // Add this for sorting
                    };
                });

                // Sort: duplicates first, then by how many times they appear (descending)
                finalResults.sort((a: any, b: any) => {
                    // First, sort by duplicate count descending
                    if (b.duplicateCount !== a.duplicateCount) {
                        return b.duplicateCount - a.duplicateCount;
                    }
                    // Optionally, add a secondary sort (e.g., by Symbol)
                    return a.Symbol.localeCompare(b.Symbol);
                });

                // Remove duplicateCount from the response if you don't want to expose it
                finalResults.forEach((asset: any) => { delete asset.duplicateCount; });

                // Pagination logic for lazy loading
                let page = parseInt(String(req.query.page), 10) || 1;
                let limit = parseInt(String(req.query.limit), 10) || 100;
                if (limit > 500) limit = 500;
                if (page < 1) page = 1;
                const totalCount = finalResults.length;
                const totalPages = Math.ceil(totalCount / limit);
                const paginatedResults = finalResults.slice((page - 1) * limit, page * limit);

                res.json({
                    page,
                    limit,
                    totalCount,
                    totalPages,
                    data: paginatedResults
                });

            } catch (error) {
                // Use structured error handler from logger.ts
                const { handleError } = require('../utils/logger');
                const errObj = handleError(error, 'GET /screener/:usernameID/all', {
                    requestId,
                    usernameID: req.params.usernameID,
                    error: (error as Error).message
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                // Ensure client is closed
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            error: (closeError as Error).message
                        });
                    }
                }
            }
        }
    );

    // endpoint that updates screener document with price parameters 
    app.patch('/screener/price', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/price',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                let minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                let maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                const screenerName = sanitizeInput(req.body.screenerName || '');
                const Username = sanitizeInput(req.body.user || '');
                if (!screenerName) {
                    logger.warn({
                        msg: 'Screener name is required',
                        context: 'PATCH /screener/price',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    logger.warn({
                        msg: 'Username is required',
                        context: 'PATCH /screener/price',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    logger.warn({
                        msg: 'Both min price and max price cannot be empty',
                        context: 'PATCH /screener/price',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Both min price and max price cannot be empty' });
                }
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
                                const sortedCloseValues = closeValues.map((doc: { close: number }) => doc.close).sort((a: number, b: number) => b - a);
                                maxPrice = sortedCloseValues[0];
                                maxPrice = Math.ceil(maxPrice * 100) / 100;
                            }
                        }
                    }
                    if (minPrice >= maxPrice) {
                        logger.warn({
                            msg: 'Min price cannot be higher than or equal to max price',
                            context: 'PATCH /screener/price',
                            statusCode: 400
                        });
                        return res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
                    }
                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };
                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        logger.warn({
                            msg: 'Screener not found',
                            details: 'No matching screener exists for the given user and name',
                            context: 'PATCH /screener/price',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }
                    const updateDoc = { $set: { Price: [minPrice, maxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });
                    if (!result) {
                        logger.warn({
                            msg: 'Screener not found on update',
                            details: 'No matching screener exists for the given user and name',
                            context: 'PATCH /screener/price',
                            statusCode: 404
                        });
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
                    const errorObj = dbError instanceof Error ? dbError : new Error(String(dbError));
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errorObj.message,
                        stack: errorObj.stack,
                        Username,
                        screenerName,
                        context: 'PATCH /screener/price',
                        statusCode: 500
                    });
                    res.status(500).json({
                        message: 'Database operation failed',
                        error: errorObj.message
                    });
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                            logger.error({
                                msg: 'Error closing database connection',
                                error: closeErr.message,
                                context: 'PATCH /screener/price',
                                statusCode: 500
                            });
                        }
                    }
                }
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error));
                logger.error({
                    msg: 'Price Update Error',
                    error: errorObj.message,
                    stack: errorObj.stack,
                    context: 'PATCH /screener/price',
                    statusCode: 500
                });
                res.status(500).json({
                    message: 'Internal Server Error',
                    error: errorObj.message
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
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/marketcap',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                const maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                const Username = sanitizeInput(req.body.user || '');
                const screenerName = sanitizeInput(req.body.screenerName || '');
                if (!screenerName) {
                    logger.warn({
                        msg: 'Screener name is required',
                        context: 'PATCH /screener/marketcap',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    logger.warn({
                        msg: 'Both min market cap and max market cap cannot be empty',
                        context: 'PATCH /screener/marketcap',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Both min market cap and max market cap cannot be empty' });
                }
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const assetInfoCollection = db.collection('AssetInfo');
                    const collection = db.collection('Screeners');
                    let finalMinPrice = minPrice;
                    if (isNaN(finalMinPrice)) {
                        const lowestMarketCapDoc = await assetInfoCollection.find({
                            MarketCapitalization: { $nin: [null, undefined], $gt: 0 }
                        })
                            .sort({ MarketCapitalization: 1 })
                            .limit(1)
                            .project({ MarketCapitalization: 1 })
                            .toArray();
                        if (lowestMarketCapDoc.length > 0) {
                            finalMinPrice = lowestMarketCapDoc[0].MarketCapitalization;
                        } else {
                            logger.warn({
                                msg: 'No assets found to determine minimum market cap',
                                context: 'PATCH /screener/marketcap',
                                statusCode: 404
                            });
                            return res.status(404).json({ message: 'No assets found to determine minimum market cap' });
                        }
                    }
                    let finalMaxPrice = maxPrice;
                    if (isNaN(finalMaxPrice)) {
                        const highestMarketCapDoc = await assetInfoCollection.find({
                            MarketCapitalization: { $nin: [null, undefined], $gt: 0 }
                        })
                            .sort({ MarketCapitalization: -1 })
                            .limit(1)
                            .project({ MarketCapitalization: 1 })
                            .toArray();
                        if (highestMarketCapDoc.length > 0) {
                            finalMaxPrice = highestMarketCapDoc[0].MarketCapitalization;
                        } else {
                            logger.warn({
                                msg: 'No assets found to determine maximum market cap',
                                context: 'PATCH /screener/marketcap',
                                statusCode: 404
                            });
                            return res.status(404).json({ message: 'No assets found to determine maximum market cap' });
                        }
                    }
                    if (finalMinPrice >= finalMaxPrice) {
                        logger.warn({
                            msg: 'Min market cap cannot be higher than or equal to max market cap',
                            context: 'PATCH /screener/marketcap',
                            statusCode: 400
                        });
                        return res.status(400).json({ message: 'Min market cap cannot be higher than or equal to max market cap' });
                    }
                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };
                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        logger.warn({
                            msg: 'Screener not found',
                            context: 'PATCH /screener/marketcap',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }
                    const updateDoc = { $set: { MarketCap: [finalMinPrice, finalMaxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });
                    if (!result) {
                        logger.warn({
                            msg: 'Unable to update screener',
                            context: 'PATCH /screener/marketcap',
                            statusCode: 404
                        });
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
                } catch (dbError) {
                    const errObj = handleError(dbError, 'PATCH /screener/marketcap', {
                        Username,
                        screenerName
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        Username,
                        screenerName,
                        context: 'PATCH /screener/marketcap',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                            logger.error({
                                msg: 'Error closing database connection',
                                error: closeErr.message,
                                context: 'PATCH /screener/marketcap'
                            });
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /screener/marketcap', {}, 500);
                logger.error({
                    msg: 'Market Cap Update Error',
                    error: errObj.message,
                    context: 'PATCH /screener/marketcap',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
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
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/ipo-date',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const rawMinPrice = sanitizeInput(req.body.minPrice || '');
                const rawMaxPrice = sanitizeInput(req.body.maxPrice || '');
                const Username = sanitizeInput(req.body.user || '');
                const screenerName = sanitizeInput(req.body.screenerName || '');
                const minPrice = rawMinPrice ? new Date(rawMinPrice) : new Date('invalid');
                const maxPrice = rawMaxPrice ? new Date(rawMaxPrice) : new Date('invalid');
                if (!screenerName) {
                    logger.warn({
                        msg: 'Screener name is required',
                        context: 'PATCH /screener/ipo-date',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (isNaN(minPrice.getTime()) && isNaN(maxPrice.getTime())) {
                    logger.warn({
                        msg: 'At least one of min or max IPO date must be provided',
                        context: 'PATCH /screener/ipo-date',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'At least one of min or max IPO date must be provided' });
                }
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const assetInfoCollection = db.collection('AssetInfo');
                    const collection = db.collection('Screeners');
                    let finalMinPrice = minPrice;
                    if (isNaN(finalMinPrice.getTime())) {
                        const oldestIpoDoc = await assetInfoCollection.find({
                            IPO: { $nin: [null, undefined] }
                        })
                            .sort({ IPO: 1 })
                            .limit(1)
                            .project({ IPO: 1 })
                            .toArray();
                        if (oldestIpoDoc.length > 0) {
                            finalMinPrice = new Date(oldestIpoDoc[0].IPO);
                        } else {
                            logger.warn({
                                msg: 'No IPO dates found to determine minimum date',
                                context: 'PATCH /screener/ipo-date',
                                statusCode: 404
                            });
                            return res.status(404).json({ message: 'No IPO dates found to determine minimum date' });
                        }
                    }
                    let finalMaxPrice = maxPrice;
                    if (isNaN(finalMaxPrice.getTime())) {
                        finalMaxPrice = new Date(); // Current date
                    }
                    if (finalMinPrice >= finalMaxPrice) {
                        logger.warn({
                            msg: 'Minimum IPO date cannot be later than or equal to maximum IPO date',
                            context: 'PATCH /screener/ipo-date',
                            statusCode: 400
                        });
                        return res.status(400).json({ message: 'Minimum IPO date cannot be later than or equal to maximum IPO date' });
                    }
                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };
                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        logger.warn({
                            msg: 'Screener not found',
                            context: 'PATCH /screener/ipo-date',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }
                    const updateDoc = { $set: { IPO: [finalMinPrice, finalMaxPrice] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });
                    if (!result) {
                        logger.warn({
                            msg: 'Unable to update screener',
                            context: 'PATCH /screener/ipo-date',
                            statusCode: 404
                        });
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
                } catch (dbError) {
                    const errObj = handleError(dbError, 'PATCH /screener/ipo-date', {
                        Username,
                        screenerName
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        Username,
                        screenerName,
                        context: 'PATCH /screener/ipo-date',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                            logger.error({
                                msg: 'Error closing database connection',
                                error: closeErr.message,
                                context: 'PATCH /screener/ipo-date'
                            });
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /screener/ipo-date', {}, 500);
                logger.error({
                    msg: 'IPO Date Update Error',
                    error: errObj.message,
                    context: 'PATCH /screener/ipo-date',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that handles adding symbol to hidden list for user 
    app.patch('/screener/:user/hidden/:symbol',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.symbolParam('symbol')
        ]),
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/:user/hidden/:symbol',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const symbol = sanitizeInput(req.params.symbol).toUpperCase();
                const Username = sanitizeInput(req.params.user);
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const usersCollection = db.collection('Users');
                    const assetInfoCollection = db.collection('AssetInfo');
                    const assetExists = await assetInfoCollection.findOne({ Symbol: symbol });
                    if (!assetExists) {
                        logger.warn({
                            msg: 'Symbol not found',
                            symbol,
                            context: 'PATCH /screener/:user/hidden/:symbol',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'Symbol not found', symbol });
                    }
                    const userDoc = await usersCollection.findOne({ Username: Username });
                    if (!userDoc) {
                        logger.warn({
                            msg: 'User not found',
                            username: Username,
                            context: 'PATCH /screener/:user/hidden/:symbol',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'User not found', username: obfuscateUsername(Username) });
                    }
                    if (userDoc.Hidden && userDoc.Hidden.includes(symbol)) {
                        logger.warn({
                            msg: 'Symbol already in hidden list',
                            symbol,
                            username: Username,
                            context: 'PATCH /screener/:user/hidden/:symbol',
                            statusCode: 409
                        });
                        return res.status(409).json({ message: 'Symbol already in hidden list', symbol });
                    }
                    const filter = { Username: Username };
                    const updateDoc = { $addToSet: { Hidden: symbol } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json({ message: 'Hidden List updated successfully', symbol });
                } catch (dbError) {
                    const errObj = handleError(dbError, 'PATCH /screener/:user/hidden/:symbol', {
                        Username,
                        symbol
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        Username,
                        symbol,
                        context: 'PATCH /screener/:user/hidden/:symbol',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                            logger.error({
                                msg: 'Error closing database connection',
                                error: closeErr.message,
                                context: 'PATCH /screener/:user/hidden/:symbol'
                            });
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /screener/:user/hidden/:symbol', {}, 500);
                logger.error({
                    msg: 'Hidden List Update Error',
                    error: errObj.message,
                    context: 'PATCH /screener/:user/hidden/:symbol',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that fetches hidden list for user 
    app.get('/screener/results/:user/hidden',
        validate([
            validationSchemas.userParam('user')
        ]),
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /screener/results/:user/hidden',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const username = sanitizeInput(req.params.user);
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const collection = db.collection('Users');
                    const userDoc = await collection.findOne({ Username: username }, {
                        projection: {
                            Hidden: 1,
                            _id: 0
                        }
                    });
                    if (!userDoc) {
                        logger.warn({
                            msg: 'User not found',
                            username: username,
                            context: 'GET /screener/results/:user/hidden',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'User not found', username: obfuscateUsername(username) });
                    }
                    if (!userDoc.Hidden || userDoc.Hidden.length === 0) {
                        return res.json([]);
                    }
                    res.json(userDoc.Hidden);
                } catch (dbError) {
                    const errObj = handleError(dbError, 'GET /screener/results/:user/hidden', {
                        username
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        username,
                        context: 'GET /screener/results/:user/hidden',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                            logger.error({
                                msg: 'Error closing database connection',
                                error: closeErr.message,
                                context: 'GET /screener/results/:user/hidden'
                            });
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'GET /screener/results/:user/hidden', {}, 500);
                logger.error({
                    msg: 'Hidden List Retrieval Error',
                    error: errObj.message,
                    context: 'GET /screener/results/:user/hidden',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that retrieves all screeners' names for user 
    app.get('/screener/:user/names',
        validate([
            validationSchemas.userParam('user')
        ]),
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /screener/:user/names',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const username = sanitizeInput(req.params.user);
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const userDocs = await collection.find({ UsernameID: username }, {
                        projection: {
                            Name: 1,
                            Include: 1,
                            _id: 0
                        }
                    }).toArray();
                    if (userDocs.length > 0) {
                        res.status(200).json(userDocs);
                    } else {
                        logger.warn({
                            msg: 'No screeners found for user',
                            username: username,
                            context: 'GET /screener/:user/names',
                            statusCode: 404
                        });
                        res.status(404).json({
                            message: 'No screeners found for the user',
                            username: username
                        });
                    }
                } catch (dbError) {
                    const errObj = handleError(dbError, 'GET /screener/:user/names', {
                        username
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        username,
                        context: 'GET /screener/:user/names',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                            logger.error({
                                msg: 'Error closing database connection',
                                error: closeErr.message,
                                context: 'GET /screener/:user/names'
                            });
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'GET /screener/:user/names', {}, 500);
                logger.error({
                    msg: 'Screener Names Retrieval Error',
                    error: errObj.message,
                    context: 'GET /screener/:user/names',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that removes ticker from hidden list 
    app.patch('/screener/:user/show/:symbol',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.symbolParam('symbol')
        ]),
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/:user/show/:symbol',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                // Sanitize inputs
                const username = sanitizeInput(req.params.user);
                const symbol = sanitizeInput(req.params.symbol);
                // Validate symbol
                if (!symbol) {
                    logger.warn({
                        msg: 'Show Symbol - Missing Symbol',
                        username: username,
                        context: 'PATCH /screener/:user/show/:symbol',
                        statusCode: 400
                    });
                    return res.status(400).json({
                        message: 'Please provide a valid symbol',
                        username: username
                    });
                }
                try {
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
                        logger.warn({
                            msg: 'Show Symbol - User Not Found or Symbol Not Hidden',
                            username: username,
                            symbol,
                            context: 'PATCH /screener/:user/show/:symbol',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: 'User not found or symbol not in hidden list',
                            username: username,
                            symbol
                        });
                    }
                    // Remove symbol from hidden list
                    const filter = { Username: username };
                    const updateDoc = { $pull: { Hidden: symbol } };
                    const result = await collection.updateOne(filter, updateDoc);
                    // Check if update was successful
                    if (result.modifiedCount === 0) {
                        const errObj = handleError(new Error('Failed to update hidden list'), 'PATCH /screener/:user/show/:symbol', {
                            username: username,
                            symbol
                        }, 500);
                        return res.status(errObj.statusCode || 500).json(errObj);
                    }
                    logger.info({
                        msg: 'Hidden List updated successfully',
                        username: username,
                        symbol,
                        context: 'PATCH /screener/:user/show/:symbol',
                        statusCode: 200
                    });
                    res.status(200).json({
                        message: 'Hidden List updated successfully',
                        username: username,
                        symbol
                    });
                } catch (dbError) {
                    const errObj = handleError(dbError, 'PATCH /screener/:user/show/:symbol', {
                        username: username,
                        symbol
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        username: username,
                        symbol,
                        context: 'PATCH /screener/:user/show/:symbol',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn({
                                msg: 'Error closing database connection',
                                error: (closeError instanceof Error ? closeError.message : String(closeError)),
                                context: 'PATCH /screener/:user/show/:symbol',
                                statusCode: 500
                            });
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /screener/:user/show/:symbol', {}, 500);
                logger.error({
                    msg: 'Remove Hidden Symbol Error',
                    error: errObj.message,
                    username: req.params.user,
                    symbol: sanitizeInput(req.params.symbol),
                    context: 'PATCH /screener/:user/show/:symbol',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that retrieves all available asset types for user (for screener)
    app.get('/screener/asset-type',
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /screener/asset-type',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const assetInfoCollection = db.collection('AssetInfo');
                    // Retrieve distinct asset types
                    const assetTypes = await assetInfoCollection.distinct('AssetType');
                    // Basic type and null/undefined filtering
                    const uniqueAssetTypes = assetTypes
                        .filter((type: string) =>
                            typeof type === 'string' &&
                            type.trim() !== '' &&
                            type !== null &&
                            type !== undefined
                        )
                        .slice(0, 50);
                    logger.info({
                        msg: 'Asset types retrieved successfully',
                        count: uniqueAssetTypes.length,
                        context: 'GET /screener/asset-type',
                        statusCode: 200
                    });
                    res.status(200).json(uniqueAssetTypes);
                } catch (dbError) {
                    const errObj = handleError(dbError, 'GET /screener/asset-type', {}, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        context: 'GET /screener/asset-type',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn({
                                msg: 'Error closing database connection',
                                error: closeError instanceof Error ? closeError.message : String(closeError),
                                context: 'GET /screener/asset-type',
                                statusCode: 500
                            });
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'GET /screener/asset-type', {}, 500);
                logger.error({
                    msg: 'Asset Type Retrieval Error',
                    error: errObj.message,
                    context: 'GET /screener/asset-type',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
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
                    if (!value.every((type: string) =>
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
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/asset-types',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const assetTypes = req.body.assetTypes;
                const Username = req.body.user;
                const screenerName = req.body.screenerName;
                // Sanitize asset types (trim and remove duplicates)
                const sanitizedAssetTypes = [...new Set(
                    assetTypes.map((type: string) => sanitizeInput(type).replace(/&amp;/g, '&'))
                )];
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const filter = {
                        UsernameID: Username,
                        Name: screenerName
                    };
                    const updateDoc = { $set: { AssetTypes: sanitizedAssetTypes } };
                    const options = { returnOriginal: false };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, options);
                    // Check for update success using result itself
                    if (!result) {
                        logger.error({
                            msg: 'Screener not found after update attempt',
                            filter,
                            result,
                            context: 'PATCH /screener/asset-types',
                            statusCode: 404
                        });
                        const errObj = handleError(new Error('Screener not found'), 'PATCH /screener/asset-types', {
                            username: Username,
                            screenerName,
                            filter,
                            result
                        }, 404);
                        return res.status(errObj.statusCode || 404).json(errObj);
                    }
                    res.json({
                        message: 'Asset types updated successfully',
                        assetTypes: sanitizedAssetTypes,
                        updated: true
                    });
                } catch (dbError) {
                    const errObj = handleError(dbError, 'PATCH /screener/asset-types', {
                        username: Username,
                        screenerName
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/asset-types',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn({
                                msg: 'Error closing database connection',
                                error: closeError instanceof Error ? closeError.message : String(closeError),
                                context: 'PATCH /screener/asset-types',
                                statusCode: 500
                            });
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /screener/asset-types', {}, 500);
                logger.error({
                    msg: 'Asset Types Update Error',
                    error: errObj.message,
                    username: req.body.user,
                    context: 'PATCH /screener/asset-types',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that retrieves all available sectors for user (for screener)
    app.get('/screener/sectors',
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /screener/sectors',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const assetInfoCollection = db.collection('AssetInfo');
                    // Retrieve distinct sectors
                    const sectors = await assetInfoCollection.distinct('Sector');
                    // Basic type and null/undefined filtering
                    const uniqueSectors = sectors
                        .filter((sector: string) =>
                            typeof sector === 'string' &&
                            sector.trim() !== '' &&
                            sector !== null &&
                            sector !== undefined
                        )
                        .slice(0, 50); // Optional: limit to 50 sectors to prevent potential DoS
                    res.status(200).json(uniqueSectors);
                } catch (dbError) {
                    const errObj = handleError(dbError, 'GET /screener/sectors', {}, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        context: 'GET /screener/sectors',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn({
                                msg: 'Error closing database connection',
                                error: closeError instanceof Error ? closeError.message : String(closeError),
                                context: 'GET /screener/sectors',
                                statusCode: 500
                            });
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'GET /screener/sectors', {}, 500);
                logger.error({
                    msg: 'Sectors Retrieval Error',
                    error: errObj.message,
                    context: 'GET /screener/sectors',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
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
                    if (!value.every((sector: string) =>
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
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/sectors',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const sectors = req.body.sectors;
                const Username = req.body.user;
                const screenerName = req.body.screenerName;
                // Sanitize sectors (trim and remove duplicates)
                const sanitizedSectors = [...new Set(
                    sectors.map((sector: string) => {
                        // Use sanitizeInput but ensure we don't escape & characters
                        return sanitizeInput(sector).replace(/&amp;/g, '&'); // Replace &amp; back to &
                    })
                )];
                try {
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
                    if (!result) {
                        const errObj = handleError(new Error('Screener not found'), 'PATCH /screener/sectors', {
                            username: Username,
                            screenerName,
                            filter,
                            result
                        }, 404);
                        logger.warn({
                            msg: 'Screener not found',
                            username: Username,
                            screenerName,
                            filter,
                            result,
                            context: 'PATCH /screener/sectors',
                            statusCode: 404
                        });
                        return res.status(errObj.statusCode || 404).json(errObj);
                    }
                    res.json({
                        message: 'Sectors updated successfully',
                        sectors: sanitizedSectors
                    });
                } catch (dbError) {
                    const errObj = handleError(dbError, 'PATCH /screener/sectors', {
                        username: Username,
                        screenerName
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/sectors',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn({
                                msg: 'Error closing database connection',
                                error: closeError instanceof Error ? closeError.message : String(closeError),
                                context: 'PATCH /screener/sectors',
                                statusCode: 500
                            });
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /screener/sectors', {}, 500);
                logger.error({
                    msg: 'Sectors Update Error',
                    error: errObj.message,
                    username: req.body.user,
                    context: 'PATCH /screener/sectors',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that retrieves all available exchanges for user (screener)
    app.get('/screener/exchange',
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /screener/exchange',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const assetInfoCollection = db.collection('AssetInfo');
                    // Retrieve distinct exchanges
                    const exchanges = await assetInfoCollection.distinct('Exchange');
                    // Basic type and null/undefined filtering 
                    const uniqueExchanges = exchanges
                        .filter((exchange: string) =>
                            typeof exchange === 'string' &&
                            exchange.trim() !== '' &&
                            exchange !== null &&
                            exchange !== undefined
                        )
                        .slice(0, 10); // Optional: limit to 10 exchanges to prevent potential DoS 
                    res.status(200).json(uniqueExchanges);
                } catch (dbError) {
                    const errObj = handleError(dbError, 'GET /screener/exchange', {}, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        context: 'GET /screener/exchange',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn({ closeError }, 'Error closing database connection');
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'GET /screener/exchange', {}, 500);
                logger.error({
                    msg: 'Exchange Retrieval Error',
                    error: errObj.message,
                    context: 'GET /screener/exchange',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
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
                    if (!value.every((exchange: string) =>
                        typeof exchange === 'string' &&
                        exchange.trim().length > 0 &&
                        exchange.trim().length <= 10
                    )) {
                        throw new Error('Each exchange must be a non-empty string with max 10 characters');
                    }
                    return true;
                })
        ]),
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/exchange',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const exchanges = req.body.exchanges;
                const Username = req.body.user;
                const screenerName = req.body.screenerName;
                // Sanitize exchanges (trim and remove duplicates)
                const sanitizedExchanges = [...new Set(
                    exchanges.map((exchange: string) => sanitizeInput(exchange))
                )];
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    // Comprehensive debugging of user's screeners
                    const allUserScreeners = await collection.find({
                        UsernameID: Username
                    }).toArray();
                    logger.debug({
                        msg: 'All User Screeners',
                        count: allUserScreeners.length,
                        screenerNames: allUserScreeners.map((s: any) => s.Name),
                        context: 'PATCH /screener/exchange'
                    });
                    const filter = {
                        UsernameID: Username,
                        Name: screenerName
                    };
                    logger.debug({
                        msg: 'Update Filter',
                        filter,
                        context: 'PATCH /screener/exchange'
                    });
                    // Use updateOne with comprehensive logging
                    const updateResult = await collection.updateOne(filter, {
                        $set: { Exchanges: sanitizedExchanges }
                    });
                    logger.debug({
                        msg: 'Update Operation Result',
                        matchedCount: updateResult.matchedCount,
                        modifiedCount: updateResult.modifiedCount,
                        context: 'PATCH /screener/exchange'
                    });
                    if (updateResult.matchedCount === 0) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: {
                                username: Username,
                                screenerName,
                                availableScreeners: allUserScreeners.map((s: any) => s.Name)
                            }
                        });
                    }
                    res.json({
                        message: 'Exchanges updated successfully',
                        exchanges: sanitizedExchanges
                    });
                } catch (dbError) {
                    const errObj = handleError(dbError, 'PATCH /screener/exchange', {
                        username: Username,
                        screenerName
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/exchange',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn({ closeError }, 'Error closing database connection');
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /screener/exchange', {}, 500);
                logger.error({
                    msg: 'Exchanges Update Error',
                    error: errObj.message,
                    username: req.body.user,
                    context: 'PATCH /screener/exchange',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that retrieves all available countries for user (screener)
    app.get('/screener/country',
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /screener/country',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const assetInfoCollection = db.collection('AssetInfo');
                    // Use the `distinct` method to get an array of unique Country values
                    const Country = await assetInfoCollection.distinct('Country');
                    // Remove any null or undefined values from the array
                    const uniqueCountry = Country.filter((country: string) => country !== null && country !== undefined);
                    res.status(200).json(uniqueCountry);
                } catch (dbError) {
                    const errObj = handleError(dbError, 'GET /screener/country', {}, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        context: 'GET /screener/country',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn({ closeError }, 'Error closing database connection');
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'GET /screener/country', {}, 500);
                logger.error({
                    msg: 'Country Retrieval Error',
                    error: errObj.message,
                    context: 'GET /screener/country',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
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
                    if (!value.every((country: string) =>
                        typeof country === 'string' &&
                        country.trim().length > 0 &&
                        country.trim().length <= 50
                    )) {
                        throw new Error('Each country must be a non-empty string with max 50 characters');
                    }
                    return true;
                })
        ]),
        async (req: Request, res: Response) => {
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/country',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const countries = req.body.countries;
                const Username = req.body.user;
                const screenerName = req.body.screenerName;
                // Sanitize countries (trim and remove duplicates)
                const sanitizedCountries = [...new Set(
                    countries.map((country: string) => sanitizeInput(country))
                )];
                try {
                    client = new MongoClient(uri);
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    // Comprehensive debugging of user's screeners
                    const allUserScreeners = await collection.find({
                        UsernameID: Username
                    }).toArray();
                    logger.debug({
                        msg: 'All User Screeners',
                        count: allUserScreeners.length,
                        screenerNames: allUserScreeners.map((s: any) => s.Name),
                        context: 'PATCH /screener/country'
                    });
                    const filter = {
                        UsernameID: Username,
                        Name: screenerName
                    };
                    logger.debug({
                        msg: 'Update Filter',
                        filter,
                        context: 'PATCH /screener/country'
                    });
                    // Use updateOne with comprehensive logging
                    const updateResult = await collection.updateOne(filter, {
                        $set: { Countries: sanitizedCountries }
                    });
                    logger.debug({
                        msg: 'Update Operation Result',
                        matchedCount: updateResult.matchedCount,
                        modifiedCount: updateResult.modifiedCount,
                        context: 'PATCH /screener/country'
                    });
                    if (updateResult.matchedCount === 0) {
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: {
                                username: Username,
                                screenerName,
                                availableScreeners: allUserScreeners.map((s: any) => s.Name)
                            }
                        });
                    }
                    res.json({
                        message: 'Countries updated successfully',
                        countries: sanitizedCountries
                    });
                } catch (dbError) {
                    const errObj = handleError(dbError, 'PATCH /screener/country', {
                        username: Username,
                        screenerName
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/country',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn({ closeError }, 'Error closing database connection');
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /screener/country', {}, 500);
                logger.error({
                    msg: 'Countries Update Error',
                    error: errObj.message,
                    username: req.body.user,
                    context: 'PATCH /screener/country',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
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
        async (req: Request, res: Response) => {
            let minPrice, maxPrice, screenerName, Username;
            let client;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/pe',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
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
                            PERatio: { $nin: ['None', null, undefined], $gt: 0 }
                        })
                            .sort({ PERatio: -1 })
                            .limit(1)
                            .project({ PERatio: 1 })
                            .toArray();
                        if (highestPERatioDoc.length > 0) {
                            maxPrice = highestPERatioDoc[0].PERatio;
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
                    const errObj = handleError(dbError, 'PATCH /screener/pe', {
                        username: Username,
                        screenerName,
                        minPrice,
                        maxPrice
                    }, 500);
                    logger.error({
                        msg: 'Database Operation Error',
                        error: errObj.message,
                        username: Username,
                        screenerName,
                        minPrice,
                        maxPrice,
                        context: 'PATCH /screener/pe',
                        statusCode: 500
                    });
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError) {
                            logger.warn({ closeError }, 'Error closing database connection');
                        }
                    }
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /screener/pe', {}, 500);
                logger.error({
                    msg: 'PE Update Error',
                    error: errObj.message,
                    context: 'PATCH /screener/pe',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        });

    // endpoint that updates screener document with PEG parameters 
    app.patch('/screener/peg', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/peg',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                let minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                let maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                const screenerName = sanitizeInput(req.body.screenerName || '');
                const Username = sanitizeInput(req.body.user || '');
                if (!screenerName) {
                    logger.warn({
                        msg: 'Screener name is required',
                        context: 'PATCH /screener/peg',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    logger.warn({
                        msg: 'Username is required',
                        context: 'PATCH /screener/peg',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    logger.warn({
                        msg: 'Both min PEG and max PEG cannot be empty',
                        context: 'PATCH /screener/peg',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Both min PEG and max PEG cannot be empty' });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const assetInfoCollection = db.collection('AssetInfo');
                if (isNaN(minPrice) && !isNaN(maxPrice)) {
                    minPrice = 1;
                }
                if (isNaN(maxPrice) && !isNaN(minPrice)) {
                    const highestPERDoc = await assetInfoCollection.find({ PEGRatio: { $ne: 'None' } })
                        .sort({ PEGRatio: -1 })
                        .limit(1)
                        .project({ PEGRatio: 1 })
                        .toArray();
                    if (highestPERDoc.length > 0) {
                        maxPrice = highestPERDoc[0].PEGRatio;
                    } else {
                        logger.warn({
                            msg: 'No assets found to determine maximum PEG',
                            context: 'PATCH /screener/peg',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum PEG' });
                    }
                }
                if (minPrice >= maxPrice) {
                    logger.warn({
                        msg: 'Min PEG cannot be higher than or equal to max PEG',
                        context: 'PATCH /screener/peg',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min PEG cannot be higher than or equal to max PEG' });
                }
                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };
                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'No matching screener exists for the given user and name',
                        context: 'PATCH /screener/peg',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }
                const updateDoc = { $set: { PEG: [minPrice, maxPrice] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });
                if (!result) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'Unable to update screener',
                        context: 'PATCH /screener/peg',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }
                res.json({
                    message: 'PEG range updated successfully',
                    updatedScreener: result.value
                });
            } catch (error) {
                let errObj;
                if (typeof error === 'object' && error !== null && 'message' in error) {
                    errObj = handleError(error as Error, 'PATCH /screener/peg', {}, 500);
                } else {
                    errObj = handleError(new Error(String(error)), 'PATCH /screener/peg', {}, 500);
                }
                logger.error({
                    msg: 'PEG Update Error',
                    error: errObj.message,
                    context: 'PATCH /screener/peg',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        let closeErr: Error;
                        if (typeof closeError === 'object' && closeError !== null && 'message' in closeError) {
                            closeErr = closeError as Error;
                        } else {
                            closeErr = new Error(String(closeError));
                        }
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'PATCH /screener/peg'
                        });
                    }
                }
            }
        });

    // endpoint that updates screener document with PEG parameters 
    app.patch('/screener/eps', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/eps',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                let minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                let maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                const screenerName = sanitizeInput(req.body.screenerName || '');
                const Username = sanitizeInput(req.body.user || '');
                if (!screenerName) {
                    logger.warn({
                        msg: 'Screener name is required',
                        context: 'PATCH /screener/eps',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    logger.warn({
                        msg: 'Username is required',
                        context: 'PATCH /screener/eps',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    logger.warn({
                        msg: 'Both min EPS and max EPS cannot be empty',
                        context: 'PATCH /screener/eps',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Both min EPS and max EPS cannot be empty' });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const assetInfoCollection = db.collection('AssetInfo');
                if (isNaN(minPrice) && !isNaN(maxPrice)) {
                    minPrice = 1;
                }
                if (isNaN(maxPrice) && !isNaN(minPrice)) {
                    const highestEPSDoc = await assetInfoCollection.find({
                        EPS: {
                            $ne: 'None',
                            $type: 'number'
                        }
                    })
                        .sort({ EPS: -1 })
                        .limit(1)
                        .project({ EPS: 1 })
                        .toArray();
                    if (highestEPSDoc.length > 0) {
                        maxPrice = highestEPSDoc[0].EPS;
                    } else {
                        logger.warn({
                            msg: 'No assets found to determine maximum EPS',
                            context: 'PATCH /screener/eps',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum EPS' });
                    }
                }
                if (minPrice >= maxPrice) {
                    logger.warn({
                        msg: 'Min EPS cannot be higher than or equal to max EPS',
                        context: 'PATCH /screener/eps',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min EPS cannot be higher than or equal to max EPS' });
                }
                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };
                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'No matching screener exists for the given user and name',
                        context: 'PATCH /screener/eps',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }
                const updateDoc = { $set: { EPS: [minPrice, maxPrice] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });
                if (!result) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'Unable to update screener',
                        context: 'PATCH /screener/eps',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }
                res.json({
                    message: 'EPS range updated successfully',
                    updatedScreener: result.value
                });
            } catch (error) {
                let errObj;
                if (typeof error === 'object' && error !== null && 'message' in error) {
                    errObj = handleError(error as Error, 'PATCH /screener/eps', {}, 500);
                } else {
                    errObj = handleError(new Error(String(error)), 'PATCH /screener/eps', {}, 500);
                }
                logger.error({
                    msg: 'EPS Update Error',
                    error: errObj.message,
                    context: 'PATCH /screener/eps',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        let closeErr: Error;
                        if (typeof closeError === 'object' && closeError !== null && 'message' in closeError) {
                            closeErr = closeError as Error;
                        } else {
                            closeErr = new Error(String(closeError));
                        }
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'PATCH /screener/eps'
                        });
                    }
                }
            }
        });

    // endpoint that updates screener document with PS Ratio parameters 
    app.patch('/screener/ps-ratio', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/ps-ratio',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                let minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                let maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                const screenerName = sanitizeInput(req.body.screenerName || '');
                const Username = sanitizeInput(req.body.user || '');
                if (!screenerName) {
                    logger.warn({
                        msg: 'Screener name is required',
                        context: 'PATCH /screener/ps-ratio',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    logger.warn({
                        msg: 'Username is required',
                        context: 'PATCH /screener/ps-ratio',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    logger.warn({
                        msg: 'Both min PS Ratio and max PS Ratio cannot be empty',
                        context: 'PATCH /screener/ps-ratio',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Both min PS Ratio and max PS Ratio cannot be empty' });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const assetInfoCollection = db.collection('AssetInfo');
                if (isNaN(minPrice) && !isNaN(maxPrice)) {
                    minPrice = 1;
                }
                if (isNaN(maxPrice) && !isNaN(minPrice)) {
                    const highestPSRatioDoc = await assetInfoCollection.find({
                        PriceToSalesRatioTTM: {
                            $nin: ['None', '-'],
                            $type: 'number'
                        }
                    })
                        .sort({ PriceToSalesRatioTTM: -1 })
                        .limit(1)
                        .project({ PriceToSalesRatioTTM: 1 })
                        .toArray();
                    if (highestPSRatioDoc.length > 0) {
                        maxPrice = highestPSRatioDoc[0].PriceToSalesRatioTTM;
                    } else {
                        logger.warn({
                            msg: 'No assets found to determine maximum PS Ratio',
                            context: 'PATCH /screener/ps-ratio',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum PS Ratio' });
                    }
                }
                if (minPrice >= maxPrice) {
                    logger.warn({
                        msg: 'Min PS Ratio cannot be higher than or equal to max PS Ratio',
                        context: 'PATCH /screener/ps-ratio',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min PS Ratio cannot be higher than or equal to max PS Ratio' });
                }
                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };
                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'No matching screener exists for the given user and name',
                        context: 'PATCH /screener/ps-ratio',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }
                const updateDoc = { $set: { PS: [minPrice, maxPrice] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });
                if (!result) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'Unable to update screener',
                        context: 'PATCH /screener/ps-ratio',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }
                res.json({
                    message: 'Price to Sales Ratio range updated successfully',
                    updatedScreener: result.value
                });
            } catch (error) {
                let errObj;
                if (typeof error === 'object' && error !== null && 'message' in error) {
                    errObj = handleError(error as Error, 'PATCH /screener/ps-ratio', {}, 500);
                } else {
                    errObj = handleError(new Error(String(error)), 'PATCH /screener/ps-ratio', {}, 500);
                }
                logger.error({
                    msg: 'PS Ratio Update Error',
                    error: errObj.message,
                    context: 'PATCH /screener/ps-ratio',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        let closeErr: Error;
                        if (typeof closeError === 'object' && closeError !== null && 'message' in closeError) {
                            closeErr = closeError as Error;
                        } else {
                            closeErr = new Error(String(closeError));
                        }
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'PATCH /screener/ps-ratio'
                        });
                    }
                }
            }
        });

    // endpoint that updates screener document with PB Ratio parameters 
    app.patch('/screener/pb-ratio', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/pb-ratio',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                let minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                let maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                const screenerName = sanitizeInput(req.body.screenerName || '');
                const Username = sanitizeInput(req.body.user || '');
                if (!screenerName) {
                    logger.warn({
                        msg: 'Screener name is required',
                        context: 'PATCH /screener/pb-ratio',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    logger.warn({
                        msg: 'Username is required',
                        context: 'PATCH /screener/pb-ratio',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    logger.warn({
                        msg: 'Both min PB Ratio and max PB Ratio cannot be empty',
                        context: 'PATCH /screener/pb-ratio',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Both min PB Ratio and max PB Ratio cannot be empty' });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const assetInfoCollection = db.collection('AssetInfo');
                if (isNaN(minPrice) && !isNaN(maxPrice)) {
                    minPrice = 1;
                }
                if (isNaN(maxPrice) && !isNaN(minPrice)) {
                    const highestPBRatioDoc = await assetInfoCollection.find({
                        PriceToBookRatio: {
                            $nin: ['None', '-'],
                            $type: 'number'
                        }
                    })
                        .sort({ PriceToBookRatio: -1 })
                        .limit(1)
                        .project({ PriceToBookRatio: 1 })
                        .toArray();
                    if (highestPBRatioDoc.length > 0) {
                        maxPrice = highestPBRatioDoc[0].PriceToBookRatio;
                    } else {
                        logger.warn({
                            msg: 'No assets found to determine maximum PB Ratio',
                            context: 'PATCH /screener/pb-ratio',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum PB Ratio' });
                    }
                }
                if (minPrice >= maxPrice) {
                    logger.warn({
                        msg: 'Min PB Ratio cannot be higher than or equal to max PB Ratio',
                        context: 'PATCH /screener/pb-ratio',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min PB Ratio cannot be higher than or equal to max PB Ratio' });
                }
                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };
                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'No matching screener exists for the given user and name',
                        context: 'PATCH /screener/pb-ratio',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }
                const updateDoc = { $set: { PB: [minPrice, maxPrice] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });
                if (!result) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'Unable to update screener',
                        context: 'PATCH /screener/pb-ratio',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }
                res.json({
                    message: 'Price to Book Ratio range updated successfully',
                    updatedScreener: result.value
                });
            } catch (error) {
                let errObj;
                if (typeof error === 'object' && error !== null && 'message' in error) {
                    errObj = handleError(error as Error, 'PATCH /screener/pb-ratio', {}, 500);
                } else {
                    errObj = handleError(new Error(String(error)), 'PATCH /screener/pb-ratio', {}, 500);
                }
                logger.error({
                    msg: 'PB Ratio Update Error',
                    error: errObj.message,
                    context: 'PATCH /screener/pb-ratio',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        let closeErr: Error;
                        if (typeof closeError === 'object' && closeError !== null && 'message' in closeError) {
                            closeErr = closeError as Error;
                        } else {
                            closeErr = new Error(String(closeError));
                        }
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'PATCH /screener/pb-ratio'
                        });
                    }
                }
            }
        });

    // endpoint that updates screener document with dividend yield parameters 
    app.patch('/screener/div-yield', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/div-yield',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                let minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) / 100 : NaN;
                let maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) / 100 : NaN;
                const screenerName = sanitizeInput(req.body.screenerName || '');
                const Username = sanitizeInput(req.body.user || '');
                if (!screenerName) {
                    logger.warn({
                        msg: 'Screener name is required',
                        context: 'PATCH /screener/div-yield',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    logger.warn({
                        msg: 'Username is required',
                        context: 'PATCH /screener/div-yield',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minPrice) && isNaN(maxPrice)) {
                    logger.warn({
                        msg: 'Both min and max Dividend Yield cannot be empty',
                        context: 'PATCH /screener/div-yield',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Both min and max Dividend Yield cannot be empty' });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const assetInfoCollection = db.collection('AssetInfo');
                let effectiveMinPrice = isNaN(minPrice) ? 0.001 : minPrice;
                let effectiveMaxPrice = maxPrice;
                if (isNaN(maxPrice)) {
                    const highestDividendYieldDoc = await assetInfoCollection.find({
                        DividendYield: {
                            $nin: ['None', '-'],
                            $exists: true,
                            $type: 'number'
                        }
                    })
                        .sort({ DividendYield: -1 })
                        .limit(1)
                        .project({ DividendYield: 1 })
                        .toArray();
                    if (highestDividendYieldDoc.length > 0) {
                        effectiveMaxPrice = highestDividendYieldDoc[0].DividendYield;
                    } else {
                        logger.warn({
                            msg: 'No assets found to determine maximum Dividend Yield',
                            context: 'PATCH /screener/div-yield',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum Dividend Yield' });
                    }
                }
                if (effectiveMinPrice >= effectiveMaxPrice) {
                    logger.warn({
                        msg: 'Minimum Dividend Yield cannot be higher than or equal to maximum Dividend Yield',
                        details: {
                            minDividendYield: effectiveMinPrice,
                            maxDividendYield: effectiveMaxPrice
                        },
                        context: 'PATCH /screener/div-yield',
                        statusCode: 400
                    });
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
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'No matching screener exists for the given user and name',
                        context: 'PATCH /screener/div-yield',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }
                const updateDoc = { $set: { DivYield: [effectiveMinPrice, effectiveMaxPrice] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });
                if (!result) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'Unable to update screener',
                        context: 'PATCH /screener/div-yield',
                        statusCode: 404
                    });
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
            } catch (error) {
                let errObj;
                if (typeof error === 'object' && error !== null && 'message' in error) {
                    errObj = handleError(error as Error, 'PATCH /screener/div-yield', {}, 500);
                } else {
                    errObj = handleError(new Error(String(error)), 'PATCH /screener/div-yield', {}, 500);
                }
                logger.error({
                    msg: 'Dividend Yield Update Error',
                    error: errObj.message,
                    context: 'PATCH /screener/div-yield',
                    statusCode: 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        let closeErr: Error;
                        if (typeof closeError === 'object' && closeError !== null && 'message' in closeError) {
                            closeErr = closeError as Error;
                        } else {
                            closeErr = new Error(String(closeError));
                        }
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'PATCH /screener/div-yield'
                        });
                    }
                }
            }
        });

    //endpoint is supposed to update document with growth % 
    app.patch('/screener/fundamental-growth', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
    ]), async (req: Request, res: Response) => {
        let client: any;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/fundamental-growth',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const screenerName = sanitizeInput(req.body.screenerName || '');
            const Username = sanitizeInput(req.body.user || '');
            if (!screenerName) {
                logger.warn({
                    msg: 'Screener name is required',
                    context: 'PATCH /screener/fundamental-growth',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                logger.warn({
                    msg: 'Username is required',
                    context: 'PATCH /screener/fundamental-growth',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username is required' });
            }
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const collection = db.collection('Screeners');
            const assetInfoCollection = db.collection('AssetInfo');
            // Use index signature for dynamic keys
            const updateDoc: { $set: Record<string, [number, number]> } = { $set: {} };
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
                if (min === null && max === null) {
                    continue;
                }
                const sanitizedMin = min !== null ? parseFloat(sanitizeInput(min.toString())) : null;
                const sanitizedMax = max !== null ? parseFloat(sanitizeInput(max.toString())) : null;
                // If min value is empty and max value is filled
                if (sanitizedMin === null && sanitizedMax !== null) {
                    const lowestDoc = await assetInfoCollection.find({
                        [attribute]: {
                            $nin: ['None', '-'],
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
                        logger.warn({
                            msg: `No assets found to determine minimum ${attribute}`,
                            details: `Unable to find valid ${attribute} values`,
                            context: 'PATCH /screener/fundamental-growth',
                            statusCode: 404
                        });
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
                            $nin: ['None', '-'],
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
                        logger.warn({
                            msg: `No assets found to determine maximum ${attribute}`,
                            details: `Unable to find valid ${attribute} values`,
                            context: 'PATCH /screener/fundamental-growth',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: `No assets found to determine maximum ${attribute}`,
                            details: `Unable to find valid ${attribute} values`
                        });
                    }
                }
                // If both values are provided
                if (sanitizedMin !== null && sanitizedMax !== null) {
                    if (sanitizedMin / 100 >= sanitizedMax / 100) {
                        logger.warn({
                            msg: `Invalid ${attribute} range`,
                            details: `Minimum ${attribute} must be less than maximum ${attribute}`,
                            context: 'PATCH /screener/fundamental-growth',
                            statusCode: 400
                        });
                        return res.status(400).json({
                            message: `Invalid ${attribute} range`,
                            details: `Minimum ${attribute} must be less than maximum ${attribute}`
                        });
                    }
                    updateDoc.$set[attribute] = [sanitizedMin / 100, sanitizedMax / 100];
                }
            }
            const filter = {
                UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
            };
            const existingScreener = await collection.findOne(filter);
            if (!existingScreener) {
                logger.warn({
                    msg: 'Screener not found',
                    details: 'No matching screener exists for the given user and name',
                    context: 'PATCH /screener/fundamental-growth',
                    statusCode: 404
                });
                return res.status(404).json({
                    message: 'Screener not found',
                    details: 'No matching screener exists for the given user and name'
                });
            }
            const result = await collection.findOneAndUpdate(
                filter,
                updateDoc,
                { returnOriginal: false }
            );
            if (!result) {
                logger.warn({
                    msg: 'Screener update failed',
                    details: 'Unable to update screener document',
                    context: 'PATCH /screener/fundamental-growth',
                    statusCode: 404
                });
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
            let errObj;
            if (typeof error === 'object' && error !== null && 'message' in error) {
                errObj = handleError(error as Error, 'PATCH /screener/fundamental-growth', {}, 500);
            } else {
                errObj = handleError(new Error(String(error)), 'PATCH /screener/fundamental-growth', {}, 500);
            }
            logger.error({
                msg: 'Fundamental Growth Update Error',
                error: errObj.message,
                context: 'PATCH /screener/fundamental-growth',
                statusCode: 500
            });
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    let closeErr: Error;
                    if (typeof closeError === 'object' && closeError !== null && 'message' in closeError) {
                        closeErr = closeError as Error;
                    } else {
                        closeErr = new Error(String(closeError));
                    }
                    logger.error({
                        msg: 'Error closing database connection',
                        error: closeErr.message,
                        context: 'PATCH /screener/fundamental-growth'
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
        validationSchemas.averageVolumeOption(),
        ...validationSchemas.volumeValues()
    ]), async (req: Request, res: Response) => {
        let client: any;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/volume',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const value1 = req.body.value1 ? Math.max(parseFloat(sanitizeInput(req.body.value1.toString())), 0.1) : null;
            const value2 = req.body.value2 ? parseFloat(sanitizeInput(req.body.value2.toString())) : null;
            const value3 = req.body.value3 ? Math.max(parseFloat(sanitizeInput(req.body.value3.toString())), 1) : null;
            const value4 = req.body.value4 ? parseFloat(sanitizeInput(req.body.value4.toString())) : null;
            const relVolOption = sanitizeInput(req.body.relVolOption);
            const avgVolOption = sanitizeInput(req.body.avgVolOption);
            const screenerName = sanitizeInput(req.body.screenerName);
            const Username = sanitizeInput(req.body.user);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const screenersCollection = db.collection('Screeners');
            const assetInfoCollection = db.collection('AssetInfo');
            const filter = { UsernameID: Username, Name: screenerName };
            // Use index signature for dynamic keys
            const updateDoc: Record<string, [number | null, number | null]> = {};
            async function getMaxValue(attribute: string): Promise<number | null> {
                const result = await assetInfoCollection.aggregate([
                    { $group: { _id: null, value: { $max: `$${attribute}` } } }
                ]).toArray();
                return result[0]?.value ?? null;
            }
            // Process Relative Volume
            if (relVolOption !== '-') {
                const relVolAttributeName = `RelVolume${relVolOption}`;
                let relVolValues: [number | null, number | null] = [value1, value2];
                if (value1 !== null && value2 === null) {
                    const maxValue = await getMaxValue(relVolAttributeName);
                    relVolValues[1] = maxValue;
                } else if (value1 === null && value2 !== null) {
                    relVolValues[0] = 0.1;
                }
                if (relVolValues[0] !== null || relVolValues[1] !== null) {
                    updateDoc[relVolAttributeName] = relVolValues;
                }
            }
            // Process Average Volume
            if (avgVolOption !== '-') {
                const avgVolAttributeName = `AvgVolume${avgVolOption}`;
                let avgVolValues: [number | null, number | null] = [value3, value4];
                if (value3 !== null && value4 === null) {
                    const maxValue = await getMaxValue(avgVolAttributeName);
                    avgVolValues[1] = maxValue;
                } else if (value3 === null && value4 !== null) {
                    avgVolValues[0] = 1;
                }
                if (avgVolValues[0] !== null || avgVolValues[1] !== null) {
                    updateDoc[avgVolAttributeName] = avgVolValues;
                }
            }
            if (Object.keys(updateDoc).length === 0) {
                logger.info({
                    msg: 'No updates to apply',
                    context: 'PATCH /screener/volume',
                    statusCode: 200
                });
                return res.status(200).json({ message: 'No updates to apply' });
            }
            const options = { returnOriginal: false };
            const result = await screenersCollection.findOneAndUpdate(filter, { $set: updateDoc }, options);
            if (!result) {
                logger.warn({
                    msg: 'Screener not found',
                    username: Username,
                    screenerName,
                    context: 'PATCH /screener/volume',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Screener not found' });
            }
            res.json({ message: 'Document updated successfully', updatedFields: Object.keys(updateDoc) });
        } catch (error) {
            let errObj;
            if (typeof error === 'object' && error !== null && 'message' in error) {
                errObj = handleError(error as Error, 'PATCH /screener/volume', {}, 500);
            } else {
                errObj = handleError(new Error(String(error)), 'PATCH /screener/volume', {}, 500);
            }
            logger.error({
                msg: 'Error updating screener',
                error: errObj.message,
                username: typeof req.body.user === 'string' ? req.body.user : '',
                screenerName: typeof req.body.screenerName === 'string' ? req.body.screenerName : '',
                context: 'PATCH /screener/volume',
                statusCode: 500
            });
            res.status(errObj.statusCode || 500).json({ message: 'Internal Server Error', error: errObj.message });
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    let closeErr: Error;
                    if (typeof closeError === 'object' && closeError !== null && 'message' in closeError) {
                        closeErr = closeError as Error;
                    } else {
                        closeErr = new Error(String(closeError));
                    }
                    logger.error({
                        msg: 'Error closing database connection',
                        error: closeErr.message,
                        context: 'PATCH /screener/volume'
                    });
                }
            }
        }
    });

    // endpoint that updates screener document with RS Score parameters 
    app.patch('/screener/rs-score', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.rsScore()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let Username = '';
        let screenerName = '';
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/rs-score',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Sanitize and parse inputs
            const value1 = req.body.value1 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value1.toString())), 1), 100) : null;
            const value2 = req.body.value2 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value2.toString())), 1), 100) : null;
            const value3 = req.body.value3 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value3.toString())), 1), 100) : null;
            const value4 = req.body.value4 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value4.toString())), 1), 100) : null;
            const value5 = req.body.value5 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value5.toString())), 1), 100) : null;
            const value6 = req.body.value6 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value6.toString())), 1), 100) : null;

            screenerName = sanitizeInput(req.body.screenerName);
            Username = sanitizeInput(req.body.user);
            // Log plain username

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const collection = db.collection('Screeners');
            const filter = { UsernameID: Username, Name: screenerName };
            // Use index signature for dynamic keys
            const updateDoc: { [key: string]: [number, number] } = {};
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
                if (values.some((value) => value !== null)) {
                    const newArray: [number, number] = [
                        values[0] !== null ? values[0]! : defaults[0],
                        values[1] !== null ? values[1]! : defaults[1]
                    ];
                    updateDoc[pair.key] = newArray;
                }
            });
            if (Object.keys(updateDoc).length === 0) {
                return res.status(200).json({ message: 'No RS Score values to update' });
            }
            const options = { returnOriginal: false };
            const result = await collection.findOneAndUpdate(filter, { $set: updateDoc }, options);
            if (!result) {
                logger.warn({
                    msg: 'Screener not found for RS Score update',
                    user: Username,
                    screenerName,
                    context: 'PATCH /screener/rs-score',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Screener not found' });
            }
            res.json({
                message: 'RS Score updated successfully',
                updatedFields: Object.keys(updateDoc)
            });
        } catch (error: unknown) {
            handleError(error, 'PATCH /screener/rs-score', {
                user: Username,
                screenerName: req.body.screenerName
            }, 500);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.warn({
                        msg: 'Error closing database connection',
                        user: Username,
                        error: closeError.message,
                        context: 'PATCH /screener/rs-score',
                        statusCode: 500
                    });
                }
            }
        }
    });

    // endpoint that updates screener document with Average Daily Volatility (ADV) parameters 
    app.patch('/screener/adv', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.ADV(),
    ]), async (req: Request, res: Response) => {
        let client: any;
        let Username = '';
        let screenerName = '';
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/adv',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
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

            screenerName = sanitizeInput(req.body.screenerName);
            Username = sanitizeInput(req.body.user);

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const assetInfoCollection = db.collection('AssetInfo');
            const screenersCollection = db.collection('Screeners');
            const maxValues = await assetInfoCollection.aggregate([
                { $group: { _id: null, ADV1M: { $max: '$ADV1M' }, ADV1W: { $max: '$ADV1W' }, ADV1Y: { $max: '$ADV1Y' }, ADV4M: { $max: '$ADV4M' } } }
            ]).toArray();
            const filter = { UsernameID: Username, Name: screenerName };
            const updateDoc: { $set: Record<string, number[]> } = { $set: {} };
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
                if (values.some((value) => value !== null && !isNaN(value))) {
                    const max = maxValues[0][attribute];
                    const newArray = values.map((value, index) => value !== null && !isNaN(value) ? value : (index === 0 ? 0.01 : max));
                    updateDoc.$set[pair.key] = newArray;
                }
            });
            if (Object.keys(updateDoc.$set).length === 0) {
                return res.status(200).json({ message: 'No ADV values to update' });
            }
            const options = { returnOriginal: false };
            const result = await screenersCollection.findOneAndUpdate(filter, updateDoc, options);
            if (!result) {
                logger.warn({
                    msg: 'Screener not found for ADV update',
                    user: Username,
                    screenerName,
                    context: 'PATCH /screener/adv',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Screener not found' });
            }
            res.json({
                message: 'ADV updated successfully',
                updatedFields: Object.keys(updateDoc.$set)
            });
        } catch (error: unknown) {
            logger.error({
                msg: 'Error updating ADV',
                error,
                user: Username,
                screenerName,
                context: 'PATCH /screener/adv',
                statusCode: 500
            });
            res.status(500).json({ message: 'Internal Server Error' });
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.warn({
                        msg: 'Error closing database connection',
                        user: Username,
                        error: closeError instanceof Error ? closeError.message : String(closeError),
                        context: 'PATCH /screener/adv',
                        statusCode: 500
                    });
                }
            }
        }
    });

    // endpoint that updates screener document with price peformance parameters 
    app.patch('/screener/price-performance', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.pricePerformanceValues()
    ]), async (req: Request, res: Response) => {
        let client: any;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    username: req.body.user,
                    context: 'PATCH /screener/price-performance',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
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

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const collection = db.collection('Screeners');
            const assetInfoCollection = db.collection('AssetInfo');
            const filter = { UsernameID: Username, Name: screenerName };
            const updateDoc: { $set: Record<string, any> } = { $set: {} };

            // New logic for changePerc
            if (value1 !== null || value2 !== null) {
                updateDoc.$set.changePerc = [];
                if (value1 === null && value2 !== null) {
                    updateDoc.$set.changePerc.push(0.01);
                    updateDoc.$set.changePerc.push(value2);
                } else if (value1 !== null && value2 === null) {
                    updateDoc.$set.changePerc.push(value1);
                    let attributeToCheck: string;
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
            if (!result) {
                logger.warn({
                    msg: 'Screener not found for price performance update',
                    username: Username,
                    screenerName: screenerName,
                    context: 'PATCH /screener/price-performance',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Screener not found' });
            }
            res.json({
                message: 'Price performance updated successfully',
                updatedFields: Object.keys(updateDoc.$set)
            });
        } catch (error: any) {
            const errObj = handleError(error, 'PATCH /screener/price-performance', { username: req.body.user }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                    logger.error({
                        msg: 'Error closing database connection',
                        error: closeErr.message,
                        username: req.body.user,
                        context: 'PATCH /screener/price-performance'
                    });
                }
            }
        }
    });

    app.patch('/screener/roe', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/roe',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                // Sanitize inputs
                let minROE = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                let maxROE = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                const screenerName = sanitizeInput(req.body.screenerName || '');
                const Username = sanitizeInput(req.body.user || '');

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

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const assetInfoCollection = db.collection('AssetInfo');

                // Set default minROE to minimum ROE if it is not provided
                if (isNaN(minROE) && !isNaN(maxROE)) {
                    const minROEDoc = await assetInfoCollection.aggregate([
                        { $project: { roe: { $ifNull: [{ $first: "$quarterlyFinancials.roe" }, null] } } },
                        { $match: { roe: { $ne: null } } },
                        { $group: { _id: null, minROE: { $min: "$roe" } } }
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
                        { $project: { roe: { $ifNull: [{ $first: "$quarterlyFinancials.roe" }, null] } } },
                        { $match: { roe: { $ne: null } } },
                        { $group: { _id: null, maxROE: { $max: "$roe" } } }
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

            } catch (error: any) {
                const errObj = handleError(error, 'PATCH /screener/roe', {
                    username: req.body.user,
                    screenerName: req.body.screenerName
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: any) {
                        logger.warn({
                            msg: 'Error closing database connection',
                            error: closeError.message,
                            context: 'PATCH /screener/roe'
                        });
                    }
                }
            }
        });

    app.patch('/screener/roa', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/roa',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                // Sanitize inputs
                let minROA = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                let maxROA = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                const screenerName = sanitizeInput(req.body.screenerName || '');
                const Username = sanitizeInput(req.body.user || '');

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

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const assetInfoCollection = db.collection('AssetInfo');

                // Set default minROA to minimum ROA if it is not provided
                if (isNaN(minROA) && !isNaN(maxROA)) {
                    const minROADoc = await assetInfoCollection.aggregate([
                        { $project: { roa: { $ifNull: [{ $first: "$quarterlyFinancials.roa" }, null] } } },
                        { $match: { roa: { $ne: null } } },
                        { $group: { _id: null, minROA: { $min: "$roa" } } }
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
                        { $project: { roa: { $ifNull: [{ $first: "$quarterlyFinancials.roa" }, null] } } },
                        { $match: { roa: { $ne: null } } },
                        { $group: { _id: null, maxROA: { $max: "$roa" } } }
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

            } catch (error: any) {
                const errObj = handleError(error, 'PATCH /screener/roa', {
                    username: req.body.user,
                    screenerName: req.body.screenerName
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: any) {
                        logger.warn({
                            msg: 'Error closing database connection',
                            error: closeError.message,
                            context: 'PATCH /screener/roa'
                        });
                    }
                }
            }
        });

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
        async (req: Request, res: Response) => {
            const requestId = crypto.randomBytes(16).toString('hex');
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /:user/toggle/screener/:list',
                        statusCode: 401,
                        requestId
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                // Sanitize inputs
                const user = sanitizeInput(req.params.user);
                const list = sanitizeInput(req.params.list);

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                const filter = { Name: list, UsernameID: user };
                const screener = await collection.findOne(filter);

                if (!screener) {
                    logger.warn({
                        msg: 'Screener Not Found',
                        requestId,
                        username: user,
                        screenerName: list,
                        context: 'PATCH /:user/toggle/screener/:list',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Screener not found' });
                }

                // Toggle the Include attribute
                const updatedIncludeValue = !screener.Include;

                // Update the document in the database
                const updateResult = await collection.updateOne(filter, {
                    $set: { Include: updatedIncludeValue }
                });

                if (updateResult.modifiedCount === 0) {
                    logger.error({
                        msg: 'Failed to Update Screener',
                        requestId,
                        username: user,
                        screenerName: list,
                        context: 'PATCH /:user/toggle/screener/:list',
                        statusCode: 500
                    });
                    return res.status(500).json({ message: 'Failed to update screener' });
                }

                res.status(200).json({
                    message: 'Screener updated successfully',
                    Include: updatedIncludeValue,
                    requestId
                });

            } catch (error: any) {
                const errObj = handleError(error, 'PATCH /:user/toggle/screener/:list', {
                    username: req.params.user,
                    screenerName: req.params.list,
                    requestId
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: any) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            requestId,
                            error: closeError.message,
                            context: 'PATCH /:user/toggle/screener/:list'
                        });
                    }
                }
            }
        }
    );

    // Full Reset screener parameters 
    app.patch('/screener/reset/:user/:name',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.screenerNameParam()
        ]),
        async (req: Request, res: Response) => {
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        username: req.params.user,
                        context: 'PATCH /screener/reset/:user/:name',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                // Sanitize input parameters
                const UsernameID = sanitizeInput(req.params.user);
                const Name = sanitizeInput(req.params.name);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                const filter = { UsernameID: UsernameID, Name: Name };
                logger.debug('Resetting screener parameters', {
                    username: UsernameID,
                    screenerName: Name
                });

                const updateDoc: { $set: Record<string, any>, $unset: Record<string, any> } = {
                    $set: {
                        UsernameID: UsernameID,
                        Name: Name,
                    },
                    $unset: {}
                };

                // Find existing fields to unset
                const fields = await collection.findOne(filter, { projection: { _id: 0 } });

                if (!fields) {
                    logger.warn({
                        msg: 'Screener not found during reset',
                        username: UsernameID,
                        screenerName: Name,
                        context: 'PATCH /screener/reset/:user/:name',
                        statusCode: 404
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
                    logger.warn({
                        msg: 'Screener update failed',
                        username: UsernameID,
                        screenerName: Name,
                        context: 'PATCH /screener/reset/:user/:name',
                        statusCode: 500
                    });
                    res.status(500).json({ message: 'Failed to reset screener parameters' });
                }
            } catch (error: any) {
                const errObj = handleError(error, 'PATCH /screener/reset/:user/:name', { username: req.params.user }, 500);
                res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: any) {
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeError.message,
                            username: req.params.user,
                            context: 'PATCH /screener/reset/:user/:name'
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
                .withMessage('Screener name can only contain letters, numbers, spaces, underscores, and hyphens'),
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
        async (req: Request, res: Response) => {
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        username: req.body.user,
                        context: 'PATCH /reset/screener/param',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                // Sanitize inputs
                const UsernameID = sanitizeInput(req.body.user);
                const Name = sanitizeInput(req.body.Name);
                const value = sanitizeInput(req.body.stringValue);

                logger.info({
                    msg: 'Attempting to reset screener parameter',
                    parameter: value,
                    username: UsernameID,
                    screenerName: Name,
                    context: 'PATCH /reset/screener/param'
                });

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const filter = { UsernameID: UsernameID, Name: Name };
                const updateDoc: { $unset: Record<string, any> } = { $unset: {} };

                switch (value) {
                    case 'price': updateDoc.$unset.Price = ''; break;
                    case 'marketCap': updateDoc.$unset.MarketCap = ''; break;
                    case 'IPO': updateDoc.$unset.IPO = ''; break;
                    case 'Sector': updateDoc.$unset.Sectors = ''; break;
                    case 'AssetType': updateDoc.$unset.AssetTypes = ''; break;
                    case 'Exchange': updateDoc.$unset.Exchanges = ''; break;
                    case 'Country': updateDoc.$unset.Countries = ''; break;
                    case 'PE': updateDoc.$unset.PE = ''; break;
                    case 'ForwardPE': updateDoc.$unset.ForwardPE = ''; break;
                    case 'PEG': updateDoc.$unset.PEG = ''; break;
                    case 'EPS': updateDoc.$unset.EPS = ''; break;
                    case 'PS': updateDoc.$unset.PS = ''; break;
                    case 'PB': updateDoc.$unset.PB = ''; break;
                    case 'Beta': updateDoc.$unset.Beta = ''; break;
                    case 'DivYield': updateDoc.$unset.DivYield = ''; break;
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
                    case 'ROE': updateDoc.$unset.ROE = ''; break;
                    case 'ROA': updateDoc.$unset.ROA = ''; break;
                    case 'CurrentRatio': updateDoc.$unset.currentRatio = ''; break;
                    case 'CurrentAssets': updateDoc.$unset.assetsCurrent = ''; break;
                    case 'CurrentLiabilities': updateDoc.$unset.liabilitiesCurrent = ''; break;
                    case 'CurrentDebt': updateDoc.$unset.debtCurrent = ''; break;
                    case 'CashEquivalents': updateDoc.$unset.cashAndEq = ''; break;
                    case 'FCF': updateDoc.$unset.freeCashFlow = ''; break;
                    case 'ProfitMargin': updateDoc.$unset.profitMargin = ''; break;
                    case 'GrossMargin': updateDoc.$unset.grossMargin = ''; break;
                    case 'DebtEquity': updateDoc.$unset.debtEquity = ''; break;
                    case 'BookValue': updateDoc.$unset.bookVal = ''; break;
                    case 'EV': updateDoc.$unset.EV = ''; break;
                    case 'RSI': updateDoc.$unset.RSI = ''; break;
                    case 'Gap': updateDoc.$unset.Gap = ''; break;
                    case 'IV': updateDoc.$unset.IV = ''; break;
                    default:
                        logger.warn({
                            msg: 'Attempted to reset with unknown parameter',
                            parameter: value,
                            username: UsernameID,
                            screenerName: Name,
                            context: 'PATCH /reset/screener/param',
                            statusCode: 400
                        });
                        return res.status(400).json({ message: `Unknown reset parameter: ${value}` });
                }

                const options = { returnOriginal: false };
                const result = await collection.findOneAndUpdate(filter, updateDoc, options);

                if (result) {
                    res.json({
                        message: 'Parameter reset successfully',
                        resetParameter: value
                    });
                } else {
                    logger.warn({
                        msg: 'No screener found for reset',
                        username: UsernameID,
                        screenerName: Name,
                        context: 'PATCH /reset/screener/param',
                        statusCode: 404
                    });
                    res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to reset parameter'
                    });
                }
            } catch (error: any) {
                const errObj = handleError(error, 'PATCH /reset/screener/param', { username: req.body.user }, 500);
                res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: any) {
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeError.message,
                            username: req.body.user,
                            context: 'PATCH /reset/screener/param'
                        });
                    }
                }
            }
        }
    );

    // Retrieves params from individual screener document
    app.get('/screener/datavalues/:user/:name',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.screenerNameParam(),
        ]),
        async (req: Request, res: Response) => {
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /screener/datavalues/:user/:name',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                const usernameID = sanitizeInput(req.params.user);
                const name = sanitizeInput(req.params.name);

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const screenersCollection = db.collection('Screeners');

                const query = { UsernameID: usernameID, Name: name };
                const projection: Record<string, number> = {
                    Price: 1, MarketCap: 1, Sectors: 1, Exchanges: 1, Countries: 1, PE: 1,
                    ForwardPE: 1, PEG: 1, EPS: 1, PS: 1, PB: 1, Beta: 1, DivYield: 1, EPSQoQ: 1, EPSYoY: 1,
                    EarningsQoQ: 1, EarningsYoY: 1, RevQoQ: 1, RevYoY: 1, AvgVolume1W: 1, AvgVolume1M: 1,
                    AvgVolume6M: 1, AvgVolume1Y: 1, RelVolume1W: 1, RelVolume1M: 1, RelVolume6M: 1, RelVolume1Y: 1,
                    RSScore1W: 1, RSScore1M: 1, RSScore4M: 1, MA10: 1, MA20: 1, MA50: 1, MA200: 1, CurrentPrice: 1, NewHigh: 1, NewLow: 1, PercOffWeekHigh: 1,
                    PercOffWeekLow: 1, changePerc: 1, IPO: 1, ADV1W: 1, ADV1M: 1, ADV4M: 1, ADV1Y: 1, ROE: 1, ROA: 1, currentRatio: 1,
                    assetsCurrent: 1, liabilitiesCurrent: 1, debtCurrent: 1, cashAndEq: 1, freeCashFlow: 1, profitMargin: 1, grossMargin: 1,
                    debtEquity: 1, bookVal: 1, EV: 1, RSI: 1, Gap: 1, AssetType: 1, IV: 1,
                };

                const cursor = screenersCollection.find(query, { projection });
                const result = await cursor.toArray();

                if (result.length === 0) {
                    logger.warn({
                        msg: 'Screener data not found',
                        username: usernameID,
                        screenerName: name,
                        context: 'GET /screener/datavalues/:user/:name',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'No document found',
                        details: 'Screener data could not be retrieved'
                    });
                }

                const document = result[0] as Record<string, any>;
                const response = {
                    Price: document.Price,
                    MarketCap: document.MarketCap,
                    Sectors: document.Sectors,
                    AssetType: document.AssetType,
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
                    IV: document.IV,
                };
                res.status(200).json(response);
            } catch (error: any) {
                const errObj = handleError(error, 'GET /screener/datavalues/:user/:name', {
                    username: req.params.user,
                    screenerName: req.params.name
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: any) {
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeError.message,
                            context: 'GET /screener/datavalues/:user/:name'
                        });
                    }
                }
            }
        }
    );

    // endpoint that sends summary for selected screener
    app.get('/screener/summary/:usernameID/:name',
        validate([
            validationSchemas.userParam2(),
            validationSchemas.screenerNameParam(),
        ]),
        async (req: Request, res: Response) => {
            const requestId = crypto.randomBytes(16).toString('hex');
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /screener/summary/:usernameID/:name',
                        statusCode: 401,
                        requestId
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                // Sanitize input parameters
                const usernameID = sanitizeInput(req.params.usernameID);
                const name = sanitizeInput(req.params.name);

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const screenersCollection = db.collection('Screeners');
                const filter = { UsernameID: usernameID, Name: name };

                logger.debug({
                    msg: 'Executing Database Query',
                    requestId,
                    collection: 'Screeners',
                    filter: { UsernameID: usernameID, Name: name }
                });

                const performanceData = await screenersCollection.findOne(filter);

                if (!performanceData) {
                    logger.warn({
                        msg: 'Screener Summary Not Found',
                        requestId,
                        username: usernameID,
                        screenerName: name,
                        context: 'GET /screener/summary/:usernameID/:name',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Document not found',
                        requestId
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

                const filteredData: Record<string, any> = {};
                for (const attribute of attributes) {
                    if (Object.prototype.hasOwnProperty.call(performanceData, attribute)) {
                        filteredData[attribute] = performanceData[attribute];
                    }
                }

                res.status(200).json(filteredData);
            } catch (error: any) {
                const errObj = handleError(error, 'GET /screener/summary/:usernameID/:name', {
                    username: req.params.usernameID,
                    screenerName: req.params.name,
                    requestId
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: any) {
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeError.message,
                            context: 'GET /screener/summary/:usernameID/:name',
                            requestId
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
        async (req: Request, res: Response) => {
            const requestId = crypto.randomBytes(16).toString('hex');
            let client: any;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /:user/toggle/screener/:list',
                        statusCode: 401,
                        requestId
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                // Sanitize inputs
                const user = sanitizeInput(req.params.user);
                const list = sanitizeInput(req.params.list);

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');

                const filter = { Name: list, UsernameID: user };
                const screener = await collection.findOne(filter);

                if (!screener) {
                    logger.warn({
                        msg: 'Screener Not Found',
                        requestId,
                        username: user,
                        screenerName: list,
                        context: 'PATCH /:user/toggle/screener/:list',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Screener not found' });
                }

                // Toggle the Include attribute
                const updatedIncludeValue = !screener.Include;

                // Update the document in the database
                const updateResult = await collection.updateOne(filter, {
                    $set: { Include: updatedIncludeValue }
                });

                if (updateResult.modifiedCount === 0) {
                    logger.error({
                        msg: 'Failed to Update Screener',
                        requestId,
                        username: user,
                        screenerName: list,
                        context: 'PATCH /:user/toggle/screener/:list',
                        statusCode: 500
                    });
                    return res.status(500).json({ message: 'Failed to update screener' });
                }

                res.status(200).json({
                    message: 'Screener updated successfully',
                    Include: updatedIncludeValue,
                    requestId
                });

            } catch (error: any) {
                const errObj = handleError(error, 'PATCH /:user/toggle/screener/:list', {
                    username: req.params.user,
                    screenerName: req.params.list,
                    requestId
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: any) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            requestId,
                            error: closeError.message,
                            context: 'PATCH /:user/toggle/screener/:list'
                        });
                    }
                }
            }
        }
    );

    app.patch('/screener/current-ratio', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let minCurrentRatio: number, maxCurrentRatio: number, screenerName: string, Username: string;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                const errObj = handleError(
                    new Error('Unauthorized API Access'),
                    'PATCH /screener/current-ratio',
                    { providedApiKey: !!sanitizedKey },
                    401
                );
                return res.status(401).json(errObj);
            }

            // Sanitize inputs
            const minRaw = req.body.minPrice;
            const maxRaw = req.body.maxPrice;
            minCurrentRatio = (minRaw !== undefined && minRaw !== null && minRaw !== '' && !isNaN(Number(minRaw)))
                ? parseFloat(sanitizeInput(minRaw.toString()))
                : 0.01; // hardcoded minimum value
            maxCurrentRatio = (maxRaw !== undefined && maxRaw !== null && maxRaw !== '' && !isNaN(Number(maxRaw)))
                ? parseFloat(sanitizeInput(maxRaw.toString()))
                : NaN;
            screenerName = sanitizeInput(req.body.screenerName || '');
            Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                const errObj = handleError(
                    new Error('Screener name is required'),
                    'PATCH /screener/current-ratio',
                    { username: Username },
                    400
                );
                return res.status(400).json(errObj);
            }
            if (!Username) {
                const errObj = handleError(
                    new Error('Username is required'),
                    'PATCH /screener/current-ratio',
                    { screenerName },
                    400
                );
                return res.status(400).json(errObj);
            }
            if (isNaN(minCurrentRatio) && isNaN(maxCurrentRatio)) {
                const errObj = handleError(
                    new Error('Both min Current Ratio and max Current Ratio cannot be empty'),
                    'PATCH /screener/current-ratio',
                    { username: Username, screenerName },
                    400
                );
                return res.status(400).json(errObj);
            }

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
                        $match: { currentRatio: { $ne: null } },
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
                    const errObj = handleError(
                        new Error('No assets found to determine minimum Current Ratio'),
                        'PATCH /screener/current-ratio',
                        { username: Username, screenerName },
                        404
                    );
                    return res.status(404).json(errObj);
                }
            }

            // If maxCurrentRatio is empty, find the highest Current Ratio
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
                    const errObj = handleError(
                        new Error('No assets found to determine maximum Current Ratio'),
                        'PATCH /screener/current-ratio',
                        { username: Username, screenerName },
                        404
                    );
                    return res.status(404).json(errObj);
                }
            }

            // Ensure minCurrentRatio is less than maxCurrentRatio
            if (minCurrentRatio >= maxCurrentRatio) {
                const errObj = handleError(
                    new Error('Min Current Ratio cannot be higher than or equal to max Current Ratio'),
                    'PATCH /screener/current-ratio',
                    { username: Username, screenerName, minCurrentRatio, maxCurrentRatio },
                    400
                );
                return res.status(400).json(errObj);
            }

            const filter = {
                UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
            };

            const existingScreener = await collection.findOne(filter);
            if (!existingScreener) {
                const errObj = handleError(
                    new Error('Screener not found'),
                    'PATCH /screener/current-ratio',
                    { username: Username, screenerName },
                    404
                );
                return res.status(404).json(errObj);
            }

            const updateDoc: { $set: Record<string, any> } = { $set: { currentRatio: [minCurrentRatio, maxCurrentRatio] } };
            const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

            if (!result) {
                const errObj = handleError(
                    new Error('Unable to update screener'),
                    'PATCH /screener/current-ratio',
                    { username: Username, screenerName },
                    404
                );
                return res.status(404).json(errObj);
            }

            res.json({
                message: 'Current Ratio range updated successfully',
                updatedScreener: result.value
            });

        } catch (error: any) {
            const errObj = handleError(error, 'PATCH /screener/current-ratio', {
                username: req.body.user,
                screenerName: req.body.screenerName
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: any) {
                    logger.warn('Error closing database connection', {
                        error: closeError.message
                    });
                }
            }
        }
    });

    app.patch('/screener/current-assets', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            let minCurrentAssets: number, maxCurrentAssets: number, screenerName: string, Username: string;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    const errObj = handleError(
                        new Error('Unauthorized API Access'),
                        'PATCH /screener/current-assets',
                        { providedApiKey: !!sanitizedKey },
                        401
                    );
                    return res.status(401).json(errObj);
                }

                // Sanitize inputs
                minCurrentAssets = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                maxCurrentAssets = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    const errObj = handleError(
                        new Error('Screener name is required'),
                        'PATCH /screener/current-assets',
                        { username: Username },
                        400
                    );
                    return res.status(400).json(errObj);
                }
                if (!Username) {
                    const errObj = handleError(
                        new Error('Username is required'),
                        'PATCH /screener/current-assets',
                        { screenerName },
                        400
                    );
                    return res.status(400).json(errObj);
                }
                if (isNaN(minCurrentAssets) && isNaN(maxCurrentAssets)) {
                    const errObj = handleError(
                        new Error('Both min Current Assets and max Current Assets cannot be empty'),
                        'PATCH /screener/current-assets',
                        { username: Username, screenerName },
                        400
                    );
                    return res.status(400).json(errObj);
                }

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
                        const errObj = handleError(
                            new Error('No assets found to determine minimum Current Assets'),
                            'PATCH /screener/current-assets',
                            { username: Username, screenerName },
                            404
                        );
                        return res.status(404).json(errObj);
                    }
                }

                // If maxCurrentAssets is empty, find the highest Current Assets
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
                        const errObj = handleError(
                            new Error('No assets found to determine maximum Current Assets'),
                            'PATCH /screener/current-assets',
                            { username: Username, screenerName },
                            404
                        );
                        return res.status(404).json(errObj);
                    }
                }

                // Ensure minCurrentAssets is less than maxCurrentAssets
                if (minCurrentAssets >= maxCurrentAssets) {
                    const errObj = handleError(
                        new Error('Min Current Assets cannot be higher than or equal to max Current Assets'),
                        'PATCH /screener/current-assets',
                        { username: Username, screenerName, minCurrentAssets, maxCurrentAssets },
                        400
                    );
                    return res.status(400).json(errObj);
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    const errObj = handleError(
                        new Error('Screener not found'),
                        'PATCH /screener/current-assets',
                        { username: Username, screenerName },
                        404
                    );
                    return res.status(404).json(errObj);
                }

                const updateDoc: { $set: Record<string, any> } = { $set: { assetsCurrent: [minCurrentAssets, maxCurrentAssets] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    const errObj = handleError(
                        new Error('Unable to update screener'),
                        'PATCH /screener/current-assets',
                        { username: Username, screenerName },
                        404
                    );
                    return res.status(404).json(errObj);
                }

                res.json({
                    message: 'Current Assets range updated successfully',
                    updatedScreener: result.value
                });

            } catch (error) {
                const errObj = handleError(error as any, 'PATCH /screener/current-assets', {
                    username: req.body.user,
                    screenerName: req.body.screenerName
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            error: (closeError as any).message
                        });
                    }
                }
            }
        });

    app.patch('/screener/current-liabilities', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            let minCurrentLiabilities: number, maxCurrentLiabilities: number, screenerName: string, Username: string;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    const errObj = handleError(
                        new Error('Unauthorized API Access'),
                        'PATCH /screener/current-liabilities',
                        { providedApiKey: !!sanitizedKey },
                        401
                    );
                    return res.status(401).json(errObj);
                }

                // Sanitize inputs
                minCurrentLiabilities = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                maxCurrentLiabilities = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    const errObj = handleError(
                        new Error('Screener name is required'),
                        'PATCH /screener/current-liabilities',
                        { username: Username },
                        400
                    );
                    return res.status(400).json(errObj);
                }
                if (!Username) {
                    const errObj = handleError(
                        new Error('Username is required'),
                        'PATCH /screener/current-liabilities',
                        { screenerName },
                        400
                    );
                    return res.status(400).json(errObj);
                }
                if (isNaN(minCurrentLiabilities) && isNaN(maxCurrentLiabilities)) {
                    const errObj = handleError(
                        new Error('Both min Current Liabilities and max Current Liabilities cannot be empty'),
                        'PATCH /screener/current-liabilities',
                        { username: Username, screenerName },
                        400
                    );
                    return res.status(400).json(errObj);
                }

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
                        const errObj = handleError(
                            new Error('No assets found to determine minimum Current Liabilities'),
                            'PATCH /screener/current-liabilities',
                            { username: Username, screenerName },
                            404
                        );
                        return res.status(404).json(errObj);
                    }
                }

                // If maxCurrentLiabilities is empty, find the highest Current Liabilities
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
                        const errObj = handleError(
                            new Error('No assets found to determine maximum Current Liabilities'),
                            'PATCH /screener/current-liabilities',
                            { username: Username, screenerName },
                            404
                        );
                        return res.status(404).json(errObj);
                    }
                }

                // Ensure minCurrentLiabilities is less than maxCurrentLiabilities
                if (minCurrentLiabilities >= maxCurrentLiabilities) {
                    const errObj = handleError(
                        new Error('Min Current Liabilities cannot be higher than or equal to max Current Liabilities'),
                        'PATCH /screener/current-liabilities',
                        { username: Username, screenerName, minCurrentLiabilities, maxCurrentLiabilities },
                        400
                    );
                    return res.status(400).json(errObj);
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    const errObj = handleError(
                        new Error('Screener not found'),
                        'PATCH /screener/current-liabilities',
                        { username: Username, screenerName },
                        404
                    );
                    return res.status(404).json(errObj);
                }

                const updateDoc: { $set: Record<string, any> } = { $set: { liabilitiesCurrent: [minCurrentLiabilities, maxCurrentLiabilities] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    const errObj = handleError(
                        new Error('Unable to update screener'),
                        'PATCH /screener/current-liabilities',
                        { username: Username, screenerName },
                        404
                    );
                    return res.status(404).json(errObj);
                }

                res.json({
                    message: 'Current Liabilities range updated successfully',
                    updatedScreener: result.value
                });

            } catch (error) {
                const errObj = handleError(error as any, 'PATCH /screener/current-liabilities', {
                    username: req.body.user,
                    screenerName: req.body.screenerName
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            error: (closeError as any).message
                        });
                    }
                }
            }
        });

    app.patch('/screener/current-debt', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            let minCurrentDebt: number, maxCurrentDebt: number, screenerName: string, Username: string;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);

                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    const errObj = handleError(
                        new Error('Unauthorized API Access'),
                        'PATCH /screener/current-debt',
                        { providedApiKey: !!sanitizedKey },
                        401
                    );
                    return res.status(401).json(errObj);
                }

                // Sanitize inputs
                minCurrentDebt = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
                maxCurrentDebt = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    const errObj = handleError(
                        new Error('Screener name is required'),
                        'PATCH /screener/current-debt',
                        { username: Username },
                        400
                    );
                    return res.status(400).json(errObj);
                }
                if (!Username) {
                    const errObj = handleError(
                        new Error('Username is required'),
                        'PATCH /screener/current-debt',
                        { screenerName },
                        400
                    );
                    return res.status(400).json(errObj);
                }
                if (isNaN(minCurrentDebt) && isNaN(maxCurrentDebt)) {
                    const errObj = handleError(
                        new Error('Both min Current Debt and max Current Debt cannot be empty'),
                        'PATCH /screener/current-debt',
                        { username: Username, screenerName },
                        400
                    );
                    return res.status(400).json(errObj);
                }

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
                        const errObj = handleError(
                            new Error('No assets found to determine minimum Current Debt'),
                            'PATCH /screener/current-debt',
                            { username: Username, screenerName },
                            404
                        );
                        return res.status(404).json(errObj);
                    }
                }

                // If maxCurrentDebt is empty, find the highest Current Debt
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
                        const errObj = handleError(
                            new Error('No assets found to determine maximum Current Debt'),
                            'PATCH /screener/current-debt',
                            { username: Username, screenerName },
                            404
                        );
                        return res.status(404).json(errObj);
                    }
                }

                // Ensure minCurrentDebt is less than maxCurrentDebt
                if (minCurrentDebt >= maxCurrentDebt) {
                    const errObj = handleError(
                        new Error('Min Current Debt cannot be higher than or equal to max Current Debt'),
                        'PATCH /screener/current-debt',
                        { username: Username, screenerName, minCurrentDebt, maxCurrentDebt },
                        400
                    );
                    return res.status(400).json(errObj);
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    const errObj = handleError(
                        new Error('Screener not found'),
                        'PATCH /screener/current-debt',
                        { username: Username, screenerName },
                        404
                    );
                    return res.status(404).json(errObj);
                }

                const updateDoc: { $set: Record<string, any> } = { $set: { debtCurrent: [minCurrentDebt, maxCurrentDebt] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    const errObj = handleError(
                        new Error('Unable to update screener'),
                        'PATCH /screener/current-debt',
                        { username: Username, screenerName },
                        404
                    );
                    return res.status(404).json(errObj);
                }

                res.json({
                    message: 'Current Debt range updated successfully',
                    updatedScreener: result.value
                });

            } catch (error) {
                const errObj = handleError(error as any, 'PATCH /screener/current-debt', {
                    username: req.body.user,
                    screenerName: req.body.screenerName
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn('Error closing database connection', {
                            error: (closeError as any).message
                        });
                    }
                }
            }
        });

    app.patch('/screener/cash-equivalents', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let minCashEquivalents: number, maxCashEquivalents: number, screenerName: string, Username: string;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/cash-equivalents',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Sanitize inputs
            minCashEquivalents = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
            maxCashEquivalents = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
            screenerName = sanitizeInput(req.body.screenerName || '');
            Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                logger.warn({
                    msg: 'Screener name is required',
                    context: 'PATCH /screener/cash-equivalents',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                logger.warn({
                    msg: 'Username is required',
                    context: 'PATCH /screener/cash-equivalents',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username is required' });
            }
            if (isNaN(minCashEquivalents) && isNaN(maxCashEquivalents)) {
                logger.warn({
                    msg: 'Both min and max Cash Equivalents cannot be empty',
                    context: 'PATCH /screener/cash-equivalents',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Both min Cash Equivalents and max Cash Equivalents cannot be empty' });
            }

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
                            minCashEquivalents = 0.001;
                        }
                    } else {
                        logger.warn({
                            msg: 'No assets found to determine minimum Cash Equivalents',
                            context: 'PATCH /screener/cash-equivalents',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine minimum Cash Equivalents' });
                    }
                }

                // If maxCashEquivalents is empty, find the highest Cash Equivalents
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
                        logger.warn({
                            msg: 'No assets found to determine maximum Cash Equivalents',
                            context: 'PATCH /screener/cash-equivalents',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum Cash Equivalents' });
                    }
                }

                // Ensure minCashEquivalents is less than maxCashEquivalents
                if (minCashEquivalents >= maxCashEquivalents) {
                    logger.warn({
                        msg: 'Min Cash Equivalents cannot be higher than or equal to max Cash Equivalents',
                        context: 'PATCH /screener/cash-equivalents',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min Cash Equivalents cannot be higher than or equal to max Cash Equivalents' });
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };
                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'No matching screener exists for the given user and name',
                        context: 'PATCH /screener/cash-equivalents',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }
                const updateDoc: { $set: Record<string, any> } = { $set: { cashAndEq: [minCashEquivalents, maxCashEquivalents] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });
                if (!result) {
                    logger.warn({
                        msg: 'Unable to update screener',
                        details: 'Screener not found after update',
                        context: 'PATCH /screener/cash-equivalents',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }
                res.json({
                    message: 'Cash Equivalents range updated successfully',
                    updatedScreener: result.value
                });
            } catch (dbError: unknown) {
                const err = dbError instanceof Error ? dbError : new Error(String(dbError));
                logger.error({
                    msg: 'Database Operation Error',
                    error: err.message,
                    stack: err.stack,
                    Username,
                    screenerName,
                    context: 'PATCH /screener/cash-equivalents',
                    statusCode: 500
                });
                res.status(500).json({
                    message: 'Database operation failed',
                    error: err.message
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: unknown) {
                        const err = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: err.message,
                            context: 'PATCH /screener/cash-equivalents',
                            statusCode: 500
                        });
                    }
                }
            }
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /screener/cash-equivalents', {
                username: req.body.user,
                screenerName: req.body.screenerName
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    app.patch('/screener/free-cash-flow', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let minFreeCashFlow: number, maxFreeCashFlow: number, screenerName: string, Username: string;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/free-cash-flow',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Sanitize inputs
            minFreeCashFlow = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
            maxFreeCashFlow = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
            screenerName = sanitizeInput(req.body.screenerName || '');
            Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                logger.warn({
                    msg: 'Screener name is required',
                    context: 'PATCH /screener/free-cash-flow',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                logger.warn({
                    msg: 'Username is required',
                    context: 'PATCH /screener/free-cash-flow',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username is required' });
            }
            if (isNaN(minFreeCashFlow) && isNaN(maxFreeCashFlow)) {
                logger.warn({
                    msg: 'Both min and max Free Cash Flow cannot be empty',
                    context: 'PATCH /screener/free-cash-flow',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Both min Free Cash Flow and max Free Cash Flow cannot be empty' });
            }

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
                            minFreeCashFlow = 0.001;
                        }
                    } else {
                        logger.warn({
                            msg: 'No assets found to determine minimum Free Cash Flow',
                            context: 'PATCH /screener/free-cash-flow',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine minimum Free Cash Flow' });
                    }
                }

                // If maxFreeCashFlow is empty, find the highest Free Cash Flow
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
                        logger.warn({
                            msg: 'No assets found to determine maximum Free Cash Flow',
                            context: 'PATCH /screener/free-cash-flow',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum Free Cash Flow' });
                    }
                }

                // Ensure minFreeCashFlow is less than maxFreeCashFlow
                if (minFreeCashFlow >= maxFreeCashFlow) {
                    logger.warn({
                        msg: 'Min Free Cash Flow cannot be higher than or equal to max Free Cash Flow',
                        context: 'PATCH /screener/free-cash-flow',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min Free Cash Flow cannot be higher than or equal to max Free Cash Flow' });
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };
                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        details: 'No matching screener exists for the given user and name',
                        context: 'PATCH /screener/free-cash-flow',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }
                const updateDoc: { $set: Record<string, any> } = { $set: { freeCashFlow: [minFreeCashFlow, maxFreeCashFlow] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });
                if (!result) {
                    logger.warn({
                        msg: 'Unable to update screener',
                        details: 'Screener not found after update',
                        context: 'PATCH /screener/free-cash-flow',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }
                res.json({
                    message: 'Free Cash Flow range updated successfully',
                    updatedScreener: result.value
                });
            } catch (dbError: unknown) {
                const err = dbError instanceof Error ? dbError : new Error(String(dbError));
                logger.error({
                    msg: 'Database Operation Error',
                    error: err.message,
                    stack: err.stack,
                    Username,
                    screenerName,
                    context: 'PATCH /screener/free-cash-flow',
                    statusCode: 500
                });
                res.status(500).json({
                    message: 'Database operation failed',
                    error: err.message
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: unknown) {
                        const err = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: err.message,
                            context: 'PATCH /screener/free-cash-flow',
                            statusCode: 500
                        });
                    }
                }
            }
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /screener/free-cash-flow', {
                username: req.body.user,
                screenerName: req.body.screenerName
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    app.patch('/screener/profit-margin', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let minProfitMargin: number, maxProfitMargin: number, screenerName: string, Username: string;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/profit-margin',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Sanitize inputs
            minProfitMargin = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
            maxProfitMargin = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
            screenerName = sanitizeInput(req.body.screenerName || '');
            Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                logger.warn({
                    msg: 'Screener name is required',
                    context: 'PATCH /screener/profit-margin',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                logger.warn({
                    msg: 'Username is required',
                    context: 'PATCH /screener/profit-margin',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username is required' });
            }
            if (isNaN(minProfitMargin) && isNaN(maxProfitMargin)) {
                logger.warn({
                    msg: 'Both min and max Profit Margin cannot be empty',
                    context: 'PATCH /screener/profit-margin',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Both min Profit Margin and max Profit Margin cannot be empty' });
            }

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
                        logger.warn({
                            msg: 'No assets found to determine minimum Profit Margin',
                            context: 'PATCH /screener/profit-margin',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine minimum Profit Margin' });
                    }
                }

                // If maxProfitMargin is empty, find the highest Profit Margin
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
                        logger.warn({
                            msg: 'No assets found to determine maximum Profit Margin',
                            context: 'PATCH /screener/profit-margin',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum Profit Margin' });
                    }
                }

                // Ensure minProfitMargin is less than maxProfitMargin
                if (minProfitMargin >= maxProfitMargin) {
                    logger.warn({
                        msg: 'Min Profit Margin cannot be higher than or equal to max Profit Margin',
                        minProfitMargin,
                        maxProfitMargin,
                        context: 'PATCH /screener/profit-margin',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min Profit Margin cannot be higher than or equal to max Profit Margin' });
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/profit-margin',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                const updateDoc: { $set: Record<string, any> } = { $set: { profitMargin: [minProfitMargin, maxProfitMargin] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    logger.warn({
                        msg: 'Unable to update screener',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/profit-margin',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }

                res.json({
                    message: 'Profit Margin range updated successfully',
                    updatedScreener: result.value
                });

            } catch (dbError: unknown) {
                const err = dbError instanceof Error ? dbError : new Error(String(dbError));
                logger.error({
                    msg: 'Database Operation Error',
                    error: err.message,
                    stack: err.stack,
                    Username,
                    screenerName,
                    context: 'PATCH /screener/profit-margin',
                    statusCode: 500
                });
                res.status(500).json({
                    message: 'Database operation failed',
                    error: err.message
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: unknown) {
                        const err = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.warn({
                            msg: 'Error closing database connection',
                            error: err.message,
                            context: 'PATCH /screener/profit-margin'
                        });
                    }
                }
            }
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /screener/profit-margin', {
                username: req.body.user,
                screenerName: req.body.screenerName
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    app.patch('/screener/gross-margin', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let minGrossMargin: number, maxGrossMargin: number, screenerName: string, Username: string;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/gross-margin',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Sanitize inputs
            minGrossMargin = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
            maxGrossMargin = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
            screenerName = sanitizeInput(req.body.screenerName || '');
            Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                logger.warn({
                    msg: 'Screener name is required',
                    context: 'PATCH /screener/gross-margin',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                logger.warn({
                    msg: 'Username is required',
                    context: 'PATCH /screener/gross-margin',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username is required' });
            }
            if (isNaN(minGrossMargin) && isNaN(maxGrossMargin)) {
                logger.warn({
                    msg: 'Both min and max Gross Margin cannot be empty',
                    context: 'PATCH /screener/gross-margin',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Both min Gross Margin and max Gross Margin cannot be empty' });
            }

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
                        logger.warn({
                            msg: 'No assets found to determine minimum Gross Margin',
                            context: 'PATCH /screener/gross-margin',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine minimum Gross Margin' });
                    }
                }

                // If maxGrossMargin is empty, find the highest Gross Margin
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
                        logger.warn({
                            msg: 'No assets found to determine maximum Gross Margin',
                            context: 'PATCH /screener/gross-margin',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum Gross Margin' });
                    }
                }

                // Ensure minGrossMargin is less than maxGrossMargin
                if (minGrossMargin >= maxGrossMargin) {
                    logger.warn({
                        msg: 'Min Gross Margin cannot be higher than or equal to max Gross Margin',
                        minGrossMargin,
                        maxGrossMargin,
                        context: 'PATCH /screener/gross-margin',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min Gross Margin cannot be higher than or equal to max Gross Margin' });
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/gross-margin',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                const updateDoc: { $set: Record<string, any> } = { $set: { grossMargin: [minGrossMargin, maxGrossMargin] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    logger.warn({
                        msg: 'Unable to update screener',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/gross-margin',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }

                res.json({
                    message: 'Gross Margin range updated successfully',
                    updatedScreener: result.value
                });

            } catch (dbError: unknown) {
                const err = dbError instanceof Error ? dbError : new Error(String(dbError));
                logger.error({
                    msg: 'Database Operation Error',
                    error: err.message,
                    stack: err.stack,
                    Username,
                    screenerName,
                    context: 'PATCH /screener/gross-margin',
                    statusCode: 500
                });
                res.status(500).json({
                    message: 'Database operation failed',
                    error: err.message
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: unknown) {
                        const err = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.warn({
                            msg: 'Error closing database connection',
                            error: err.message,
                            context: 'PATCH /screener/gross-margin'
                        });
                    }
                }
            }
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /screener/gross-margin', {
                username: req.body.user,
                screenerName: req.body.screenerName
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    app.patch('/screener/debt-to-equity-ratio', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let minDebtToEquityRatio: number, maxDebtToEquityRatio: number, screenerName: string, Username: string;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/debt-to-equity-ratio',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Sanitize inputs
            minDebtToEquityRatio = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
            maxDebtToEquityRatio = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
            screenerName = sanitizeInput(req.body.screenerName || '');
            Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                logger.warn({
                    msg: 'Screener name is required',
                    context: 'PATCH /screener/debt-to-equity-ratio',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                logger.warn({
                    msg: 'Username is required',
                    context: 'PATCH /screener/debt-to-equity-ratio',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username is required' });
            }
            if (isNaN(minDebtToEquityRatio) && isNaN(maxDebtToEquityRatio)) {
                logger.warn({
                    msg: 'Both min and max Debt to Equity Ratio cannot be empty',
                    context: 'PATCH /screener/debt-to-equity-ratio',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Both min Debt to Equity Ratio and max Debt to Equity Ratio cannot be empty' });
            }

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
                        logger.warn({
                            msg: 'No assets found to determine minimum Debt to Equity Ratio',
                            context: 'PATCH /screener/debt-to-equity-ratio',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine minimum Debt to Equity Ratio' });
                    }
                }

                // If maxDebtToEquityRatio is empty, find the highest Debt to Equity Ratio
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
                        logger.warn({
                            msg: 'No assets found to determine maximum Debt to Equity Ratio',
                            context: 'PATCH /screener/debt-to-equity-ratio',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum Debt to Equity Ratio' });
                    }
                }

                // Ensure minDebtToEquityRatio is less than maxDebtToEquityRatio
                if (minDebtToEquityRatio >= maxDebtToEquityRatio) {
                    logger.warn({
                        msg: 'Min Debt to Equity Ratio cannot be higher than or equal to max Debt to Equity Ratio',
                        minDebtToEquityRatio,
                        maxDebtToEquityRatio,
                        context: 'PATCH /screener/debt-to-equity-ratio',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min Debt to Equity Ratio cannot be higher than or equal to max Debt to Equity Ratio' });
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/debt-to-equity-ratio',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                const updateDoc: { $set: Record<string, any> } = { $set: { debtEquity: [minDebtToEquityRatio, maxDebtToEquityRatio] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    logger.warn({
                        msg: 'Unable to update screener',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/debt-to-equity-ratio',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }

                res.json({
                    message: 'Debt to Equity Ratio range updated successfully',
                    updatedScreener: result.value
                });

            } catch (dbError: unknown) {
                const err = dbError instanceof Error ? dbError : new Error(String(dbError));
                logger.error({
                    msg: 'Database Operation Error',
                    error: err.message,
                    stack: err.stack,
                    Username,
                    screenerName,
                    context: 'PATCH /screener/debt-to-equity-ratio',
                    statusCode: 500
                });
                res.status(500).json({
                    message: 'Database operation failed',
                    error: err.message
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: unknown) {
                        const err = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.warn({
                            msg: 'Error closing database connection',
                            error: err.message,
                            context: 'PATCH /screener/debt-to-equity-ratio'
                        });
                    }
                }
            }
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /screener/debt-to-equity-ratio', {
                username: req.body.user,
                screenerName: req.body.screenerName
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    app.patch('/screener/book-value', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let minBookValue: number, maxBookValue: number, screenerName: string, Username: string;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/book-value',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Sanitize inputs
            minBookValue = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
            maxBookValue = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
            screenerName = sanitizeInput(req.body.screenerName || '');
            Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                logger.warn({
                    msg: 'Screener name is required',
                    context: 'PATCH /screener/book-value',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                logger.warn({
                    msg: 'Username is required',
                    context: 'PATCH /screener/book-value',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username is required' });
            }
            if (isNaN(minBookValue) && isNaN(maxBookValue)) {
                logger.warn({
                    msg: 'Both min and max Book Value cannot be empty',
                    context: 'PATCH /screener/book-value',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Both min Book Value and max Book Value cannot be empty' });
            }

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
                        logger.warn({
                            msg: 'No assets found to determine minimum Book Value',
                            context: 'PATCH /screener/book-value',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine minimum Book Value' });
                    }
                }

                // If maxBookValue is empty, find the highest Book Value
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
                        logger.warn({
                            msg: 'No assets found to determine maximum Book Value',
                            context: 'PATCH /screener/book-value',
                            statusCode: 404
                        });
                        return res.status(404).json({ message: 'No assets found to determine maximum Book Value' });
                    }
                }

                // Ensure minBookValue is less than maxBookValue
                if (minBookValue >= maxBookValue) {
                    logger.warn({
                        msg: 'Min Book Value cannot be higher than or equal to max Book Value',
                        minBookValue,
                        maxBookValue,
                        context: 'PATCH /screener/book-value',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min Book Value cannot be higher than or equal to max Book Value' });
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/book-value',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                const updateDoc: { $set: Record<string, any> } = { $set: { bookVal: [minBookValue, maxBookValue] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    logger.warn({
                        msg: 'Unable to update screener',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/book-value',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'Unable to update screener'
                    });
                }

                res.json({
                    message: 'Book Value range updated successfully',
                    updatedScreener: result.value
                });

            } catch (dbError: unknown) {
                const err = dbError instanceof Error ? dbError : new Error(String(dbError));
                logger.error({
                    msg: 'Database Operation Error',
                    error: err.message,
                    stack: err.stack,
                    Username,
                    screenerName,
                    context: 'PATCH /screener/book-value',
                    statusCode: 500
                });
                res.status(500).json({
                    message: 'Database operation failed',
                    error: err.message
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: unknown) {
                        const err = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.warn({
                            msg: 'Error closing database connection',
                            error: err.message,
                            context: 'PATCH /screener/book-value'
                        });
                    }
                }
            }
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /screener/book-value', {
                username: req.body.user,
                screenerName: req.body.screenerName
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    app.patch('/screener/ev', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let minPrice: number, maxPrice: number, screenerName: string, Username: string;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/ev',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Sanitize inputs
            minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
            maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
            screenerName = sanitizeInput(req.body.screenerName || '');
            Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                logger.warn({
                    msg: 'Screener name is required',
                    context: 'PATCH /screener/ev',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                logger.warn({
                    msg: 'Username is required',
                    context: 'PATCH /screener/ev',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username is required' });
            }
            if (isNaN(minPrice) && isNaN(maxPrice)) {
                logger.warn({
                    msg: 'Both min EV and max EV cannot be empty',
                    context: 'PATCH /screener/ev',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Both min EV and max EV cannot be empty' });
            }

            try {
                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const assetInfoCollection = db.collection('AssetInfo');

                // Set default minPrice to minimum EV if it is not provided
                if (isNaN(minPrice)) {
                    const minEV = await assetInfoCollection.aggregate([
                        {
                            $match: {
                                EV: { $nin: ['None', null, undefined] }
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
                        logger.warn({
                            msg: 'No assets found to determine minimum EV',
                            context: 'PATCH /screener/ev',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: 'No assets found to determine minimum EV',
                            details: 'Unable to find a valid EV in the database'
                        });
                    }
                }

                // Set default maxPrice to maximum EV if it is not provided
                if (isNaN(maxPrice)) {
                    const maxEV = await assetInfoCollection.aggregate([
                        {
                            $match: {
                                EV: { $nin: ['None', null, undefined] }
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
                        logger.warn({
                            msg: 'No assets found to determine maximum EV',
                            context: 'PATCH /screener/ev',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: 'No assets found to determine maximum EV',
                            details: 'Unable to find a valid EV in the database'
                        });
                    }
                }

                // Ensure minPrice is less than maxPrice
                if (minPrice >= maxPrice) {
                    logger.warn({
                        msg: 'Min EV cannot be higher than or equal to max EV',
                        minPrice,
                        maxPrice,
                        context: 'PATCH /screener/ev',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min EV cannot be higher than or equal to max EV' });
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/ev',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                const updateDoc: { $set: Record<string, any> } = { $set: { EV: [minPrice, maxPrice] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    logger.warn({
                        msg: 'Unable to update screener',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/ev',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                res.json({
                    message: 'EV range updated successfully',
                    updatedScreener: result.value
                });

            } catch (dbError: unknown) {
                const err = dbError instanceof Error ? dbError : new Error(String(dbError));
                logger.error({
                    msg: 'Database Operation Error',
                    error: err.message,
                    stack: err.stack,
                    Username,
                    screenerName,
                    context: 'PATCH /screener/ev',
                    statusCode: 500
                });
                res.status(500).json({
                    message: 'Database operation failed',
                    error: err.message
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: unknown) {
                        const err = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.warn({
                            msg: 'Error closing database connection',
                            error: err.message,
                            context: 'PATCH /screener/ev'
                        });
                    }
                }
            }
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /screener/ev', {
                username: req.body.user,
                screenerName: req.body.screenerName
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    app.patch('/screener/rsi', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let minRSI: number, maxRSI: number, screenerName: string, Username: string;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/rsi',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Sanitize inputs
            minRSI = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
            maxRSI = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
            screenerName = sanitizeInput(req.body.screenerName || '');
            Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                logger.warn({
                    msg: 'Screener name is required',
                    context: 'PATCH /screener/rsi',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                logger.warn({
                    msg: 'Username is required',
                    context: 'PATCH /screener/rsi',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username is required' });
            }
            if (isNaN(minRSI) && isNaN(maxRSI)) {
                logger.warn({
                    msg: 'Both min and max RSI cannot be empty',
                    context: 'PATCH /screener/rsi',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Both min RSI and max RSI cannot be empty' });
            }

            try {
                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const assetInfoCollection = db.collection('AssetInfo');

                // Set default minRSI to 1 if not provided
                if (isNaN(minRSI)) {
                    minRSI = 1;
                }
                // Set default maxRSI to 100 if not provided
                if (isNaN(maxRSI)) {
                    maxRSI = 100;
                }

                // Ensure minRSI is less than maxRSI
                if (minRSI >= maxRSI) {
                    logger.warn({
                        msg: 'Min RSI cannot be higher than or equal to max RSI',
                        minRSI,
                        maxRSI,
                        context: 'PATCH /screener/rsi',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min RSI cannot be higher than or equal to max RSI' });
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/rsi',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                const updateDoc: { $set: Record<string, any> } = { $set: { RSI: [minRSI, maxRSI] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    logger.warn({
                        msg: 'Unable to update screener',
                        username: Username,
                        screenerName,
                        context: 'PATCH /screener/rsi',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                res.json({
                    message: 'RSI range updated successfully',
                    updatedScreener: result.value
                });

            } catch (dbError: unknown) {
                const err = dbError instanceof Error ? dbError : new Error(String(dbError));
                logger.error({
                    msg: 'Database Operation Error',
                    error: err.message,
                    stack: err.stack,
                    Username,
                    screenerName,
                    context: 'PATCH /screener/rsi',
                    statusCode: 500
                });
                res.status(500).json({
                    message: 'Database operation failed',
                    error: err.message
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: unknown) {
                        const err = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.warn({
                            msg: 'Error closing database connection',
                            error: err.message,
                            context: 'PATCH /screener/rsi'
                        });
                    }
                }
            }
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /screener/rsi', {
                username: req.body.user,
                screenerName: req.body.screenerName
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    app.patch('/screener/gap-percent', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]), async (req: Request, res: Response) => {
        let client: any;
        let minGap: number, maxGap: number, screenerName: string, Username: string;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /screener/gap-percent',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Sanitize inputs
            minGap = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
            maxGap = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
            screenerName = sanitizeInput(req.body.screenerName || '');
            Username = sanitizeInput(req.body.user || '');

            // Validate inputs
            if (!screenerName) {
                logger.warn({
                    msg: 'Screener name is required',
                    context: 'PATCH /screener/gap-percent',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Screener name is required' });
            }
            if (!Username) {
                logger.warn({
                    msg: 'Username is required',
                    context: 'PATCH /screener/gap-percent',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username is required' });
            }
            if (isNaN(minGap) && isNaN(maxGap)) {
                logger.warn({
                    msg: 'Both min Gap and max Gap cannot be empty',
                    context: 'PATCH /screener/gap-percent',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Both min Gap and max Gap cannot be empty' });
            }

            try {
                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Screeners');
                const assetInfoCollection = db.collection('AssetInfo');

                // Set default minGap to minimum Gap if not provided
                if (isNaN(minGap)) {
                    const minGapResult = await assetInfoCollection.aggregate([
                        {
                            $match: {
                                $and: [
                                    { Gap: { $ne: 'None' } },
                                    { Gap: { $ne: null } },
                                    { Gap: { $ne: undefined } },
                                    { Gap: { $ne: NaN } }
                                ]
                            }
                        },
                        { $group: { _id: null, minGap: { $min: '$Gap' } } }
                    ]).toArray();
                    if (minGapResult.length > 0) {
                        minGap = minGapResult[0].minGap;
                    } else {
                        logger.warn({
                            msg: 'No assets found to determine minimum Gap',
                            context: 'PATCH /screener/gap-percent',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: 'No assets found to determine minimum Gap',
                            details: 'Unable to find a valid Gap in the database'
                        });
                    }
                }

                // Set default maxGap to maximum Gap if not provided
                if (isNaN(maxGap)) {
                    const maxGapResult = await assetInfoCollection.aggregate([
                        {
                            $match: {
                                $and: [
                                    { Gap: { $ne: 'None' } },
                                    { Gap: { $ne: null } },
                                    { Gap: { $ne: undefined } },
                                    { Gap: { $ne: NaN } }
                                ]
                            }
                        },
                        { $group: { _id: null, maxGap: { $max: '$Gap' } } }
                    ]).toArray();
                    if (maxGapResult.length > 0) {
                        maxGap = maxGapResult[0].maxGap;
                    } else {
                        logger.warn({
                            msg: 'No assets found to determine maximum Gap',
                            context: 'PATCH /screener/gap-percent',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: 'No assets found to determine maximum Gap',
                            details: 'Unable to find a valid Gap in the database'
                        });
                    }
                }

                if (minGap >= maxGap) {
                    logger.warn({
                        msg: 'Min Gap cannot be higher than or equal to max Gap',
                        context: 'PATCH /screener/gap-percent',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Min Gap cannot be higher than or equal to max Gap' });
                }

                const filter = {
                    UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                    Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                };

                const existingScreener = await collection.findOne(filter);
                if (!existingScreener) {
                    logger.warn({
                        msg: 'Screener not found',
                        context: 'PATCH /screener/gap-percent',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                const updateDoc = { $set: { Gap: [minGap, maxGap] } };
                const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                if (!result) {
                    logger.warn({
                        msg: 'Screener not found during update',
                        context: 'PATCH /screener/gap-percent',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Screener not found',
                        details: 'No matching screener exists for the given user and name'
                    });
                }

                res.json({
                    message: 'Gap range updated successfully',
                    updatedScreener: result.value
                });

            } catch (dbError: unknown) {
                const err = dbError instanceof Error ? dbError : new Error(String(dbError));
                logger.error({
                    msg: 'Database Operation Error',
                    error: err.message,
                    stack: err.stack,
                    Username,
                    screenerName,
                    context: 'PATCH /screener/gap-percent',
                    statusCode: 500
                });
                res.status(500).json({
                    message: 'Database operation failed',
                    error: err.message
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: unknown) {
                        logger.warn({
                            msg: 'Error closing database connection',
                            error: closeError instanceof Error ? closeError.message : String(closeError),
                            context: 'PATCH /screener/gap-percent'
                        });
                    }
                }
            }
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /screener/gap-percent', {
                username: req.body.user,
                screenerName: req.body.screenerName
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- PATCH update table columns for a user ---
    app.patch('/update/columns', validate([
        body('columns').isArray({ min: 1 }).withMessage('Columns must be a non-empty array'),
        body('user').isString().trim().notEmpty().withMessage('User is required')
    ]), async (req: Request, res: Response) => {
        let client: any;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /update/columns',
                    statusCode: 401
                });
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
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /update/columns', {
                username: req.body?.user
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: unknown) {
                    logger.warn({
                        msg: 'Error closing database connection',
                        error: closeError instanceof Error ? closeError.message : String(closeError),
                        context: 'PATCH /update/columns'
                    });
                }
            }
        }
    });

    // --- GET table columns for a user ---
    app.get('/get/columns', validate([
        query('user').isString().trim().notEmpty().withMessage('User is required')
    ]), async (req: Request, res: Response) => {
        let client: any;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /get/columns',
                    statusCode: 401
                });
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
                logger.warn({
                    msg: 'No columns found for user',
                    username: sanitizedUser,
                    context: 'GET /get/columns',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'No columns found for user' });
            }
            return res.status(200).json({ columns: userDoc.Table });
        } catch (error: unknown) {
            const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'GET /get/columns', {
                username: req.query?.user
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError: unknown) {
                    logger.warn({
                        msg: 'Error closing database connection',
                        error: closeError instanceof Error ? closeError.message : String(closeError),
                        context: 'GET /get/columns'
                    });
                }
            }
        }
    });

    // endpoint that updates screener document with Intrinsic Value (IV) parameters
    app.patch('/screener/intrinsic-value', validate([
        validationSchemas.user(),
        validationSchemas.screenerNameBody(),
        validationSchemas.minPrice(),
        validationSchemas.maxPrice()
    ]),
        async (req: Request, res: Response) => {
            let client: any;
            let minIV: number, maxIV: number, screenerName: string, Username: string;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /screener/intrinsic-value',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }

                // Sanitize inputs
                minIV = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
                maxIV = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
                screenerName = sanitizeInput(req.body.screenerName || '');
                Username = sanitizeInput(req.body.user || '');

                // Validate inputs
                if (!screenerName) {
                    logger.warn({
                        msg: 'Screener name is required',
                        context: 'PATCH /screener/intrinsic-value',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Screener name is required' });
                }
                if (!Username) {
                    logger.warn({
                        msg: 'Username is required',
                        context: 'PATCH /screener/intrinsic-value',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Username is required' });
                }
                if (isNaN(minIV) && isNaN(maxIV)) {
                    logger.warn({
                        msg: 'Both min IV and max IV cannot be empty',
                        context: 'PATCH /screener/intrinsic-value',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Both min IV and max IV cannot be empty' });
                }

                try {
                    client = new MongoClient(uri);
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Screeners');
                    const assetInfoCollection = db.collection('AssetInfo');

                    // If minIV is not provided, set to the minimum IV in the database
                    if (isNaN(minIV)) {
                        const lowestIVDoc = await assetInfoCollection.find({
                            $and: [
                                { IntrinsicValue: { $ne: 'None' } },
                                { IntrinsicValue: { $ne: null } },
                                { IntrinsicValue: { $ne: undefined } },
                                { IntrinsicValue: { $gt: 0 } }
                            ]
                        })
                            .sort({ IntrinsicValue: 1 })
                            .limit(1)
                            .project({ IntrinsicValue: 1 })
                            .toArray();

                        if (lowestIVDoc.length > 0) {
                            minIV = Math.floor(lowestIVDoc[0].IntrinsicValue * 100) / 100;
                        } else {
                            logger.warn({
                                msg: 'No assets found to determine minimum Intrinsic Value',
                                context: 'PATCH /screener/intrinsic-value',
                                statusCode: 404
                            });
                            return res.status(404).json({
                                message: 'No assets found to determine minimum Intrinsic Value',
                                details: 'Unable to find a valid Intrinsic Value in the database'
                            });
                        }
                    }

                    // If maxIV is not provided, set to the maximum IV in the database
                    if (isNaN(maxIV)) {
                        const highestIVDoc = await assetInfoCollection.find({
                            $and: [
                                { IntrinsicValue: { $ne: 'None' } },
                                { IntrinsicValue: { $ne: null } },
                                { IntrinsicValue: { $ne: undefined } },
                                { IntrinsicValue: { $gt: 0 } }
                            ]
                        })
                            .sort({ IntrinsicValue: -1 })
                            .limit(1)
                            .project({ IntrinsicValue: 1 })
                            .toArray();

                        if (highestIVDoc.length > 0) {
                            maxIV = Math.ceil(highestIVDoc[0].IntrinsicValue * 100) / 100;
                        } else {
                            logger.warn({
                                msg: 'No assets found to determine maximum Intrinsic Value',
                                context: 'PATCH /screener/intrinsic-value',
                                statusCode: 404
                            });
                            return res.status(404).json({
                                message: 'No assets found to determine maximum Intrinsic Value',
                                details: 'Unable to find a valid Intrinsic Value in the database'
                            });
                        }
                    }

                    if (minIV >= maxIV) {
                        logger.warn({
                            msg: 'Min IV cannot be higher than or equal to max IV',
                            context: 'PATCH /screener/intrinsic-value',
                            statusCode: 400
                        });
                        return res.status(400).json({ message: 'Min IV cannot be higher than or equal to max IV' });
                    }

                    const filter = {
                        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
                        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
                    };

                    const existingScreener = await collection.findOne(filter);
                    if (!existingScreener) {
                        logger.warn({
                            msg: 'Screener not found',
                            context: 'PATCH /screener/intrinsic-value',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    const updateDoc = { $set: { IV: [minIV, maxIV] } };
                    const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

                    if (!result) {
                        logger.warn({
                            msg: 'Screener not found during update',
                            context: 'PATCH /screener/intrinsic-value',
                            statusCode: 404
                        });
                        return res.status(404).json({
                            message: 'Screener not found',
                            details: 'No matching screener exists for the given user and name'
                        });
                    }

                    res.json({
                        message: 'Intrinsic Value range updated successfully',
                        updatedScreener: result.value
                    });

                } catch (dbError: unknown) {
                    const errObj = handleError(dbError instanceof Error ? dbError : new Error(String(dbError)), 'PATCH /screener/intrinsic-value', {
                        username: Username,
                        screenerName
                    }, 500);
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    if (client) {
                        try {
                            await client.close();
                        } catch (closeError: unknown) {
                            logger.warn({
                                msg: 'Error closing database connection',
                                error: closeError instanceof Error ? closeError.message : String(closeError),
                                context: 'PATCH /screener/intrinsic-value'
                            });
                        }
                    }
                }
            } catch (error: unknown) {
                const errObj = handleError(error instanceof Error ? error : new Error(String(error)), 'PATCH /screener/intrinsic-value', {
                    username: req.body.user,
                    screenerName: req.body.screenerName
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        });
};
