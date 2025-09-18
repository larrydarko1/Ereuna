import { handleError } from '../utils/logger.js';
import { validationSets, body, validationResult, param } from '../utils/validationUtils.js';
import speakeasy from 'speakeasy';
import { Request, Response } from 'express';

export default function (app: any, deps: any) {
    const {
        validate,
        validationSchemas,
        sanitizeInput,
        logger,
        crypto,
        MongoClient,
        uri,
        argon2,
        jwt,
        config
    } = deps;

    // Endpoint for user login
    app.post('/login',
        validate([
            validationSchemas.username(),
            validationSchemas.password(),
            validationSchemas.rememberMe()
        ]),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                const { username, password, rememberMe } = req.body;
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'POST /login',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                if (!username || !password) {
                    logger.warn({
                        msg: 'Login attempt with missing fields',
                        usernameProvided: !!username,
                        context: 'POST /login',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Please fill both username and password fields' });
                }
                const sanitizedUsername = sanitizeInput(username);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const user = await usersCollection.findOne({ Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } });
                if (!user) {
                    logger.warn({
                        msg: 'Login attempt with non-existent username',
                        username: sanitizedUsername,
                        ip: req.ip,
                        context: 'POST /login',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: "Username doesn't exist" });
                }
                const passwordMatch = await argon2.verify(user.Password, password);
                if (!passwordMatch) {
                    logger.warn({
                        msg: 'Login attempt with incorrect password',
                        username: sanitizedUsername,
                        ip: req.ip,
                        context: 'POST /login',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Password is incorrect' });
                }
                const today = new Date();
                const expiresDate = new Date(user.Expires);
                const MFA = user.MFA;
                if (today > expiresDate) {
                    logger.warn({
                        msg: 'Login attempt with expired subscription',
                        username: sanitizedUsername,
                        context: 'POST /login',
                        statusCode: 402
                    });
                    await usersCollection.updateOne({ Username: user.Username }, { $set: { Paid: false } });
                    return res.status(402).json({ message: 'Subscription is expired' });
                }
                if (MFA === true) {
                    logger.info({
                        msg: 'MFA verification required',
                        username: sanitizedUsername,
                        context: 'POST /login',
                        statusCode: 200
                    });
                    return res.status(200).json({ message: 'MFA verification required', mfaRequired: true });
                }
                await usersCollection.updateOne({ Username: user.Username }, { $set: { Paid: true } });
                await usersCollection.updateOne({ Username: user.Username }, { $set: { LastLogin: new Date() } });
                let tokenExpiration = rememberMe === 'true' ? '7d' : '1h';
                // Exclude sensitive fields from user object
                const { Password, ...safeUserData } = user;
                const token = jwt.sign({ user: safeUserData }, config.secretKey, { expiresIn: tokenExpiration });
                logger.info({
                    msg: 'User logged in successfully',
                    username: sanitizedUsername,
                    context: 'POST /login',
                    statusCode: 200
                });
                return res.status(200).json({ message: 'Logged in successfully', token });
            } catch (error) {
                const errObj = handleError(error, 'POST /login', {}, 500);
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
                            context: 'POST /login'
                        });
                    }
                }
            }
        }
    );

    // endpoint that creates users / assuming payment has been successful on client-side 
    app.post('/signup',
        validate([
            ...validationSets.registration,
            validationSchemas.paymentMethodId(),
            validationSchemas.promoCode()
        ]),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'POST /signup',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const { username, password, subscriptionPlan, paymentMethodId, return_url, promoCode } = req.body;
                const sanitizedUsername = sanitizeInput(username);
                const sanitizedPromoCode = promoCode ? sanitizeInput(promoCode) : null;
                const parsedSubscriptionPlan = parseInt(subscriptionPlan, 10);
                logger.info({
                    msg: 'Signup attempt',
                    username: sanitizedUsername,
                    subscriptionPlan: parsedSubscriptionPlan,
                    promoCode: sanitizedPromoCode,
                    context: 'POST /signup'
                });
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const agentsCollection = db.collection('Agents');
                if (await isUsernameTaken(usersCollection, sanitizedUsername, logger)) {
                    logger.warn({
                        msg: 'Username already exists',
                        username: sanitizedUsername,
                        context: 'POST /signup',
                        statusCode: 400
                    });
                    return res.status(400).json({ errors: [{ field: 'username', message: 'Username already exists' }] });
                }
                const { amount, expirationDate } = calculateSubscription(parsedSubscriptionPlan, logger);
                if (!amount || !expirationDate) {
                    logger.warn({
                        msg: 'Invalid subscription plan or expiration date',
                        attemptedPlan: parsedSubscriptionPlan,
                        context: 'POST /signup',
                        statusCode: 400
                    });
                    return res.status(400).json({ errors: [{ field: 'subscriptionPlan', message: 'Invalid subscription plan or expiration date' }] });
                }
                const promoCodeValidated = await validatePromoCode(agentsCollection, sanitizedPromoCode, amount, logger);
                const hashedPassword = await argon2.hash(password);
                const rawAuthKey = crypto.randomBytes(64).toString('hex');
                if (!paymentMethodId) {
                    logger.warn({
                        msg: 'Signup attempt without payment method',
                        username: sanitizedUsername,
                        context: 'POST /signup',
                        statusCode: 400
                    });
                    return res.status(400).json({ errors: [{ field: 'paymentMethodId', message: 'Payment method ID is required' }] });
                }
                const paymentIntent = await createPaymentIntent(amount, paymentMethodId, return_url, logger);
                if (!paymentIntent) {
                    logger.error({
                        msg: 'Payment failed',
                        username: sanitizedUsername,
                        context: 'POST /signup',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Payment failed' });
                }
                if (paymentIntent.status === 'requires_action') {
                    logger.info({
                        msg: 'Payment requires action',
                        username: sanitizedUsername,
                        context: 'POST /signup',
                        statusCode: 200
                    });
                    return res.json({ requiresAction: true, clientSecret: paymentIntent.client_secret });
                }
                const newUser = await createUser(usersCollection, sanitizedUsername, hashedPassword, expirationDate, parsedSubscriptionPlan, promoCodeValidated, rawAuthKey, logger);
                if (!newUser) {
                    logger.error({
                        msg: 'Failed to create user',
                        username: sanitizedUsername,
                        context: 'POST /signup',
                        statusCode: 500
                    });
                    return res.status(500).json({ message: 'Failed to create user' });
                }
                // Create 10 portfolio documents for the new user
                const portfoliosCollection = db.collection('Portfolios');
                const portfolioDocs = Array.from({ length: 10 }, (_, i) => ({
                    Username: sanitizedUsername,
                    Number: i + 1,
                    trades: [],
                    BaseValue: 0,
                    portfolio: [],
                    cash: 0
                }));
                try {
                    await portfoliosCollection.insertMany(portfolioDocs);
                } catch (portfolioError) {
                    const err = portfolioError instanceof Error ? portfolioError : new Error(String(portfolioError));
                    logger.error({
                        msg: 'Portfolio Creation Failed',
                        error: err.message,
                        name: err.name,
                        context: 'POST /signup'
                    });
                }
                await createReceipt(db.collection('Receipts'), newUser.insertedId, amount, parsedSubscriptionPlan, promoCodeValidated, logger);
                logger.info({
                    msg: 'User created successfully',
                    username: sanitizedUsername,
                    context: 'POST /signup',
                    statusCode: 201
                });
                return res.status(201).json({ message: 'User created successfully', rawAuthKey });
            } catch (error) {
                const errObj = handleError(error, 'POST /signup', {}, 500);
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
                            context: 'POST /signup'
                        });
                    }
                }
            }
        }
    );

    // Helper functions
    async function isUsernameTaken(collection: any, username: string, logger: any): Promise<boolean> {
        const existingUser = await collection.findOne({ Username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (existingUser) {
            logger.warn({
                msg: 'Username Conflict',
                reason: 'Username already exists',
                username,
                context: 'isUsernameTaken',
                statusCode: 400
            });
            return true;
        }
        return false;
    }

    function calculateSubscription(plan: number, logger: any): { amount: number | null, expirationDate: Date | null } {
        const today = new Date();
        let expirationDate: Date | null = null;
        let amount: number | null = null;
        switch (plan) {
            case 1:
                expirationDate = new Date(today.setMonth(today.getMonth() + 1));
                amount = 599;
                break;
            case 2:
                expirationDate = new Date(today.setMonth(today.getMonth() + 4));
                amount = 2399;
                break;
            default:
                logger.warn({
                    msg: 'Invalid Subscription Plan',
                    attemptedPlan: plan,
                    context: 'calculateSubscription',
                    statusCode: 400
                });
                return { amount: null, expirationDate: null };
        }
        return { amount, expirationDate };
    }

    async function validatePromoCode(collection: any, promoCode: string | null, amount: number, logger: any): Promise<string> {
        if (!promoCode) return 'None';
        const promoCodeDoc = await collection.findOne({ CODE: promoCode });
        if (promoCodeDoc) {
            // If promo code is valid, log info
            logger.info({
                msg: 'Promo code validated',
                promoCode,
                context: 'validatePromoCode',
                statusCode: 200
            });
            return promoCode;
        } else {
            logger.warn({
                msg: 'Invalid Promo Code',
                providedPromoCode: promoCode,
                context: 'validatePromoCode',
                statusCode: 400
            });
            return 'None';
        }
    }

    async function createPaymentIntent(amount: number, paymentMethodId: string, return_url: string, logger: any): Promise<any> {
        // Simulate payment processing
    }

    async function createUser(collection: any, username: string, hashedPassword: string, expirationDate: Date, subscriptionPlan: number, promoCode: string, rawAuthKey: string, logger: any): Promise<any> {
        const newUser = {
            Username: username,
            Password: hashedPassword,
            Expires: expirationDate,
            Paid: false,
            PaymentMethod: 'Credit Card',
            SubscriptionPlan: subscriptionPlan,
            Hidden: [],
            Created: new Date(),
            defaultSymbol: 'NVDA',
            PROMOCODE: promoCode,
            HashedAuthKey: await argon2.hash(rawAuthKey),
            MFA: false,
            ChartSettings: {
                indicators: [
                    { type: 'SMA', timeframe: 200, visible: true },
                    { type: 'SMA', timeframe: 50, visible: true },
                    { type: 'SMA', timeframe: 20, visible: true },
                    { type: 'SMA', timeframe: 10, visible: true }
                ],
                intrinsicValue: { visible: true }
            },
            panel: [
                { order: 1, tag: 'Summary', name: 'Summary', hidden: false },
                { order: 2, tag: 'EpsTable', name: 'EPS Growth Table', hidden: false },
                { order: 3, tag: 'EarnTable', name: 'Earnings Growth Table', hidden: false },
                { order: 4, tag: 'SalesTable', name: 'Sales Growth Table', hidden: false },
                { order: 5, tag: 'DividendsTable', name: 'Dividend Table', hidden: false },
                { order: 6, tag: 'SplitsTable', name: 'Split Table', hidden: false },
                { order: 7, tag: 'Financials', name: 'Financial Statements', hidden: false },
                { order: 8, tag: 'Notes', name: 'Notes', hidden: false },
                { order: 9, tag: 'News', name: 'News', hidden: false },
            ],
            WatchPanel: ['SPY', 'QQQ', 'DIA', 'IWM', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'ARKK', 'FFTY'],
            Table: [
                'name', 'price', 'perc_change', 'rs_score1w', 'rs_score1m', 'rs_score4m', 'adv1w', 'adv1m', 'adv4m', 'adv1y',
                'exchange', 'sector', 'industry', 'country', 'isin', 'market_cap', 'pe_ratio', 'ps_ratio', 'peg', 'dividend_yield', 'eps'
            ]
        };
        try {
            return await collection.insertOne(newUser);
        } catch (insertError: any) {
            logger.error({
                msg: 'User Insertion Failed',
                error: insertError.message,
                name: insertError.name,
                context: 'createUser',
                statusCode: 500
            });
            return null;
        }
    }

    async function createReceipt(collection: any, userId: any, amount: number, subscriptionPlan: number, promoCode: string, logger: any): Promise<any> {
        const receiptDocument = {
            UserID: userId,
            Amount: amount,
            Date: new Date(),
            Method: 'Credit Card',
            Subscription: subscriptionPlan,
            PROMOCODE: promoCode
        };
        try {
            return await collection.insertOne(receiptDocument);
        } catch (receiptError: any) {
            logger.error({
                msg: 'Receipt Insertion Failed',
                error: receiptError.message,
                name: receiptError.name,
                context: 'createReceipt',
                statusCode: 500
            });
            throw new Error('Receipt insertion failed');
        }
    }

    // Endpoint for verifying the token
    app.get('/verify', (req: Request, res: Response) => {
        const apiKey = req.header('x-api-key');
        const sanitizedKey = sanitizeInput(apiKey);
        if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
            logger.warn({
                msg: 'Invalid API key',
                providedApiKey: !!sanitizedKey,
                context: 'GET /verify',
                statusCode: 401
            });
            return res.status(401).json({ message: 'Unauthorized API Access' });
        }
        const authHeader = req.headers['authorization'];
        logger.info({
            msg: 'Token verification attempt',
            ip: req.ip,
            timestamp: new Date().toISOString(),
            context: 'GET /verify',
            statusCode: 200
        });
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn({
                msg: 'Invalid Authorization header format',
                ip: req.ip,
                headerProvided: !!authHeader,
                context: 'GET /verify',
                statusCode: 401
            });
            return res.status(401).json({ message: 'Invalid authorization format', status: 'error' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            logger.warn({
                msg: 'No token provided',
                ip: req.ip,
                context: 'GET /verify',
                statusCode: 401
            });
            return res.status(401).json({ message: 'No authentication token', status: 'error' });
        }
        try {
            jwt.verify(token, config.secretKey, (err: any, decoded: any) => {
                if (err) {
                    if (err.name === 'TokenExpiredError') {
                        logger.warn({
                            msg: 'Expired token verification attempt',
                            ip: req.ip,
                            error: err.message,
                            context: 'GET /verify',
                            statusCode: 401
                        });
                        return res.status(401).json({ message: 'Token expired', status: 'error' });
                    }
                    logger.error({
                        msg: 'Token verification failed',
                        ip: req.ip,
                        error: err.message,
                        context: 'GET /verify',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Invalid token', status: 'error' });
                }
                const { password, ...safeUserData } = decoded.user || {};
                logger.info({
                    msg: 'Token verified successfully',
                    ip: req.ip,
                    context: 'GET /verify',
                    statusCode: 200
                });
                return res.status(200).json({ user: safeUserData, status: 'success' });
            });
        } catch (error: any) {
            logger.error({
                msg: 'Unexpected error in token verification',
                ip: req.ip,
                error: error.message,
                stack: error.stack,
                context: 'GET /verify',
                statusCode: 500
            });
            res.status(500).json({ message: 'Internal Server Error', status: 'error' });
        }
    });

    app.post('/verify-mfa',
        validate([
            validationSchemas.username(),
            validationSchemas.mfaCode(),
            validationSchemas.rememberMe()
        ]),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                const { username, mfaCode, rememberMe } = req.body;
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'POST /verify-mfa',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const sanitizedUsername = sanitizeInput(username);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const user = await usersCollection.findOne({ Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } });
                if (!user) {
                    logger.warn({
                        msg: 'MFA verification attempt with non-existent username',
                        username: sanitizedUsername,
                        ip: req.ip,
                        context: 'POST /verify-mfa',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: "Username doesn't exist" });
                }
                if (!user.MFA || !user.secret) {
                    logger.warn({
                        msg: 'MFA verification attempt for user without 2FA enabled',
                        username: sanitizedUsername,
                        ip: req.ip,
                        context: 'POST /verify-mfa',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: '2FA is not enabled for this user' });
                }
                const verified = speakeasy.totp.verify({
                    secret: user.secret,
                    encoding: 'base32',
                    token: mfaCode,
                    window: 1
                });
                if (!verified) {
                    logger.warn({
                        msg: 'MFA verification attempt with invalid code',
                        username: sanitizedUsername,
                        ip: req.ip,
                        context: 'POST /verify-mfa',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Invalid MFA code' });
                }
                let tokenExpiration = rememberMe === 'true' ? '7d' : '1h';
                const token = jwt.sign({ user: user.Username }, config.secretKey, { expiresIn: tokenExpiration });
                logger.info({
                    msg: 'MFA verified and user logged in',
                    username: sanitizedUsername,
                    context: 'POST /verify-mfa',
                    statusCode: 200
                });
                return res.status(200).json({ message: 'Logged in successfully', token });
            } catch (error) {
                const errObj = handleError(error, 'POST /verify-mfa', {}, 500);
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
                            context: 'POST /verify-mfa'
                        });
                    }
                }
            }
        }
    );

    // Endpoint for toggling 2FA (initiate or confirm)
    app.post('/twofa',
        validate([
            validationSchemas.username(),
            validationSchemas.enabled(),
            // to do: validate mfaCode and secret for confirmation
        ]),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                const { username, enabled, mode, mfaCode, secret } = req.body;
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'POST /twofa',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                if (!username) {
                    logger.warn({
                        msg: '2FA toggle attempt with missing fields',
                        usernameProvided: !!username,
                        context: 'POST /twofa',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Please fill the username field' });
                }
                const sanitizedUsername = sanitizeInput(username);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const user = await usersCollection.findOne({ Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } });
                if (!user) {
                    logger.warn({
                        msg: '2FA toggle attempt with non-existent username',
                        username: sanitizedUsername,
                        ip: req.ip,
                        context: 'POST /twofa',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: "Username doesn't exist" });
                }
                // Step 1: Initiate 2FA (mode === 'initiate')
                if (enabled && mode === 'initiate') {
                    if (user.MFA && user.secret && user.qrCode) {
                        logger.info({
                            msg: '2FA already enabled',
                            username: sanitizedUsername,
                            context: 'POST /twofa',
                            statusCode: 200
                        });
                        return res.status(200).json({
                            message: '2FA already enabled',
                            qrCode: speakeasy.otpauthURL({
                                secret: user.secret,
                                label: `${user.Username}@Ereuna`,
                                issuer: 'Ereuna',
                                encoding: 'base32'
                            }),
                            secret: user.secret
                        });
                    }
                    const secretObj = speakeasy.generateSecret({ length: 20 });
                    const qrCode = speakeasy.otpauthURL({
                        secret: secretObj.base32,
                        label: `${sanitizedUsername}@Ereuna`,
                        issuer: 'Ereuna',
                        encoding: 'base32'
                    });
                    logger.info({
                        msg: '2FA initiation successful',
                        username: sanitizedUsername,
                        context: 'POST /twofa',
                        statusCode: 200
                    });
                    return res.status(200).json({
                        message: '2FA initiation successful',
                        qrCode,
                        secret: secretObj.base32
                    });
                }
                // Step 2: Confirm 2FA (mode === 'confirm')
                if (enabled && mode === 'confirm') {
                    if (!mfaCode || !secret) {
                        logger.warn({
                            msg: '2FA confirmation attempt missing code or secret',
                            username: sanitizedUsername,
                            context: 'POST /twofa',
                            statusCode: 400
                        });
                        return res.status(400).json({ message: 'Verification code and secret required' });
                    }
                    const verified = speakeasy.totp.verify({
                        secret,
                        encoding: 'base32',
                        token: mfaCode,
                        window: 1
                    });
                    if (!verified) {
                        logger.warn({
                            msg: '2FA confirmation attempt with invalid code',
                            username: sanitizedUsername,
                            context: 'POST /twofa',
                            statusCode: 401
                        });
                        return res.status(401).json({ message: 'Invalid verification code' });
                    }
                    const qrCode = speakeasy.otpauthURL({
                        secret,
                        label: `${user.Username}@Ereuna`,
                        issuer: 'Ereuna',
                        encoding: 'base32'
                    });
                    await usersCollection.updateOne(
                        { Username: user.Username },
                        { $set: { MFA: true, secret, qrCode } }
                    );
                    logger.info({
                        msg: '2FA enabled',
                        username: sanitizedUsername,
                        context: 'POST /twofa',
                        statusCode: 200
                    });
                    return res.status(200).json({ message: '2FA enabled' });
                }
                // Disable 2FA
                if (!enabled) {
                    await usersCollection.updateOne(
                        { Username: user.Username },
                        { $set: { MFA: false, secret: null, qrCode: null } }
                    );
                    logger.info({
                        msg: '2FA disabled',
                        username: sanitizedUsername,
                        context: 'POST /twofa',
                        statusCode: 200
                    });
                    return res.status(200).json({ message: '2FA disabled' });
                }
                logger.warn({
                    msg: 'Invalid 2FA request',
                    username: sanitizedUsername,
                    context: 'POST /twofa',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Invalid 2FA request' });
            } catch (error) {
                const errObj = handleError(error, 'POST /twofa', {}, 500);
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
                            context: 'POST /twofa'
                        });
                    }
                }
            }
        }
    );

    // Endpoint to get current 2FA status and QR code for a user
    app.post('/twofa-status',
        validate([
            validationSchemas.username()
        ]),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                const { username } = req.body;
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'POST /twofa-status',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                if (!username) {
                    logger.warn({
                        msg: '2FA status request missing username',
                        context: 'POST /twofa-status',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Username required' });
                }
                const sanitizedUsername = sanitizeInput(username);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const user = await usersCollection.findOne({ Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } });
                if (!user) {
                    logger.warn({
                        msg: '2FA status request for non-existent user',
                        username: sanitizedUsername,
                        context: 'POST /twofa-status',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'User not found' });
                }
                logger.info({
                    msg: '2FA status retrieved',
                    username: sanitizedUsername,
                    context: 'POST /twofa-status',
                    statusCode: 200
                });
                return res.status(200).json({
                    enabled: !!user.MFA,
                    qrCode: user.secret ? speakeasy.otpauthURL({
                        secret: user.secret,
                        label: `${user.Username}@Ereuna`,
                        issuer: 'Ereuna',
                        encoding: 'base32'
                    }) : null
                });
            } catch (error) {
                const errObj = handleError(error, 'POST /twofa-status', {}, 500);
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
                            context: 'POST /twofa-status'
                        });
                    }
                }
            }
        }
    );

    //endpoint that allows for password reset
    app.post('/recover',
        validate([
            validationSchemas.recoveryKey()
        ]),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'POST /recover',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const { recoveryKey } = req.body;
                const sanitizedRecoveryKey = sanitizeInput(recoveryKey);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const users = await usersCollection.find({ HashedAuthKey: { $exists: true } }).toArray();
                const matchedUser = await Promise.all(users.map(async (user: any) => {
                    try {
                        const isMatch = await argon2.verify(user.HashedAuthKey, sanitizedRecoveryKey);
                        return isMatch ? user : null;
                    } catch (compareError: any) {
                        logger.error({
                            msg: 'Recovery Key Comparison Error',
                            userId: user.Username ? user.Username.substring(0, 3) + '...' : 'Unknown',
                            context: 'POST /recover',
                            error: compareError.message
                        });
                        return null;
                    }
                })).then(results => results.find(user => user !== null));
                if (matchedUser) {
                    logger.info({
                        msg: 'Account Recovery Initiated',
                        username: matchedUser.Username ? matchedUser.Username.substring(0, 3) + '...' : 'Unknown',
                        context: 'POST /recover',
                        statusCode: 200
                    });
                    return res.status(200).json({ valid: true, username: matchedUser.Username });
                } else {
                    logger.warn({
                        msg: 'Recovery Key Validation Failed',
                        ip: req.ip,
                        recoveryKeyAttemptLength: sanitizedRecoveryKey.length,
                        context: 'POST /recover',
                        statusCode: 401
                    });
                    return res.status(401).json({
                        valid: false,
                        errors: [{ field: 'recoveryKey', message: 'Invalid recovery key' }]
                    });
                }
            } catch (error) {
                const errObj = handleError(error, 'POST /recover', {}, 500);
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
                            context: 'POST /recover'
                        });
                    }
                }
            }
        }
    );

    // endpoint that generates a new recovery key upon validation 
    app.patch('/generate-key',
        validate([
            validationSchemas.user(),
            validationSchemas.password()
        ]),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /generate-key',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const { user, password } = req.body;
                const sanitizedUsername = sanitizeInput(user);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Users');
                const filter = { Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } };
                const userDoc = await collection.findOne(filter);
                if (!userDoc) {
                    logger.warn({
                        msg: 'Key Generation Attempt for Non-Existent User',
                        attemptedUsername: sanitizedUsername,
                        ip: req.ip,
                        context: 'PATCH /generate-key',
                        statusCode: 404
                    });
                    return res.status(404).json({ errors: [{ field: 'user', message: 'User not found' }] });
                }
                const isPasswordCorrect = await argon2.verify(userDoc.Password, password);
                if (!isPasswordCorrect) {
                    logger.warn({
                        msg: 'Key Generation Attempt with Incorrect Password',
                        username: userDoc.Username,
                        ip: req.ip,
                        context: 'PATCH /generate-key',
                        statusCode: 401
                    });
                    return res.status(401).json({ errors: [{ field: 'password', message: 'Incorrect password' }] });
                }
                const today = new Date();
                const expiresDate = new Date(userDoc.Expires);
                if (today > expiresDate || !userDoc.Paid) {
                    logger.warn({
                        msg: 'Key Generation Attempt with Expired/Inactive Subscription',
                        username: userDoc.Username,
                        subscriptionExpired: today > expiresDate,
                        paid: userDoc.Paid,
                        context: 'PATCH /generate-key',
                        statusCode: 402
                    });
                    return res.status(402).json({ errors: [{ field: 'subscription', message: 'Subscription is expired or inactive' }] });
                }
                const rawAuthKey = crypto.randomBytes(64).toString('hex');
                const hashedAuthKey = await argon2.hash(rawAuthKey, {
                    type: argon2.argon2id,
                    memoryCost: 65536,
                    timeCost: 3,
                    parallelism: 1
                });
                const updateDoc = {
                    $set: {
                        HashedAuthKey: hashedAuthKey,
                        LastKeyGenerationTime: new Date()
                    }
                };
                const result = await collection.updateOne(
                    { Username: userDoc.Username },
                    updateDoc
                );
                if (result.modifiedCount === 0) {
                    logger.error({
                        msg: 'Failed to Update Authentication Key',
                        username: userDoc.Username,
                        context: 'PATCH /generate-key',
                        statusCode: 500
                    });
                    return res.status(500).json({ message: 'Failed to update authentication key' });
                }
                logger.info({
                    msg: 'Authentication Key Regenerated',
                    username: userDoc.Username.substring(0, 3) + '...',
                    context: 'PATCH /generate-key',
                    statusCode: 200
                });
                return res.json({ confirm: true, message: 'Key generated successfully', rawAuthKey });
            } catch (error) {
                const errObj = handleError(error, 'PATCH /generate-key', {}, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                        logger.warn({
                            msg: 'MongoDB Client Closure Failed',
                            error: {
                                message: closeErr.message,
                                name: closeErr.name
                            },
                            context: 'PATCH /generate-key'
                        });
                    }
                }
            }
        }
    );

    // Endpoint to actually retrieve the key using the token
    app.get('/retrieve-key', async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /retrieve-key',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { token } = req.query;
            if (!token) {
                logger.warn({
                    msg: 'Token is required for key retrieval',
                    context: 'GET /retrieve-key',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Token is required' });
            }
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const tokenDoc = await db.collection('DownloadTokens').findOne({ token });
            if (!tokenDoc) {
                logger.warn({
                    msg: 'Invalid token provided for key retrieval',
                    token,
                    context: 'GET /retrieve-key',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'Invalid token' });
            }
            if (Date.now() > tokenDoc.expiresAt.getTime()) {
                await db.collection('DownloadTokens').deleteOne({ token });
                logger.warn({
                    msg: 'Token has expired',
                    token,
                    context: 'GET /retrieve-key',
                    statusCode: 410
                });
                return res.status(410).json({ message: 'Token has expired' });
            }
            const userDoc = await db.collection('Users').findOne({ Username: tokenDoc.username });
            if (!userDoc || !userDoc.AuthKey) {
                logger.warn({
                    msg: 'User or key not found for token',
                    username: tokenDoc.username,
                    context: 'GET /retrieve-key',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User or key not found' });
            }
            await db.collection('DownloadTokens').deleteOne({ token });
            res.json({ key: userDoc.AuthKey });
        } catch (error) {
            const errObj = handleError(error, 'GET /retrieve-key', {}, 500);
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
                        context: 'GET /retrieve-key'
                    });
                }
            }
        }
    });

    // endpoint that updates user document with new password
    app.patch('/password-change',
        validate([
            validationSchemas.user(),
            validationSchemas.oldPassword(),
            validationSchemas.newPassword()
        ]),
        async (req: Request, res: Response) => {
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn({
                    msg: 'Password Change Validation Failed',
                    errors: errors.array().map(error => ({
                        message: error.msg
                    })),
                    context: 'PATCH /password-change',
                    statusCode: 400
                });
                return res.status(400).json({
                    errors: errors.array().map(error => ({
                        message: error.msg
                    }))
                });
            }
            let client: typeof MongoClient | undefined;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /password-change',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const { oldPassword, newPassword, user } = req.body;
                const sanitizedUsername = sanitizeInput(user);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Users');
                const userDoc = await collection.findOne({
                    Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
                });
                if (!userDoc) {
                    logger.warn({
                        msg: 'Password Change Attempt for Non-Existent User',
                        attemptedUsername: sanitizedUsername,
                        ip: req.ip,
                        context: 'PATCH /password-change',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'User not found' });
                }
                const isOldPasswordCorrect = await argon2.verify(userDoc.Password, oldPassword);
                if (!isOldPasswordCorrect) {
                    logger.warn({
                        msg: 'Password Change Attempt with Incorrect Current Password',
                        username: userDoc.Username,
                        ip: req.ip,
                        context: 'PATCH /password-change',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Current password is incorrect' });
                }
                const isNewPasswordSameAsOld = await argon2.verify(userDoc.Password, newPassword);
                if (isNewPasswordSameAsOld) {
                    logger.warn({
                        msg: 'Password Change Attempt with Same Password',
                        username: userDoc.Username,
                        context: 'PATCH /password-change',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'New password must be different from the current password' });
                }
                const hashedNewPassword = await argon2.hash(newPassword, {
                    type: argon2.argon2id,
                    memoryCost: 65536,
                    timeCost: 3,
                    parallelism: 1
                });
                const updateDoc = {
                    $set: {
                        Password: hashedNewPassword,
                        LastPasswordChangeTime: new Date()
                    }
                };
                const result = await collection.updateOne(
                    { Username: userDoc.Username },
                    updateDoc
                );
                if (result.modifiedCount === 0) {
                    logger.error({
                        msg: 'Failed to Update Password',
                        username: userDoc.Username,
                        context: 'PATCH /password-change',
                        statusCode: 500
                    });
                    return res.status(500).json({ message: 'Failed to update password' });
                }
                logger.info({
                    msg: 'Password Changed',
                    username: userDoc.Username.substring(0, 3) + '...',
                    context: 'PATCH /password-change',
                    statusCode: 200
                });
                res.json({
                    message: 'Password successfully changed',
                    confirm: true
                });
            } catch (error) {
                const errObj = handleError(error, 'PATCH /password-change', {}, 500);
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
                            context: 'PATCH /password-change'
                        });
                    }
                }
            }
        }
    );

    //endpoint that changes password with recovery method 
    app.patch('/change-password2',
        validate([
            validationSchemas.recoveryKey(),
            validationSchemas.newPassword()
        ]),
        async (req: Request, res: Response) => {
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /change-password2',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const { recoveryKey, newPassword } = req.body;
                if (!recoveryKey || !newPassword) {
                    logger.warn({
                        msg: 'Change Password attempt with missing fields',
                        recoveryKeyProvided: !!recoveryKey,
                        newPasswordProvided: !!newPassword,
                        context: 'PATCH /change-password2',
                        statusCode: 400
                    });
                    return res.status(400).json({ message: 'Please fill both recovery key and new password fields' });
                }
                const sanitizedRecoveryKey = sanitizeInput(recoveryKey);
                const sanitizedNewPassword = sanitizeInput(newPassword);
                const client = new MongoClient(uri);
                try {
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const usersCollection = db.collection('Users');
                    const users = await usersCollection.find({}).toArray();
                    const matchedUser = await Promise.all(users.map(async (user: any) => {
                        try {
                            const isMatch = await argon2.verify(user.HashedAuthKey, sanitizedRecoveryKey);
                            return isMatch ? user : null;
                        } catch (compareError: any) {
                            logger.warn({
                                msg: 'Recovery Key Comparison Error',
                                username: user.Username,
                                error: compareError instanceof Error ? compareError.message : String(compareError),
                                context: 'PATCH /change-password2',
                                statusCode: 400
                            });
                            return null;
                        }
                    })).then(results => results.find(user => user !== null));
                    if (!matchedUser) {
                        logger.warn({
                            msg: 'Change Password attempt with invalid recovery key',
                            ip: req.ip,
                            context: 'PATCH /change-password2',
                            statusCode: 401
                        });
                        return res.status(401).json({ message: 'Invalid recovery key' });
                    }
                    const hashedPassword = await argon2.hash(sanitizedNewPassword, {
                        type: argon2.argon2id,
                        memoryCost: 65536,
                        timeCost: 3,
                        parallelism: 1
                    });
                    const updateResult = await usersCollection.updateOne(
                        { HashedAuthKey: matchedUser.HashedAuthKey },
                        { $set: { Password: hashedPassword } }
                    );
                    if (updateResult.modifiedCount === 1) {
                        logger.info({
                            msg: 'Password changed successfully',
                            username: matchedUser.Username ? matchedUser.Username.substring(0, 3) + '...' : 'Unknown',
                            context: 'PATCH /change-password2',
                            statusCode: 200
                        });
                        return res.status(200).json({ message: 'Password changed successfully' });
                    } else {
                        logger.error({
                            msg: 'Failed to Update Password',
                            username: matchedUser.Username,
                            context: 'PATCH /change-password2',
                            statusCode: 500
                        });
                        return res.status(500).json({ message: 'Failed to update password' });
                    }
                } catch (error) {
                    const errObj = handleError(error, 'PATCH /change-password2', {}, 500);
                    return res.status(errObj.statusCode || 500).json(errObj);
                } finally {
                    await client.close();
                }
            } catch (error) {
                const errObj = handleError(error, 'PATCH /change-password2', {}, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            }
        }
    );

    // endpoint that updates username for user
    app.patch('/change-username',
        // Validation middleware
        validate([
            validationSchemas.user('user'),
            validationSchemas.newUsername()
        ]),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'PATCH /change-username',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const { user, newUsername } = req.body;
                const sanitizedCurrentUsername = sanitizeInput(user);
                const sanitizedNewUsername = sanitizeInput(newUsername);
                if (sanitizedCurrentUsername === sanitizedNewUsername) {
                    logger.warn({
                        msg: 'Username Change Rejected',
                        reason: 'Current and new usernames are identical',
                        context: 'PATCH /change-username',
                        statusCode: 400
                    });
                    return res.status(400).json({
                        errors: [{ field: 'newUsername', message: 'Current username and new username cannot be the same' }]
                    });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const existingUser = await usersCollection.findOne({
                    Username: { $regex: new RegExp(`^${sanitizedNewUsername}$`, 'i') }
                });
                if (existingUser) {
                    logger.warn({
                        msg: 'Username Change Rejected',
                        reason: 'Username already exists',
                        attemptedUsername: sanitizedNewUsername,
                        ip: req.ip,
                        context: 'PATCH /change-username',
                        statusCode: 400
                    });
                    return res.status(400).json({
                        errors: [{ field: 'newUsername', message: 'Username already exists' }]
                    });
                }
                const userUpdateResult = await usersCollection.updateOne(
                    { Username: sanitizedCurrentUsername },
                    { $set: { Username: sanitizedNewUsername } }
                );
                if (userUpdateResult.modifiedCount === 0) {
                    logger.warn({
                        msg: 'Username Change Failed',
                        reason: 'User not found',
                        username: sanitizedCurrentUsername,
                        context: 'PATCH /change-username',
                        statusCode: 404
                    });
                    return res.status(404).json({
                        errors: [{ field: 'user', message: 'User not found' }]
                    });
                }
                const collectionsToUpdate = [
                    {
                        name: 'Notes',
                        filter: { Username: sanitizedCurrentUsername },
                        update: { $set: { Username: sanitizedNewUsername } }
                    },
                    {
                        name: 'Screeners',
                        filter: { UsernameID: sanitizedCurrentUsername },
                        update: { $set: { UsernameID: sanitizedNewUsername } }
                    },
                    {
                        name: 'Watchlists',
                        filter: { UsernameID: sanitizedCurrentUsername },
                        update: { $set: { UsernameID: sanitizedNewUsername } }
                    }
                ];
                for (const collection of collectionsToUpdate) {
                    try {
                        const result = await db.collection(collection.name).updateMany(
                            collection.filter,
                            collection.update
                        );
                        logger.info({
                            msg: `Updated ${collection.name} Collection`,
                            modifiedCount: result.modifiedCount,
                            context: 'PATCH /change-username',
                            statusCode: 200
                        });
                    } catch (updateError: any) {
                        logger.error({
                            msg: `Failed to update ${collection.name} Collection`,
                            error: updateError instanceof Error ? updateError.message : String(updateError),
                            context: 'PATCH /change-username',
                            statusCode: 500
                        });
                    }
                }
                logger.info({
                    msg: 'Username changed successfully',
                    username: sanitizedCurrentUsername.substring(0, 3) + '...',
                    context: 'PATCH /change-username',
                    statusCode: 200
                });
                res.json({ message: 'Username changed successfully', confirm: true });
            } catch (error) {
                const errObj = handleError(error, 'PATCH /change-username', {
                    currentUsernameLength: req.body.user ? req.body.user.length : 0,
                    newUsernameLength: req.body.newUsername ? req.body.newUsername.length : 0
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: any) {
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeError instanceof Error ? closeError.message : String(closeError),
                            context: 'PATCH /change-username',
                            statusCode: 500
                        });
                    }
                }
            }
        }
    );

    app.delete('/account-delete',
        validate([
            validationSchemas.user(),
            validationSchemas.password()
        ]),
        async (req: Request, res: Response) => {
            let client: typeof MongoClient | undefined;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'DELETE /account-delete',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const { user, password } = req.body;
                const sanitizedUsername = sanitizeInput(user);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: sanitizedUsername });
                if (!userDoc) {
                    logger.warn({
                        msg: 'Account Deletion Failed',
                        reason: 'User not found',
                        username: sanitizedUsername,
                        context: 'DELETE /account-delete',
                        statusCode: 404
                    });
                    return res.status(404).json({ errors: [{ field: 'user', message: 'User not found' }] });
                }
                const isPasswordValid = await argon2.verify(userDoc.Password, password);
                if (!isPasswordValid) {
                    logger.warn({
                        msg: 'Account Deletion Failed',
                        reason: 'Incorrect Password',
                        username: sanitizedUsername,
                        context: 'DELETE /account-delete',
                        statusCode: 401
                    });
                    return res.status(401).json({ errors: [{ field: 'password', message: 'Incorrect password' }] });
                }
                const collectionsToClean = [
                    { name: 'Users', filter: { Username: sanitizedUsername }, logMessage: 'User Document Deleted' },
                    { name: 'Screeners', filter: { UsernameID: sanitizedUsername }, logMessage: 'Screeners Cleaned Up' },
                    { name: 'Watchlists', filter: { UsernameID: sanitizedUsername }, logMessage: 'Watchlists Cleaned Up' },
                    { name: 'Notes', filter: { Username: sanitizedUsername }, logMessage: 'Notes Cleaned Up' }
                ];
                for (const collection of collectionsToClean) {
                    try {
                        const result = await db.collection(collection.name).deleteMany(collection.filter);
                        logger.info({
                            msg: collection.logMessage,
                            username: sanitizedUsername,
                            deletedCount: result.deletedCount,
                            context: 'DELETE /account-delete',
                            statusCode: 200
                        });
                    } catch (deleteError: any) {
                        logger.error({
                            msg: `Failed to clean up ${collection.name} Collection`,
                            username: sanitizedUsername,
                            error: deleteError instanceof Error ? deleteError.message : String(deleteError),
                            context: 'DELETE /account-delete',
                            statusCode: 500
                        });
                    }
                }
                logger.info({
                    msg: 'Account deleted successfully',
                    username: sanitizedUsername,
                    context: 'DELETE /account-delete',
                    statusCode: 200
                });
                res.json({ message: 'Account deleted successfully', confirm: true });
            } catch (error) {
                const errObj = handleError(error, 'DELETE /account-delete', {
                    usernameLength: req.body.user ? req.body.user.length : 0
                }, 500);
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError: any) {
                        logger.error({
                            msg: 'Error closing database connection',
                            error: closeError instanceof Error ? closeError.message : String(closeError),
                            context: 'DELETE /account-delete',
                            statusCode: 500
                        });
                    }
                }
            }
        }
    );

    // endpoint that retrieves expriation days for users (user section)
    app.get('/get-expiration-date',
        validate([
            body('user')
                .optional()
                .trim()
                .notEmpty().withMessage('Username is required')
        ]),
        async (req: Request, res: Response) => {
            const username = req.query.user;
            if (!username) {
                logger.warn({
                    msg: 'Expiration Date Check Failed',
                    reason: 'Username missing',
                    context: 'GET /get-expiration-date',
                    statusCode: 400
                });
                return res.status(400).json({
                    errors: [{ field: 'user', message: 'Username is required' }]
                });
            }
            const sanitizedUsername = sanitizeInput(username);
            let client: typeof MongoClient | undefined;
            try {
                const apiKey = req.header('x-api-key');
                const sanitizedKey = sanitizeInput(apiKey);
                if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                    logger.warn({
                        msg: 'Invalid API key',
                        providedApiKey: !!sanitizedKey,
                        context: 'GET /get-expiration-date',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({ Username: sanitizedUsername });
                if (!userDoc) {
                    logger.warn({
                        msg: 'Expiration Date Check Failed',
                        reason: 'User not found',
                        username: sanitizedUsername.substring(0, 3) + '...',
                        context: 'GET /get-expiration-date',
                        statusCode: 404
                    });
                    return res.status(404).json({ error: 'User not found' });
                }
                const today = new Date();
                const expiresDate = new Date(userDoc.Expires);
                const differenceInTime = expiresDate.getTime() - today.getTime();
                const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
                logger.info({
                    msg: 'Expiration Date Retrieved',
                    username: sanitizedUsername.substring(0, 3) + '...',
                    expirationDays: differenceInDays,
                    context: 'GET /get-expiration-date',
                    statusCode: 200
                });
                res.json({ expirationDays: differenceInDays });
            } catch (error) {
                const errObj = handleError(error, 'GET /get-expiration-date', {
                    usernameLength: sanitizedUsername.length
                }, 500);
                logger.error({
                    msg: 'Expiration Date Retrieval Error',
                    error: error instanceof Error ? error.message : String(error),
                    username: sanitizedUsername.substring(0, 3) + '...',
                    context: 'GET /get-expiration-date',
                    statusCode: errObj.statusCode || 500
                });
                return res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            error: closeError instanceof Error ? closeError.message : String(closeError),
                            context: 'GET /get-expiration-date',
                            statusCode: 500
                        });
                    }
                }
            }
        }
    );

    // retrieves receipts for the user 
    app.get('/get-receipts/:user',
        validate([
            param('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
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
                        requestId,
                        context: 'GET /get-receipts/:user',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const user = sanitizeInput(req.params.user);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const userDoc = await usersCollection.findOne({
                    Username: { $regex: new RegExp(`^${user}$`, 'i') }
                });
                if (!userDoc) {
                    logger.warn({
                        msg: 'User Not Found',
                        requestId,
                        username: user.substring(0, 3) + '...',
                        context: 'GET /get-receipts/:user',
                        statusCode: 404
                    });
                    return res.status(404).json({ error: 'User not found', requestId });
                }
                const receiptsCollection = db.collection('Receipts');
                const query = { UserID: userDoc._id };
                const userReceipts = await receiptsCollection.find(query).toArray();
                logger.info({
                    msg: 'Receipts Retrieved',
                    requestId,
                    username: user.substring(0, 3) + '...',
                    receiptsCount: userReceipts.length,
                    context: 'GET /get-receipts/:user',
                    statusCode: 200
                });
                res.json({ receipts: userReceipts, requestId });
            } catch (error) {
                const errObj = handleError(error, 'GET /get-receipts/:user', {
                    requestId,
                    usernameLength: req.params.user ? req.params.user.length : 0
                }, 500);
                logger.error({
                    msg: 'Error Retrieving Receipts',
                    requestId,
                    username: req.params.user ? req.params.user.substring(0, 3) + '...' : 'Unknown',
                    error: error instanceof Error ? error.message : String(error),
                    context: 'GET /get-receipts/:user',
                    statusCode: errObj.statusCode || 500
                });
                res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            requestId,
                            error: closeError instanceof Error ? closeError.message : String(closeError),
                            context: 'GET /get-receipts/:user',
                            statusCode: 500
                        });
                    }
                }
            }
        }
    );

    // endpoint that retrieves default symbol for user
    app.get('/:user/default-symbol',
        validate([
            param('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
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
                        requestId,
                        context: 'GET /:user/default-symbol',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const username = sanitizeInput(req.params.user);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Users');
                const userDoc = await collection.findOne(
                    { Username: username },
                    { projection: { defaultSymbol: 1, _id: 0 } }
                );
                if (!userDoc) {
                    logger.warn({
                        msg: 'User Not Found',
                        requestId,
                        username: username.substring(0, 3) + '...',
                        context: 'GET /:user/default-symbol',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'User not found' });
                }
                res.json({ defaultSymbol: userDoc.defaultSymbol });
            } catch (error) {
                const errObj = handleError(error, 'GET /:user/default-symbol', {
                    requestId,
                    usernameLength: req.params.user ? req.params.user.length : 0
                }, 500);
                logger.error({
                    msg: 'Error Retrieving Default Symbol',
                    requestId,
                    username: req.params.user ? req.params.user.substring(0, 3) + '...' : 'Unknown',
                    error: error instanceof Error ? error.message : String(error),
                    context: 'GET /:user/default-symbol',
                    statusCode: errObj.statusCode || 500
                });
                res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            requestId,
                            error: closeError instanceof Error ? closeError.message : String(closeError),
                            context: 'GET /:user/default-symbol',
                            statusCode: 500
                        });
                    }
                }
            }
        }
    );

    // endpoint that updates default symbol for user
    app.patch('/:user/update-default-symbol',
        validate([
            // Validate user parameter
            param('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

            // Validate default symbol in body
            body('defaultSymbol')
                .trim()
                .notEmpty().withMessage('Default symbol is required')
                .isLength({ min: 1, max: 10 }).withMessage('Symbol must be between 1 and 10 characters')
                .matches(/^[A-Za-z0-9.]+$/).withMessage('Symbol can only contain letters, numbers, and periods')
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
                        requestId,
                        context: 'PATCH /:user/update-default-symbol',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    logger.warn({
                        msg: 'Validation Failed',
                        requestId,
                        errors: errors.array(),
                        username: req.params.user ? req.params.user.substring(0, 3) + '...' : 'Unknown',
                        context: 'PATCH /:user/update-default-symbol',
                        statusCode: 400
                    });
                    return res.status(400).json({ errors: errors.array() });
                }
                const username = sanitizeInput(req.params.user);
                const defaultSymbol = sanitizeInput(req.body.defaultSymbol).toUpperCase();
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Users');
                const assetInfoCollection = db.collection('AssetInfo');
                const symbolExists = await assetInfoCollection.findOne({ Symbol: defaultSymbol });
                if (!symbolExists) {
                    logger.warn({
                        msg: 'Symbol Not Found in Asset Info',
                        requestId,
                        username: username.substring(0, 3) + '...',
                        symbol: defaultSymbol,
                        context: 'PATCH /:user/update-default-symbol',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'Symbol not found' });
                }
                const result = await collection.updateOne(
                    { Username: username },
                    { $set: { defaultSymbol: defaultSymbol } }
                );
                if (result.matchedCount === 0) {
                    logger.warn({
                        msg: 'User Not Found During Symbol Update',
                        requestId,
                        username: username.substring(0, 3) + '...',
                        context: 'PATCH /:user/update-default-symbol',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'User not found' });
                }
                if (result.modifiedCount === 0) {
                    return res.status(400).json({ message: 'No changes made' });
                }
                res.json({ message: 'Default symbol updated successfully' });
            } catch (error) {
                const errObj = handleError(error, 'PATCH /:user/update-default-symbol', {
                    requestId,
                    usernameLength: req.params.user ? req.params.user.length : 0
                }, 500);
                logger.error({
                    msg: 'Error Updating Default Symbol',
                    requestId,
                    username: req.params.user ? req.params.user.substring(0, 3) + '...' : 'Unknown',
                    error: error instanceof Error ? error.message : String(error),
                    context: 'PATCH /:user/update-default-symbol',
                    statusCode: errObj.statusCode || 500
                });
                res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            requestId,
                            error: closeError instanceof Error ? closeError.message : String(closeError),
                            context: 'PATCH /:user/update-default-symbol',
                            statusCode: 500
                        });
                    }
                }
            }
        }
    );

    // Endpoint that retrieves the 'Hidden' list for a user
    app.get('/:user/hidden',
        validate([
            param('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
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
                        requestId,
                        context: 'GET /:user/hidden',
                        statusCode: 401
                    });
                    return res.status(401).json({ message: 'Unauthorized API Access' });
                }
                const username = sanitizeInput(req.params.user);
                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const collection = db.collection('Users');
                const userDoc = await collection.findOne(
                    { Username: username },
                    { projection: { Hidden: 1, _id: 0 } }
                );
                if (!userDoc) {
                    logger.warn({
                        msg: 'User Not Found',
                        requestId,
                        username: username.substring(0, 3) + '...',
                        context: 'GET /:user/hidden',
                        statusCode: 404
                    });
                    return res.status(404).json({ message: 'User not found' });
                }
                logger.info({
                    msg: 'Hidden List Retrieved',
                    requestId,
                    username: username.substring(0, 3) + '...',
                    context: 'GET /:user/hidden',
                    statusCode: 200
                });
                res.json({ Hidden: userDoc.Hidden });
            } catch (error) {
                const errObj = handleError(error, 'GET /:user/hidden', {
                    requestId,
                    usernameLength: req.params.user ? req.params.user.length : 0
                }, 500);
                logger.error({
                    msg: 'Error Retrieving Hidden List',
                    requestId,
                    username: req.params.user ? req.params.user.substring(0, 3) + '...' : 'Unknown',
                    error: error instanceof Error ? error.message : String(error),
                    context: 'GET /:user/hidden',
                    statusCode: errObj.statusCode || 500
                });
                res.status(errObj.statusCode || 500).json(errObj);
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            requestId,
                            error: closeError instanceof Error ? closeError.message : String(closeError),
                            context: 'GET /:user/hidden',
                            statusCode: 500
                        });
                    }
                }
            }
        }
    );

    // endpoint to update the current theme
    app.post('/theme', validate([
        validationSchemas.theme(),
        validationSchemas.username()
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /theme',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { theme, username } = req.body;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser });
            if (!userDocument) {
                logger.warn({
                    msg: 'User not found',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'POST /theme',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }
            await usersCollection.updateOne({ Username: sanitizedUser }, { $set: { theme } });
            logger.info({
                msg: 'Theme updated',
                username: sanitizedUser.substring(0, 3) + '...',
                context: 'POST /theme',
                statusCode: 200
            });
            return res.status(200).json({ message: 'Theme updated' });
        } catch (error) {
            const errObj = handleError(error, 'POST /theme', {
                usernameLength: req.body.username ? req.body.username.length : 0
            }, 500);
            logger.error({
                msg: 'Error updating theme',
                error: error instanceof Error ? error.message : String(error),
                context: 'POST /theme',
                statusCode: errObj.statusCode || 500
            });
            return res.status(errObj.statusCode || 500).json({ message: 'An error occurred while updating theme' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to load current them for user 
    app.post('/load-theme', validate([
        validationSchemas.username()
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /load-theme',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username } = req.body;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser });
            if (!userDocument) {
                logger.warn({
                    msg: 'User not found',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'POST /load-theme',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }
            const theme = userDocument.theme;
            logger.info({
                msg: 'Theme loaded',
                username: sanitizedUser.substring(0, 3) + '...',
                context: 'POST /load-theme',
                statusCode: 200
            });
            return res.status(200).json({ theme });
        } catch (error) {
            const errObj = handleError(error, 'POST /load-theme', {
                usernameLength: req.body.username ? req.body.username.length : 0
            }, 500);
            logger.error({
                msg: 'Error loading theme',
                error: error instanceof Error ? error.message : String(error),
                context: 'POST /load-theme',
                statusCode: errObj.statusCode || 500
            });
            return res.status(errObj.statusCode || 500).json({ message: 'An error occurred while loading theme' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to update the current panel order
    app.post('/panel', validate([
        validationSchemas.username(),
        body('newListOrder')
            .isArray({ min: 1, max: 9 })
            .withMessage('Panel list must contain between 1 and 9 items'),
        body('newListOrder.*.order')
            .isInt({ min: 1, max: 9 })
            .withMessage('Order must be an integer between 1 and 9'),
        body('newListOrder.*.tag')
            .isIn(['Summary', 'EpsTable', 'EarnTable', 'SalesTable', 'DividendsTable', 'SplitsTable', 'Financials', 'Notes', 'News'])
            .withMessage('Invalid tag'),
        body('newListOrder.*.name')
            .isString()
            .withMessage('Name must be a string'),
        body('newListOrder.*.hidden')
            .isBoolean()
            .withMessage('Hidden must be a boolean'),
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /panel',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, newListOrder } = req.body;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser });
            if (!userDocument) {
                logger.warn({
                    msg: 'User not found',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'POST /panel',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }
            // Update or create the panel list
            const updateResult = await usersCollection.updateOne(
                { Username: sanitizedUser },
                {
                    $set: {
                        panel: newListOrder
                    }
                },
                {
                    upsert: true
                }
            );
            if (updateResult.matchedCount === 0 && updateResult.upsertedCount === 1) {
                logger.info({
                    msg: 'Panel list created',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'POST /panel',
                    statusCode: 201
                });
                return res.status(201).json({ message: 'Panel list created' });
            } else {
                logger.info({
                    msg: 'Panel list updated',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'POST /panel',
                    statusCode: 200
                });
                return res.status(200).json({ message: 'Panel list updated' });
            }
        } catch (error) {
            const errObj = handleError(error, 'POST /panel', {
                usernameLength: req.body.username ? req.body.username.length : 0
            }, 500);
            logger.error({
                msg: 'Error updating panel list',
                error: error instanceof Error ? error.message : String(error),
                context: 'POST /panel',
                statusCode: errObj.statusCode || 500
            });
            return res.status(errObj.statusCode || 500).json({ message: 'An error occurred while updating panel list' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to get the current panel order
    app.get('/panel', validate([
        validationSchemas.usernameQuery()
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /panel',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username } = req.query;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser }, { projection: { panel: 1 } });
            if (!userDocument) {
                logger.warn({
                    msg: 'User not found',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'GET /panel',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }
            logger.info({
                msg: 'Panel list retrieved',
                username: sanitizedUser.substring(0, 3) + '...',
                context: 'GET /panel',
                statusCode: 200
            });
            return res.status(200).json({ panel: userDocument.panel || [] });
        } catch (error) {
            const errObj = handleError(error, 'GET /panel', {
                usernameLength: req.query.username ? req.query.username.length : 0
            }, 500);
            logger.error({
                msg: 'Error retrieving panel list',
                error: error instanceof Error ? error.message : String(error),
                context: 'GET /panel',
                statusCode: errObj.statusCode || 500
            });
            return res.status(errObj.statusCode || 500).json({ message: 'An error occurred while retrieving the panel list' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to update the current summary panel order
    app.post('/panel2', validate([
        validationSchemas.username(),
        body('newListOrder')
            .isArray({ min: 1, max: 42 })
            .withMessage('Panel list must contain between 1 and 40 items'),
        body('newListOrder.*.order')
            .isInt({ min: 1, max: 42 })
            .withMessage('Order must be an integer between 1 and 40'),
        body('newListOrder.*.tag')
            .isIn(['Symbol', 'CompanyName', 'AssetType', 'Exchange', 'ISIN', 'IPODate', 'Sector', 'Industry', 'ReportedCurrency', 'TechnicalScore1W', 'TechnicalScore1M', 'TechnicalScore4M', 'MarketCap', 'SharesOutstanding', 'Location', 'DividendDate', 'DividendYieldTTM', 'BookValue', 'PEGRatio', 'PERatio', 'Description', 'AverageVolume1W', 'AverageVolume1M', 'AverageVolume6M', 'AverageVolume1Y', 'RelativeVolume1W', 'RelativeVolume1M', 'RelativeVolume6M', 'RelativeVolume1Y', 'PercentageOff52wkHigh', 'PercentageOff52wkLow', 'AllTimeHigh', 'AllTimeLow', 'PSRatio', 'ADV1W', 'ADV1M', 'ADV4M', 'ADV1Y', 'Gap', 'RSI',
                'fiftytwoWeekHigh', 'fiftytwoWeekLow'])
            .withMessage('Invalid tag'),
        body('newListOrder.*.name')
            .isString()
            .withMessage('Name must be a string'),
        body('newListOrder.*.hidden')
            .isBoolean()
            .withMessage('Hidden must be a boolean'),
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /panel2',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username, newListOrder } = req.body;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser });
            if (!userDocument) {
                logger.warn({
                    msg: 'User not found',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'POST /panel2',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }
            // Update or create the panel list
            const updateResult = await usersCollection.updateOne(
                { Username: sanitizedUser },
                {
                    $set: {
                        panel2: newListOrder
                    }
                },
                {
                    upsert: true
                }
            );
            if (updateResult.matchedCount === 0 && updateResult.upsertedCount === 1) {
                logger.info({
                    msg: 'Panel list created',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'POST /panel2',
                    statusCode: 201
                });
                return res.status(201).json({ message: 'Panel list created' });
            } else {
                logger.info({
                    msg: 'Panel list updated',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'POST /panel2',
                    statusCode: 200
                });
                return res.status(200).json({ message: 'Panel list updated' });
            }
        } catch (error) {
            // Type guard for validation errors
            if (
                typeof error === 'object' &&
                error !== null &&
                'errors' in error &&
                Array.isArray((error as any).errors)
            ) {
                const validationErrors = (error as any).errors.map((err: any) => ({
                    field: err.param,
                    message: err.msg
                }));
                logger.warn({
                    msg: 'Validation failed',
                    errors: validationErrors,
                    context: 'POST /panel2',
                    statusCode: 400
                });
                return res.status(400).json({ errors: validationErrors });
            }
            const errObj = handleError(error, 'POST /panel2', {
                usernameLength: req.body.username ? req.body.username.length : 0
            }, 500);
            // Error already logged in handleError
            return res.status(errObj.statusCode || 500).json({ message: 'An error occurred while updating panel list' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to get the current summary panel order
    app.get('/panel2', validate([
        validationSchemas.usernameQuery()
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /panel2',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username } = req.query;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser }, { projection: { panel2: 1 } });
            if (!userDocument) {
                logger.warn({
                    msg: 'User not found',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'GET /panel2',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }
            logger.info({
                msg: 'Panel2 list retrieved',
                username: sanitizedUser.substring(0, 3) + '...',
                context: 'GET /panel2',
                statusCode: 200
            });
            return res.status(200).json({ panel2: userDocument.panel2 || [] });
        } catch (error) {
            const errObj = handleError(error, 'GET /panel2', {
                usernameLength: req.query.username ? String(req.query.username).length : 0
            }, 500);
            logger.error({
                msg: 'Error retrieving panel2 list',
                error: error instanceof Error ? error.message : String(error),
                context: 'GET /panel2',
                statusCode: errObj.statusCode || 500
            });
            return res.status(errObj.statusCode || 500).json({ message: 'An error occurred while retrieving the panel list' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to get the current panel order
    app.get('/panel', validate([
        validationSchemas.usernameQuery()
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /panel',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            const { username } = req.query;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser }, { projection: { panel: 1 } });
            if (!userDocument) {
                logger.warn({
                    msg: 'User not found',
                    username: sanitizedUser.substring(0, 3) + '...',
                    context: 'GET /panel',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }
            logger.info({
                msg: 'Panel list retrieved',
                username: sanitizedUser.substring(0, 3) + '...',
                context: 'GET /panel',
                statusCode: 200
            });
            return res.status(200).json({ panel: userDocument.panel || [] });
        } catch (error) {
            const errObj = handleError(error, 'GET /panel', {
                usernameLength: req.query.username ? String(req.query.username).length : 0
            }, 500);
            logger.error({
                msg: 'Error retrieving panel list',
                error: error instanceof Error ? error.message : String(error),
                context: 'GET /panel',
                statusCode: errObj.statusCode || 500
            });
            return res.status(errObj.statusCode || 500).json({ message: 'An error occurred while retrieving the panel list' });
        } finally {
            if (client) await client.close();
        }
    });

};