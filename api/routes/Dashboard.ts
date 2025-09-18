import { Request, Response } from 'express';
import { handleError } from '../utils/logger.js';

export default function (app: any, deps: any) {
    const {
        sanitizeInput,
        logger,
        MongoClient,
        uri
    } = deps;


    // --- GET market stats ---
    app.get('/market-stats', async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;
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
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const statsCollection = db.collection('Stats');
            const statsDoc = await statsCollection.findOne({ _id: 'marketStats' });
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
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                    logger.error({
                        msg: 'Error closing database connection',
                        error: closeErr.message,
                        context: 'GET /market-stats'
                    });
                }
            }
        }
    });

}