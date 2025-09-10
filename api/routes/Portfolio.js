import { updatePortfolioStats } from '../utils/portfolioStats.js';
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

            // Update static stats
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);
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

            // Update static stats
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);
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
            // Update static stats
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);
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

    // --- GET latest quotes for active portfolio  ---
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
            // Update static stats
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);
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
        body('stats').isObject().withMessage('Stats must be an object'),
        body('positions').isArray().withMessage('Positions must be an array'),
        body('trades').isArray().withMessage('Trades must be an array')
    ]), async (req, res) => {
        let client;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', { providedApiKey: !!sanitizedKey });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, portfolio, stats, positions, trades } = req.body;
            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);

            // --- Backend CSV Injection & Sanitization ---
            function isDangerousCSVValue(v) {
                if (typeof v === 'string' && v.startsWith("'")) v = v.slice(1);
                return typeof v === 'string' && /^[=+\-@]/.test(v) && v.length > 1;
            }
            function sanitizeRow(row) {
                const sanitized = {};
                for (const [k, v] of Object.entries(row)) {
                    let value = v;
                    // Convert numeric fields to numbers
                    if (["Shares", "Price", "Total", "Commission"].includes(k)) {
                        const num = Number(value);
                        value = isNaN(num) ? 0 : num;
                    }
                    // Parse Date to ISO format if present
                    else if (k === "Date" && typeof value === "string") {
                        let dateStr = value;
                        // If date string is in the format YYYYMMDDTHH:mm:ss.sssZ, reinsert '-' at positions 4 and 7
                        if (/^\d{8}T/.test(dateStr)) {
                            dateStr = dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6) + '-' + dateStr.slice(6);
                        }
                        const parsedDate = new Date(dateStr);
                        value = isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString();
                    }
                    else if (typeof value === 'string') {
                        value = sanitizeInput(value);
                    }
                    sanitized[k] = value;
                }
                return sanitized;
            }
            // Check for dangerous values in imported data
            for (const row of [...positions, ...trades]) {
                for (let v of Object.values(row)) {
                    if (isDangerousCSVValue(v)) {
                        return res.status(400).json({ message: 'Potentially dangerous value detected in import.' });
                    }
                }
            }
            for (let v of Object.values(stats)) {
                if (isDangerousCSVValue(v)) {
                    return res.status(400).json({ message: 'Potentially dangerous value detected in import.' });
                }
            }
            // Sanitize all string fields
            const safeStats = {};
            for (const [k, v] of Object.entries(stats)) {
                safeStats[k] = typeof v === 'string' ? sanitizeInput(v) : v;
            }
            // Group biggestLoser.* and biggestWinner.* keys into nested objects
            function groupNestedStats(statsObj, baseKey) {
                const nested = {};
                Object.keys(statsObj).forEach(key => {
                    if (key.startsWith(baseKey + '.')) {
                        const subKey = key.split('.')[1];
                        nested[subKey] = statsObj[key];
                    }
                });
                // Remove flat keys
                Object.keys(nested).forEach(subKey => {
                    delete statsObj[baseKey + '.' + subKey];
                });
                // Remove flat baseKey if present
                if (statsObj.hasOwnProperty(baseKey)) {
                    delete statsObj[baseKey];
                }
                // Only set if there are subkeys
                if (Object.keys(nested).length > 0) {
                    statsObj[baseKey] = nested;
                }
            }
            groupNestedStats(safeStats, 'biggestLoser');
            groupNestedStats(safeStats, 'biggestWinner');
            // Remove unwanted lowercase fields
            delete safeStats.baseValue;
            delete safeStats.totalValue;
            delete safeStats.unrealizedPL;
            // Convert cash and BaseValue to numbers
            if (safeStats.hasOwnProperty('cash')) {
                const cashNum = Number(safeStats.cash);
                safeStats.cash = isNaN(cashNum) ? 0 : cashNum;
            }
            if (safeStats.hasOwnProperty('BaseValue')) {
                const baseValueNum = Number(safeStats.BaseValue);
                safeStats.BaseValue = isNaN(baseValueNum) ? 0 : baseValueNum;
            }
            // Convert avgHoldTimeLosers and avgHoldTimeWinners to numbers
            if (safeStats.hasOwnProperty('avgHoldTimeLosers')) {
                const losersNum = Number(safeStats.avgHoldTimeLosers);
                safeStats.avgHoldTimeLosers = isNaN(losersNum) ? 0 : losersNum;
            }
            if (safeStats.hasOwnProperty('avgHoldTimeWinners')) {
                const winnersNum = Number(safeStats.avgHoldTimeWinners);
                safeStats.avgHoldTimeWinners = isNaN(winnersNum) ? 0 : winnersNum;
            }
            const safePositions = positions.map(sanitizeRow);
            // Only keep allowed fields for positions
            const allowedPositionFields = ['Symbol', 'Shares', 'AvgPrice'];
            const safePositionsFiltered = safePositions.map(pos => {
                const filtered = {};
                for (const key of allowedPositionFields) {
                    if (pos.hasOwnProperty(key)) {
                        // Ensure Shares and AvgPrice are numbers
                        if (key === 'Shares' || key === 'AvgPrice') {
                            const num = Number(pos[key]);
                            filtered[key] = isNaN(num) ? 0 : num;
                        } else {
                            filtered[key] = pos[key];
                        }
                    }
                }
                return filtered;
            });
            const safeTrades = trades.map(sanitizeRow);

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const portfoliosCollection = db.collection('Portfolios');
            const positionsCollection = db.collection('Positions');
            const tradesCollection = db.collection('Trades');

            // Upsert the portfolio document with all stats fields
            // Always set Username and Number
            const portfolioUpdate = { ...safeStats, Username: sanitizedUser, Number: portfolioNumber };
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $set: portfolioUpdate },
                { upsert: true }
            );

            // Remove old positions/trades for this portfolio
            await positionsCollection.deleteMany({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });
            await tradesCollection.deleteMany({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });

            // Insert new positions (enforce max 500)
            if (safePositionsFiltered.length) {
                if (safePositionsFiltered.length > 500) {
                    return res.status(400).json({ message: 'Cannot import more than 500 active positions per portfolio.' });
                }
                const posDocs = safePositionsFiltered.map(pos => ({
                    ...pos,
                    Username: sanitizedUser,
                    PortfolioNumber: portfolioNumber
                }));
                await positionsCollection.insertMany(posDocs);
            }
            // Insert new trades
            if (safeTrades.length) {
                if (safeTrades.length > 1000) {
                    return res.status(400).json({ message: 'Cannot import more than 1000 trades per portfolio.' });
                }
                const tradeDocs = safeTrades.map(trade => ({
                    ...trade,
                    Username: sanitizedUser,
                    PortfolioNumber: portfolioNumber
                }));
                await tradesCollection.insertMany(tradeDocs);
            }

            // Update static stats
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);
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

            // Get static stats from Portfolios
            const portfolioDoc = await portfoliosCollection.findOne(
                { Username: sanitizedUser, Number: portfolioNumber }
            );
            if (!portfolioDoc) {
                logger.warn('[DEBUG] Portfolio not found');
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            // Get positions for pie chart and value calculations
            const portfolioArr = await positionsCollection.find(
                { Username: sanitizedUser, PortfolioNumber: portfolioNumber },
                { projection: { Symbol: 1, Shares: 1, AvgPrice: 1 } }
            ).toArray();

            // Get latest quotes for all symbols in portfolio from OHCLVData
            const symbols = portfolioArr.map(pos => pos.Symbol);
            let quotes = {};
            const MAX_SYMBOLS = 5000;
            if (symbols.length > 0) {
                if (symbols.length > MAX_SYMBOLS) {
                    logger.error('[DEBUG] Too many symbols requested', { symbolsLen: symbols.length });
                    return res.status(400).json({ message: `Too many symbols requested (max ${MAX_SYMBOLS})` });
                }
                const OHCLVDataCollection = db.collection('OHCLVData');
                const batchSize = 500;
                for (let i = 0; i < symbols.length; i += batchSize) {
                    const batch = symbols.slice(i, i + batchSize);
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
            }

            // Calculate pie chart and values
            let totalPortfolioValue = portfolioDoc.cash || 0;
            let activePositionsValue = 0;
            let pieChartLabels = [];
            let pieChartData = [];
            let unrealizedPL = 0;
            portfolioArr.forEach(pos => {
                const quote = quotes[pos.Symbol];
                if (quote !== undefined && typeof pos.Shares === 'number') {
                    const positionValue = quote * pos.Shares;
                    activePositionsValue += positionValue;
                    totalPortfolioValue += positionValue;
                    pieChartLabels.push(pos.Symbol);
                    pieChartData.push(positionValue);
                    // Calculate unrealized PL
                    if (typeof pos.AvgPrice === 'number' && typeof pos.Shares === 'number') {
                        const pl = (quote - pos.AvgPrice) * pos.Shares;
                        unrealizedPL += pl;
                    }
                }
            });
            if (portfolioDoc.cash > 0) {
                pieChartLabels.push('CASH');
                pieChartData.push(portfolioDoc.cash);
            }
            const totalPortfolioValue2 = activePositionsValue + (portfolioDoc.cash || 0);

            // Get all stats including value history
            const stats = await updatePortfolioStats(db, sanitizedUser, portfolioNumber);

            // Compose summary object from static stats, calculated values, and value history
            const investedAmount = typeof portfolioDoc.BaseValue === 'number' && portfolioDoc.BaseValue > 0 ? portfolioDoc.BaseValue : null;
            const totalPLRaw = (activePositionsValue + (portfolioDoc.cash || 0)) - (portfolioDoc.BaseValue || 0);
            const totalPLFormatted = Number(totalPLRaw).toFixed(2);
            const totalPLPercent = investedAmount ? Number((totalPLRaw / investedAmount) * 100).toFixed(2) : null;
            const unrealizedPLFormatted = unrealizedPL !== null ? Number(unrealizedPL).toFixed(2) : null;
            const unrealizedPLPercentFormatted = investedAmount ? Number((unrealizedPL / investedAmount) * 100).toFixed(2) : null;

            const summary = {
                ...portfolioDoc,
                totalPortfolioValue,
                totalPortfolioValue2,
                activePositions: activePositionsValue,
                pieChart: {
                    labels: pieChartLabels,
                    data: pieChartData
                },
                positionsCount: portfolioArr.length,
                totalPL: totalPLFormatted,
                totalPLPercent,
                unrealizedPL: unrealizedPLFormatted,
                unrealizedPLPercent: unrealizedPLPercentFormatted,
                portfolioValueHistory: stats.portfolioValueHistory,
                tradeReturnsChart: stats.tradeReturnsChart
            };
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
            if (client) await client.close();
        }
    });

    // --- POST set BaseValue for a specific portfolio ---
    app.post('/portfolio/basevalue', [
        body('username').isString().trim().notEmpty().withMessage('Username is required')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Invalid username format'),
        body('portfolio').isInt({ min: 1, max: 10 }).withMessage('Portfolio number required (1-10)'),
        body('baseValue').isFloat({ min: 0.01 }).withMessage('BaseValue must be a positive number')
    ], async (req, res) => {
        const apiKey = req.header('x-api-key');
        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            return res.status(401).json({ message: 'Unauthorized API Access' });
        }
        const { username, portfolio, baseValue } = req.body;
        const sanitizedUser = sanitizeInput(username);
        const portfolioNumber = parseInt(portfolio, 10);
        const sanitizedBaseValue = parseFloat(baseValue);

        if (!sanitizedUser || !sanitizedBaseValue || sanitizedBaseValue <= 0) {
            return res.status(400).json({ message: 'Invalid input' });
        }

        let client;
        try {
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const portfoliosCollection = db.collection('Portfolios');
            // Update BaseValue for the portfolio
            const result = await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $set: { BaseValue: sanitizedBaseValue } }
            );
            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Portfolio not found' });
            }
            // Optionally update static stats
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);
            return res.status(200).json({ message: 'BaseValue updated successfully' });
        } catch (error) {
            return res.status(500).json({ message: 'An error occurred while updating BaseValue' });
        } finally {
            if (client) await client.close();
        }
    });

    // --- GET full export for a specific portfolio number ---
    app.get('/portfolio/export', validate([
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
            const tradesCollection = db.collection('Trades');
            const positionsCollection = db.collection('Positions');
            const OHCLVData1mCollection = db.collection('OHCLVData1m');

            // 1. Get Portfolio document
            const portfolioDoc = await portfoliosCollection.findOne(
                { Username: sanitizedUser, Number: portfolioNumber }
            );
            if (!portfolioDoc) {
                logger.warn('[DEBUG] Portfolio not found');
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            // Remove unwanted fields
            const {
                Username,
                Number,
                portfolioValueHistory,
                tradeReturnsChart,
                ...portfolioStats
            } = portfolioDoc;

            // 2. Get Trades (transaction history)
            const tradesArr = await tradesCollection.find(
                { Username: sanitizedUser, PortfolioNumber: portfolioNumber }
            ).sort({ Date: -1 }).toArray();

            // 3. Get Positions (open positions)
            const positionsArrRaw = await positionsCollection.find(
                { Username: sanitizedUser, PortfolioNumber: portfolioNumber }
            ).toArray();

            // Get latest close price for each position from OHCLVData1m
            let totalValue = portfolioDoc.cash || 0;
            let unrealizedPL = 0;
            const positionsArr = [];
            for (const pos of positionsArrRaw) {
                // Find latest close price for tickerID
                const latestQuoteDoc = await OHCLVData1mCollection.find({ tickerID: pos.Symbol })
                    .sort({ timestamp: -1 })
                    .limit(1)
                    .toArray();
                const latestClose = latestQuoteDoc.length > 0 ? latestQuoteDoc[0].close : null;
                let currentValue = null;
                let positionUnrealizedPL = null;
                if (latestClose !== null && typeof pos.Shares === 'number') {
                    currentValue = latestClose * pos.Shares;
                    totalValue += currentValue;
                    if (typeof pos.AvgPrice === 'number') {
                        positionUnrealizedPL = (latestClose - pos.AvgPrice) * pos.Shares;
                        unrealizedPL += positionUnrealizedPL;
                    }
                }
                positionsArr.push({
                    ...pos,
                    currentValue,
                    latestClose,
                    unrealizedPL: positionUnrealizedPL
                });
            }

            // Add calculated values to stats
            portfolioStats.totalValue = parseFloat(totalValue).toFixed(2);
            portfolioStats.unrealizedPL = parseFloat(unrealizedPL).toFixed(2);

            // Build response payload
            return res.status(200).json({
                stats: portfolioStats,
                transactionHistory: tradesArr,
                portfolio: positionsArr
            });
        } catch (error) {
            logger.error({
                msg: 'An error occurred while exporting portfolio',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.query?.username
            });
            return res.status(500).json({ message: 'An error occurred while exporting portfolio' });
        } finally {
            if (client) await client.close();
        }
    });

}