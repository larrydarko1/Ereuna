export default function (app, deps) {
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
                const systemSettings = db.collection('systemSettings');

                const status = await systemSettings.findOne({ name: 'EreunaApp' });

                return res.json({ maintenance: status ? status.maintenance : false });
            } catch (error) {
                // Log error
                logger.error({
                    msg: 'Error Retrieving Maintenance Status',
                    requestId: requestId,
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });

                return res.status(500).json({
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
        });

    // Maintenance status POST endpoint
    app.post('/maintenance-status',
        validate([
            body('maintenance')
                .custom((value) => {
                    // Sanitize the input first
                    const sanitizedValue = sanitizeInput(value.toString());

                    // Convert to boolean after sanitization
                    const booleanValue = sanitizedValue.toLowerCase() === 'true';

                    return typeof booleanValue === 'boolean';
                }).withMessage('Maintenance status must be a valid boolean')
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
                // Sanitize the maintenance value
                const maintenance = sanitizeInput(req.body.maintenance.toString()).toLowerCase() === 'true';

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const systemSettings = db.collection('systemSettings');

                await systemSettings.updateOne(
                    { name: 'EreunaApp' },
                    {
                        $set: {
                            maintenance: maintenance,
                            lastUpdated: new Date()
                        }
                    }
                );
                return res.json({
                    success: true,
                    requestId: requestId
                });
            } catch (error) {
                // Log error
                logger.error({
                    msg: 'Error Updating Maintenance Status',
                    requestId: requestId,
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });

                return res.status(500).json({
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

    // endpoint to get general communications
    app.get('/communications', async (req, res) => {
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
            const alertsCollection = db.collection('Alerts');

            // Fetch all documents from the Alerts collection
            const communications = await alertsCollection.find({}).sort({ publishedDate: -1 }).toArray();

            res.status(200).json(communications);

            await client.close();
        } catch (error) {
            logger.error({
                msg: 'Communications Fetch Error',
                error: error.message
            });

            res.status(500).json({
                message: 'Internal Server Error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });


};