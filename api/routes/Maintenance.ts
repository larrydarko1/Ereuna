import { Request, Response } from 'express';
import { handleError } from '../utils/logger.js';

export default function (app: any, deps: any) {
    const {
        validate,
        body,
        sanitizeInput,
        logger,
        crypto,
        getDB
    } = deps;

    // Maintenance status GET endpoint
    app.get('/maintenance-status',
        async (req: Request, res: Response) => {
            const requestId = crypto.randomBytes(16).toString('hex');
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
                const db = await getDB();
                const systemSettings = db.collection('systemSettings');
                const status = await systemSettings.findOne({ name: 'EreunaApp' });
                return res.json({
                    maintenance: status ? status.maintenance : false,
                    type: status?.type || 'regular',
                    requestId
                });
            } catch (error) {
                const errObj = handleError(error, 'GET /maintenance-status', { requestId }, 500);
                return res.status(errObj.statusCode || 500).json({ ...errObj, requestId });
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
            body('type')
                .optional()
                .isIn(['regular', 'extraordinary'])
                .withMessage('Type must be either "regular" or "extraordinary"'),
        ]),
        async (req: Request, res: Response) => {
            const requestId = crypto.randomBytes(16).toString('hex');
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
                const type = sanitizeInput(req.body.type?.toString?.() ?? 'regular');
                const validType = ['regular', 'extraordinary'].includes(type) ? type : 'regular';

                const db = await getDB();
                const systemSettings = db.collection('systemSettings');
                await systemSettings.updateOne(
                    { name: 'EreunaApp' },
                    {
                        $set: {
                            maintenance,
                            type: validType,
                            lastUpdated: new Date(),
                        },
                    }
                );
                logger.info({
                    msg: 'Maintenance status updated',
                    maintenance,
                    type: validType,
                    requestId,
                    context: 'POST /maintenance-status',
                });
                return res.json({ success: true, requestId });
            } catch (error: any) {
                const errObj = handleError(error, 'POST /maintenance-status', { requestId }, 500);
                return res.status(errObj.statusCode || 500).json({ ...errObj, requestId });
            }
        }
    );

    // endpoint to get general communications
    app.get('/communications',
        async (req: Request, res: Response) => {
            const requestId = crypto.randomBytes(16).toString('hex');
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
                const db = await getDB();
                const alertsCollection = db.collection('Alerts');
                const communications = await alertsCollection.find({}).sort({ publishedDate: -1 }).toArray();
                return res.status(200).json({ communications, requestId });
            } catch (error: any) {
                const errObj = handleError(error, 'GET /communications', { requestId }, 500);
                return res.status(errObj.statusCode || 500).json({ ...errObj, requestId });
            }
        }
    );

    // endpoint to get documentation features
    app.get('/docs-features',
        async (req: Request, res: Response) => {
            const requestId = crypto.randomBytes(16).toString('hex');
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /docs-features',
                        statusCode: 401,
                        requestId,
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access', requestId });
                }
                const db = await getDB();
                const docsCollection = db.collection('Docs');
                const features = await docsCollection.find({}).sort({ _id: -1 }).toArray();
                return res.status(200).json({ features, requestId });
            } catch (error: any) {
                const errObj = handleError(error, 'GET /docs-features', { requestId }, 500);
                return res.status(errObj.statusCode || 500).json({ ...errObj, requestId });
            }
        }
    );

};