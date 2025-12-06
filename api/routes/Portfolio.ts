import { updatePortfolioStats } from '../utils/portfolioStats.js';
import { Request, Response } from 'express';
import { handleError } from '../utils/logger.js';

export default function (app: any, deps: any) {
    const {
        validate,
        validationSchemas,
        body,
        query,
        sanitizeInput,
        logger,
        MongoClient,
        uri,
        getDB
    } = deps;
    // --- GET trades for a specific portfolio ---
    app.get('/trades', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be 1-500'),
        query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be >= 0')
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /trades',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, portfolio, limit, skip } = req.query as {
                username: string;
                portfolio: string;
                limit?: string;
                skip?: string;
            };
            if (!username || !portfolio) {
                logger.warn({
                    msg: 'Missing username or portfolio',
                    context: 'GET /trades',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Missing username or portfolio' });
            }
            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);
            const tradesLimit = limit ? Math.min(parseInt(limit, 10), 500) : 100;
            const tradesSkip = skip ? Math.max(parseInt(skip, 10), 0) : 0;

            const db = await getDB();
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
            const errObj = handleError(error, 'GET /trades', { user: req.query?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- POST add a trade to a specific portfolio ---
    app.post('/trades/add', validate([
        validationSchemas.username(),
        body('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        body('trade').isObject().withMessage('Trade must be an object'),
        body('trade.Symbol').isString().trim().notEmpty().withMessage('Symbol is required'),
        body('trade.Action').matches(/^(Buy|Sell)$/).withMessage('Action must be "Buy" or "Sell"'),
        body('trade.Shares').isFloat({ min: 0.01 }).withMessage('Shares must be a positive number (min 0.01)'),
        body('trade.Price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
        body('trade.Date').isISO8601().withMessage('Date must be a valid ISO date'),
        body('trade.Total').isFloat({ min: 0 }).withMessage('Total must be a number'),
        body('trade.Commission').optional().isFloat({ min: 0 }).withMessage('Commission must be a non-negative number'),
        body('trade.Leverage').optional().isFloat({ min: 1, max: 10 }).withMessage('Leverage must be between 1 and 10'),
        body('trade.IsShort').optional().isBoolean().withMessage('IsShort must be a boolean'),
    ]), async (req: Request, res: Response) => {
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
            // Safely extract portfolio as string
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            const processedTrade = {
                Date: new Date(trade.Date).toISOString(),
                Symbol: String(trade.Symbol).toUpperCase().trim(),
                Action: String(trade.Action),
                Shares: Number(trade.Shares),
                Price: Number(trade.Price),
                Total: Number(trade.Total),
                Commission: typeof trade.Commission === 'number' ? Number(trade.Commission) : 0,
                Leverage: typeof trade.Leverage === 'number' ? Number(trade.Leverage) : 1,
                IsShort: typeof trade.IsShort === 'boolean' ? trade.IsShort : false,
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber,
                Timestamp: new Date().toISOString()  // Add timestamp for same-day ordering
            };

            const db = await getDB();
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

            // Cash check - for leveraged positions, only margin is required
            const currentCash = typeof portfolioDoc.cash === 'number' ? portfolioDoc.cash : 0;

            let cashRequired: number;
            if (processedTrade.IsShort) {
                // Short positions: we receive cash from selling borrowed shares
                // No upfront cash required (margin is handled by the proceeds)
                cashRequired = 0;
            } else {
                // Long positions with leverage require partial cash
                cashRequired = processedTrade.Total / processedTrade.Leverage;
            }

            if (cashRequired > currentCash) {
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
            let cashChange: number;
            if (processedTrade.IsShort) {
                // Short: receive cash from selling borrowed shares
                cashChange = processedTrade.Total;
            } else {
                // Long: pay the required margin/cash
                cashChange = -cashRequired;
            }

            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $inc: { cash: cashChange } }
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
                    {
                        $set: {
                            Shares: totalShares,
                            AvgPrice: newAvgPrice,
                            Leverage: processedTrade.Leverage,
                            IsShort: processedTrade.IsShort
                        }
                    }
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
                    AvgPrice: processedTrade.Price,
                    Leverage: processedTrade.Leverage,
                    IsShort: processedTrade.IsShort
                });
            }

            // Update static stats
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);
            return res.status(200).json({ message: 'Trade added and portfolio updated' });
        } catch (error) {
            if (typeof error === 'object' && error && 'errors' in error) {
                const validationErrors = (error as any).errors.map((err: any) => ({
                    field: err.param,
                    message: err.msg
                }));
                return res.status(400).json({ errors: validationErrors });
            }
            logger.error({
                msg: 'An error occurred while adding trade',
                error: (error as Error).message,
                stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
                route: req.originalUrl,
                method: req.method,
                user: req.body?.username
            });
            return res.status(500).json({ message: 'An error occurred while adding trade' });
        }
    });


    // --- GET portfolio for a specific portfolio number ---
    app.get('/portfolio', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
        query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be >= 0')
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /portfolio',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, portfolio, limit, skip } = req.query as {
                username?: string;
                portfolio?: string;
                limit?: string;
                skip?: string;
            };
            if (!username || !portfolio) {
                logger.warn({
                    msg: 'Missing username or portfolio',
                    context: 'GET /portfolio',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Missing username or portfolio' });
            }
            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);
            const positionsLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
            const positionsSkip = skip ? Math.max(parseInt(skip, 10), 0) : 0;

            const db = await getDB();
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
            const errObj = handleError(error, 'GET /portfolio', { user: req.query?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- DELETE portfolio (reset) for a specific portfolio number ---
    app.delete('/portfolio', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)')
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'DELETE /portfolio',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Type-safe extraction of query params
            const { username, portfolio } = req.query as {
                username?: string;
                portfolio?: string | number;
            };
            if (!username || portfolio === undefined || portfolio === null) {
                logger.warn({
                    msg: 'Missing username or portfolio',
                    context: 'DELETE /portfolio',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Missing username or portfolio' });
            }
            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            const db = await getDB();
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
            const errObj = handleError(error, 'DELETE /portfolio', { user: req.query?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- POST add cash to a specific portfolio ---
    app.post('/portfolio/cash', [
        body('username').isString().trim().notEmpty().withMessage('Username is required')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Invalid username format'),
        body('portfolio').isInt({ min: 1, max: 10 }).withMessage('Portfolio number required (1-10)'),
        body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
        body('date').optional().isISO8601().withMessage('Date must be a valid ISO date')
    ], async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /portfolio/cash',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Type-safe extraction of body params
            const { username, portfolio, amount, date } = req.body as {
                username?: string;
                portfolio?: string | number;
                amount?: string | number;
                date?: string;
            };
            if (!username || portfolio === undefined || portfolio === null || amount === undefined || amount === null) {
                logger.warn({
                    msg: 'Missing required fields',
                    context: 'POST /portfolio/cash',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Invalid input' });
            }
            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            let amountStr: string = '';
            if (typeof amount === 'string') {
                amountStr = amount;
            } else if (typeof amount === 'number') {
                amountStr = amount.toString();
            } else {
                amountStr = String(amount);
            }
            const sanitizedAmount = parseFloat(amountStr);

            let depositDate = new Date().toISOString();
            if (date) {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    depositDate = parsedDate.toISOString();
                }
            }
            if (!sanitizedUser || !sanitizedAmount || sanitizedAmount <= 0) {
                logger.warn({
                    msg: 'Invalid sanitized input',
                    context: 'POST /portfolio/cash',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Invalid input' });
            }
            const db = await getDB();
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
            // Add a \"cash deposit\" trade to Trades collection
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
            const errObj = handleError(error, 'POST /portfolio/cash', { user: req.body?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- POST withdraw cash from a specific portfolio ---
    app.post('/portfolio/withdraw-cash', [
        body('username').isString().trim().notEmpty().withMessage('Username is required')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Invalid username format'),
        body('portfolio').isInt({ min: 1, max: 10 }).withMessage('Portfolio number required (1-10)'),
        body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
        body('date').optional().isISO8601().withMessage('Date must be a valid ISO date')
    ], async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /portfolio/withdraw-cash',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, portfolio, amount, date } = req.body as {
                username?: string;
                portfolio?: string | number;
                amount?: string | number;
                date?: string;
            };
            if (!username || portfolio === undefined || portfolio === null || amount === undefined || amount === null) {
                logger.warn({
                    msg: 'Missing required fields',
                    context: 'POST /portfolio/withdraw-cash',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Invalid input' });
            }
            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            let amountStr: string = '';
            if (typeof amount === 'string') {
                amountStr = amount;
            } else if (typeof amount === 'number') {
                amountStr = amount.toString();
            } else {
                amountStr = String(amount);
            }
            const sanitizedAmount = parseFloat(amountStr);

            let withdrawalDate = new Date().toISOString();
            if (date) {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    withdrawalDate = parsedDate.toISOString();
                }
            }
            if (!sanitizedUser || !sanitizedAmount || sanitizedAmount <= 0) {
                logger.warn({
                    msg: 'Invalid sanitized input',
                    context: 'POST /portfolio/withdraw-cash',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Invalid input' });
            }

            const db = await getDB();
            const portfoliosCollection = db.collection('Portfolios');

            // Check if user has sufficient cash
            const portfolioDoc = await portfoliosCollection.findOne({ Username: sanitizedUser, Number: portfolioNumber });
            if (!portfolioDoc) {
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            const currentCash = typeof portfolioDoc.cash === 'number' ? portfolioDoc.cash : 0;
            if (currentCash < sanitizedAmount) {
                return res.status(400).json({ message: 'Insufficient cash balance for withdrawal' });
            }

            // Deduct cash from portfolio's cash balance
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $inc: { cash: -sanitizedAmount } }
            );

            // Add a "cash withdrawal" trade to Trades collection
            const tradesCollection = db.collection('Trades');
            const withdrawalTrade = {
                Date: withdrawalDate,
                Symbol: '-',
                Action: 'Cash Withdrawal',
                Shares: '-',
                Price: '-',
                Total: -sanitizedAmount,  // Negative to indicate withdrawal
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber
            };
            await tradesCollection.insertOne(withdrawalTrade);

            // Update static stats
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);
            return res.status(200).json({ message: 'Cash withdrawn successfully' });
        } catch (error) {
            const errObj = handleError(error, 'POST /portfolio/withdraw-cash', { user: req.body?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- GET cash for a specific portfolio ---
    app.get('/portfolio/cash', [
        query('username').isString().trim().notEmpty().withMessage('Username is required'),
        query('portfolio').isInt({ min: 1, max: 10 }).withMessage('Portfolio number required (1-10)')
    ], async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /portfolio/cash',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Type-safe extraction of query params
            const { username, portfolio } = req.query as {
                username?: string;
                portfolio?: string | number;
            };
            if (!username || portfolio === undefined || portfolio === null) {
                logger.warn({
                    msg: 'Missing username or portfolio',
                    context: 'GET /portfolio/cash',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username and portfolio are required' });
            }
            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            const db = await getDB();
            const portfoliosCollection = db.collection('Portfolios');
            const portfolioDoc = await portfoliosCollection.findOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { projection: { cash: 1, BaseValue: 1 } }
            );
            if (!portfolioDoc) {
                logger.warn({
                    msg: 'Portfolio not found',
                    context: 'GET /portfolio/cash',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Portfolio not found' });
            }
            return res.status(200).json({
                cash: portfolioDoc.cash || 0,
                BaseValue: typeof portfolioDoc.BaseValue === 'number' ? portfolioDoc.BaseValue : 0
            });
        } catch (error) {
            const errObj = handleError(error, 'GET /portfolio/cash', { user: req.query?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- GET latest quotes for active portfolio  ---
    app.get('/quotes', async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /quotes',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Type-safe extraction of symbols param
            const symbolsParam = req.query.symbols;
            if (!symbolsParam || typeof symbolsParam !== 'string') {
                logger.warn({
                    msg: 'Missing or invalid symbols parameter',
                    context: 'GET /quotes',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Symbols parameter is required' });
            }
            const symbols = symbolsParam.split(',').map(s => sanitizeInput(s.trim().toUpperCase()));

            const db = await getDB();
            const assetInfoCollection = db.collection('AssetInfo');

            // Fetch all matching assets in one query
            const assets = await assetInfoCollection.find({ Symbol: { $in: symbols } }).toArray();

            // Build the result: { SYMBOL: close }
            const result: Record<string, number | null> = {};
            for (const asset of assets) {
                if (asset.TimeSeries && typeof asset.TimeSeries === 'object') {
                    // Get close price directly from TimeSeries
                    const close = asset.TimeSeries.close;
                    if (close !== undefined && close !== null) {
                        result[asset.Symbol] = typeof close === 'number' ? close : parseFloat(close);
                    }
                }
            }

            // For symbols not found, return null
            symbols.forEach(sym => {
                if (!(sym in result)) result[sym] = null;
            });

            return res.status(200).json(result);

        } catch (error) {
            const errObj = handleError(error, 'GET /quotes', {}, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    app.post('/trades/sell', validate([
        validationSchemas.username(),
        body('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        body('trade').isObject().withMessage('Trade must be an object'),
        body('trade.Symbol').isString().trim().notEmpty().withMessage('Symbol is required'),
        body('trade.Action').matches(/^(Buy|Sell)$/).withMessage('Action must be "Buy" or "Sell"'),
        body('trade.Shares').isFloat({ min: 0.01 }).withMessage('Shares must be a positive number'),
        body('trade.Price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
        body('trade.Date').isISO8601().withMessage('Date must be a valid ISO date'),
        body('trade.Total').isFloat({ min: 0 }).withMessage('Total must be a number'),
        body('trade.Commission').optional().isFloat({ min: 0 }).withMessage('Commission must be a non-negative number'),
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /trades/sell',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Type-safe extraction of body params
            const { username, portfolio, trade } = req.body as {
                username?: string;
                portfolio?: string | number;
                trade?: any;
            };
            if (!username || portfolio === undefined || portfolio === null || !trade) {
                logger.warn({
                    msg: 'Missing required fields',
                    context: 'POST /trades/sell',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Invalid input' });
            }
            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            const processedTrade = {
                Date: new Date(trade.Date).toISOString(),
                Symbol: String(trade.Symbol).toUpperCase().trim(),
                Action: String(trade.Action),
                Shares: Number(trade.Shares),
                Price: Number(trade.Price),
                Total: Number(trade.Total),
                Commission: typeof trade.Commission === 'number' ? Number(trade.Commission) : 0,
                Timestamp: new Date().toISOString()  // Add timestamp for same-day ordering
            };

            // Prevent future-dated trades
            if (new Date(processedTrade.Date) > new Date()) {
                logger.warn({
                    msg: 'Trade date cannot be in the future',
                    context: 'POST /trades/sell',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Trade date cannot be in the future' });
            }

            const db = await getDB();
            const portfoliosCollection = db.collection('Portfolios');
            const assetInfoCollection = db.collection('AssetInfo');

            // Check if symbol exists
            const symbolExists = await assetInfoCollection.findOne({ Symbol: processedTrade.Symbol });
            if (!symbolExists) {
                logger.warn({
                    msg: 'Symbol not found in AssetInfo',
                    context: 'POST /trades/sell',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Symbol not found in AssetInfo' });
            }

            // Find portfolio doc
            let portfolioDoc = await portfoliosCollection.findOne({ Username: sanitizedUser, Number: portfolioNumber });
            if (!portfolioDoc) {
                logger.warn({
                    msg: 'Portfolio not found',
                    context: 'POST /trades/sell',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            // Close position logic using Positions and Trades collections
            // This endpoint handles:
            // 1. Sell to close long positions (Action: "Sell")
            // 2. Buy to close short positions (Action: "Buy")
            const positionsCollection = db.collection('Positions');
            const tradesCollection = db.collection('Trades');

            // Find position
            const position = await positionsCollection.findOne({ Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: processedTrade.Symbol });
            if (!position || position.Shares < processedTrade.Shares) {
                logger.warn({
                    msg: 'Not enough shares to close position',
                    context: 'POST /trades/sell',
                    statusCode: 400,
                    position: position ? { shares: position.Shares, isShort: position.IsShort } : null,
                    requestedShares: processedTrade.Shares,
                    action: processedTrade.Action
                });
                return res.status(400).json({ message: 'Not enough shares to close position' });
            }

            // Verify the action matches the position type
            const isShort = position.IsShort || false;
            const isClosingCorrectly = (isShort && processedTrade.Action === 'Buy') || (!isShort && processedTrade.Action === 'Sell');

            if (!isClosingCorrectly) {
                // Auto-correct the action based on position type for better UX
                // This handles cases where frontend doesn't know the position type
                logger.info({
                    msg: 'Auto-correcting action based on position type',
                    context: 'POST /trades/sell',
                    positionType: isShort ? 'short' : 'long',
                    sentAction: processedTrade.Action,
                    correctedAction: isShort ? 'Buy' : 'Sell'
                });
                processedTrade.Action = isShort ? 'Buy' : 'Sell';
            }

            // Add trade to Trades collection
            // Enforce max 1000 trades per portfolio
            const tradeCount = await tradesCollection.countDocuments({ Username: sanitizedUser, PortfolioNumber: portfolioNumber });
            if (tradeCount >= 1000) {
                logger.warn({
                    msg: 'Maximum number of trades (1000) reached for this portfolio.',
                    context: 'POST /trades/sell',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Maximum number of trades (1000) reached for this portfolio.' });
            }

            // Add IsShort flag to the trade record to maintain position type in history
            await tradesCollection.insertOne({
                ...processedTrade,
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber,
                IsShort: isShort  // Preserve the position type in transaction history
            });

            // Update cash based on position type
            // For long positions: selling adds cash (receive money for shares)
            // For short positions: closing (buying back) costs cash to repurchase shares
            let cashChange: number;

            if (isShort) {
                // Closing short: we pay to buy back the shares
                // We originally received cash when opening the short
                // Now we must pay to close it
                cashChange = -processedTrade.Total;
            } else {
                // Closing long: we receive the sale proceeds
                cashChange = processedTrade.Total;
            }

            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $inc: { cash: cashChange } }
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
            return res.status(200).json({ message: 'Position closed and portfolio updated' });
        } catch (error) {
            if (typeof error === 'object' && error && 'errors' in error) {
                const validationErrors = (error as any).errors.map((err: any) => ({
                    field: err.param,
                    message: err.msg
                }));
                return res.status(400).json({ errors: validationErrors });
            }
            const errObj = handleError(error, 'POST /trades/sell', { user: req.body?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- DELETE a specific trade and replay portfolio ---
    app.delete('/trades/:tradeId', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)')
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'DELETE /trades/:tradeId',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            const { tradeId } = req.params;
            const { username, portfolio } = req.query as {
                username?: string;
                portfolio?: string;
            };

            if (!username || !portfolio) {
                logger.warn({
                    msg: 'Missing username or portfolio',
                    context: 'DELETE /trades/:tradeId',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Missing username or portfolio' });
            }

            if (!tradeId) {
                return res.status(400).json({ message: 'Missing trade ID' });
            }

            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);

            const db = await getDB();
            const tradesCollection = db.collection('Trades');
            const portfoliosCollection = db.collection('Portfolios');
            const positionsCollection = db.collection('Positions');

            // Import ObjectId from mongodb
            const { ObjectId } = await import('mongodb');

            // Verify trade exists and belongs to user
            const tradeToDelete = await tradesCollection.findOne({
                _id: new ObjectId(tradeId),
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber
            });

            if (!tradeToDelete) {
                return res.status(404).json({ message: 'Trade not found or unauthorized' });
            }

            // Delete the trade
            await tradesCollection.deleteOne({
                _id: new ObjectId(tradeId)
            });

            // Get portfolio document to restore initial state
            const portfolioDoc = await portfoliosCollection.findOne({
                Username: sanitizedUser,
                Number: portfolioNumber
            });

            if (!portfolioDoc) {
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            // Clear all positions for this portfolio
            await positionsCollection.deleteMany({
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber
            });

            // Reset cash to 0 (we'll rebuild from BaseValue and all trades)
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $set: { cash: 0 } }
            );

            // Get all remaining trades sorted by date
            const remainingTrades = await tradesCollection.find({
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber
            }).sort({ Date: 1 }).toArray();

            // Replay all trades to rebuild portfolio state
            for (const trade of remainingTrades) {
                // Handle cash deposits and withdrawals
                if (trade.Action === 'Cash Deposit') {
                    await portfoliosCollection.updateOne(
                        { Username: sanitizedUser, Number: portfolioNumber },
                        { $inc: { cash: trade.Total } }
                    );
                    continue;
                }

                if (trade.Action === 'Cash Withdrawal') {
                    await portfoliosCollection.updateOne(
                        { Username: sanitizedUser, Number: portfolioNumber },
                        { $inc: { cash: trade.Total } }  // Total is already negative for withdrawals
                    );
                    continue;
                }

                // Skip trades without a symbol (shouldn't happen after cash handling above)
                if (!trade.Symbol || trade.Symbol === '' || trade.Symbol === '-') {
                    continue;
                }

                const isShort = trade.IsShort || false;
                const leverage = trade.Leverage || 1;

                if (trade.Action === 'Buy' && !isShort) {
                    // Regular buy (long position)
                    const cashRequired = trade.Total / leverage;

                    // Update cash
                    await portfoliosCollection.updateOne(
                        { Username: sanitizedUser, Number: portfolioNumber },
                        { $inc: { cash: -cashRequired } }
                    );

                    // Update or create position
                    const existingPosition = await positionsCollection.findOne({
                        Username: sanitizedUser,
                        PortfolioNumber: portfolioNumber,
                        Symbol: trade.Symbol
                    });

                    if (existingPosition) {
                        const totalShares = existingPosition.Shares + trade.Shares;
                        const totalCost = (existingPosition.Shares * existingPosition.AvgPrice) + (trade.Shares * trade.Price);
                        const newAvgPrice = totalCost / totalShares;

                        await positionsCollection.updateOne(
                            { Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: trade.Symbol },
                            {
                                $set: {
                                    Shares: totalShares,
                                    AvgPrice: newAvgPrice,
                                    Leverage: leverage
                                }
                            }
                        );
                    } else {
                        await positionsCollection.insertOne({
                            Username: sanitizedUser,
                            PortfolioNumber: portfolioNumber,
                            Symbol: trade.Symbol,
                            Shares: trade.Shares,
                            AvgPrice: trade.Price,
                            Leverage: leverage,
                            IsShort: false
                        });
                    }
                } else if (trade.Action === 'Sell' && isShort) {
                    // Open short position
                    const marginRequired = trade.Total;

                    await portfoliosCollection.updateOne(
                        { Username: sanitizedUser, Number: portfolioNumber },
                        { $inc: { cash: -marginRequired } }
                    );

                    const existingPosition = await positionsCollection.findOne({
                        Username: sanitizedUser,
                        PortfolioNumber: portfolioNumber,
                        Symbol: trade.Symbol,
                        IsShort: true
                    });

                    if (existingPosition) {
                        const totalShares = existingPosition.Shares + trade.Shares;
                        const totalProceeds = (existingPosition.Shares * existingPosition.AvgPrice) + (trade.Shares * trade.Price);
                        const newAvgPrice = totalProceeds / totalShares;

                        await positionsCollection.updateOne(
                            { Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: trade.Symbol, IsShort: true },
                            {
                                $set: {
                                    Shares: totalShares,
                                    AvgPrice: newAvgPrice
                                }
                            }
                        );
                    } else {
                        await positionsCollection.insertOne({
                            Username: sanitizedUser,
                            PortfolioNumber: portfolioNumber,
                            Symbol: trade.Symbol,
                            Shares: trade.Shares,
                            AvgPrice: trade.Price,
                            IsShort: true
                        });
                    }
                } else if (trade.Action === 'Sell' && !isShort) {
                    // Close long position
                    const existingPosition = await positionsCollection.findOne({
                        Username: sanitizedUser,
                        PortfolioNumber: portfolioNumber,
                        Symbol: trade.Symbol,
                        IsShort: false
                    });

                    if (existingPosition) {
                        const newShares = existingPosition.Shares - trade.Shares;

                        // Add cash from sale
                        await portfoliosCollection.updateOne(
                            { Username: sanitizedUser, Number: portfolioNumber },
                            { $inc: { cash: trade.Total } }
                        );

                        if (newShares <= 0.001) {
                            // Position fully closed
                            await positionsCollection.deleteOne({
                                Username: sanitizedUser,
                                PortfolioNumber: portfolioNumber,
                                Symbol: trade.Symbol,
                                IsShort: false
                            });
                        } else {
                            // Position partially closed
                            await positionsCollection.updateOne(
                                { Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: trade.Symbol, IsShort: false },
                                { $set: { Shares: newShares } }
                            );
                        }
                    }
                } else if (trade.Action === 'Buy' && isShort) {
                    // Close short position
                    const existingPosition = await positionsCollection.findOne({
                        Username: sanitizedUser,
                        PortfolioNumber: portfolioNumber,
                        Symbol: trade.Symbol,
                        IsShort: true
                    });

                    if (existingPosition) {
                        const newShares = existingPosition.Shares - trade.Shares;
                        const closeCost = trade.Total;
                        const saleProceeds = trade.Shares * existingPosition.AvgPrice;
                        const realizedPL = saleProceeds - closeCost;
                        const marginReturn = trade.Shares * existingPosition.AvgPrice;

                        await portfoliosCollection.updateOne(
                            { Username: sanitizedUser, Number: portfolioNumber },
                            { $inc: { cash: marginReturn + realizedPL } }
                        );

                        if (newShares <= 0.001) {
                            await positionsCollection.deleteOne({
                                Username: sanitizedUser,
                                PortfolioNumber: portfolioNumber,
                                Symbol: trade.Symbol,
                                IsShort: true
                            });
                        } else {
                            await positionsCollection.updateOne(
                                { Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: trade.Symbol, IsShort: true },
                                { $set: { Shares: newShares } }
                            );
                        }
                    }
                }
            }

            // Recalculate portfolio statistics
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);

            return res.status(200).json({
                message: 'Trade deleted and portfolio recalculated successfully'
            });

        } catch (error) {
            const errObj = handleError(error, 'DELETE /trades/:tradeId', { user: req.query?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- PATCH update a specific trade and replay portfolio ---
    app.patch('/trades/:tradeId', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        body('trade').isObject().withMessage('Trade must be an object'),
        body('trade.Action').matches(/^(Buy|Sell)$/).withMessage('Action must be "Buy" or "Sell"'),
        body('trade.Shares').isFloat({ min: 0.01 }).withMessage('Shares must be a positive number (min 0.01)'),
        body('trade.Price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
        body('trade.Date').isISO8601().withMessage('Date must be a valid ISO date'),
        body('trade.Total').isFloat({ min: 0 }).withMessage('Total must be a number'),
        body('trade.Commission').optional().isFloat({ min: 0 }).withMessage('Commission must be a non-negative number'),
        body('trade.Leverage').optional().isFloat({ min: 1, max: 10 }).withMessage('Leverage must be between 1 and 10'),
        body('trade.IsShort').optional().isBoolean().withMessage('IsShort must be a boolean'),
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'PATCH /trades/:tradeId',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            const { tradeId } = req.params;
            const { username, portfolio } = req.query as {
                username?: string;
                portfolio?: string;
            };
            const { trade: updatedTradeData } = req.body;

            if (!username || !portfolio) {
                logger.warn({
                    msg: 'Missing username or portfolio',
                    context: 'PATCH /trades/:tradeId',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Missing username or portfolio' });
            }

            const sanitizedUser = sanitizeInput(username);
            const portfolioNumber = parseInt(portfolio, 10);

            const db = await getDB();
            const tradesCollection = db.collection('Trades');
            const portfoliosCollection = db.collection('Portfolios');
            const positionsCollection = db.collection('Positions');

            // Import ObjectId from mongodb
            const { ObjectId } = await import('mongodb');

            // Verify trade exists and belongs to user
            const existingTrade = await tradesCollection.findOne({
                _id: new ObjectId(tradeId),
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber
            });

            if (!existingTrade) {
                return res.status(404).json({ message: 'Trade not found or unauthorized' });
            }

            // Prepare the updated trade fields (preserving Symbol and metadata)
            const processedTrade = {
                Date: new Date(updatedTradeData.Date).toISOString(),
                Action: String(updatedTradeData.Action),
                Shares: Number(updatedTradeData.Shares),
                Price: Number(updatedTradeData.Price),
                Total: Number(updatedTradeData.Total),
                Commission: typeof updatedTradeData.Commission === 'number' ? Number(updatedTradeData.Commission) : 0,
                Leverage: typeof updatedTradeData.Leverage === 'number' ? Number(updatedTradeData.Leverage) : 1,
                IsShort: typeof updatedTradeData.IsShort === 'boolean' ? updatedTradeData.IsShort : false,
            };

            // Update the trade
            await tradesCollection.updateOne(
                { _id: new ObjectId(tradeId) },
                { $set: processedTrade }
            );

            // Get portfolio document to restore initial state
            const portfolioDoc = await portfoliosCollection.findOne({
                Username: sanitizedUser,
                Number: portfolioNumber
            });

            if (!portfolioDoc) {
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            // Clear all positions for this portfolio (they will be rebuilt)
            await positionsCollection.deleteMany({
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber
            });

            // Reset cash to 0 (we'll rebuild from BaseValue and all trades)
            await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $set: { cash: 0 } }
            );

            // Get all trades sorted by date to replay
            const allTrades = await tradesCollection.find({
                Username: sanitizedUser,
                PortfolioNumber: portfolioNumber
            }).sort({ Date: 1 }).toArray();

            // Replay all trades to rebuild portfolio state
            for (const trade of allTrades) {
                // Handle cash deposits and withdrawals
                if (trade.Action === 'Cash Deposit') {
                    await portfoliosCollection.updateOne(
                        { Username: sanitizedUser, Number: portfolioNumber },
                        { $inc: { cash: trade.Total } }
                    );
                    continue;
                }

                if (trade.Action === 'Cash Withdrawal') {
                    await portfoliosCollection.updateOne(
                        { Username: sanitizedUser, Number: portfolioNumber },
                        { $inc: { cash: trade.Total } }  // Total is already negative for withdrawals
                    );
                    continue;
                }

                // Skip trades without a symbol
                if (!trade.Symbol || trade.Symbol === '' || trade.Symbol === '-') {
                    continue;
                }

                const isShort = trade.IsShort || false;
                const leverage = trade.Leverage || 1;

                if (trade.Action === 'Buy' && !isShort) {
                    // Regular buy (long position)
                    const cashRequired = trade.Total / leverage;

                    // Update cash
                    await portfoliosCollection.updateOne(
                        { Username: sanitizedUser, Number: portfolioNumber },
                        { $inc: { cash: -cashRequired } }
                    );

                    // Update or create position
                    const existingPosition = await positionsCollection.findOne({
                        Username: sanitizedUser,
                        PortfolioNumber: portfolioNumber,
                        Symbol: trade.Symbol
                    });

                    if (existingPosition) {
                        const totalShares = existingPosition.Shares + trade.Shares;
                        const totalCost = (existingPosition.Shares * existingPosition.AvgPrice) + (trade.Shares * trade.Price);
                        const newAvgPrice = totalCost / totalShares;

                        await positionsCollection.updateOne(
                            { Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: trade.Symbol },
                            { $set: { Shares: totalShares, AvgPrice: newAvgPrice, Leverage: leverage } }
                        );
                    } else {
                        await positionsCollection.insertOne({
                            Username: sanitizedUser,
                            PortfolioNumber: portfolioNumber,
                            Symbol: trade.Symbol,
                            Shares: trade.Shares,
                            AvgPrice: trade.Price,
                            Leverage: leverage,
                            IsShort: false
                        });
                    }
                } else if (trade.Action === 'Sell' && !isShort) {
                    // Regular sell (closing long position)
                    const cashReceived = trade.Total;

                    // Update cash
                    await portfoliosCollection.updateOne(
                        { Username: sanitizedUser, Number: portfolioNumber },
                        { $inc: { cash: cashReceived } }
                    );

                    // Reduce or remove position
                    const existingPosition = await positionsCollection.findOne({
                        Username: sanitizedUser,
                        PortfolioNumber: portfolioNumber,
                        Symbol: trade.Symbol
                    });

                    if (existingPosition) {
                        const newShares = existingPosition.Shares - trade.Shares;

                        if (newShares <= 0.001) {
                            await positionsCollection.deleteOne({
                                Username: sanitizedUser,
                                PortfolioNumber: portfolioNumber,
                                Symbol: trade.Symbol
                            });
                        } else {
                            await positionsCollection.updateOne(
                                { Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: trade.Symbol },
                                { $set: { Shares: newShares } }
                            );
                        }
                    }
                } else if (trade.Action === 'Sell' && isShort) {
                    // Short sell (opening short position)
                    const marginRequired = trade.Total;

                    // Update cash (short receives cash but needs margin)
                    await portfoliosCollection.updateOne(
                        { Username: sanitizedUser, Number: portfolioNumber },
                        { $inc: { cash: marginRequired } }
                    );

                    // Update or create short position
                    const existingPosition = await positionsCollection.findOne({
                        Username: sanitizedUser,
                        PortfolioNumber: portfolioNumber,
                        Symbol: trade.Symbol
                    });

                    if (existingPosition) {
                        const totalShares = existingPosition.Shares + trade.Shares;
                        const totalCost = (existingPosition.Shares * existingPosition.AvgPrice) + (trade.Shares * trade.Price);
                        const newAvgPrice = totalCost / totalShares;

                        await positionsCollection.updateOne(
                            { Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: trade.Symbol },
                            { $set: { Shares: totalShares, AvgPrice: newAvgPrice, IsShort: true, Leverage: leverage } }
                        );
                    } else {
                        await positionsCollection.insertOne({
                            Username: sanitizedUser,
                            PortfolioNumber: portfolioNumber,
                            Symbol: trade.Symbol,
                            Shares: trade.Shares,
                            AvgPrice: trade.Price,
                            IsShort: true,
                            Leverage: leverage
                        });
                    }
                } else if (trade.Action === 'Buy' && isShort) {
                    // Buy to cover short
                    const cashRequired = trade.Total;

                    // Update cash
                    await portfoliosCollection.updateOne(
                        { Username: sanitizedUser, Number: portfolioNumber },
                        { $inc: { cash: -cashRequired } }
                    );

                    // Reduce or remove short position
                    const existingPosition = await positionsCollection.findOne({
                        Username: sanitizedUser,
                        PortfolioNumber: portfolioNumber,
                        Symbol: trade.Symbol
                    });

                    if (existingPosition) {
                        const newShares = existingPosition.Shares - trade.Shares;

                        if (newShares <= 0.001) {
                            await positionsCollection.deleteOne({
                                Username: sanitizedUser,
                                PortfolioNumber: portfolioNumber,
                                Symbol: trade.Symbol
                            });
                        } else {
                            await positionsCollection.updateOne(
                                { Username: sanitizedUser, PortfolioNumber: portfolioNumber, Symbol: trade.Symbol },
                                { $set: { Shares: newShares } }
                            );
                        }
                    }
                }
            }

            // Update portfolio statistics
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);

            return res.status(200).json({
                message: 'Trade updated and portfolio recalculated successfully'
            });

        } catch (error) {
            const errObj = handleError(error, 'PATCH /trades/:tradeId', { user: req.query?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- POST import a full portfolio (positions, trades, cash) ---
    app.post('/portfolio/import', validate([
        validationSchemas.username(),
        body('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        body('stats').isObject().withMessage('Stats must be an object'),
        body('positions').isArray().withMessage('Positions must be an array'),
        body('trades').isArray().withMessage('Trades must be an array')
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /portfolio/import',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Type-safe extraction of body params
            const { username, portfolio, stats, positions, trades } = req.body as {
                username?: string;
                portfolio?: string | number;
                stats?: any;
                positions?: any[];
                trades?: any[];
            };
            if (!username || portfolio === undefined || portfolio === null || !stats || !positions || !trades) {
                logger.warn({
                    msg: 'Missing required fields',
                    context: 'POST /portfolio/import',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Invalid input' });
            }
            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            // --- Backend CSV Injection & Sanitization ---
            function isDangerousCSVValue(v: any): boolean {
                if (typeof v === 'string' && v.startsWith("'")) v = v.slice(1);
                return typeof v === 'string' && /^[=+\-@]/.test(v) && v.length > 1;
            }
            function sanitizeRow(row: Record<string, any>): Record<string, any> {
                const sanitized: Record<string, any> = {};
                for (const [k, v] of Object.entries(row)) {
                    let value = v;
                    if (["Shares", "Price", "Total", "Commission"].includes(k)) {
                        const num = Number(value);
                        value = isNaN(num) ? 0 : num;
                    } else if (k === "Date" && typeof value === "string") {
                        let dateStr = value;
                        if (/^\d{8}T/.test(dateStr)) {
                            dateStr = dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6) + '-' + dateStr.slice(6);
                        }
                        const parsedDate = new Date(dateStr);
                        value = isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString();
                    } else if (typeof value === 'string') {
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
                        logger.warn({
                            msg: 'Potentially dangerous value detected in import',
                            context: 'POST /portfolio/import',
                            statusCode: 400
                        });
                        return res.status(400).json({ message: 'Potentially dangerous value detected in import.' });
                    }
                }
            }
            for (let v of Object.values(stats)) {
                if (isDangerousCSVValue(v)) {
                    logger.warn({
                        msg: 'Potentially dangerous value detected in stats import',
                        context: 'POST /portfolio/import',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Potentially dangerous value detected in import.' });
                }
            }
            // Sanitize all string fields
            const safeStats: Record<string, any> = {};
            for (const [k, v] of Object.entries(stats)) {
                safeStats[k] = typeof v === 'string' ? sanitizeInput(v) : v;
            }
            // Group biggestLoser.* and biggestWinner.* keys into nested objects
            function groupNestedStats(statsObj: Record<string, any>, baseKey: string) {
                const nested: Record<string, any> = {};
                Object.keys(statsObj).forEach(key => {
                    if (key.startsWith(baseKey + '.')) {
                        const subKey = key.split('.')[1];
                        nested[subKey] = statsObj[key];
                    }
                });
                Object.keys(nested).forEach(subKey => {
                    delete statsObj[baseKey + '.' + subKey];
                });
                if (statsObj.hasOwnProperty(baseKey)) {
                    delete statsObj[baseKey];
                }
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

            // Handle benchmarks - convert benchmarks.0, benchmarks.1, etc. into array
            const benchmarksArray: string[] = [];
            Object.keys(safeStats).forEach(key => {
                if (key.startsWith('benchmarks.')) {
                    const index = parseInt(key.split('.')[1], 10);
                    if (!isNaN(index)) {
                        benchmarksArray[index] = String(safeStats[key]).toUpperCase().trim();
                    }
                    delete safeStats[key];
                }
            });
            // Filter out empty values and limit to 5
            safeStats.benchmarks = benchmarksArray
                .filter((b: string) => b && b.length > 0)
                .slice(0, 5);

            // If benchmarks is already an array (alternative format), process it
            if (safeStats.hasOwnProperty('benchmarks') && Array.isArray(safeStats.benchmarks)) {
                safeStats.benchmarks = safeStats.benchmarks
                    .slice(0, 5)
                    .map((b: any) => String(b).toUpperCase().trim())
                    .filter((b: string) => b.length > 0);
            }
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
            const allowedPositionFields = ['Symbol', 'Shares', 'AvgPrice', 'IsShort', 'Leverage'];
            const safePositionsFiltered = safePositions.map(pos => {
                const filtered: Record<string, any> = {};
                for (const key of allowedPositionFields) {
                    if (pos.hasOwnProperty(key)) {
                        if (key === 'Shares' || key === 'AvgPrice' || key === 'Leverage') {
                            const num = Number(pos[key]);
                            filtered[key] = isNaN(num) ? (key === 'Leverage' ? 1 : 0) : num;
                        } else if (key === 'IsShort') {
                            // Convert to boolean
                            filtered[key] = pos[key] === true || pos[key] === 'true';
                        } else {
                            filtered[key] = pos[key];
                        }
                    }
                }
                return filtered;
            });
            const safeTrades = trades.map(sanitizeRow);

            const db = await getDB();
            const portfoliosCollection = db.collection('Portfolios');
            const positionsCollection = db.collection('Positions');
            const tradesCollection = db.collection('Trades');

            // Prepare the portfolio update object
            // Remove any potential conflicting nested benchmark fields
            const portfolioUpdate: Record<string, any> = { ...safeStats, Username: sanitizedUser, Number: portfolioNumber };

            // Clean up any nested benchmark-related fields that might cause conflicts
            const keysToRemove = Object.keys(portfolioUpdate).filter(key =>
                key.startsWith('benchmarks.') ||
                (key !== 'benchmarks' && key.toLowerCase().includes('benchmark'))
            );
            keysToRemove.forEach(key => delete portfolioUpdate[key]);

            // Upsert the portfolio document with all stats fields
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
                    logger.warn({
                        msg: 'Cannot import more than 500 active positions per portfolio',
                        context: 'POST /portfolio/import',
                        statusCode: 400
                    });
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
                    logger.warn({
                        msg: 'Cannot import more than 1000 trades per portfolio',
                        context: 'POST /portfolio/import',
                        statusCode: 400
                    });
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
            const errObj = handleError(error, 'POST /portfolio/import', { user: req.body?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- GET portfolio summary for a specific portfolio number ---
    app.get('/portfolio/summary', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)')
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /portfolio/summary',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Type-safe extraction of query params
            const { username, portfolio } = req.query as {
                username?: string;
                portfolio?: string | number;
            };
            if (!username || portfolio === undefined || portfolio === null) {
                logger.warn({
                    msg: 'Missing username or portfolio',
                    context: 'GET /portfolio/summary',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username and portfolio are required' });
            }
            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            const db = await getDB();
            const portfoliosCollection = db.collection('Portfolios');
            const positionsCollection = db.collection('Positions');

            // Get static stats from Portfolios
            const portfolioDoc = await portfoliosCollection.findOne(
                { Username: sanitizedUser, Number: portfolioNumber }
            );
            if (!portfolioDoc) {
                logger.warn({
                    msg: 'Portfolio not found',
                    context: 'GET /portfolio/summary',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            // Get positions for pie chart and value calculations
            const portfolioArr = await positionsCollection.find(
                { Username: sanitizedUser, PortfolioNumber: portfolioNumber },
                { projection: { Symbol: 1, Shares: 1, AvgPrice: 1, IsShort: 1 } }
            ).toArray();

            // Get latest quotes for all symbols in portfolio from OHCLVData
            const symbols = portfolioArr.map((pos: { Symbol: string }) => pos.Symbol);
            let quotes: Record<string, number> = {};
            const MAX_SYMBOLS = 5000;
            if (symbols.length > 0) {
                if (symbols.length > MAX_SYMBOLS) {
                    logger.error({
                        msg: 'Too many symbols requested',
                        symbolsLen: symbols.length,
                        context: 'GET /portfolio/summary',
                        statusCode: 400
                    });
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
                    docs.forEach((doc: any) => {
                        quotes[doc.tickerID] = doc.close;
                    });
                }
            }

            // Calculate pie chart and values
            let totalPortfolioValue = portfolioDoc.cash || 0;
            let activePositionsValue = 0;
            let pieChartLabels: string[] = [];
            let pieChartData: number[] = [];
            let unrealizedPL = 0;
            // ...existing code...
            portfolioArr.forEach((pos: { Symbol: string; Shares: number; AvgPrice: number; IsShort?: boolean }) => {
                const quote = quotes[pos.Symbol];
                if (quote !== undefined && typeof pos.Shares === 'number') {
                    // For short positions: position value is negative (it's a liability)
                    // For long positions: position value is positive (it's an asset)
                    const positionValue = pos.IsShort
                        ? -(quote * pos.Shares)  // Liability: we owe shares
                        : (quote * pos.Shares);   // Asset: we own shares

                    activePositionsValue += positionValue;
                    totalPortfolioValue += positionValue;

                    // Only add to pie chart if it's a long position or positive value
                    // (we don't show short positions in pie chart as they're liabilities)
                    if (!pos.IsShort && positionValue > 0) {
                        pieChartLabels.push(pos.Symbol);
                        pieChartData.push(positionValue);
                    }

                    // Calculate unrealized PL
                    if (typeof pos.AvgPrice === 'number' && typeof pos.Shares === 'number') {
                        // For short positions: profit when price goes down (AvgPrice - quote)
                        // For long positions: profit when price goes up (quote - AvgPrice)
                        const pl = pos.IsShort
                            ? (pos.AvgPrice - quote) * pos.Shares
                            : (quote - pos.AvgPrice) * pos.Shares;
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

            // Calculate benchmark performance
            const benchmarks = portfolioDoc.benchmarks || [];
            const benchmarkPerformance: any[] = [];

            if (benchmarks.length > 0) {
                const tradesCollection = db.collection('Trades');

                // Get the first transaction date (portfolio inception)
                const firstTrade = await tradesCollection.findOne(
                    { Username: sanitizedUser, PortfolioNumber: portfolioNumber },
                    { sort: { Date: 1 } }
                );

                if (firstTrade && firstTrade.Date) {
                    const inceptionDate = new Date(firstTrade.Date);
                    const OHCLVDataCollection = db.collection('OHCLVData');

                    for (const benchmarkSymbol of benchmarks) {
                        try {
                            // Get inception price (closest price on or after inception date)
                            const inceptionPrice = await OHCLVDataCollection.findOne(
                                {
                                    tickerID: benchmarkSymbol,
                                    timestamp: { $gte: inceptionDate }
                                },
                                { sort: { timestamp: 1 } }
                            );

                            // Get current price
                            const currentPrice = await OHCLVDataCollection.findOne(
                                { tickerID: benchmarkSymbol },
                                { sort: { timestamp: -1 } }
                            );

                            if (inceptionPrice && currentPrice && inceptionPrice.close && currentPrice.close) {
                                const benchmarkReturn = ((currentPrice.close - inceptionPrice.close) / inceptionPrice.close) * 100;
                                const portfolioReturn = totalPLPercent ? parseFloat(totalPLPercent) : 0;
                                const outperformance = portfolioReturn - benchmarkReturn;

                                benchmarkPerformance.push({
                                    symbol: benchmarkSymbol,
                                    inceptionPrice: Number(inceptionPrice.close.toFixed(2)),
                                    currentPrice: Number(currentPrice.close.toFixed(2)),
                                    return: Number(benchmarkReturn.toFixed(2)),
                                    portfolioReturn: Number(portfolioReturn.toFixed(2)),
                                    outperformance: Number(outperformance.toFixed(2)),
                                    beating: outperformance > 0
                                });
                            }
                        } catch (benchmarkError) {
                            logger.warn({
                                msg: 'Failed to calculate benchmark performance',
                                benchmark: benchmarkSymbol,
                                error: benchmarkError instanceof Error ? benchmarkError.message : String(benchmarkError),
                                context: 'GET /portfolio/summary'
                            });
                        }
                    }
                }
            }

            const summary = {
                ...portfolioDoc,
                ...stats, // computed stats overwrite portfolioDoc fields
                totalPortfolioValue,
                totalPortfolioValue2,
                activePositions: activePositionsValue,
                pieChart: {
                    labels: pieChartLabels,
                    data: pieChartData
                },
                positionsCount: portfolioArr.length,
                totalPL: Number(totalPLFormatted),
                totalPLPercent,
                unrealizedPL: Number(unrealizedPLFormatted),
                unrealizedPLPercent: unrealizedPLPercentFormatted,
                portfolioValueHistory: stats.portfolioValueHistory,
                tradeReturnsChart: stats.tradeReturnsChart,
                benchmarkPerformance
            };
            return res.status(200).json(summary);
        } catch (error) {
            const errObj = handleError(error, 'GET /portfolio/summary', { user: req.query?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- POST set BaseValue for a specific portfolio ---
    app.post('/portfolio/basevalue', [
        body('username').isString().trim().notEmpty().withMessage('Username is required')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Invalid username format'),
        body('portfolio').isInt({ min: 1, max: 10 }).withMessage('Portfolio number required (1-10)'),
        body('baseValue').isFloat({ min: 0.01 }).withMessage('BaseValue must be a positive number')
    ], async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /portfolio/basevalue',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Type-safe extraction of body params
            const { username, portfolio, baseValue } = req.body as {
                username?: string;
                portfolio?: string | number;
                baseValue?: string | number;
            };
            if (!username || portfolio === undefined || portfolio === null || baseValue === undefined || baseValue === null) {
                logger.warn({
                    msg: 'Missing required fields',
                    context: 'POST /portfolio/basevalue',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Invalid input' });
            }
            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            let baseValueStr: string = '';
            if (typeof baseValue === 'string') {
                baseValueStr = baseValue;
            } else if (typeof baseValue === 'number') {
                baseValueStr = baseValue.toString();
            } else {
                baseValueStr = String(baseValue);
            }
            const sanitizedBaseValue = parseFloat(baseValueStr);

            if (!sanitizedUser || !sanitizedBaseValue || sanitizedBaseValue <= 0) {
                logger.warn({
                    msg: 'Invalid sanitized input',
                    context: 'POST /portfolio/basevalue',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Invalid input' });
            }

            const db = await getDB();
            const portfoliosCollection = db.collection('Portfolios');
            // Update BaseValue for the portfolio
            const result = await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $set: { BaseValue: sanitizedBaseValue } }
            );
            if (result.matchedCount === 0) {
                logger.warn({
                    msg: 'Portfolio not found',
                    context: 'POST /portfolio/basevalue',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Portfolio not found' });
            }
            // Optionally update static stats
            await updatePortfolioStats(db, sanitizedUser, portfolioNumber);
            return res.status(200).json({ message: 'BaseValue updated successfully' });
        } catch (error) {
            const errObj = handleError(error, 'POST /portfolio/basevalue', { user: req.body?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- GET full export for a specific portfolio number ---
    app.get('/portfolio/export', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)')
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /portfolio/export',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Type-safe extraction of query params
            const { username, portfolio } = req.query as {
                username?: string;
                portfolio?: string | number;
            };
            if (!username || portfolio === undefined || portfolio === null) {
                logger.warn({
                    msg: 'Missing username or portfolio',
                    context: 'GET /portfolio/export',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username and portfolio are required' });
            }
            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            const db = await getDB();
            const portfoliosCollection = db.collection('Portfolios');
            const tradesCollection = db.collection('Trades');
            const positionsCollection = db.collection('Positions');
            const OHCLVData1mCollection = db.collection('OHCLVData1m');

            // 1. Get Portfolio document
            const portfolioDoc = await portfoliosCollection.findOne(
                { Username: sanitizedUser, Number: portfolioNumber }
            );
            if (!portfolioDoc) {
                logger.warn({
                    msg: 'Portfolio not found',
                    context: 'GET /portfolio/export',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            // Remove unwanted fields
            const {
                Username,
                Number: portfolioNum,
                portfolioValueHistory,
                tradeReturnsChart,
                _id,
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
            const positionsArr: any[] = [];
            for (const pos of positionsArrRaw) {
                // Find latest close price for tickerID
                const latestQuoteDoc = await OHCLVData1mCollection.find({ tickerID: pos.Symbol })
                    .sort({ timestamp: -1 })
                    .limit(1)
                    .toArray();
                const latestClose = latestQuoteDoc.length > 0 ? latestQuoteDoc[0].close : null;
                let currentValue: number | null = null;
                let positionUnrealizedPL: number | null = null;
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
            portfolioStats.totalValue = Number(totalValue).toFixed(2);
            portfolioStats.unrealizedPL = Number(unrealizedPL).toFixed(2);
            // Ensure cash is included in stats for export
            portfolioStats.cash = portfolioDoc.cash || 0;

            // Build response payload
            return res.status(200).json({
                stats: portfolioStats,
                transactionHistory: tradesArr,
                portfolio: positionsArr
            });
        } catch (error) {
            const errObj = handleError(error, 'GET /portfolio/export', { user: req.query?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- GET benchmarks for a specific portfolio ---
    app.get('/portfolio/benchmarks', validate([
        validationSchemas.usernameQuery(),
        query('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)')
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /portfolio/benchmarks',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            const { username, portfolio } = req.query as {
                username?: string;
                portfolio?: string | number;
            };

            if (!username || portfolio === undefined || portfolio === null) {
                logger.warn({
                    msg: 'Missing username or portfolio',
                    context: 'GET /portfolio/benchmarks',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username and portfolio are required' });
            }

            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            const db = await getDB();
            const portfoliosCollection = db.collection('Portfolios');

            const portfolioDoc = await portfoliosCollection.findOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { projection: { benchmarks: 1 } }
            );

            if (!portfolioDoc) {
                logger.warn({
                    msg: 'Portfolio not found',
                    context: 'GET /portfolio/benchmarks',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            return res.status(200).json({
                benchmarks: portfolioDoc.benchmarks || []
            });
        } catch (error) {
            const errObj = handleError(error, 'GET /portfolio/benchmarks', { user: req.query?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- POST update benchmarks for a specific portfolio ---
    app.post('/portfolio/benchmarks', validate([
        validationSchemas.username(),
        body('portfolio').isInt({ min: 0, max: 9 }).withMessage('Portfolio number required (0-9)'),
        body('benchmarks').isArray({ max: 5 }).withMessage('Benchmarks must be an array with max 5 items')
    ]), async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /portfolio/benchmarks',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            const { username, portfolio, benchmarks } = req.body as {
                username?: string;
                portfolio?: string | number;
                benchmarks?: string[];
            };

            if (!username || portfolio === undefined || portfolio === null || !benchmarks) {
                logger.warn({
                    msg: 'Missing required fields',
                    context: 'POST /portfolio/benchmarks',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Username, portfolio, and benchmarks are required' });
            }

            const sanitizedUser = sanitizeInput(username);
            let portfolioStr: string = '';
            if (typeof portfolio === 'string') {
                portfolioStr = portfolio;
            } else if (typeof portfolio === 'number') {
                portfolioStr = portfolio.toString();
            } else {
                portfolioStr = String(portfolio);
            }
            const portfolioNumber = parseInt(portfolioStr, 10);

            // Validate max 5 benchmarks
            if (benchmarks.length > 5) {
                logger.warn({
                    msg: 'Too many benchmarks',
                    context: 'POST /portfolio/benchmarks',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Maximum 5 benchmarks allowed' });
            }

            // Sanitize and validate benchmark symbols
            const sanitizedBenchmarks = benchmarks.map(b => sanitizeInput(b).toUpperCase().trim()).filter(b => b);

            const db = await getDB();
            const portfoliosCollection = db.collection('Portfolios');
            const assetInfoCollection = db.collection('AssetInfo');

            // Verify all benchmark symbols exist in AssetInfo
            if (sanitizedBenchmarks.length > 0) {
                const existingSymbols = await assetInfoCollection.find(
                    { Symbol: { $in: sanitizedBenchmarks } },
                    { projection: { Symbol: 1 } }
                ).toArray();

                const foundSymbols = existingSymbols.map((doc: any) => doc.Symbol);
                const missingSymbols = sanitizedBenchmarks.filter(s => !foundSymbols.includes(s));

                if (missingSymbols.length > 0) {
                    logger.warn({
                        msg: 'Invalid benchmark symbols',
                        missingSymbols,
                        context: 'POST /portfolio/benchmarks',
                        statusCode: 400
                    });
                    return res.status(400).json({
                        message: `Invalid benchmark symbols: ${missingSymbols.join(', ')}`
                    });
                }
            }

            // Update portfolio with new benchmarks
            const result = await portfoliosCollection.updateOne(
                { Username: sanitizedUser, Number: portfolioNumber },
                { $set: { benchmarks: sanitizedBenchmarks } }
            );

            if (result.matchedCount === 0) {
                logger.warn({
                    msg: 'Portfolio not found',
                    context: 'POST /portfolio/benchmarks',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Portfolio not found' });
            }

            return res.status(200).json({
                message: 'Benchmarks updated successfully',
                benchmarks: sanitizedBenchmarks
            });
        } catch (error) {
            const errObj = handleError(error, 'POST /portfolio/benchmarks', { user: req.body?.username }, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

}