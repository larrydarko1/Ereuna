import { Request, Response } from 'express';
import { handleError } from '../utils/logger.js';

export default function (app: any, deps: any) {
    const {
        validate,
        body,
        sanitizeInput,
        logger,
        MongoClient,
        uri,
        crypto
    } = deps;

    // Maintenance status GET endpoint
    app.get('/maintenance-status',
        async (req: Request, res: Response) => {
            const requestId = crypto.randomBytes(16).toString('hex');
            let client: typeof MongoClient | undefined;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /maintenance-status',
                        statusCode: 401,
                        requestId
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access', requestId });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const systemSettings = db.collection('systemSettings');
                const status = await systemSettings.findOne({ name: 'EreunaApp' });
                return res.json({ maintenance: status ? status.maintenance : false, requestId });
            } catch (error) {
                const errObj = handleError(error, 'GET /maintenance-status', { requestId }, 500);
                return res.status(errObj.statusCode || 500).json({ ...errObj, requestId });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'GET /maintenance-status',
                            requestId
                        });
                    }
                }
            }
        });

    // Maintenance status POST endpoint
    app.post('/maintenance-status',
        validate([
            body('maintenance')
                .custom((value: any) => {
                    const sanitizedValue = sanitizeInput(value?.toString?.() ?? '');
                    const booleanValue = sanitizedValue.toLowerCase() === 'true';
                    return typeof booleanValue === 'boolean';
                })
                .withMessage('Maintenance status must be a valid boolean'),
        ]),
        async (req: Request, res: Response) => {
            const requestId = crypto.randomBytes(16).toString('hex');
            let client: typeof MongoClient | undefined;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'POST /maintenance-status',
                        statusCode: 401,
                        requestId,
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access', requestId });
                }
                const maintenance = sanitizeInput(req.body.maintenance?.toString?.() ?? '').toLowerCase() === 'true';
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const systemSettings = db.collection('systemSettings');
                await systemSettings.updateOne(
                    { name: 'EreunaApp' },
                    {
                        $set: {
                            maintenance,
                            lastUpdated: new Date(),
                        },
                    }
                );
                logger.info({
                    msg: 'Maintenance status updated',
                    maintenance,
                    requestId,
                    context: 'POST /maintenance-status',
                });
                return res.json({ success: true, requestId });
            } catch (error: any) {
                const errObj = handleError(error, 'POST /maintenance-status', { requestId }, 500);
                return res.status(errObj.statusCode || 500).json({ ...errObj, requestId });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'POST /maintenance-status',
                            requestId,
                        });
                    }
                }
            }
        }
    );

    // endpoint to get general communications
    app.get('/communications',
        async (req: Request, res: Response) => {
            const requestId = crypto.randomBytes(16).toString('hex');
            let client: typeof MongoClient | undefined;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /communications',
                        statusCode: 401,
                        requestId,
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access', requestId });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const alertsCollection = db.collection('Alerts');
                const communications = await alertsCollection.find({}).sort({ publishedDate: -1 }).toArray();
                logger.info({
                    msg: 'Communications fetched',
                    count: communications.length,
                    requestId,
                    context: 'GET /communications',
                });
                return res.status(200).json({ communications, requestId });
            } catch (error: any) {
                const errObj = handleError(error, 'GET /communications', { requestId }, 500);
                return res.status(errObj.statusCode || 500).json({ ...errObj, requestId });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeErr.message,
                            context: 'GET /communications',
                            requestId,
                        });
                    }
                }
            }
        }
    );

};