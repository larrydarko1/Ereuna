import { Request, Response } from 'express';
import { handleError } from '../utils/logger.js';
import { withCache } from '../utils/cache.js';

export default function (app: any, deps: any) {
    const {
        sanitizeInput,
        logger,
        getDB
    } = deps;


    // --- GET market stats ---
    app.get('/market-stats', async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /market-stats',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Use connection pool and caching
            const statsDoc = await withCache(
                'market-stats',
                async () => {
                    const db = await getDB();
                    const statsCollection = db.collection('Stats');
                    return await statsCollection.findOne({ _id: 'marketStats' });
                },
                60, // 60 second TTL
                'price'
            );

            if (!statsDoc) {
                logger.warn({
                    msg: 'marketStats document not found',
                    context: 'GET /market-stats',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'marketStats document not found' });
            }
            return res.status(200).json(statsDoc);
        } catch (error) {
            const errObj = handleError(error, 'GET /market-stats', {}, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- GET index news (for multiple tickers) ---
    app.get('/index-news', async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /index-news',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Get tickers from query string (comma-separated)
            const tickersParam = req.query.tickers as string;
            if (!tickersParam) {
                return res.status(400).json({ message: 'Tickers parameter is required' });
            }

            const tickers = tickersParam.split(',').map(t => sanitizeInput(t.trim().toUpperCase()));

            // Cache key based on tickers
            const cacheKey = `index-news:${tickers.sort().join(',')}`;

            const newsResults = await withCache(
                cacheKey,
                async () => {
                    const db = await getDB();
                    const newsCollection = db.collection('News');

                    // Helper function to get the last trading day
                    function getLastTradingDay(): Date {
                        const now = new Date();
                        const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                        let lastTradingDay = new Date(estNow);

                        const dayOfWeek = estNow.getDay();

                        // If it's Sunday (0), go back to Friday
                        if (dayOfWeek === 0) {
                            lastTradingDay.setDate(estNow.getDate() - 2);
                        }
                        // If it's Saturday (6), go back to Friday
                        else if (dayOfWeek === 6) {
                            lastTradingDay.setDate(estNow.getDate() - 1);
                        }
                        // For weekdays, use today

                        // Set to start of day (00:00:00)
                        lastTradingDay.setHours(0, 0, 0, 0);
                        return lastTradingDay;
                    }

                    const lastTradingDay = getLastTradingDay();
                    const nextDay = new Date(lastTradingDay);
                    nextDay.setDate(lastTradingDay.getDate() + 1);

                    // Fetch news for each ticker, filtered by last trading day
                    const results: Record<string, any[]> = {};

                    for (const ticker of tickers) {
                        const news = await newsCollection.find({
                            tickers: ticker,
                            publishedDate: {
                                $gte: lastTradingDay,
                                $lt: nextDay
                            }
                        }).sort({ publishedDate: -1 }).limit(20).toArray();

                        results[ticker] = news;
                    }

                    return results;
                },
                120, // 2 minute TTL
                'price'
            );

            return res.status(200).json(newsResults);
        } catch (error) {
            const errObj = handleError(error, 'GET /index-news', {}, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- GET holidays ---
    app.get('/holidays', async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /holidays',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Use connection pool and caching
            const holidaysDoc = await withCache(
                'holidays',
                async () => {
                    const db = await getDB();
                    const statsCollection = db.collection('Stats');
                    return await statsCollection.findOne({ _id: 'Holidays' });
                },
                86400, // 24 hour TTL since holidays don't change often
                'price'
            );

            if (!holidaysDoc) {
                logger.warn({
                    msg: 'Holidays document not found',
                    context: 'GET /holidays',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Holidays document not found' });
            }
            return res.status(200).json(holidaysDoc);
        } catch (error) {
            const errObj = handleError(error, 'GET /holidays', {}, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

    // --- GET calendar events for a specific date ---
    app.get('/calendar-events', async (req: Request, res: Response) => {
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /calendar-events',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Get date from query (format: YYYY-MM-DD)
            const dateParam = req.query.date as string;
            if (!dateParam) {
                return res.status(400).json({ message: 'Date parameter is required (format: YYYY-MM-DD)' });
            }

            const sanitizedDate = sanitizeInput(dateParam);

            // Parse date and create date range for the day
            const targetDate = new Date(sanitizedDate);
            if (isNaN(targetDate.getTime())) {
                return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
            }

            // Set to start of day UTC
            targetDate.setUTCHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);

            // Use cache with date-specific key
            const cacheKey = `calendar-events:${sanitizedDate}`;

            const events = await withCache(
                cacheKey,
                async () => {
                    const db = await getDB();
                    const calendarCollection = db.collection('Calendar');

                    // Query for all events on the target date (Earnings, Dividends, Splits)
                    const results = await calendarCollection.find({
                        reportDate: {
                            $gte: targetDate,
                            $lt: nextDay
                        }
                    })
                        .sort({ type: 1, symbol: 1 })
                        .toArray();

                    return results;
                },
                300, // 5 minute TTL - calendar events can change during the day
                'price'
            );

            // Group events by type
            const eventsByType = {
                Earnings: events.filter((e: any) => e.type === 'Earnings'),
                Dividends: events.filter((e: any) => e.type === 'Dividend'),
                Splits: events.filter((e: any) => e.type === 'Split')
            };

            return res.status(200).json({
                date: sanitizedDate,
                count: events.length,
                events,
                eventsByType
            });
        } catch (error) {
            const errObj = handleError(error, 'GET /calendar-events', {}, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        }
    });

}