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
            const portfolioDoc = await portfoliosCollection.findOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { projection: { trades: 1 } }
            );
            if (!portfolioDoc) {
                return res.status(404).json({ message: 'Portfolio not found' });
            }
            return res.status(200).json({ trades: portfolioDoc.trades || [] });
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
                Commission: typeof trade.Commission === 'number' ? Number(trade.Commission) : 0
            };

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
                // Create new portfolio doc if not exists
                portfolioDoc = {
                    Username: sanitizedUser,
                    Number: portfolioNumber,
                    portfolio: [],
                    trades: [],
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

            // Add trade and update cash
            const updateResult = await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                {
                    $push: { trades: processedTrade },
                    $inc: { cash: -processedTrade.Total }
                }
            );

            if (updateResult.modifiedCount === 1) {
                // Portfolio update logic
                let portfolioArr = Array.isArray(portfolioDoc.portfolio) ? portfolioDoc.portfolio : [];
                const idx = portfolioArr.findIndex(p => p.Symbol === processedTrade.Symbol);

                if (idx !== -1) {
                    // Update existing position
                    const position = portfolioArr[idx];
                    const totalShares = position.Shares + processedTrade.Shares;
                    const totalCost = (position.AvgPrice * position.Shares) + (processedTrade.Price * processedTrade.Shares);
                    const newAvgPrice = totalCost / totalShares;

                    portfolioArr[idx] = {
                        Symbol: position.Symbol,
                        Shares: totalShares,
                        AvgPrice: newAvgPrice
                    };
                } else {
                    // Add new position
                    portfolioArr.push({
                        Symbol: processedTrade.Symbol,
                        Shares: processedTrade.Shares,
                        AvgPrice: processedTrade.Price
                    });
                }

                await portfoliosCollection.updateOne(
                    { Username: sanitizedUser, Number: portfolioNumber },
                    { $set: { portfolio: portfolioArr } }
                );

                return res.status(200).json({ message: 'Trade added and portfolio updated' });
            } else {
                return res.status(400).json({ message: 'Trade not added' });
            }
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
            const portfolioDoc = await portfoliosCollection.findOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { projection: { portfolio: 1 } }
            );
            if (!portfolioDoc) {
                return res.status(404).json({ message: 'Portfolio not found' });
            }
            return res.status(200).json({ portfolio: portfolioDoc.portfolio || [] });
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

            // Reset trades, portfolio, and cash for this portfolio
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $set: { trades: [], portfolio: [], cash: 0, BaseValue: 0 } }
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
            // Add a "cash deposit" trade to trades array
            const cashTrade = {
                Date: depositDate,
                Symbol: '-',
                Action: 'Cash Deposit',
                Shares: '-',
                Price: '-',
                Total: sanitizedAmount
            };
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $push: { trades: cashTrade } }
            );
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

            // Portfolio update logic for Sell
            let portfolioArr = Array.isArray(portfolioDoc.portfolio) ? portfolioDoc.portfolio : [];
            const idx = portfolioArr.findIndex(p => p.Symbol === processedTrade.Symbol);

            if (idx === -1 || portfolioArr[idx].Shares < processedTrade.Shares) {
                return res.status(400).json({ message: 'Not enough shares to sell' });
            }

            // Add trade and update cash
            const updateResult = await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                {
                    $push: { trades: processedTrade },
                    $inc: { cash: processedTrade.Total }
                }
            );

            if (updateResult.modifiedCount === 1) {
                // Update or remove position
                const position = portfolioArr[idx];
                const remainingShares = position.Shares - processedTrade.Shares;

                if (remainingShares > 0) {
                    portfolioArr[idx] = {
                        Symbol: position.Symbol,
                        Shares: remainingShares,
                        AvgPrice: position.AvgPrice // Keep avg price unchanged for remaining shares
                    };
                } else {
                    // Remove position if all shares sold
                    portfolioArr.splice(idx, 1);
                }
                await portfoliosCollection.updateOne(
                    { Username: sanitizedUser, Number: portfolioNumber },
                    { $set: { portfolio: portfolioArr } }
                );

                return res.status(200).json({ message: 'Sell trade added and portfolio updated' });
            } else {
                return res.status(400).json({ message: 'Trade not added' });
            }
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

            // Upsert the portfolio document with new data
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                {
                    $set: {
                        portfolio: safePortfolioData,
                        trades: safeTxData,
                        cash: cash
                    }
                },
                { upsert: true }
            );

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

}