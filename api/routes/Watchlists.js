import crypto from 'crypto';
import { param } from '../utils/validationUtils.js';

export default function (app, deps) {
    const {
        validate,
        validationSchemas,
        validationSets,
        body,
        sanitizeInput,
        logger,
        obfuscateUsername,
        MongoClient,
        uri
    } = deps;

    // endpoint that retrieves watchlists (names)
    app.get('/:user/watchlists',
        validate([
            validationSchemas.userParam('user')
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
                // Sanitize user parameter
                const user = sanitizeInput(req.params.user);

                const client = new MongoClient(uri);

                try {
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Watchlists');

                    // Find user watchlists with logging
                    const userWatchlists = await collection.find({ UsernameID: user }).toArray();

                    // Log if no watchlists found
                    if (userWatchlists.length === 0) {
                        logger.warn('No watchlists found', {
                            user: obfuscateUsername(user)
                        });

                        return res.status(404).json({
                            message: 'User not found or no watchlists found'
                        });
                    }
                    // Send watchlists with additional security
                    res.status(200).json(userWatchlists.map(watchlist => ({
                        ...watchlist,
                        // Optionally remove any sensitive fields
                        _id: undefined // Remove MongoDB internal ID if needed
                    })));

                } catch (dbError) {
                    // Log database-specific errors
                    logger.error('Database error retrieving watchlists', {
                        user: obfuscateUsername(user),
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
                        error: 'Failed to retrieve watchlists'
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
                logger.error('Unexpected error in watchlists retrieval', {
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

    // endpoint that retrieves content of watchlists based on the selected name 
    app.get('/:user/watchlists/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.watchlistName()
        ]),
        async (req, res) => {
            try {
                const user = sanitizeInput(req.params.user);
                const list = sanitizeInput(req.params.list);
                const client = new MongoClient(uri);

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
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Watchlists');

                    const Watchlists = await collection.findOne({ UsernameID: user, Name: list });

                    if (!Watchlists) {
                        logger.warn('Watchlist not found', {
                            user: obfuscateUsername(user),
                            list: list
                        });

                        return res.status(404).json({
                            message: 'Watchlist not found'
                        });
                    }

                    res.status(200).json(Watchlists.List);

                } catch (dbError) {
                    logger.error('Database error retrieving watchlist', {
                        user: obfuscateUsername(user),
                        list: list,
                        error: dbError.message
                    });

                    return res.status(500).json({
                        message: 'Internal Server Error',
                        error: 'Failed to retrieve watchlist'
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
                logger.error('Unexpected error in watchlist retrieval', {
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


    // Retrieves OHCLV for multiple elements inside the watchlist
    app.get('/data-values', async (req, res) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Accept comma-separated tickers in the query string
            const tickersParam = req.query.tickers;
            if (!tickersParam) {
                return res.status(400).json({ message: 'No tickers provided' });
            }
            const tickers = tickersParam.split(',').map(sanitizeInput);

            const client = new MongoClient(uri);
            try {
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('OHCLVData');

                // Fetch latest two docs for each ticker
                const results = {};
                for (const ticker of tickers) {
                    const documents = await collection.find({ tickerID: ticker })
                        .sort({ timestamp: -1 })
                        .limit(2)
                        .toArray();

                    if (documents.length > 0) {
                        const latest = documents[0];
                        const responseData = {
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
            } catch (dbError) {
                logger.error('Database error retrieving data', { error: dbError.message });
                res.status(500).json({ message: 'Internal Server Error', error: 'Failed to retrieve data' });
            } finally {
                try {
                    await client.close();
                } catch (closeError) {
                    logger.error('Error closing database connection', { error: closeError.message });
                }
            }
        } catch (unexpectedError) {
            logger.error('Unexpected error in data retrieval', { error: unexpectedError.message, stack: unexpectedError.stack });
            res.status(500).json({ message: 'Internal Server Error', error: 'An unexpected error occurred' });
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
                const list = sanitizeInput(req.params.list);
                const user = sanitizeInput(req.params.user);
                const { Name, symbol } = req.body;
                const sanitizedSymbol = sanitizeInput(symbol.toUpperCase());
                const sanitizedName = sanitizeInput(Name);

                const client = new MongoClient(uri);

                try {
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Watchlists');

                    // Verify watchlist exists and belongs to the user
                    const watchlist = await collection.findOne({
                        Name: sanitizedName,
                        UsernameID: user
                    });

                    if (!watchlist) {
                        return res.status(404).json({
                            message: 'Watchlist not found',
                            details: 'The specified watchlist does not exist or you do not have access to it'
                        });
                    }

                    // Check if watchlist has reached maximum number of symbols (100)
                    if (watchlist.List && watchlist.List.length >= 100) {
                        return res.status(400).json({
                            message: 'Limit reached, cannot add more than 100 symbols per watchlist',
                            details: 'Maximum of 100 symbols per watchlist'
                        });
                    }

                    // Check if symbol already exists in the watchlist
                    if (watchlist.List && watchlist.List.includes(sanitizedSymbol)) {
                        return res.status(409).json({
                            message: 'Symbol already exists in the watchlist',
                            symbol: sanitizedSymbol
                        });
                    }

                    // Verify symbol exists in AssetInfo collection
                    const assetInfoCollection = db.collection('AssetInfo');
                    const assetExists = await assetInfoCollection.findOne({ Symbol: sanitizedSymbol });

                    if (!assetExists) {
                        return res.status(404).json({
                            message: 'Symbol not found',
                            symbol: sanitizedSymbol
                        });
                    }

                    // Add symbol to watchlist
                    const result = await collection.updateOne(
                        { Name: sanitizedName, UsernameID: user },
                        {
                            $addToSet: { List: sanitizedSymbol },
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
                        logger.warn('Failed to add symbol to watchlist', {
                            user: user,
                            listName: sanitizedName,
                            symbol: sanitizedSymbol
                        });

                        res.status(500).json({
                            message: 'Failed to update watchlist',
                            details: 'An unexpected error occurred while adding the symbol'
                        });
                    }
                } catch (dbError) {
                    logger.error('Database error in adding symbol to watchlist', {
                        user: user,
                        listName: sanitizedName,
                        symbol: sanitizedSymbol,
                        error: dbError.message
                    });

                    res.status(500).json({
                        message: 'Internal Server Error',
                        error: 'Failed to add symbol to watchlist'
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
                logger.error('Unexpected error in adding symbol to watchlist', {
                    error: unexpectedError.message,
                    stack: unexpectedError.stack
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: 'An unexpected error occurred'
                });
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
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method,
                path: req.path
            });

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
                const list = sanitizeInput(req.params.list);
                const ticker = sanitizeInput(req.params.ticker).toUpperCase();
                const user = sanitizeInput(req.params.user);

                const client = new MongoClient(uri);

                try {
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Watchlists');

                    // Verify watchlist exists and belongs to the user
                    const watchlist = await collection.findOne({
                        Name: list,
                        UsernameID: user
                    });

                    if (!watchlist) {
                        requestLogger.warn('Watchlist not found', {
                            user: obfuscateUsername(user),
                            list
                        });
                        return res.status(404).json({
                            message: 'Watchlist not found',
                            details: 'The specified watchlist does not exist or you do not have access to it'
                        });
                    }

                    // Check if ticker exists in the watchlist
                    if (!watchlist.List || !watchlist.List.includes(ticker)) {
                        requestLogger.warn('Ticker not found in watchlist', {
                            user: obfuscateUsername(user),
                            list,
                            ticker
                        });
                        return res.status(404).json({
                            message: 'Ticker not found in the watchlist'
                        });
                    }

                    const filter = { Name: list, UsernameID: user };
                    const update = {
                        $pull: { List: ticker },
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
                        requestLogger.warn('Failed to delete ticker', {
                            user: obfuscateUsername(user),
                            list,
                            ticker
                        });

                        res.status(500).json({
                            message: 'Failed to delete ticker',
                            details: 'An unexpected error occurred while deleting the symbol'
                        });
                    }
                } catch (dbError) {
                    requestLogger.error('Database error in deleting ticker', {
                        user: obfuscateUsername(user),
                        list,
                        ticker,
                        error: dbError.message
                    });

                    res.status(500).json({
                        message: 'Internal Server Error',
                        error: 'Failed to delete ticker from watchlist'
                    });
                } finally {
                    try {
                        await client.close();
                    } catch (closeError) {
                        requestLogger.error('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }
            } catch (unexpectedError) {
                requestLogger.error('Unexpected error in deleting ticker', {
                    error: unexpectedError.message,
                    stack: unexpectedError.stack
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: 'An unexpected error occurred'
                });
            }
        }
    );

    // endpoint that deletes selected watchlist
    app.delete('/:user/delete/watchlists/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.watchlistName()
        ]),
        async (req, res) => {
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method
            });

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
                const list = sanitizeInput(req.params.list);
                const user = sanitizeInput(req.params.user);

                const client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Watchlists');

                const filter = { Name: list, UsernameID: user };

                const result = await collection.deleteOne(filter);

                if (result.deletedCount === 0) {
                    requestLogger.warn('Attempted to delete a non-existent watchlist', {
                        user: obfuscateUsername(user),
                        list: '[masked]'
                    });
                    return res.status(404).json({ message: 'Watchlist not found' });
                }

                res.send({ message: 'Watchlist deleted successfully' });

                await client.close();
            } catch (error) {
                requestLogger.error('Error deleting watchlist', {
                    error: error.message,
                    stack: error.stack
                });
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });

    // endpoint that creates a new watchlist 
    app.post('/:user/create/watchlists/:list',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.watchlistName()
        ]),
        async (req, res) => {
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method,
            });

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
                const list = sanitizeInput(req.params.list);
                const user = sanitizeInput(req.params.user);

                // Log the attempt to create a new watchlist
                requestLogger.info('Create watchlist attempt', {
                    user: obfuscateUsername(user),
                    list
                });

                const client = new MongoClient(uri);

                try {
                    await client.connect();

                    const db = client.db('EreunaDB');
                    const collection = db.collection('Watchlists');

                    // Check how many watchlists the user already has
                    const existingWatchlistsCount = await collection.countDocuments({ UsernameID: user });

                    if (existingWatchlistsCount >= 20) {
                        requestLogger.warn('Watchlist creation limit reached', {
                            user: obfuscateUsername(user),
                            existingWatchlistsCount
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
                        requestLogger.warn('Watchlist with same name already exists', {
                            user: obfuscateUsername(user),
                            list
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
                        requestLogger.warn('Failed to create watchlist', {
                            user: obfuscateUsername(user),
                            list
                        });

                        res.status(500).json({
                            message: 'Error creating watchlist',
                            details: 'An unexpected error occurred while creating the watchlist'
                        });
                    }
                } catch (dbError) {
                    requestLogger.error('Database error in creating watchlist', {
                        user: obfuscateUsername(user),
                        list,
                        error: dbError.message
                    });

                    res.status(500).json({
                        message: 'Internal Server Error',
                        error: 'Failed to create watchlist'
                    });
                } finally {
                    try {
                        await client.close();
                    } catch (closeError) {
                        requestLogger.error('Error closing database connection', {
                            error: closeError.message
                        });
                    }
                }
            } catch (unexpectedError) {
                requestLogger.error('Unexpected error in creating watchlist', {
                    error: unexpectedError.message,
                    stack: unexpectedError.stack
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: 'An unexpected error occurred'
                });
            }
        }
    );

    // endpoint that renames selected watchlist 
    app.patch('/:user/rename/watchlists/:oldname',
        validate([
            validationSchemas.userParam('user'),
            validationSchemas.newname()
        ]),
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method
            });

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
                const oldname = sanitizeInput(req.params.oldname);
                const newname = sanitizeInput(req.body.newname);
                const Username = sanitizeInput(req.params.user);

                if (!newname) {
                    requestLogger.warn('Attempt to rename watchlist with empty name', {
                        user: obfuscateUsername(Username),
                        oldname: '[masked]'
                    });
                    return res.status(400).json({ message: 'Please provide a new name' });
                }

                const client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Watchlists');

                const filter = { UsernameID: Username, Name: oldname };
                const updateDoc = { $set: { Name: newname } };

                const result = await collection.updateOne(filter, updateDoc);

                if (result.modifiedCount === 0) {
                    requestLogger.warn('Watchlist not found for renaming', {
                        user: obfuscateUsername(Username),
                        oldname: '[masked]',
                        newname: '[masked]'
                    });
                    return res.status(404).json({ message: 'Watchlist not found' });
                }

                client.close();
                res.json({ message: 'Watchlist renamed successfully' });
            } catch (error) {
                requestLogger.error('Error renaming watchlist', {
                    error: error.message,
                    stack: error.stack
                });
                res.status(500).json({ message: 'Internal Server Error' });
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
                .custom((value) => {
                    if (!value.every(item => typeof item === 'string' && item.length <= 12)) {
                        throw new Error('Each list item must be a string with max 12 characters');
                    }
                    return true;
                })
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
                const user = sanitizeInput(req.body.user);
                const Name = sanitizeInput(req.params.Name);
                const newListOrder = req.body.newListOrder.map(item => sanitizeInput(item));

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Watchlists');

                const filter = { UsernameID: user, Name: Name };
                const update = { $set: { List: newListOrder } };

                const result = await collection.updateOne(filter, update, { upsert: true });

                if (result.upsertedCount === 1) {
                } else if (result.modifiedCount === 1) {
                } else {
                    logger.warn({
                        msg: 'No Matching Watchlist Found',
                        requestId: requestId,
                        user: obfuscateUsername(user),
                        watchlistName: Name
                    });
                    return res.status(404).json({ message: 'Watchlist not found' });
                }

                res.send({
                    message: 'Watchlist order updated successfully',
                    requestId: requestId
                });

            } catch (error) {
                // Comprehensive error logging
                logger.error({
                    msg: 'Error Updating Watchlist Order',
                    requestId: requestId,
                    user: req.body.user ? obfuscateUsername(req.body.user) : 'Unknown',
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
                const isAdding = req.params.isAdding === 'true';
                const watchlistName = sanitizeInput(req.body.watchlistName);
                const symbol = sanitizeInput(req.body.symbol);
                const user = sanitizeInput(req.body.user);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Watchlists');

                // Verify watchlist exists and belongs to the user
                const watchlist = await collection.findOne({
                    Name: watchlistName,
                    UsernameID: user
                });

                if (!watchlist) {
                    logger.warn({
                        msg: 'Watchlist Not Found',
                        requestId: requestId,
                        user: obfuscateUsername(user),
                        watchlistName: watchlistName
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
                    // Add the symbol to the List array if it doesn't exist
                    result = await collection.updateOne(
                        { Name: watchlistName, UsernameID: user },
                        { $addToSet: { List: symbol } }
                    );
                } else {
                    // Remove the symbol from the List array
                    result = await collection.updateOne(
                        { Name: watchlistName },
                        { $pull: { List: symbol } }
                    );
                }

                if (result.matchedCount === 0) {
                    logger.warn({
                        msg: 'Watchlist Not Found',
                        requestId: requestId,
                        user: obfuscateUsername(user),
                        watchlistName: watchlistName
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
                        : 'Ticker removed successfully',
                    requestId: requestId
                });

            } catch (error) {
                // Comprehensive error logging
                logger.error({
                    msg: 'Error Updating Watchlist Ticker',
                    requestId: requestId,
                    user: req.body.user ? obfuscateUsername(req.body.user) : 'Unknown',
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

    // endpoint that retrieves watchlists for a specific user
    app.get('/:user/full-watchlists',
        validate([
            param('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
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
                const user = sanitizeInput(req.params.user);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Watchlists');

                // Find all watchlists for the given user
                const userWatchlists = await collection.find({ UsernameID: user }, { projection: { _id: 0, Name: 1, List: 1 } }).toArray();

                if (userWatchlists.length === 0) {
                    // Log no watchlists found
                    logger.warn({
                        msg: 'No Watchlists Found',
                        requestId: requestId,
                        user: obfuscateUsername(user)
                    });

                    res.status(404).json({ message: 'No watchlists found for the user' });
                    return;
                }

                res.send(userWatchlists);

            } catch (error) {
                // Log error
                logger.error({
                    msg: 'Error Retrieving Watchlists',
                    requestId: requestId,
                    user: req.params.user ? obfuscateUsername(req.params.user) : 'Unknown',
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

    //endpoint that retrieves exchanges for each symbol (related to assigning pictures correctly)
    app.get('/symbols-exchanges',
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
                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
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
                        requestId: requestId
                    });

                    return res.status(404).json({ message: 'No documents found' });
                }

                res.json(documents);

            } catch (error) {
                // Log detailed error
                logger.error({
                    msg: 'Error Retrieving Symbols and Exchanges',
                    requestId: requestId,
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
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
        });

    // Endpoint that retrieves the last update date
    app.get('/getlastupdate',
        async (req, res) => {
            const requestId = crypto.randomBytes(16).toString('hex');
            let client;

            // Get the API key from the request header
            const apiKey = req.header('X-API-KEY');

            // Validate the API key
            if (!apiKey || apiKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', {
                    providedApiKey: !!apiKey,
                });

                return res.status(401).json({
                    message: 'Unauthorized API Access',
                });
            }

            try {
                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('OHCLVData');

                const query = {};
                const options = {
                    sort: { timestamp: -1 },
                    limit: 1
                };
                const result = await collection.findOne(query, options);

                if (!result) {
                    logger.warn({
                        msg: 'No documents found',
                        requestId: requestId
                    });

                    return res.status(404).json({ message: 'No documents found' });
                }

                const date = result.timestamp;
                const formattedDate = date.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                res.json({ date: formattedDate });

            } catch (error) {
                // Log detailed error
                logger.error({
                    msg: 'Error Retrieving Last Update',
                    requestId: requestId,
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
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

    // Sends annual and quarterly financials
    app.get('/:ticker/financials',
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

                    if (!data || !data.AnnualFinancials || !data.quarterlyFinancials) {
                        logger.warn('No financial data found', {
                            ticker: ticker
                        });
                        return res.status(404).json({
                            message: 'No financial data found for this ticker'
                        });
                    }

                    const annualFinancials = data.AnnualFinancials;
                    const quarterlyFinancials = data.quarterlyFinancials;

                    res.status(200).json({
                        annualFinancials,
                        quarterlyFinancials
                    });

                } catch (dbError) {
                    logger.error('Database error retrieving financial data', {
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
                        error: 'Failed to retrieve financial data'
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
                logger.error('Unexpected error in financial data retrieval', {
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

    // Endpoint that retrieves watch panel data for a user
    app.get('/watchpanel/:user',
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

                const username = req.params.user;

                if (!username) {
                    return res.status(400).json({ message: 'Missing user parameter' });
                }

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
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
                            ticker: ticker
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
                logger.error({
                    msg: 'WatchPanel Data Retrieval Error',
                    error: error.message
                });

                res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            } finally {
                if (client) {
                    await client.close();
                }
            }
        }
    );

    app.patch('/watchpanel/:user', validate([
        validationSchemas.userParam('user'),
        validationSchemas.symbolsArray()
    ]), async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);

            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
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

            client = new MongoClient(uri);
            await client.connect();

            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const assetInfoCollection = db.collection('AssetInfo');
            const ohclvCollection = db.collection('OHCLVData');

            // Validate all symbols exist in AssetInfo collection
            const assetDocs = await assetInfoCollection.find({ Symbol: { $in: symbols } }).toArray();
            const foundSymbols = assetDocs.map(doc => doc.Symbol);
            const missingSymbols = symbols.filter(s => !foundSymbols.includes(s));

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
            logger.error({
                msg: 'WatchPanel PATCH Error',
                error: error.message
            });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to get news for a ticker
    app.get('/:symbol/news', validate(validationSets.newsSearch), async (req, res) => {
        const ticker = req.params.symbol.toUpperCase();
        const sanitizedTicker = sanitizeInput(ticker);

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
            const newsCollection = db.collection('News');

            // Find all news where the ticker is in the tickers array
            const news = await newsCollection.find({
                tickers: sanitizedTicker
            }).sort({ publishedDate: -1 }).toArray();

            if (!news || news.length === 0) {
                return res.status(404).json({ message: 'No news found' });
            }

            res.status(200).json(news);

            client.close();
        } catch (error) {
            logger.error({
                msg: 'News Search Error',
                error: error.message,
                symbol: sanitizedTicker
            });

            res.status(500).json({
                message: 'Internal Server Error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

};