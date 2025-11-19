import { param } from '../utils/validationUtils.js';
import { Request, Response } from 'express';
import { handleError } from '../utils/logger.js';

// --- Type Definitions ---
interface Watchlist {
    Name: string;
    UsernameID: string;
    List: { ticker: string; exchange: string }[];
    createdAt?: Date;
    lastUpdated?: Date;
    [key: string]: any;
}

interface OHCLVData {
    tickerID: string;
    close: number;
    timestamp: Date;
    [key: string]: any;
}

interface OHCLVResponse {
    close: number;
    timestamp: Date;
    closeDiff?: string | number;
    percentChange?: string;
    latestClose?: number;
    previousClose?: number;
    timestampPrevious?: Date;
    message?: string;
}

export default function (app: any, deps: any) {
    const {
        validate,
        validationSchemas,
        validationSets,
        body,
        sanitizeInput,
        logger,
        getDB
    } = deps;


    // endpoint that retrieves watchlists (names)
    app.get('/:user/watchlists',
        validate([
            validationSchemas.userParam('user')
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /:user/watchlists',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const user = sanitizeInput(req.params.user);
                const db = await getDB();
                const collection = db.collection('Watchlists');
                const userWatchlists = await collection.find({ UsernameID: user }).toArray();
                if (userWatchlists.length === 0) {
                    logger.warn({
                        msg: 'No watchlists found',
                        user: user,
                        context: 'GET /:user/watchlists',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'User not found or no watchlists found' });
                }
                res.status(200).json(userWatchlists.map((watchlist: Watchlist) => ({
                    ...watchlist,
                    _id: undefined
                })));
            } catch (error) {
                // Use standardized error handler
                const errObj = handleError(error, 'GET /:user/watchlists', {
                    user: req.params.user ? req.params.user : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that retrieves content of watchlists based on the selected name 
    app.get('/:user/watchlists/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.watchlistName()
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /:user/watchlists/:list',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const user = sanitizeInput(req.params.user);
                const list = sanitizeInput(req.params.list);
                const db = await getDB();
                const collection = db.collection('Watchlists');
                const Watchlists = await collection.findOne({ UsernameID: user, Name: list });
                if (!Watchlists) {
                    logger.warn({
                        msg: 'Watchlist not found',
                        user,
                        list,
                        context: 'GET /:user/watchlists/:list',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Watchlist not found' });
                }
                res.status(200).json(Watchlists.List);
            } catch (error) {
                const errObj = handleError(error, 'GET /:user/watchlists/:list', {
                    user: req.params.user ? req.params.user : 'Unknown',
                    list: req.params.list ? req.params.list : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );


    // Retrieves OHCLV for multiple elements inside the watchlist
    app.get('/data-values', async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /data-values',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const tickersParam = req.query.tickers;
            if (!tickersParam || typeof tickersParam !== 'string') {
                return res.status(400).json({ message: 'No tickers provided' });
            }
            const tickers = (tickersParam as string).split(',').map((t: string) => sanitizeInput(t));
            const db = await getDB();
            const collection = db.collection('OHCLVData');
            const results: { [ticker: string]: OHCLVResponse } = {};
            for (const ticker of tickers) {
                const documents: OHCLVData[] = await collection.find({ tickerID: ticker })
                    .sort({ timestamp: -1 })
                    .limit(2)
                    .toArray();
                if (documents.length > 0) {
                    const latest = documents[0];
                    const responseData: OHCLVResponse = {
                        close: latest.close,
                        timestamp: latest.timestamp,
                    };
                    if (documents.length > 1) {
                        const previous = documents[1];
                        const closeDiff = latest.close - previous.close;
                        const percentChange = ((closeDiff / previous.close) * 100).toFixed(2);
                        responseData.closeDiff = closeDiff.toFixed(2);
                        responseData.percentChange = percentChange;
                        responseData.latestClose = latest.close;
                        responseData.previousClose = previous.close;
                        responseData.timestampPrevious = previous.timestamp;
                    } else {
                        responseData.closeDiff = 0;
                        responseData.percentChange = '0';
                        responseData.message = 'Insufficient historical data for comparison';
                    }
                    results[ticker] = responseData;
                }
            }
            res.status(200).json(results);
        } catch (error) {
            const errObj = handleError(error, 'GET /data-values', {}, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // endpoint to add symbol to selected watchlist 
    app.patch('/:user/watchlists/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.watchlistName(),
            body('Name').trim()
                .isLength({ min: 1, max: 20 })
                .withMessage('Watchlist name must be between 1 and 20 characters')
                .matches(/^[a-zA-Z0-9\s_-]+$/)
                .withMessage('Watchlist name can only contain letters, numbers, spaces, underscores, and hyphens'),
            body('symbol')
                .trim()
                .notEmpty().withMessage('Symbol is required')
                .isLength({ min: 1, max: 12 }).withMessage('Symbol must be between 1 and 12 characters')
                .matches(/^[A-Z0-9]+$/).withMessage('Symbol must be uppercase alphanumeric')
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /:user/watchlists/:list',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const list = sanitizeInput(req.params.list);
                const user = sanitizeInput(req.params.user);
                const { Name, symbol } = req.body;
                const sanitizedSymbol = sanitizeInput(symbol.toUpperCase());
                const sanitizedName = sanitizeInput(Name);
                const db = await getDB();
                const collection = db.collection('Watchlists');
                const watchlist = await collection.findOne({
                    Name: sanitizedName,
                    UsernameID: user
                });
                if (!watchlist) {
                    logger.warn({
                        msg: 'Watchlist not found',
                        user,
                        listName: sanitizedName,
                        context: 'PATCH /:user/watchlists/:list',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Watchlist not found',
                        details: 'The specified watchlist does not exist or you do not have access to it'
                    });
                }
                if (watchlist.List && watchlist.List.length >= 100) {
                    logger.warn({
                        msg: 'Watchlist symbol limit reached',
                        user,
                        listName: sanitizedName,
                        context: 'PATCH /:user/watchlists/:list',
                        statusCode: 400
                    });
                    return res.status(400).json({
                        message: 'Limit reached, cannot add more than 100 symbols per watchlist',
                        details: 'Maximum of 100 symbols per watchlist'
                    });
                }
                if (watchlist.List && watchlist.List.some((item: { ticker: string }) => item.ticker === sanitizedSymbol)) {
                    logger.warn({
                        msg: 'Symbol already exists in watchlist',
                        user,
                        listName: sanitizedName,
                        symbol: sanitizedSymbol,
                        context: 'PATCH /:user/watchlists/:list',
                        statusCode: 409
                    });
                    return res.status(409).json({
                        message: 'Symbol already exists in the watchlist',
                        symbol: sanitizedSymbol
                    });
                }
                const assetInfoCollection = db.collection('AssetInfo');
                const assetExists = await assetInfoCollection.findOne({ Symbol: sanitizedSymbol });
                if (!assetExists) {
                    logger.warn({
                        msg: 'Symbol not found in AssetInfo',
                        symbol: sanitizedSymbol,
                        context: 'PATCH /:user/watchlists/:list',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Symbol not found',
                        symbol: sanitizedSymbol
                    });
                }
                const symbolObj = { ticker: sanitizedSymbol, exchange: assetExists.Exchange || '' };
                const result = await collection.updateOne(
                    { Name: sanitizedName, UsernameID: user },
                    {
                        $addToSet: { List: symbolObj },
                        $set: { lastUpdated: new Date() }
                    }
                );
                if (result.modifiedCount === 1) {
                    res.status(200).json({
                        message: 'Ticker added successfully',
                        symbol: sanitizedSymbol,
                        watchlist: sanitizedName
                    });
                } else {
                    logger.warn({
                        msg: 'Failed to add symbol to watchlist',
                        user,
                        listName: sanitizedName,
                        symbol: sanitizedSymbol,
                        context: 'PATCH /:user/watchlists/:list',
                        statusCode: 500
                    });
                    res.status(500).json({
                        message: 'Failed to update watchlist',
                        details: 'An unexpected error occurred while adding the symbol'
                    });
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /:user/watchlists/:list', {
                    user: req.params.user ? req.params.user : 'Unknown',
                    list: req.params.list ? req.params.list : 'Unknown',
                    symbol: req.body.symbol ? req.body.symbol : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that deletes ticker from selected watchlist 
    app.patch('/:user/deleteticker/watchlists/:list/:ticker',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.watchlistName(),
            validationSchemas.symbolParam('ticker')
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /:user/deleteticker/watchlists/:list/:ticker',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const list = sanitizeInput(req.params.list);
                const ticker = sanitizeInput(req.params.ticker).toUpperCase();
                const user = sanitizeInput(req.params.user);
                const db = await getDB();
                const collection = db.collection('Watchlists');
                const watchlist = await collection.findOne({
                    Name: list,
                    UsernameID: user
                });
                if (!watchlist) {
                    logger.warn({
                        msg: 'Watchlist not found',
                        user,
                        list,
                        context: 'PATCH /:user/deleteticker/watchlists/:list/:ticker',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Watchlist not found',
                        details: 'The specified watchlist does not exist or you do not have access to it'
                    });
                }
                if (!watchlist.List || !watchlist.List.some((item: { ticker: string }) => item.ticker === ticker)) {
                    logger.warn({
                        msg: 'Ticker not found in watchlist',
                        user,
                        list,
                        ticker,
                        context: 'PATCH /:user/deleteticker/watchlists/:list/:ticker',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        message: 'Ticker not found in the watchlist'
                    });
                }
                const filter = { Name: list, UsernameID: user };
                const update = {
                    $pull: { List: { ticker: ticker } },
                    $set: { lastUpdated: new Date() }
                };
                const result = await collection.updateOne(filter, update);
                if (result.modifiedCount === 1) {
                    res.status(200).json({
                        message: 'Ticker deleted successfully',
                        list,
                        ticker
                    });
                } else {
                    logger.warn({
                        msg: 'Failed to delete ticker',
                        user,
                        list,
                        ticker,
                        context: 'PATCH /:user/deleteticker/watchlists/:list/:ticker',
                        statusCode: 500
                    });
                    res.status(500).json({
                        message: 'Failed to delete ticker',
                        details: 'An unexpected error occurred while deleting the symbol'
                    });
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /:user/deleteticker/watchlists/:list/:ticker', {
                    user: req.params.user ? req.params.user : 'Unknown',
                    list: req.params.list ? req.params.list : 'Unknown',
                    ticker: req.params.ticker ? req.params.ticker : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that deletes selected watchlist
    app.delete('/:user/delete/watchlists/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.watchlistName()
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'DELETE /:user/delete/watchlists/:list',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const list = sanitizeInput(req.params.list);
                const user = sanitizeInput(req.params.user);
                const db = await getDB();
                const collection = db.collection('Watchlists');
                const filter = { Name: list, UsernameID: user };
                const result = await collection.deleteOne(filter);
                if (result.deletedCount === 0) {
                    logger.warn({
                        msg: 'Attempted to delete a non-existent watchlist',
                        user,
                        list,
                        context: 'DELETE /:user/delete/watchlists/:list',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Watchlist not found' });
                }
                res.send({ message: 'Watchlist deleted successfully' });
            } catch (error) {
                const errObj = handleError(error, 'DELETE /:user/delete/watchlists/:list', {
                    user: req.params.user ? req.params.user : 'Unknown',
                    list: req.params.list ? req.params.list : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        });

    // endpoint that creates a new watchlist 
    app.post('/:user/create/watchlists/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.watchlistName()
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'POST /:user/create/watchlists/:list',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const list = sanitizeInput(req.params.list);
                const user = sanitizeInput(req.params.user);
                const db = await getDB();
                const collection = db.collection('Watchlists');
                // Check how many watchlists the user already has
                const existingWatchlistsCount = await collection.countDocuments({ UsernameID: user });
                if (existingWatchlistsCount >= 20) {
                    logger.warn({
                        msg: 'Watchlist creation limit reached',
                        user,
                        existingWatchlistsCount,
                        context: 'POST /:user/create/watchlists/:list',
                        statusCode: 400
                    });
                    return res.status(400).json({
                        message: 'Maximum number of watchlists (20) has been reached',
                        details: 'You cannot create more than 20 watchlists'
                    });
                }
                // Check if a watchlist with the same name already exists
                const existingWatchlist = await collection.findOne({
                    Name: list,
                    UsernameID: user
                });
                if (existingWatchlist) {
                    logger.warn({
                        msg: 'Watchlist with same name already exists',
                        user,
                        list,
                        context: 'POST /:user/create/watchlists/:list',
                        statusCode: 409
                    });
                    return res.status(409).json({
                        message: 'A watchlist with this name already exists',
                        details: 'Please choose a different name'
                    });
                }
                const document = {
                    Name: list,
                    UsernameID: user,
                    List: [],
                    createdAt: new Date(),
                    lastUpdated: new Date()
                };
                const result = await collection.insertOne(document);
                if (result.insertedId) {
                    res.status(201).json({
                        message: 'Watchlist created successfully',
                        watchlist: {
                            name: list,
                            id: result.insertedId
                        }
                    });
                } else {
                    logger.warn({
                        msg: 'Failed to create watchlist',
                        user,
                        list,
                        context: 'POST /:user/create/watchlists/:list',
                        statusCode: 500
                    });
                    res.status(500).json({
                        message: 'Error creating watchlist',
                        details: 'An unexpected error occurred while creating the watchlist'
                    });
                }
            } catch (error) {
                const errObj = handleError(error, 'POST /:user/create/watchlists/:list', {
                    user: req.params.user ? req.params.user : 'Unknown',
                    list: req.params.list ? req.params.list : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that renames selected watchlist 
    app.patch('/:user/rename/watchlists/:oldname',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.newname()
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /:user/rename/watchlists/:oldname',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const oldname = sanitizeInput(req.params.oldname);
                const newname = sanitizeInput(req.body.newname);
                const Username = sanitizeInput(req.params.user);
                if (!newname) {
                    logger.warn({
                        msg: 'Attempt to rename watchlist with empty name',
                        user: Username,
                        oldname,
                        context: 'PATCH /:user/rename/watchlists/:oldname',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Please provide a new name' });
                }
                const db = await getDB();
                const collection = db.collection('Watchlists');
                const filter = { UsernameID: Username, Name: oldname };
                const updateDoc = { $set: { Name: newname } };
                const result = await collection.updateOne(filter, updateDoc);
                if (result.modifiedCount === 0) {
                    logger.warn({
                        msg: 'Watchlist not found for renaming',
                        user: Username,
                        oldname,
                        newname,
                        context: 'PATCH /:user/rename/watchlists/:oldname',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Watchlist not found' });
                }
                res.json({ message: 'Watchlist renamed successfully' });
            } catch (error) {
                const errObj = handleError(error, 'PATCH /:user/rename/watchlists/:oldname', {
                    user: req.params.user ? req.params.user : 'Unknown',
                    oldname: req.params.oldname ? req.params.oldname : 'Unknown',
                    newname: req.body.newname ? req.body.newname : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        });

    // endpoint that updates the watchlist oder after sortable.js is used 
    app.patch('/watchlists/update-order/:Username/:Name',
        validate([
            param('Username')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

            param('Name')
                .trim()
                .notEmpty().withMessage('Watchlist name is required')
                .isLength({ min: 1, max: 50 }).withMessage('Watchlist name must be between 1 and 50 characters')
                .matches(/^[a-zA-Z0-9\s_\-+()]+$/).withMessage('Watchlist name can only contain letters, numbers, spaces, underscores, hyphens, plus signs, and parentheses'),

            body('newListOrder')
                .isArray().withMessage('New list order must be an array')
                .custom((value: any[]) => {
                    if (!value.every((item: any) =>
                        typeof item === 'object' &&
                        typeof item.ticker === 'string' &&
                        item.ticker.length <= 12 &&
                        (typeof item.exchange === 'string' || typeof item.exchange === 'undefined')
                    )) {
                        throw new Error('Each list item must be an object with a string ticker (max 12 chars) and optional string exchange');
                    }
                    return true;
                })
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /watchlists/update-order/:Username/:Name',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                // Sanitize inputs
                const user = sanitizeInput(req.body.user);
                const Name = sanitizeInput(req.params.Name);
                const newListOrder = req.body.newListOrder.map((item: { ticker: string; exchange: string }) => ({
                    ticker: sanitizeInput(item.ticker),
                    exchange: sanitizeInput(item.exchange)
                }));
                const db = await getDB();
                const collection = db.collection('Watchlists');
                const filter = { UsernameID: user, Name: Name };
                const update = { $set: { List: newListOrder } };
                const result = await collection.updateOne(filter, update, { upsert: true });
                if (result.upsertedCount === 1 || result.modifiedCount === 1) {
                    res.send({
                        message: 'Watchlist order updated successfully'
                    });
                } else {
                    logger.warn({
                        msg: 'No Matching Watchlist Found',
                        user,
                        watchlistName: Name,
                        context: 'PATCH /watchlists/update-order/:Username/:Name',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Watchlist not found' });
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /watchlists/update-order/:Username/:Name', {
                    user: req.body.user ? req.body.user : 'Unknown',
                    Name: req.params.Name ? req.params.Name : 'Unknown',
                    newListOrder: req.body.newListOrder ? req.body.newListOrder : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that should add/remove tickers with inputs 
    app.patch('/watchlist/addticker/:isAdding',
        validate([
            param('isAdding')
                .isIn(['true', 'false']).withMessage('isAdding must be true or false'),

            body('watchlistName')
                .trim()
                .notEmpty().withMessage('Watchlist name is required')
                .isLength({ min: 1, max: 50 }).withMessage('Watchlist name must be between 1 and 50 characters')
                .matches(/^[a-zA-Z0-9\s_\-+()]+$/).withMessage('Watchlist name can only contain letters, numbers, spaces, underscores, hyphens, plus signs, and parentheses'),

            body('symbol')
                .trim()
                .notEmpty().withMessage('Symbol is required')
                .isLength({ min: 1, max: 12 }).withMessage('Symbol must be between 1 and 12 characters')
                .matches(/^[A-Z0-9.]+$/).withMessage('Symbol can only contain uppercase letters, numbers, and dots'),

            body('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /watchlist/addticker/:isAdding',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                // Sanitize inputs
                const isAdding = req.params.isAdding === 'true';
                const watchlistName = sanitizeInput(req.body.watchlistName);
                const symbol = sanitizeInput(req.body.symbol);
                const user = sanitizeInput(req.body.user);
                const db = await getDB();
                const collection = db.collection('Watchlists');
                // Verify watchlist exists and belongs to the user
                const watchlist = await collection.findOne({
                    Name: watchlistName,
                    UsernameID: user
                });
                if (!watchlist) {
                    logger.warn({
                        msg: 'Watchlist Not Found',
                        user,
                        watchlistName,
                        context: 'PATCH /watchlist/addticker/:isAdding',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Watchlist not found' });
                }
                // Check symbol limit when adding
                if (isAdding && watchlist.List && watchlist.List.length >= 100) {
                    return res.status(400).json({
                        message: 'Limit reached, cannot add more than 100 symbol per watchlist',
                        details: 'Maximum of 100 symbols per watchlist'
                    });
                }
                let result;
                if (isAdding) {
                    // Add the symbol object to the List array if it doesn't exist
                    const assetInfoCollection = db.collection('AssetInfo');
                    const assetExists = await assetInfoCollection.findOne({ Symbol: symbol });
                    if (!assetExists) {
                        return res.status(404).json({ message: 'Symbol not found', symbol });
                    }
                    const symbolObj = { ticker: symbol, exchange: assetExists.Exchange || '' };
                    result = await collection.updateOne(
                        { Name: watchlistName, UsernameID: user },
                        { $addToSet: { List: symbolObj } }
                    );
                } else {
                    // Remove the symbol object from the List array
                    result = await collection.updateOne(
                        { Name: watchlistName },
                        { $pull: { List: { ticker: symbol } } }
                    );
                }
                if (result.matchedCount === 0) {
                    logger.warn({
                        msg: 'Watchlist Not Found',
                        user,
                        watchlistName,
                        context: 'PATCH /watchlist/addticker/:isAdding',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Watchlist not found' });
                }
                if (result.modifiedCount === 0) {
                    return res.status(200).json({
                        message: isAdding
                            ? 'Symbol already in watchlist'
                            : 'Symbol not in watchlist'
                    });
                }
                res.status(200).json({
                    message: isAdding
                        ? 'Ticker added successfully'
                        : 'Ticker removed successfully'
                });
            } catch (error) {
                const errObj = handleError(error, 'PATCH /watchlist/addticker/:isAdding', {
                    user: req.body.user ? req.body.user : 'Unknown',
                    watchlistName: req.body.watchlistName ? req.body.watchlistName : 'Unknown',
                    symbol: req.body.symbol ? req.body.symbol : 'Unknown',
                    isAdding: req.params.isAdding ? req.params.isAdding : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that retrieves watchlists for a specific user
    app.get('/:user/full-watchlists',
        validate([
            param('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
        ]),
        async (req: Request, res: Response) => {
            ;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /:user/full-watchlists',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const user = sanitizeInput(req.params.user);
                const db = await getDB();
                const collection = db.collection('Watchlists');
                // Find all watchlists for the given user
                const userWatchlists = await collection.find({ UsernameID: user }, { projection: { _id: 0, Name: 1, List: 1 } }).toArray();
                if (userWatchlists.length === 0) {
                    logger.warn({
                        msg: 'No Watchlists Found',
                        user,
                        context: 'GET /:user/full-watchlists',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'No watchlists found for the user' });
                }
                res.send(userWatchlists);
            } catch (error) {
                const errObj = handleError(error, 'GET /:user/full-watchlists', {
                    user: req.params.user ? req.params.user : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    //endpoint that retrieves exchanges for each symbol (related to assigning pictures correctly)
    app.get('/symbols-exchanges',
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /symbols-exchanges',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const db = await getDB();
                const collection = db.collection('AssetInfo');
                // Find all documents but only return Symbol and Exchange fields
                const documents = await collection.find(
                    {},
                    {
                        projection: {
                            _id: 0,  // Exclude the _id field
                            Symbol: 1,
                            Exchange: 1
                        }
                    }
                ).toArray();
                if (documents.length === 0) {
                    logger.warn({
                        msg: 'No Symbols and Exchanges Found',
                        context: 'GET /symbols-exchanges',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'No documents found' });
                }
                res.json(documents);
            } catch (error) {
                const errObj = handleError(error, 'GET /symbols-exchanges', {}, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        });

    // Endpoint that retrieves the last update date
    app.get('/getlastupdate',
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /getlastupdate',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const db = await getDB();
                // Read the lightweight Stats document containing the last market update
                const statsCollection = db.collection('Stats');
                const statsDoc = await statsCollection.findOne({ _id: 'marketStats' }, { projection: { _id: 1, updatedAt: 1 } });
                const date: Date | undefined = statsDoc && statsDoc.updatedAt ? statsDoc.updatedAt : undefined;
                if (!date) {
                    logger.warn({
                        msg: 'No timestamp available',
                        context: 'GET /getlastupdate',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'No timestamp available' });
                }

                const formattedDate = date.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                res.json({ date: formattedDate });
            } catch (error) {
                const errObj = handleError(error, 'GET /getlastupdate', {}, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // Sends annual and quarterly financials
    app.get('/:ticker/financials',
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
                        context: 'GET /:ticker/financials',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const ticker = sanitizeInput(req.params.ticker).toUpperCase();
                const db = await getDB();
                const collection = db.collection('AssetInfo');
                const data = await collection.findOne({ Symbol: ticker });
                if (!data || !data.AnnualFinancials || !data.quarterlyFinancials) {
                    logger.warn({
                        msg: 'No financial data found',
                        ticker,
                        context: 'GET /:ticker/financials',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'No financial data found for this ticker' });
                }
                const annualFinancials = data.AnnualFinancials;
                const quarterlyFinancials = data.quarterlyFinancials;
                res.status(200).json({ annualFinancials, quarterlyFinancials });
            } catch (error) {
                const errObj = handleError(error, 'GET /:ticker/financials', {
                    ticker: req.params.ticker ? req.params.ticker : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // Endpoint that retrieves watch panel data for a user
    app.get('/watchpanel/:user',
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /watchpanel/:user',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const username = req.params.user;
                if (!username) {
                    return res.status(400).json({ message: 'Missing user parameter' });
                }
                const db = await getDB();
                const assetInfoCollection = db.collection('Users');
                const ohclvCollection = db.collection('OHCLVData');
                // Find the user's WatchPanel array
                const userDoc = await assetInfoCollection.findOne({ Username: username });
                if (!Array.isArray(userDoc.WatchPanel)) {
                    return res.status(404).json({ message: 'WatchPanel not found' });
                }
                const tickers = userDoc.WatchPanel.slice(0, 20); // Limit to 20 tickers
                const watchPanelData = [];
                for (const ticker of tickers) {
                    const data = await ohclvCollection.find({ tickerID: ticker }).sort({ timestamp: -1 }).limit(2).toArray();
                    if (data.length < 2) {
                        logger.warn({
                            msg: 'Insufficient Data Found',
                            ticker: ticker,
                            context: 'GET /watchpanel/:user',
                            statusCode: 404
                        });
                        continue;
                    }
                    const latestClose = parseFloat(data[0].close.toString().slice(0, 8));
                    const previousClose = parseFloat(data[1].close.toString().slice(0, 8));
                    const percentageChange = ((latestClose - previousClose) / previousClose) * 100;
                    watchPanelData.push({
                        Symbol: ticker,
                        percentageReturn: percentageChange.toFixed(2) + '%'
                    });
                }
                res.json(watchPanelData);
            } catch (error) {
                const errObj = handleError(error, 'GET /watchpanel/:user', {
                    user: req.params.user ? req.params.user : 'Unknown'
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // Endpoint that updates the watch panel for a user
    app.patch('/watchpanel/:user', validate([
        validationSchemas.userParam('user'),
        validationSchemas.symbolsArray()
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /watchpanel/:user',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const username = req.params.user;
            if (!username) {
                return res.status(400).json({ message: 'Missing user parameter' });
            }
            const { symbols } = req.body;
            if (!Array.isArray(symbols) || symbols.length > 20 || symbols.some(s => typeof s !== 'string')) {
                return res.status(400).json({ message: 'Invalid symbols array (must be array of max 20 strings)' });
            }
            const db = await getDB();
            const usersCollection = db.collection('Users');
            const assetInfoCollection = db.collection('AssetInfo');
            const ohclvCollection = db.collection('OHCLVData');
            // Validate all symbols exist in AssetInfo collection
            const assetDocs = await assetInfoCollection.find({ Symbol: { $in: symbols } }).toArray();
            const foundSymbols = assetDocs.map((doc: { Symbol: string }) => doc.Symbol);
            const missingSymbols = symbols.filter((s: string) => !foundSymbols.includes(s));
            if (missingSymbols.length > 0) {
                return res.status(400).json({
                    message: `Invalid symbol(s): ${missingSymbols.join(', ')}`
                });
            }
            // Update the WatchPanel array for the user
            const updateResult = await usersCollection.updateOne(
                { Username: username },
                { $set: { WatchPanel: symbols } }
            );
            if (updateResult.matchedCount === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Optionally, fetch the updated WatchPanel data as in your GET endpoint
            const watchPanelData = [];
            for (const ticker of symbols) {
                const data = await ohclvCollection.find({ tickerID: ticker }).sort({ timestamp: -1 }).limit(2).toArray();
                if (data.length < 2) continue;
                const latestClose = parseFloat(data[0].close.toString().slice(0, 8));
                const previousClose = parseFloat(data[1].close.toString().slice(0, 8));
                const percentageChange = ((latestClose - previousClose) / previousClose) * 100;
                watchPanelData.push({
                    Symbol: ticker,
                    percentageReturn: percentageChange.toFixed(2) + '%'
                });
            }
            res.json(watchPanelData);
        } catch (error) {
            const errObj = handleError(error, 'PATCH /watchpanel/:user', {
                user: req.params.user ? req.params.user : 'Unknown',
                symbols: req.body.symbols ? req.body.symbols : 'Unknown'
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // endpoint to get news for a ticker
    app.get('/:symbol/news', validate(validationSets.newsSearch), async (req: Request, res: Response) => {
        const ticker = req.params.symbol.toUpperCase();
        const sanitizedTicker = sanitizeInput(ticker);
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /:symbol/news',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const db = await getDB();
            const newsCollection = db.collection('News');
            // Find all news where the ticker is in the tickers array
            const news = await newsCollection.find({
                tickers: sanitizedTicker
            }).sort({ publishedDate: -1 }).limit(5).toArray();
            if (!news || news.length === 0) {
                return res.status(404).json({ message: 'No news found' });
            }
            res.status(200).json(news);
        } catch (error) {
            const errObj = handleError(error, 'GET /:symbol/news', {
                symbol: req.params.symbol ? req.params.symbol : 'Unknown'
            }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

};