// TypeScript: declare global Stripe instance for type safety
declare global {
    // eslint-disable-next-line no-var
    var stripeInstance: any | undefined;
}
import { handleError } from '../utils/logger.js';
import { validationSets, body, validationResult, param } from '../utils/validationUtils.js';
import speakeasy from 'speakeasy';
import { Request, Response } from 'express';

export default function (app: any, deps: any) {
    const {
        validate,
        validationSchemas,
        sanitizeInput,
        sanitizeUsername,
        sanitizeUsernameCanonical,
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
                let tokenExpiration = rememberMe === 'true' ? '7d' : '1h';
                // Exclude sensitive fields from user object
                const { Password, ...safeUserData } = user;
                const token = jwt.sign({ user: safeUserData }, config.secretKey, { expiresIn: tokenExpiration });
                if (today > expiresDate) {
                    logger.warn({
                        msg: 'Login attempt with expired subscription',
                        username: sanitizedUsername,
                        context: 'POST /login',
                        statusCode: 402
                    });
                    await usersCollection.updateOne({ Username: user.Username }, { $set: { Paid: false } });
                    // Return token so frontend can allow renewal
                    return res.status(402).json({ message: 'Subscription is expired', token });
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
    app.post('/signup-paywall', validate([
        validationSets.signupPaywall
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /signup-paywall',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Map frontend fields to backend logic and sanitize all relevant fields
            const {
                username,
                password,
                payment_method_id,
                duration,
                country,
                vat,
                total,
                promoCode
            } = req.body;

            // Sanitize all relevant fields
            const sanitizedUsername = sanitizeInput(username);
            const sanitizedPassword = typeof password === 'string' ? sanitizeInput(password) : '';
            const sanitizedPaymentMethodId = typeof payment_method_id === 'string' ? sanitizeInput(payment_method_id) : '';
            // duration, vat, total are numbers but could be strings from frontend, so sanitize and parse
            const sanitizedDuration = typeof duration === 'number' ? duration : parseInt(sanitizeInput(duration));
            const sanitizedCountry = typeof country === 'string' ? sanitizeInput(country) : '';
            const sanitizedVat = typeof vat === 'number' ? vat : parseFloat(sanitizeInput(vat));
            const sanitizedTotal = typeof total === 'number' ? total : parseFloat(sanitizeInput(total));
            const sanitizedPromoCode = promoCode ? sanitizeInput(promoCode) : null;

            // Map duration to subscriptionPlan (1, 4, 6, 12 months)
            let parsedSubscriptionPlan = 1;
            if (sanitizedDuration === 4) parsedSubscriptionPlan = 4;
            else if (sanitizedDuration === 6) parsedSubscriptionPlan = 6;
            else if (sanitizedDuration === 12) parsedSubscriptionPlan = 12;
            logger.info({
                msg: 'Signup attempt (paywall)',
                username: sanitizedUsername,
                subscriptionPlan: parsedSubscriptionPlan,
                promoCode: sanitizedPromoCode,
                country: sanitizedCountry,
                vat: sanitizedVat,
                total: sanitizedTotal,
                context: 'POST /signup-paywall'
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
                    context: 'POST /signup-paywall',
                    statusCode: 400
                });
                return res.status(400).json({ errors: [{ field: 'username', message: 'Username already exists' }] });
            }
            const expirationDate = calculateSubscription(parsedSubscriptionPlan, logger);
            if (!expirationDate) {
                logger.warn({
                    msg: 'Invalid subscription plan or expiration date',
                    attemptedPlan: parsedSubscriptionPlan,
                    context: 'POST /signup-paywall',
                    statusCode: 400
                });
                return res.status(400).json({ errors: [{ field: 'subscriptionPlan', message: 'Invalid subscription plan or expiration date' }] });
            }
            const promoCodeValidated = await validatePromoCode(agentsCollection, sanitizedPromoCode, sanitizedTotal, logger);
            const hashedPassword = await argon2.hash(sanitizedPassword);
            const rawAuthKey = crypto.randomBytes(64).toString('hex');
            if (!sanitizedPaymentMethodId) {
                logger.warn({
                    msg: 'Signup attempt without payment method',
                    username: sanitizedUsername,
                    context: 'POST /signup-paywall',
                    statusCode: 400
                });
                return res.status(400).json({ errors: [{ field: 'paymentMethodId', message: 'Payment method ID is required' }] });
            }
            // Use window.location.origin as return_url for SCA
            const return_url = req.body.return_url || (req.headers.origin || '');
            const paymentIntent = await createPaymentIntent(sanitizedTotal, sanitizedPaymentMethodId, return_url, logger);
            if (!paymentIntent) {
                logger.error({
                    msg: 'Payment failed',
                    username: sanitizedUsername,
                    context: 'POST /signup-paywall',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Payment failed' });
            }
            if (paymentIntent.status === 'requires_action') {
                logger.info({
                    msg: 'Payment requires action',
                    username: sanitizedUsername,
                    context: 'POST /signup-paywall',
                    statusCode: 200
                });
                return res.json({ requiresAction: true, clientSecret: paymentIntent.client_secret });
            }
            const newUser = await createUser(usersCollection, sanitizedUsername, hashedPassword, expirationDate, parsedSubscriptionPlan, promoCodeValidated, rawAuthKey, logger);
            if (!newUser) {
                logger.error({
                    msg: 'Failed to create user',
                    username: sanitizedUsername,
                    context: 'POST /signup-paywall',
                    statusCode: 500
                });
                return res.status(500).json({ message: 'Failed to create user' });
            }
            // Create 10 portfolio documents for the new user, numbered 0 to 9, with full structure
            const portfoliosCollection = db.collection('Portfolios');
            const portfolioDocs = Array.from({ length: 10 }, (_, i) => ({
                Username: sanitizedUsername,
                Number: i,
                cash: 0,
                BaseValue: 0,
                avgGain: 0,
                avgGainAbs: 0,
                avgHoldTimeLosers: 0,
                avgHoldTimeWinners: 0,
                avgLoss: 0,
                avgLossAbs: 0,
                avgPositionSize: 0,
                biggestLoser: { ticker: '', amount: 0, tradeCount: 0 },
                biggestWinner: { ticker: '', amount: 0, tradeCount: 0 },
                breakevenCount: 0,
                breakevenPercent: 0,
                gainLossRatio: 0,
                loserCount: 0,
                loserPercent: 0,
                profitFactor: 0,
                realizedPL: 0,
                realizedPLPercent: 0,
                riskRewardRatio: 0,
                sortinoRatio: 0,
                winnerCount: 0,
                winnerPercent: 0,
                portfolioValueHistory: [],
                tradeReturnsChart: {
                    labels: [],
                    bins: [],
                    medianBinIndex: 0
                },
                trades: [],
                portfolio: []
            }));
            try {
                await portfoliosCollection.insertMany(portfolioDocs);
            } catch (portfolioError) {
                const err = portfolioError instanceof Error ? portfolioError : new Error(String(portfolioError));
                logger.error({
                    msg: 'Portfolio Creation Failed',
                    error: err.message,
                    name: err.name,
                    context: 'POST /signup-paywall'
                });
            }
            await createReceipt(
                db.collection('Receipts'),
                newUser.insertedId,
                sanitizedTotal,
                parsedSubscriptionPlan,
                promoCodeValidated,
                logger,
                sanitizedVat,
                sanitizedCountry,
                paymentIntent.id
            );
            logger.info({
                msg: 'User created successfully',
                username: sanitizedUsername,
                context: 'POST /signup-paywall',
                statusCode: 201
            });
            return res.status(201).json({ message: 'User created successfully', rawAuthKey: rawAuthKey, success: true });
        } catch (error) {
            const errObj = handleError(error, 'POST /signup-paywall', {}, 500);
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
                        context: 'POST /signup-paywall'
                    });
                }
            }
        }
    });

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

    function calculateSubscription(plan: number, logger: any): Date | null {
        const today = new Date();
        let expirationDate: Date | null = null;
        switch (plan) {
            case 1:
                expirationDate = new Date(today.setMonth(today.getMonth() + 1));
                break;
            case 4:
                expirationDate = new Date(today.setMonth(today.getMonth() + 4));
                break;
            case 6:
                expirationDate = new Date(today.setMonth(today.getMonth() + 6));
                break;
            case 12:
                expirationDate = new Date(today.setMonth(today.getMonth() + 12));
                break;
            default:
                logger.warn({
                    msg: 'Invalid Subscription Plan',
                    attemptedPlan: plan,
                    context: 'calculateSubscription',
                    statusCode: 400
                });
                return null;
        }
        return expirationDate;
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
        // Stripe payment processing
        try {
            // Use Stripe instance from global or create/import if not present
            let stripe = globalThis.stripeInstance;
            if (!stripe) {
                const StripeModule = await import('stripe');
                const secretKey = process.env.STRIPE_SECRET_KEY || '';
                if (!secretKey) {
                    throw new Error('Stripe secret key is not defined');
                }
                stripe = new StripeModule.default(secretKey);
                globalThis.stripeInstance = stripe;
            }
            // Ensure amount is an integer in cents (Stripe requires this)
            const amountCents = Math.round(Number(amount));
            // Create a PaymentIntent with the provided payment method
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountCents, // amount in cents, integer only
                currency: 'eur',
                payment_method: paymentMethodId,
                confirmation_method: 'manual',
                confirm: true,
                return_url: return_url,
                setup_future_usage: 'off_session',
                metadata: {
                    description: 'Ereuna subscription signup',
                },
            });
            // Handle SCA (3D Secure) or other required actions
            if (paymentIntent.status === 'requires_action' && paymentIntent.next_action?.type === 'use_stripe_sdk') {
                logger.info({
                    msg: 'PaymentIntent requires action (SCA)',
                    paymentIntentId: paymentIntent.id,
                    context: 'createPaymentIntent',
                    statusCode: 200
                });
                return {
                    status: 'requires_action',
                    client_secret: paymentIntent.client_secret,
                    id: paymentIntent.id
                };
            } else if (paymentIntent.status === 'succeeded') {
                logger.info({
                    msg: 'PaymentIntent succeeded',
                    paymentIntentId: paymentIntent.id,
                    context: 'createPaymentIntent',
                    statusCode: 200
                });
                return {
                    status: 'succeeded',
                    client_secret: paymentIntent.client_secret,
                    id: paymentIntent.id
                };
            } else {
                logger.error({
                    msg: 'PaymentIntent failed or unexpected status',
                    paymentIntentId: paymentIntent.id,
                    status: paymentIntent.status,
                    context: 'createPaymentIntent',
                    statusCode: 400
                });
                return null;
            }
        } catch (err: any) {
            logger.error({
                msg: 'Stripe PaymentIntent error',
                error: err.message,
                context: 'createPaymentIntent',
                statusCode: 400
            });
            return null;
        }
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

    async function createReceipt(
        collection: any,
        userId: any,
        amount: number,
        subscriptionPlan: number,
        promoCode: string,
        logger: any,
        vatPercent?: number,
        country?: string,
        paymentIntentId?: string
    ): Promise<any> {
        const receiptDocument: any = {
            UserID: userId,
            Amount: amount,
            Date: new Date(),
            Method: 'Credit Card',
            Subscription: subscriptionPlan,
            PROMOCODE: promoCode
        };
        if (typeof vatPercent === 'number') {
            receiptDocument.VAT = vatPercent;
        }
        if (country) {
            receiptDocument.Country = country;
        }
        // Add paymentIntentId if provided (for Stripe refunds)
        if (paymentIntentId) {
            receiptDocument.PaymentIntentId = paymentIntentId;
        }
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

    // endpoint for subscription renewal
    app.post('/renew-subscription', validate([
        validationSets.renewalPaywall
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /renew-subscription',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Sanitize and extract fields
            const {
                user,
                payment_method_id,
                duration,
                country,
                vat,
                total,
                promoCode
            } = req.body;

            const sanitizedUsername = sanitizeInput(user);
            const sanitizedPaymentMethodId = typeof payment_method_id === 'string' ? sanitizeInput(payment_method_id) : '';
            const sanitizedDuration = typeof duration === 'number' ? duration : parseInt(sanitizeInput(duration));
            const sanitizedCountry = typeof country === 'string' ? sanitizeInput(country) : '';
            const sanitizedVat = typeof vat === 'number' ? vat : parseFloat(sanitizeInput(vat));
            const sanitizedTotal = typeof total === 'number' ? total : parseFloat(sanitizeInput(total));
            const sanitizedPromoCode = promoCode ? sanitizeInput(promoCode) : null;

            logger.info({
                msg: 'Renewal attempt',
                username: sanitizedUsername,
                duration: sanitizedDuration,
                promoCode: sanitizedPromoCode,
                country: sanitizedCountry,
                vat: sanitizedVat,
                total: sanitizedTotal,
                context: 'POST /renew-subscription'
            });

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const agentsCollection = db.collection('Agents');
            const userDoc = await usersCollection.findOne({ Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } });
            if (!userDoc) {
                logger.warn({
                    msg: 'User not found for renewal',
                    username: sanitizedUsername,
                    context: 'POST /renew-subscription',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }
            if (!sanitizedPaymentMethodId) {
                logger.warn({
                    msg: 'Renewal attempt without payment method',
                    username: sanitizedUsername,
                    context: 'POST /renew-subscription',
                    statusCode: 400
                });
                return res.status(400).json({ errors: [{ field: 'paymentMethodId', message: 'Payment method ID is required' }] });
            }

            // Prevent double renewal: check for a recent receipt (last 2 minutes) for this user and payment method
            const receiptsCollection = db.collection('Receipts');
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            const recentReceipt = await receiptsCollection.findOne({
                UserID: userDoc._id,
                Method: 'Credit Card',
                Date: { $gte: twoMinutesAgo },
                Amount: sanitizedTotal
            });
            if (recentReceipt) {
                logger.warn({
                    msg: 'Duplicate renewal attempt detected',
                    username: sanitizedUsername,
                    context: 'POST /renew-subscription',
                    statusCode: 429
                });
                return res.status(429).json({ message: 'Renewal already processed recently. Please wait a moment.' });
            }

            // Use window.location.origin as return_url for SCA
            const return_url = req.body.return_url || (req.headers.origin || '');
            // You may want to use the same payment intent logic as signup
            const paymentIntent = await createPaymentIntent(sanitizedTotal, sanitizedPaymentMethodId, return_url, logger);
            if (!paymentIntent) {
                logger.error({
                    msg: 'Payment failed',
                    username: sanitizedUsername,
                    context: 'POST /renew-subscription',
                    statusCode: 400
                });
                return res.status(400).json({ message: 'Payment failed' });
            }
            if (paymentIntent.status === 'requires_action') {
                logger.info({
                    msg: 'Payment requires action',
                    username: sanitizedUsername,
                    context: 'POST /renew-subscription',
                    statusCode: 200
                });
                return res.json({ requiresAction: true, clientSecret: paymentIntent.client_secret });
            }

            // Calculate new expiration date
            let monthsToAdd = sanitizedDuration;
            let now = new Date();
            let currentExpiration = userDoc.Expires ? new Date(userDoc.Expires) : now;
            let newExpiration;
            if (currentExpiration < now) {
                // Expired: add months from today
                newExpiration = new Date(now);
                newExpiration.setMonth(newExpiration.getMonth() + monthsToAdd);
            } else {
                // Not expired: add months from current expiration
                newExpiration = new Date(currentExpiration);
                newExpiration.setMonth(newExpiration.getMonth() + monthsToAdd);
            }

            // Validate promo code if needed
            const promoCodeValidated = await validatePromoCode(agentsCollection, sanitizedPromoCode, sanitizedTotal, logger);

            // Update user expiration and paid status
            await usersCollection.updateOne(
                { Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } },
                {
                    $set: {
                        Expires: newExpiration,
                        Paid: true
                    }
                }
            );

            // Create a new receipt
            await createReceipt(
                db.collection('Receipts'),
                userDoc._id,
                sanitizedTotal,
                sanitizedDuration,
                promoCodeValidated,
                logger,
                sanitizedVat,
                sanitizedCountry,
                paymentIntent.id
            );

            // Fetch updated user for new token
            const updatedUser = await usersCollection.findOne({ Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } });
            let token = null;
            if (updatedUser) {
                const { Password, ...safeUserData } = updatedUser;
                token = jwt.sign({ user: safeUserData }, config.secretKey, { expiresIn: '7d' });
            }
            logger.info({
                msg: 'User renewed successfully',
                username: sanitizedUsername,
                newExpiration,
                context: 'POST /renew-subscription',
                statusCode: 200
            });
            return res.status(200).json({ message: 'Renewal successful', newExpiration, success: true, token });
        } catch (error) {
            const errObj = handleError(error, 'POST /renew-subscription', {}, 500);
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
                        context: 'POST /renew-subscription'
                    });
                }
            }
        }
    });

    // endpoint for free signup (no payment, 1 year free, no receipt)
    app.post('/signup-free', validate([
        validationSchemas.username(),
        validationSchemas.password(),
        // Optionally: country, promoCode, etc. (add as needed)
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /signup-free',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            // Sanitize input fields
            const { username, password, country, promoCode } = req.body;
            const sanitizedUsername = sanitizeInput(username);
            const sanitizedPassword = typeof password === 'string' ? sanitizeInput(password) : '';
            const sanitizedCountry = country ? sanitizeInput(country) : '';
            const sanitizedPromoCode = promoCode ? sanitizeInput(promoCode) : null;

            logger.info({
                msg: 'Signup attempt (free)',
                username: sanitizedUsername,
                country: sanitizedCountry,
                promoCode: sanitizedPromoCode,
                context: 'POST /signup-free'
            });
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            if (await isUsernameTaken(usersCollection, sanitizedUsername, logger)) {
                logger.warn({
                    msg: 'Username already exists',
                    username: sanitizedUsername,
                    context: 'POST /signup-free',
                    statusCode: 400
                });
                return res.status(400).json({ errors: [{ field: 'username', message: 'Username already exists' }] });
            }
            // 1 year free subscription
            const today = new Date();
            const expirationDate = new Date(today.setFullYear(today.getFullYear() + 1));
            const hashedPassword = await argon2.hash(sanitizedPassword);
            const rawAuthKey = crypto.randomBytes(64).toString('hex');
            // Create user
            const newUser = await createUser(
                usersCollection,
                sanitizedUsername,
                hashedPassword,
                expirationDate,
                99, // SubscriptionPlan: 99 = free
                sanitizedPromoCode || 'None',
                rawAuthKey,
                logger
            );
            if (!newUser) {
                logger.error({
                    msg: 'Failed to create user (free)',
                    username: sanitizedUsername,
                    context: 'POST /signup-free',
                    statusCode: 500
                });
                return res.status(500).json({ message: 'Failed to create user' });
            }
            // Create 10 portfolio documents for the new user, numbered 0 to 9, with full structure
            const portfoliosCollection = db.collection('Portfolios');
            const portfolioDocs = Array.from({ length: 10 }, (_, i) => ({
                Username: sanitizedUsername,
                Number: i,
                cash: 0,
                BaseValue: 0,
                avgGain: 0,
                avgGainAbs: 0,
                avgHoldTimeLosers: 0,
                avgHoldTimeWinners: 0,
                avgLoss: 0,
                avgLossAbs: 0,
                avgPositionSize: 0,
                biggestLoser: { ticker: '', amount: 0, tradeCount: 0 },
                biggestWinner: { ticker: '', amount: 0, tradeCount: 0 },
                breakevenCount: 0,
                breakevenPercent: 0,
                gainLossRatio: 0,
                loserCount: 0,
                loserPercent: 0,
                profitFactor: 0,
                realizedPL: 0,
                realizedPLPercent: 0,
                riskRewardRatio: 0,
                sortinoRatio: 0,
                winnerCount: 0,
                winnerPercent: 0,
                portfolioValueHistory: [],
                tradeReturnsChart: {
                    labels: [],
                    bins: [],
                    medianBinIndex: 0
                },
                trades: [],
                portfolio: []
            }));
            try {
                await portfoliosCollection.insertMany(portfolioDocs);
            } catch (portfolioError) {
                const err = portfolioError instanceof Error ? portfolioError : new Error(String(portfolioError));
                logger.error({
                    msg: 'Portfolio Creation Failed (free)',
                    error: err.message,
                    name: err.name,
                    context: 'POST /signup-free'
                });
            }
            logger.info({
                msg: 'User created successfully (free)',
                username: sanitizedUsername,
                context: 'POST /signup-free',
                statusCode: 201
            });
            return res.status(201).json({ message: 'User created successfully', rawAuthKey: rawAuthKey, success: true });
        } catch (error) {
            const errObj = handleError(error, 'POST /signup-free', {}, 500);
            return res.status(errObj.statusCode || 500).json(errObj);
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    const closeErr = closeError instanceof Error ? closeError : new Error(String(closeError));
                    logger.error({
                        msg: 'Error closing database connection (free)',
                        error: closeErr.message,
                        context: 'POST /signup-free'
                    });
                }
            }
        }
    });

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
                // Remove sensitive fields from user object
                const { Password, secret, qrCode, ...safeUser } = user;
                let tokenExpiration = rememberMe === 'true' ? '7d' : '1h';
                const token = jwt.sign({ user: safeUser }, config.secretKey, { expiresIn: tokenExpiration });
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
                        // Add image parameter for 2FAS Auth and similar apps
                        const baseQr = speakeasy.otpauthURL({
                            secret: user.secret,
                            label: `${user.Username}@Ereuna`,
                            issuer: 'Ereuna',
                            encoding: 'base32'
                        });
                        const qrCodeWithIcon = `${baseQr}&image=https://ereuna.io/icons/owl.png`;
                        return res.status(200).json({
                            message: '2FA already enabled',
                            qrCode: qrCodeWithIcon,
                            secret: user.secret
                        });
                    }
                    const secretObj = speakeasy.generateSecret({ length: 20 });
                    const baseQr = speakeasy.otpauthURL({
                        secret: secretObj.base32,
                        label: `${sanitizedUsername}@Ereuna`,
                        issuer: 'Ereuna',
                        encoding: 'base32'
                    });
                    const qrCode = `${baseQr}&image=https://ereuna.io/icons/owl.png`;
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
                    const baseQr = speakeasy.otpauthURL({
                        secret,
                        label: `${user.Username}@Ereuna`,
                        issuer: 'Ereuna',
                        encoding: 'base32'
                    });
                    const qrCode = `${baseQr}&image=https://ereuna.io/icons/owl.png`;
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
                return res.status(200).json({
                    enabled: !!user.MFA,
                    qrCode: user.secret ? `${speakeasy.otpauthURL({
                        secret: user.secret,
                        label: `${user.Username}@Ereuna`,
                        issuer: 'Ereuna',
                        encoding: 'base32'
                    })}&image=https://ereuna.io/icons/owl.png` : null
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
                    { name: 'Notes', filter: { Username: sanitizedUsername }, logMessage: 'Notes Cleaned Up' },
                    { name: 'Portfolios', filter: { Username: sanitizedUsername }, logMessage: 'Portfolios Cleaned Up' },
                    { name: 'Positions', filter: { Username: sanitizedUsername }, logMessage: 'Positions Cleaned Up' },
                    { name: 'Trades', filter: { Username: sanitizedUsername }, logMessage: 'Trades Cleaned Up' }
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
            // normalize input using canonical sanitizer for lookups and preserve display-safe username
            const sanitizedUser = sanitizeUsernameCanonical(username);
            const displayUser = sanitizeUsername(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            // Use case-insensitive lookup via collation to match login behaviour and avoid regex injection
            const userDocument = await usersCollection.findOne(
                { Username: sanitizedUser },
                { collation: { locale: 'en', strength: 2 } }
            );
            if (!userDocument) {
                logger.warn({
                    msg: 'User not found',
                    username: displayUser.substring(0, 3) + '...',
                    context: 'POST /theme',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }
            // Update using the actual stored Username to preserve original casing
            await usersCollection.updateOne({ Username: userDocument.Username }, { $set: { theme } });
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
            // normalize input using canonical sanitizer for lookups and preserve display-safe username
            const sanitizedUser = sanitizeUsernameCanonical(username);
            const displayUser = sanitizeUsername(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            // Case-insensitive lookup via collation to match login behaviour and avoid regex injection
            const userDocument = await usersCollection.findOne(
                { Username: sanitizedUser },
                { collation: { locale: 'en', strength: 2 } }
            );
            if (!userDocument) {
                logger.warn({
                    msg: 'User not found',
                    username: displayUser.substring(0, 3) + '...',
                    context: 'POST /load-theme',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }
            const theme = userDocument.theme;
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

    // Endpoint to get the VAT rates list
    app.get('/vat-rates', async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'GET /vat-rates',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const statsCollection = db.collection('Stats');
            const vatDoc = await statsCollection.findOne(
                { _id: 'vat_rates' },
                { projection: { countries: 1, _id: 0 } }
            );
            if (!vatDoc || !vatDoc.countries) {
                logger.warn({
                    msg: 'VAT rates not found',
                    context: 'GET /vat-rates',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'VAT rates not found' });
            }
            return res.status(200).json({ countries: vatDoc.countries });
        } catch (error) {
            const errObj = handleError(error, 'GET /vat-rates', {}, 500);
            logger.error({
                msg: 'Error retrieving VAT rates',
                error: error instanceof Error ? error.message : String(error),
                context: 'GET /vat-rates',
                statusCode: errObj.statusCode || 500
            });
            return res.status(errObj.statusCode || 500).json({ message: 'An error occurred while retrieving VAT rates' });
        } finally {
            if (client) await client.close();
        }
    });

    // Endpoint for requesting a refund (manual review, 14-day window)
    app.post('/request-refund', validate([
        validationSets.refundRequest
    ]), async (req: Request, res: Response) => {
        let client: typeof MongoClient | undefined;
        try {
            const apiKey = req.header('x-api-key');
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn({
                    msg: 'Invalid API key',
                    providedApiKey: !!sanitizedKey,
                    context: 'POST /request-refund',
                    statusCode: 401
                });
                return res.status(401).json({ message: 'Unauthorized API Access' });
            }

            // Sanitize and extract fields
            const { user, amount, paymentIntentId } = req.body;
            const sanitizedUsername = sanitizeInput(user);
            const sanitizedAmount = typeof amount === 'number' ? amount : parseFloat(sanitizeInput(amount));
            const sanitizedPaymentIntentId = sanitizeInput(paymentIntentId);

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const receiptsCollection = db.collection('Receipts');
            const refundsCollection = db.collection('Refunds');

            // Find user
            const userDoc = await usersCollection.findOne({ Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } });
            if (!userDoc) {
                logger.warn({
                    msg: 'Refund request: user not found',
                    username: sanitizedUsername,
                    context: 'POST /request-refund',
                    statusCode: 404
                });
                return res.status(404).json({ message: 'User not found' });
            }

            // Find the receipt by PaymentIntentId and user, and check it's within 14 days
            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const receipt = await receiptsCollection.findOne({
                UserID: userDoc._id,
                PaymentIntentId: sanitizedPaymentIntentId,
                Date: { $gte: fourteenDaysAgo }
            });

            if (!receipt) {
                logger.warn({
                    msg: 'Refund request: no eligible receipt found',
                    username: sanitizedUsername,
                    context: 'POST /request-refund',
                    statusCode: 400,
                });
                return res.status(400).json({ message: 'No eligible purchase found for refund (must be within 14 days).' });
            }

            // Prevent duplicate refund requests for the same PaymentIntentId
            const existingRefund = await refundsCollection.findOne({
                PaymentIntentId: receipt.PaymentIntentId,
                Status: { $in: ['pending', 'approved'] }
            });
            if (existingRefund) {
                logger.warn({
                    msg: 'Refund request: duplicate request',
                    username: sanitizedUsername,
                    context: 'POST /request-refund',
                    statusCode: 409
                });
                return res.status(409).json({ message: 'A refund request for this transaction is already pending or approved.' });
            }

            // Store refund request and immediately revoke access
            // Helper to add N business days (skipping weekends)
            function addBusinessDays(date: Date, days: number): Date {
                let result = new Date(date);
                let added = 0;
                while (added < days) {
                    result.setDate(result.getDate() + 1);
                    const day = result.getDay();
                    if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
                        added++;
                    }
                }
                return result;
            }

            const requestDate = new Date();
            const staffDeadlineDate = addBusinessDays(requestDate, 5);

            const refundDoc = {
                Username: sanitizedUsername,
                UserID: userDoc._id,
                Amount: sanitizedAmount,
                PurchaseDate: receipt.Date,
                RequestDate: requestDate,
                MaxRefundDate: new Date(receipt.Date.getTime() + 14 * 24 * 60 * 60 * 1000),
                StaffDeadlineDate: staffDeadlineDate,
                PaymentIntentId: receipt.PaymentIntentId,
                Status: 'pending', // pending, approved, rejected, refunded
                StaffNotes: '',
                ProcessedDate: null
            };
            await refundsCollection.insertOne(refundDoc);

            // Immediately revoke access: set Paid to false and Expires to now (or partial if needed)
            // If partial refund, you may want to reduce Expires by a proportional amount
            // For now, set Expires to now and Paid to false
            await usersCollection.updateOne(
                { _id: userDoc._id },
                {
                    $set: {
                        Paid: false,
                        Expires: new Date() // Set to now; adjust logic if partial refund
                    }
                }
            );

            logger.info({
                msg: 'Refund request submitted and access revoked',
                username: sanitizedUsername,
                refundDoc,
                context: 'POST /request-refund',
                statusCode: 200
            });
            return res.status(200).json({ message: 'Refund request submitted and access revoked. Staff will contact you soon.', success: true });
        } catch (error) {
            const errObj = handleError(error, 'POST /request-refund', {}, 500);
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
                        context: 'POST /request-refund'
                    });
                }
            }
        }
    });

};