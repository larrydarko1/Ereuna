export default function (app, deps) {
    const {
        validate,
        validationSchemas,
        body,
        query,
        sanitizeInput,
        logger,
        MongoClient,
        uri
    } = deps;
    // --- GET trades for a specific portfolio ---
    app.get('/trades', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be 1-500'),
        query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be >= 0')
    ]), async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, portfolio, limit, skip } = req.query;
            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);
            const tradesLimit = limit ? Math.min(parseInt(limit, 10), 500) : 100;
            const tradesSkip = skip ? Math.max(parseInt(skip, 10), 0) : 0;

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const tradesCollection = db.collection('Trades');
            const tradesArr = await tradesCollection.find({ Username: sanitizedUser, PortfolioNumber: portfolioNumber })
                .skip(tradesSkip)
                .limit(tradesLimit)
                .toArray();
            const total = await tradesCollection.countDocuments({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });
            return res.status(200).json({
                trades: tradesArr,
                total,
                limit: tradesLimit,
                skip: tradesSkip
            });
        } catch (error) {
            logger.error({
                msg: 'An error occurred while retrieving the trade list',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.query?.username
            });
            return res.status(500).json({ message: 'An error occurred while retrieving the trade list' });
        } finally {
            if (client) await client.close();
        }
    });

    // --- POST add a trade to a specific portfolio ---
    app.post('/trades/add', validate([
        validationSchemas.username(),
        body('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        body('trade').isObject().withMessage('Trade must be an object'),
        body('trade.Symbol').isString().trim().notEmpty().withMessage('Symbol is required'),
        body('trade.Action').matches('Buy').withMessage('Action must be "Buy"'),
        body('trade.Shares').isFloat({ min: 0.01 }).withMessage('Shares must be a positive number'),
        body('trade.Price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
        body('trade.Date').isISO8601().withMessage('Date must be a valid ISO date'),
        body('trade.Total').isFloat({ min: 0 }).withMessage('Total must be a number'),
        body('trade.Commission').optional().isFloat({ min: 0 }).withMessage('Commission must be a non-negative number'),
    ]), async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, portfolio, trade } = req.body;
            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);

            const processedTrade = {
                Date: new Date(trade.Date).toISOString(),
                Symbol: String(trade.Symbol).toUpperCase().trim(),
                Action: String(trade.Action),
                Shares: Number(trade.Shares),
                Price: Number(trade.Price),
                Total: Number(trade.Total),
                Commission: typeof trade.Commission === 'number' ? Number(trade.Commission) : 0,
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber
            };

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const portfoliosCollection = db.collection('Portfolios');
            const assetInfoCollection = db.collection('AssetInfo');
            const positionsCollection = db.collection('Positions');
            const tradesCollection = db.collection('Trades');

            // Check if symbol exists
            const symbolExists = await assetInfoCollection.findOne({ Symbol: processedTrade.Symbol });
            if (!symbolExists) {
                return res.status(404).json({ message: 'Symbol not found in AssetInfo' });
            }

            // Find portfolio doc
            let portfolioDoc = await portfoliosCollection.findOne({ Username: sanitizedUser, Number: portfolioNumber });
            if (!portfolioDoc) {
                // Create new portfolio doc if not exists
                portfolioDoc = {
                    Username: sanitizedUser,
                    Number: portfolioNumber,
                    BaseValue: 0,
                    cash: 0
                };
                await portfoliosCollection.insertOne(portfolioDoc);
            }

            // Cash check
            const currentCash = typeof portfolioDoc.cash === 'number' ? portfolioDoc.cash : 0;
            if (processedTrade.Total > currentCash) {
                return res.status(400).json({ message: 'Insufficient cash balance for this trade' });
            }

            // Add trade to Trades collection
            // Enforce max 1000 trades per portfolio
            const tradeCount = await tradesCollection.countDocuments({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });
            if (tradeCount >= 1000) {
                return res.status(400).json({ message: 'Maximum number of trades (1000) reached for this portfolio.' });
            }
            await tradesCollection.insertOne(processedTrade);
            // Update cash
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $inc: { cash: -processedTrade.Total } }
            );

            // Enforce max 500 active positions per portfolio
            const position = await positionsCollection.findOne({ Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: processedTrade.Symbol });
            if (position) {
                // Update existing position
                const totalShares = position.Shares + processedTrade.Shares;
                const totalCost = (position.AvgPrice * position.Shares) + (processedTrade.Price * processedTrade.Shares);
                const newAvgPrice = totalCost / totalShares;
                await positionsCollection.updateOne(
                    { Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: processedTrade.Symbol },
                    { $set: { Shares: totalShares, AvgPrice: newAvgPrice } }
                );
            } else {
                // Check current active positions count
                const activeCount = await positionsCollection.countDocuments({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });
                if (activeCount >= 500) {
                    return res.status(400).json({ message: 'Maximum number of active positions (500) reached for this portfolio.' });
                }
                // Add new position
                await positionsCollection.insertOne({
                    Username: sanitizedUser,
                    PortfolioNumber: portfolioNumber,
                    Symbol: processedTrade.Symbol,
                    Shares: processedTrade.Shares,
                    AvgPrice: processedTrade.Price
                });
            }

            return res.status(200).json({ message: 'Trade added and portfolio updated' });
        } catch (error) {
            if (error.errors) {
                const validationErrors = error.errors.map(err => ({
                    field: err.param,
                    message: err.msg
                }));
                return res.status(400).json({ errors: validationErrors });
            }
            logger.error({
                msg: 'An error occurred while adding trade',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.body?.username
            });
            return res.status(500).json({ message: 'An error occurred while adding trade' });
        } finally {
            if (client) await client.close();
        }
    });


    // --- GET portfolio for a specific portfolio number ---
    app.get('/portfolio', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
        query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be >= 0')
    ]), async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, portfolio, limit, skip } = req.query;
            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);
            const positionsLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
            const positionsSkip = skip ? Math.max(parseInt(skip, 10), 0) : 0;

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const positionsCollection = db.collection('Positions');
            const positionsArr = await positionsCollection.find({ Username: sanitizedUser, PortfolioNumber: portfolioNumber })
                .skip(positionsSkip)
                .limit(positionsLimit)
                .toArray();
            const total = await positionsCollection.countDocuments({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });
            return res.status(200).json({
                portfolio: positionsArr,
                total,
                limit: positionsLimit,
                skip: positionsSkip
            });
        } catch (error) {
            logger.error({
                msg: 'An error occurred while retrieving the portfolio',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.query?.username
            });
            return res.status(500).json({ message: 'An error occurred while retrieving the portfolio' });
        } finally {
            if (client) await client.close();
        }
    });

    // --- DELETE portfolio (reset) for a specific portfolio number ---
    app.delete('/portfolio', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)')
    ]), async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, portfolio } = req.query;
            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const portfoliosCollection = db.collection('Portfolios');
            const positionsCollection = db.collection('Positions');
            const tradesCollection = db.collection('Trades');

            // Remove all positions and trades for this portfolio
            await positionsCollection.deleteMany({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });
            await tradesCollection.deleteMany({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });
            // Reset cash and BaseValue in Portfolios
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $set: { cash: 0, BaseValue: 0 } }
            );

            return res.status(200).json({ message: 'Portfolio and trade history reset successfully' });
        } catch (error) {
            logger.error({
                msg: 'An error occurred while resetting the portfolio',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.query?.username
            });
            return res.status(500).json({ message: 'An error occurred while resetting the portfolio' });
        } finally {
            if (client) await client.close();
        }
    });

    // --- POST add cash to a specific portfolio ---
    app.post('/portfolio/cash', [
        body('username').isString().trim().notEmpty().withMessage('Username is required')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Invalid username format'),
        body('portfolio').isInt({ min: 1, max: 10 }).withMessage('Portfolio number required (1-10)'),
        body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
        body('date').optional().isISO8601().withMessage('Date must be a valid ISO date')
    ], async (req, res) => {
        const apiKey = req.header('x-api-key');
        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            return res.status(401).json({ message: 'Unauthorized API Access' });
        }
        const { username, portfolio, amount, date } = req.body;
        const sanitizedUser = sanitizeInput(username);
        const portfolioNumber = parseInt(portfolio, 10);
        const sanitizedAmount = parseFloat(amount);
        let depositDate = new Date().toISOString();
        if (date) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                depositDate = parsedDate.toISOString();
            }
        }
        if (!sanitizedUser || !sanitizedAmount || sanitizedAmount <= 0) {
            return res.status(400).json({ message: 'Invalid input' });
        }
        let client;
        try {
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const portfoliosCollection = db.collection('Portfolios');
            // Check if BaseValue is 0, and set it to the deposit amount if so
            const portfolioDoc = await portfoliosCollection.findOne({ Username: sanitizedUser, Number: portfolioNumber });
            if (portfolioDoc && (typeof portfolioDoc.BaseValue === 'number') && portfolioDoc.BaseValue === 0) {
                await portfoliosCollection.updateOne(
                    { Username: sanitizedUser, Number: portfolioNumber },
                    { $set: { BaseValue: sanitizedAmount } }
                );
            }
            // Add cash to portfolio's cash balance
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $inc: { cash: sanitizedAmount } },
                { upsert: true }
            );
            // Add a "cash deposit" trade to Trades collection
            const tradesCollection = db.collection('Trades');
            const cashTrade = {
                Date: depositDate,
                Symbol: '-',
                Action: 'Cash Deposit',
                Shares: '-',
                Price: '-',
                Total: sanitizedAmount,
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber
            };
            await tradesCollection.insertOne(cashTrade);
            return res.status(200).json({ message: 'Cash added successfully' });
        } catch (error) {
            return res.status(500).json({ message: 'An error occurred while adding cash' });
        } finally {
            if (client) await client.close();
        }
    });

    // --- GET cash for a specific portfolio ---
    app.get('/portfolio/cash', [
        query('username').isString().trim().notEmpty().withMessage('Username is required'),
        query('portfolio').isInt({ min: 1, max: 10 }).withMessage('Portfolio number required (1-10)')
    ], async (req, res) => {
        const apiKey = req.header('x-api-key');
        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            return res.status(401).json({ message: 'Unauthorized API Access' });
        }
        const username = sanitizeInput(req.query.username);
        const portfolioNumber = parseInt(req.query.portfolio, 10);
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }
        let client;
        try {
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const portfoliosCollection = db.collection('Portfolios');
            const portfolioDoc = await portfoliosCollection.findOne(
                { Username: username, Number: portfolioNumber },
                { projection: { cash: 1, BaseValue: 1 } }
            );
            if (!portfolioDoc) {
                return res.status(404).json({ message: 'Portfolio not found' });
            }
            return res.status(200).json({
                cash: portfolioDoc.cash || 0,
                BaseValue: typeof portfolioDoc.BaseValue === 'number' ? portfolioDoc.BaseValue : 0
            });
        } catch (error) {
            return res.status(500).json({ message: 'An error occurred while retrieving cash balance' });
        } finally {
            if (client) await client.close();
        }
    });

    app.get('/quotes', async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            const symbolsParam = req.query.symbols;
            if (!symbolsParam) {
                return res.status(400).json({ message: 'Symbols parameter is required' });
            }
            const symbols = symbolsParam.split(',').map(s => sanitizeInput(s.trim().toUpperCase()));

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const assetInfoCollection = db.collection('AssetInfo');

            // Fetch all matching assets in one query
            const assets = await assetInfoCollection.find({ Symbol: { $in: symbols } }).toArray();

            // Build the result: { SYMBOL: close }
            const result = {};
            for (const asset of assets) {
                if (asset.TimeSeries && typeof asset.TimeSeries === 'object') {
                    // Get the first object in TimeSeries (assume it's sorted by date descending)
                    const timeSeriesArray = Object.values(asset.TimeSeries);
                    if (timeSeriesArray.length > 0 && timeSeriesArray[0]['4. close']) {
                        result[asset.Symbol] = parseFloat(timeSeriesArray[0]['4. close']);
                    }
                }
            }

            // For symbols not found, return null
            symbols.forEach(sym => {
                if (!(sym in result)) result[sym] = null;
            });

            return res.status(200).json(result);

        } catch (error) {
            logger.error({
                msg: 'An error occurred while retrieving quotes',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method
            });
            return res.status(500).json({ message: 'An error occurred while retrieving quotes' });
        } finally {
            if (client) await client.close();
        }
    });

    app.post('/trades/sell', validate([
        validationSchemas.username(),
        body('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        body('trade').isObject().withMessage('Trade must be an object'),
        body('trade.Symbol').isString().trim().notEmpty().withMessage('Symbol is required'),
        body('trade.Action').matches('Sell').withMessage('Action must be "Sell"'),
        body('trade.Shares').isFloat({ min: 0.01 }).withMessage('Shares must be a positive number'),
        body('trade.Price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
        body('trade.Date').isISO8601().withMessage('Date must be a valid ISO date'),
        body('trade.Total').isFloat({ min: 0 }).withMessage('Total must be a number'),
        body('trade.Commission').optional().isFloat({ min: 0 }).withMessage('Commission must be a non-negative number'),
    ]), async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, portfolio, trade } = req.body;
            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);

            const processedTrade = {
                Date: new Date(trade.Date).toISOString(),
                Symbol: String(trade.Symbol).toUpperCase().trim(),
                Action: String(trade.Action),
                Shares: Number(trade.Shares),
                Price: Number(trade.Price),
                Total: Number(trade.Total),
                Commission: typeof trade.Commission === 'number' ? Number(trade.Commission) : 0
            };

            // Prevent future-dated trades
            if (new Date(processedTrade.Date) > new Date()) {
                return res.status(400).json({ message: 'Trade date cannot be in the future' });
            }

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const portfoliosCollection = db.collection('Portfolios');
            const assetInfoCollection = db.collection('AssetInfo');

            // Check if symbol exists
            const symbolExists = await assetInfoCollection.findOne({ Symbol: processedTrade.Symbol });
            if (!symbolExists) {
                return res.status(404).json({ message: 'Symbol not found in AssetInfo' });
            }

            // Find portfolio doc
            let portfolioDoc = await portfoliosCollection.findOne({ Username: sanitizedUser, Number: portfolioNumber });
            if (!portfolioDoc) {
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            // Sell logic using Positions and Trades collections
            const positionsCollection = db.collection('Positions');
            const tradesCollection = db.collection('Trades');
            // Find position
            const position = await positionsCollection.findOne({ Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: processedTrade.Symbol });
            if (!position || position.Shares < processedTrade.Shares) {
                return res.status(400).json({ message: 'Not enough shares to sell' });
            }
            // Add trade to Trades collection
            // Enforce max 1000 trades per portfolio
            const tradeCount = await tradesCollection.countDocuments({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });
            if (tradeCount >= 1000) {
                return res.status(400).json({ message: 'Maximum number of trades (1000) reached for this portfolio.' });
            }
            await tradesCollection.insertOne({
                ...processedTrade,
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber
            });
            // Update cash
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $inc: { cash: processedTrade.Total } }
            );
            // Update or remove position
            const remainingShares = position.Shares - processedTrade.Shares;
            if (remainingShares > 0) {
                await positionsCollection.updateOne(
                    { Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: processedTrade.Symbol },
                    { $set: { Shares: remainingShares } }
                );
            } else {
                await positionsCollection.deleteOne({ Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: processedTrade.Symbol });
            }
            return res.status(200).json({ message: 'Sell trade added and portfolio updated' });
        } catch (error) {
            if (error.errors) {
                const validationErrors = error.errors.map(err => ({
                    field: err.param,
                    message: err.msg
                }));
                return res.status(400).json({ errors: validationErrors });
            }
            logger.error({
                msg: 'An error occurred while adding sell trade',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.body?.username
            });
            return res.status(500).json({ message: 'An error occurred while adding sell trade' });
        } finally {
            if (client) await client.close();
        }
    });

    // --- POST import a full portfolio (positions, trades, cash) ---
    app.post('/portfolio/import', validate([
        validationSchemas.username(),
        body('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        body('portfolioData').isArray().withMessage('portfolioData must be an array'),
        body('txData').isArray().withMessage('txData must be an array'),
        body('cash').isFloat({ min: 0 }).withMessage('Cash must be a non-negative number')
    ]), async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, portfolio, portfolioData, txData, cash } = req.body;
            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);

            // --- Backend CSV Injection & Sanitization ---
            function isDangerousCSVValue(v) {
                return typeof v === 'string' && /^[=+\-@]/.test(v) && v.length > 1;
            }
            function sanitizeRow(row) {
                const sanitized = {};
                for (const [k, v] of Object.entries(row)) {
                    sanitized[k] = typeof v === 'string' ? sanitizeInput(v) : v;
                }
                return sanitized;
            }
            // Check for dangerous values in imported data
            for (const row of [...portfolioData, ...txData]) {
                for (const v of Object.values(row)) {
                    if (isDangerousCSVValue(v)) {
                        return res.status(400).json({ message: 'Potentially dangerous value detected in import.' });
                    }
                }
            }
            // Sanitize all string fields
            const safePortfolioData = portfolioData.map(sanitizeRow);
            const safeTxData = txData.map(sanitizeRow);

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const portfoliosCollection = db.collection('Portfolios');
            const positionsCollection = db.collection('Positions');
            const tradesCollection = db.collection('Trades');

            // Upsert the portfolio document with new cash value
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $set: { cash: cash } },
                { upsert: true }
            );

            // Remove old positions/trades for this portfolio
            await positionsCollection.deleteMany({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });
            await tradesCollection.deleteMany({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });

            // Insert new positions (enforce max 500)
            if (safePortfolioData.length) {
                if (safePortfolioData.length > 500) {
                    return res.status(400).json({ message: 'Cannot import more than 500 active positions per portfolio.' });
                }
                const posDocs = safePortfolioData.map(pos => ({
                    Username: sanitizedUser,
                    PortfolioNumber: portfolioNumber,
                    Symbol: pos.Symbol,
                    Shares: pos.Shares,
                    AvgPrice: pos.AvgPrice
                }));
                await positionsCollection.insertMany(posDocs);
            }
            // Insert new trades
            if (safeTxData.length) {
                if (safeTxData.length > 1000) {
                    return res.status(400).json({ message: 'Cannot import more than 1000 trades per portfolio.' });
                }
                const tradeDocs = safeTxData.map(trade => ({
                    ...trade,
                    Username: sanitizedUser,
                    PortfolioNumber: portfolioNumber
                }));
                await tradesCollection.insertMany(tradeDocs);
            }

            return res.status(200).json({ message: 'Portfolio imported successfully' });
        } catch (error) {
            logger.error({
                msg: 'An error occurred while importing portfolio',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.body?.username
            });
            return res.status(500).json({ message: 'An error occurred while importing portfolio' });
        } finally {
            if (client) await client.close();
        }
    });

    // --- GET portfolio summary for a specific portfolio number ---
    app.get('/portfolio/summary', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)')
    ]), async (req, res) => {
        let client;
        const startTime = Date.now();
        logger.info('[DEBUG] /portfolio/summary called', { query: req.query });
        try {
            const t0 = Date.now();
            logger.info('[DEBUG] Step: API key validation');
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            logger.info('[DEBUG] Step: Query parsing');
            const { username, portfolio } = req.query;
            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);

            logger.info('[DEBUG] Step: DB connect');
            client = new MongoClient(uri);
            await client.connect();
            logger.info('[DEBUG] Step: DB connected', { duration: Date.now() - t0 });
            const db = client.db('EreunaDB');
            const portfoliosCollection = db.collection('Portfolios');
            const assetInfoCollection = db.collection('AssetInfo');

            logger.info('[DEBUG] Step: Portfolio doc query');
            const t1 = Date.now();
            // Get cash and baseValue from Portfolios
            const portfolioDoc = await portfoliosCollection.findOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { projection: { cash: 1, BaseValue: 1 } }
            );
            logger.info('[DEBUG] Step: Portfolio doc loaded', { duration: Date.now() - t1 });
            if (!portfolioDoc) {
                logger.warn('[DEBUG] Portfolio not found');
                return res.status(404).json({ message: 'Portfolio not found' });
            }
            const cash = typeof portfolioDoc.cash === 'number' ? portfolioDoc.cash : 0;
            const baseValue = typeof portfolioDoc.BaseValue === 'number' ? portfolioDoc.BaseValue : 0;
            // Get positions from Positions collection (projection)
            const positionsCollection = db.collection('Positions');
            const tPosStart = Date.now();
            const portfolioArr = await positionsCollection.find(
                { Username: sanitizedUser, PortfolioNumber: portfolioNumber },
                { projection: { Symbol: 1, Shares: 1, AvgPrice: 1 } }
            ).toArray();
            logger.info('[DEBUG] Positions query done', { duration: Date.now() - tPosStart, portfolioArrLen: portfolioArr.length });

            // Get trades from Trades collection (projection)
            const tradesCollection = db.collection('Trades');
            const tTradesStart = Date.now();
            const tradesArr = await tradesCollection.find(
                { Username: sanitizedUser, PortfolioNumber: portfolioNumber },
                { projection: { Symbol: 1, Action: 1, Shares: 1, Price: 1, Total: 1, Date: 1 } }
            ).toArray();
            logger.info('[DEBUG] Trades query done', { duration: Date.now() - tTradesStart, tradesArrLen: tradesArr.length });
            logger.info('[DEBUG] Portfolio array lengths', {
                portfolioArrLen: portfolioArr.length,
                tradesArrLen: tradesArr.length,
                cash,
                baseValue
            });

            // Get latest quotes for all symbols in portfolio from OHCLVData
            const symbols = portfolioArr.map(pos => pos.Symbol);
            logger.info('[DEBUG] Symbols array length', { symbolsLen: symbols.length });
            let quotes = {};
            const MAX_SYMBOLS = 5000;
            if (symbols.length > 0) {
                logger.info('[DEBUG] Step: OHCLVData query', {
                    symbolsLen: symbols.length,
                    symbolsSample: symbols.slice(0, 10),
                    maxSymbols: MAX_SYMBOLS
                });
                if (symbols.length > MAX_SYMBOLS) {
                    logger.error('[DEBUG] Too many symbols requested', { symbolsLen: symbols.length });
                    return res.status(400).json({ message: `Too many symbols requested (max ${MAX_SYMBOLS})` });
                }
                const t2 = Date.now();
                const OHCLVDataCollection = db.collection('OHCLVData');
                // Batch query for all symbols
                const batchSize = 500;
                for (let i = 0; i < symbols.length; i += batchSize) {
                    const batch = symbols.slice(i, i + batchSize);
                    // For each symbol in batch, get latest close price
                    const docs = await OHCLVDataCollection.aggregate([
                        { $match: { tickerID: { $in: batch } } },
                        { $sort: { timestamp: -1 } },
                        { $group: { _id: "$tickerID", doc: { $first: "$$ROOT" } } },
                        { $project: { tickerID: "$_id", close: "$doc.close" } }
                    ]).toArray();
                    docs.forEach(doc => {
                        quotes[doc.tickerID] = doc.close;
                    });
                }
                const totalQueryTime = Date.now() - t2;
                logger.info('[DEBUG] Step: OHCLVData loaded', { duration: totalQueryTime, quotesLen: Object.keys(quotes).length });
                if (totalQueryTime > 10000) {
                    logger.warn('[DEBUG] OHCLVData query slow', { totalQueryTime });
                }
            }
            logger.info('[DEBUG] Quotes object keys', { quotesLen: Object.keys(quotes).length });

            // --- Optimized summary stats calculation ---
            let totalPortfolioValue = cash;
            let activePositionsValue = 0;
            let totalPL = 0;
            let unrealizedPL = 0;
            let pieChartLabels = [];
            let pieChartData = [];

            logger.info('[DEBUG] Step: Portfolio positions loop', { portfolioArrLen: portfolioArr.length });
            const t3 = Date.now();
            portfolioArr.forEach((pos, idx) => {
                if (idx % 100 === 0) logger.info(`[DEBUG] Position loop idx: ${idx}`);
                const quote = quotes[pos.Symbol];
                if (quote !== undefined && typeof pos.Shares === 'number') {
                    const positionValue = quote * pos.Shares;
                    activePositionsValue += positionValue;
                    totalPortfolioValue += positionValue;
                    pieChartLabels.push(pos.Symbol);
                    pieChartData.push(positionValue);
                    if (typeof pos.AvgPrice === 'number') {
                        const pl = (quote - pos.AvgPrice) * pos.Shares;
                        totalPL += pl;
                        unrealizedPL += pl;
                    }
                }
            });
            logger.info('[DEBUG] Step: Portfolio positions loop done', { duration: Date.now() - t3 });
            if (cash > 0) {
                pieChartLabels.push('CASH');
                pieChartData.push(cash);
            }

            // --- Additional stats ---
            logger.info('[DEBUG] Step: computeRealizedPL');
            function computeRealizedPL(trades) {
                let realized = 0;
                let lots = {};
                for (const tx of trades) {
                    if (!tx.Symbol || !tx.Action) continue;
                    if (tx.Action === 'Buy') {
                        lots[tx.Symbol] = lots[tx.Symbol] || [];
                        lots[tx.Symbol].push({ shares: tx.Shares, price: tx.Price });
                    } else if (tx.Action === 'Sell') {
                        let sharesToSell = tx.Shares;
                        lots[tx.Symbol] = lots[tx.Symbol] || [];
                        while (sharesToSell > 0 && lots[tx.Symbol].length > 0) {
                            let lot = lots[tx.Symbol][0];
                            let sellShares = Math.min(lot.shares, sharesToSell);
                            realized += (tx.Price - lot.price) * sellShares;
                            lot.shares -= sellShares;
                            sharesToSell -= sellShares;
                            if (lot.shares === 0) lots[tx.Symbol].shift();
                        }
                    }
                }
                return realized;
            }

            logger.info('[DEBUG] Step: getClosedPositions');
            function getClosedPositions(trades) {
                const txs = trades.filter(tx => tx.Date).sort((a, b) => new Date(a.Date) - new Date(b.Date));
                const positions = [];
                const lots = {};
                for (const tx of txs) {
                    if (!tx.Symbol || !tx.Action) continue;
                    if (tx.Action === 'Buy') {
                        lots[tx.Symbol] = lots[tx.Symbol] || [];
                        lots[tx.Symbol].push({ shares: tx.Shares, price: tx.Price, date: tx.Date });
                    } else if (tx.Action === 'Sell') {
                        let sharesToSell = tx.Shares;
                        lots[tx.Symbol] = lots[tx.Symbol] || [];
                        while (sharesToSell > 0 && lots[tx.Symbol].length > 0) {
                            let lot = lots[tx.Symbol][0];
                            let sellShares = Math.min(lot.shares, sharesToSell);
                            positions.push({
                                symbol: tx.Symbol,
                                buyDate: lot.date,
                                sellDate: tx.Date,
                                buyPrice: lot.price,
                                sellPrice: tx.Price,
                                shares: sellShares,
                                pnl: ((tx.Price - lot.price) / lot.price) * 100,
                                holdDays: Math.max(0, Math.round((new Date(tx.Date) - new Date(lot.date)) / (1000 * 60 * 60 * 24)))
                            });
                            lot.shares -= sellShares;
                            sharesToSell -= sellShares;
                            if (lot.shares === 0) lots[tx.Symbol].shift();
                        }
                    }
                }
                logger.info('[DEBUG] getClosedPositions done', { positionsLen: positions.length });
                return positions;
            }

            logger.info('[DEBUG] Step: computeAvgPositionSize');
            function computeAvgPositionSize(trades, baseValue) {
                const buys = trades.filter(tx => tx.Action === 'Buy' && tx.Total && tx.Date);
                logger.info('[DEBUG] computeAvgPositionSize buys', { buysLen: buys.length });
                if (!buys.length) return '0.00';
                let avgPercents = [];
                for (const buy of buys) {
                    const txsUpToBuy = trades.filter(tx => tx.Date && new Date(tx.Date) <= new Date(buy.Date));
                    let cash = 0;
                    let holdings = {};
                    for (const tx of txsUpToBuy) {
                        if (tx.Action === 'Buy') {
                            holdings[tx.Symbol] = (holdings[tx.Symbol] || 0) + tx.Shares;
                            cash -= tx.Total;
                        } else if (tx.Action === 'Sell') {
                            holdings[tx.Symbol] = (holdings[tx.Symbol] || 0) - tx.Shares;
                            cash += tx.Total;
                        } else if (tx.Action === 'Cash Deposit') {
                            cash += tx.Total;
                        }
                    }
                    let positionsValue = 0;
                    for (const [symbol, shares] of Object.entries(holdings)) {
                        let price = 0;
                        for (let i = txsUpToBuy.length - 1; i >= 0; i--) {
                            if (txsUpToBuy[i].Symbol === symbol && txsUpToBuy[i].Action === 'Buy') {
                                price = txsUpToBuy[i].Price;
                                break;
                            }
                        }
                        positionsValue += shares * price;
                    }
                    const portfolioValueAtBuy = positionsValue + cash;
                    if (portfolioValueAtBuy > 0) {
                        avgPercents.push((buy.Total / portfolioValueAtBuy) * 100);
                    }
                }
                logger.info('[DEBUG] computeAvgPositionSize done', { avgPercentsLen: avgPercents.length });
                if (!avgPercents.length) return '0.00';
                return (avgPercents.reduce((a, b) => a + b, 0) / avgPercents.length).toFixed(2);
            }

            // Winner/loser/breakeven stats
            const t4 = Date.now();
            const closedPositions = getClosedPositions(tradesArr);
            logger.info('[DEBUG] closedPositions array', { closedPositionsLen: closedPositions.length, duration: Date.now() - t4 });
            const winnerCount = closedPositions.filter(p => p.pnl > 0).length;
            const loserCount = closedPositions.filter(p => p.pnl < 0).length;
            const breakevenCount = closedPositions.filter(p => Number(p.pnl) === 0).length;
            const totalClosed = closedPositions.length;
            const winnerPercent = totalClosed ? ((winnerCount / totalClosed) * 100).toFixed(2) : '0.00';
            const loserPercent = totalClosed ? ((loserCount / totalClosed) * 100).toFixed(2) : '0.00';
            const breakevenPercent = totalClosed ? ((breakevenCount / totalClosed) * 100).toFixed(2) : '0.00';

            // Average hold time for winners/losers
            const avgHoldTimeWinners = winnerCount ? (closedPositions.filter(p => p.pnl > 0).reduce((sum, p) => sum + p.holdDays, 0) / winnerCount).toFixed(1) : '0.0';
            const avgHoldTimeLosers = loserCount ? (closedPositions.filter(p => p.pnl < 0).reduce((sum, p) => sum + p.holdDays, 0) / loserCount).toFixed(1) : '0.0';

            // Average gain/loss
            const avgGain = winnerCount ? (closedPositions.filter(p => p.pnl > 0).reduce((sum, p) => sum + p.pnl, 0) / winnerCount).toFixed(2) : '0.00';
            const avgLoss = loserCount ? (closedPositions.filter(p => p.pnl < 0).reduce((sum, p) => sum + p.pnl, 0) / loserCount).toFixed(2) : '0.00';

            // Gain/Loss Ratio
            const gainLossRatio = avgLoss !== '0.00' ? (Math.abs(Number(avgGain)) / Math.abs(Number(avgLoss))).toFixed(2) : '-';
            // Risk/Reward Ratio
            const riskRewardRatio = avgGain !== '0.00' ? (Math.abs(Number(avgLoss)) / Math.abs(Number(avgGain))).toFixed(2) : '-';

            // Average gain/loss absolute
            const avgGainAbs = winnerCount ? (closedPositions.filter(p => p.pnl > 0).reduce((sum, p) => sum + ((p.sellPrice - p.buyPrice) * p.shares), 0) / winnerCount).toFixed(2) : '0.00';
            const avgLossAbs = loserCount ? (closedPositions.filter(p => p.pnl < 0).reduce((sum, p) => sum + Math.abs((p.sellPrice - p.buyPrice) * p.shares), 0) / loserCount).toFixed(2) : '0.00';

            // Profit factor
            const grossProfit = closedPositions.filter(p => p.pnl > 0).reduce((sum, p) => sum + ((p.sellPrice - p.buyPrice) * p.shares), 0);
            const grossLoss = closedPositions.filter(p => p.pnl < 0).reduce((sum, p) => sum + Math.abs((p.sellPrice - p.buyPrice) * p.shares), 0);
            const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? '∞' : '-') : (grossProfit / grossLoss).toFixed(2);

            // Sortino ratio (using riskFreeRate = 0.02)
            const riskFreeRate = 0.02;
            const returns = closedPositions.map(p => p.pnl / 100);
            const avgReturn = returns.length ? (returns.reduce((a, b) => a + b, 0) / returns.length) : 0;
            const downsideReturns = returns.filter(r => r < riskFreeRate);
            const downsideDev = downsideReturns.length ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + Math.pow(r - riskFreeRate, 2), 0) / downsideReturns.length) : 0;
            const sortinoRatio = downsideDev === 0 ? (avgReturn > riskFreeRate ? '∞' : '-') : ((avgReturn - riskFreeRate) / downsideDev).toFixed(2);

            // Percentages
            const totalPLValue = baseValue ? totalPortfolioValue - baseValue : 0;
            const totalPLPercent = baseValue ? ((totalPLValue / baseValue) * 100).toFixed(2) : '';
            const unrealizedPLPercent = baseValue ? ((unrealizedPL / baseValue) * 100).toFixed(2) : '';
            const realizedPL = computeRealizedPL(tradesArr);
            const realizedPLPercent = baseValue ? ((realizedPL / baseValue) * 100).toFixed(2) : '';
            const avgPositionSize = computeAvgPositionSize(tradesArr, baseValue);

            // Biggest winner/loser
            let biggestWinner = { ticker: null, amount: null, tradeCount: 0 };
            let biggestLoser = { ticker: null, amount: null, tradeCount: 0 };
            if (closedPositions.length) {
                const plByTicker = {};
                const tradeCounts = {};
                for (const p of closedPositions) {
                    plByTicker[p.symbol] = (plByTicker[p.symbol] || 0) + ((p.sellPrice - p.buyPrice) * p.shares);
                    tradeCounts[p.symbol] = (tradeCounts[p.symbol] || 0) + 1;
                }
                let maxTicker = null, maxPL = -Infinity;
                let minTicker = null, minPL = Infinity;
                for (const [ticker, pl] of Object.entries(plByTicker)) {
                    if (pl > maxPL) { maxPL = pl; maxTicker = ticker; }
                    if (pl < minPL) { minPL = pl; minTicker = ticker; }
                }
                if (maxTicker !== null) {
                    biggestWinner = {
                        ticker: maxTicker,
                        amount: maxPL.toFixed(2),
                        tradeCount: tradeCounts[maxTicker] || 0
                    };
                }
                if (minTicker !== null) {
                    biggestLoser = {
                        ticker: minTicker,
                        amount: Math.abs(minPL).toFixed(2),
                        tradeCount: tradeCounts[minTicker] || 0
                    };
                }
            }

            // totalPortfolioValue2 = positions + cash
            const totalPortfolioValue2 = activePositionsValue + cash;

            // Compose summary object
            const summary = {
                totalPortfolioValue,
                totalPortfolioValue2,
                baseValue,
                activePositions: activePositionsValue,
                cash,
                totalPL: totalPLValue,
                totalPLPercent,
                unrealizedPL,
                unrealizedPLPercent,
                realizedPL,
                realizedPLPercent,
                avgPositionSize,
                avgHoldTimeWinners,
                avgHoldTimeLosers,
                avgGain,
                avgLoss,
                avgGainAbs,
                avgLossAbs,
                gainLossRatio,
                riskRewardRatio,
                winnerCount,
                winnerPercent,
                loserCount,
                loserPercent,
                breakevenCount,
                breakevenPercent,
                profitFactor,
                sortinoRatio,
                pieChart: {
                    labels: pieChartLabels,
                    data: pieChartData
                },
                positionsCount: portfolioArr.length,
                biggestWinner,
                biggestLoser
            };
            logger.info('[DEBUG] Step: summary composed', { duration: Date.now() - startTime });

            return res.status(200).json(summary);
        } catch (error) {
            logger.error({
                msg: 'An error occurred while retrieving portfolio summary',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.query?.username
            });
            return res.status(500).json({ message: 'An error occurred while retrieving portfolio summary' });
        } finally {
            logger.info('[DEBUG] Step: finally block, closing DB');
            if (client) await client.close();
            logger.info('[DEBUG] Step: DB closed, total duration', { duration: Date.now() - startTime });
        }
    });

}