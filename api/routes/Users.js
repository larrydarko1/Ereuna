import { obfuscateUsername, metricsHandler as importedMetricsHandler } from '../utils/logger.js';
import { validationSets, body, validationResult, param } from '../utils/validationUtils.js';
import speakeasy from 'speakeasy';

export default function (app, deps) {
    const {
        validate,
        validationSchemas,
        sanitizeInput,
        logger,
        securityLogger,
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
        async (req, res) => {
            try {
                const { username, password, rememberMe } = req.body;
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
                // Validate input fields are not empty
                if (!username || !password) {
                    logger.warn('Login attempt with missing fields', {
                        usernameProvided: !!username,
                        passwordProvided: !!password
                    });
                    return res.status(400).json({
                        message: 'Please fill both username and password fields'
                    });
                }

                // Additional sanitization
                const sanitizedUsername = sanitizeInput(username);

                const client = new MongoClient(uri);

                try {
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const usersCollection = db.collection('Users');

                    // Find the user by username (case-insensitive)
                    const user = await usersCollection.findOne({
                        Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
                    });

                    if (!user) {
                        // Log security event for non-existent username
                        securityLogger.logSecurityEvent('Login attempt with non-existent username', {
                            username: sanitizedUsername,
                            ip: req.ip
                        });
                        return res.status(401).json({
                            message: 'Username doesn\'t exist'
                        });
                    }

                    // Compare the provided password with the stored hash
                    const passwordMatch = await argon2.verify(user.Password, password);

                    if (!passwordMatch) {
                        // Log security event for incorrect password
                        securityLogger.logSecurityEvent('Login attempt with incorrect password', {
                            username: sanitizedUsername,
                            ip: req.ip
                        });
                        return res.status(401).json({
                            message: 'Password is incorrect'
                        });
                    }

                    // Extract today's date
                    const today = new Date();
                    const expiresDate = new Date(user.Expires);
                    const MFA = user.MFA;

                    // Check subscription status
                    if (today > expiresDate) {
                        logger.warn('Login attempt with expired subscription', {
                            username: sanitizedUsername
                        });
                        // Subscription is expired
                        await usersCollection.updateOne(
                            { Username: user.Username },
                            { $set: { Paid: false } }
                        );
                        return res.status(402).json({
                            message: 'Subscription is expired'
                        });
                    }

                    if (MFA === true) {
                        // MFA is enabled, prompt user to verify MFA code
                        return res.status(200).json({
                            message: 'MFA verification required',
                            mfaRequired: true
                        });
                    }

                    // Ensure subscription is active
                    await usersCollection.updateOne(
                        { Username: user.Username },
                        { $set: { Paid: true } }
                    );

                    // Set LastLogin timestamp
                    await usersCollection.updateOne(
                        { Username: user.Username },
                        { $set: { LastLogin: new Date() } }
                    );

                    // Generate a JWT token
                    let tokenExpiration;
                    if (rememberMe === 'true') {
                        tokenExpiration = '7d';
                    } else {
                        tokenExpiration = '1h'; // Temporary session
                    }
                    const token = jwt.sign({ user: user.Username }, config.secretKey, { expiresIn: tokenExpiration });

                    // Return a success response with the token
                    return res.status(200).json({
                        message: 'Logged in successfully',
                        token
                    });

                } catch (error) {
                    // Log database errors
                    logger.error('Login database error', {
                        error: error.message,
                        stack: error.stack
                    });
                    return res.status(500).json({
                        message: 'Database Error',
                        error: error.message
                    });
                } finally {
                    await client.close();
                }
            } catch (error) {
                // Log any unexpected errors in the main try block
                logger.error('Unexpected login process error', {
                    error: error.message,
                    stack: error.stack
                });
                return res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
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
        async (req, res) => {
            const requestLogger = createRequestLogger(req);
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
                const { username, password, subscriptionPlan, paymentMethodId, return_url, promoCode } = req.body;
                const sanitizedUsername = sanitizeInput(username);
                const sanitizedPromoCode = promoCode ? sanitizeInput(promoCode) : null;
                const parsedSubscriptionPlan = parseInt(subscriptionPlan, 10);

                logSignupAttempt(requestLogger, sanitizedUsername, parsedSubscriptionPlan, sanitizedPromoCode);

                client = new MongoClient(uri);
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const agentsCollection = db.collection('Agents');

                if (await isUsernameTaken(usersCollection, sanitizedUsername, requestLogger)) {
                    return res.status(400).json({ errors: [{ field: 'username', message: 'Username already exists' }] });
                }

                const { amount, expirationDate } = calculateSubscription(parsedSubscriptionPlan, requestLogger);
                if (!amount) return res.status(400).json({ errors: [{ field: 'subscriptionPlan', message: 'Invalid subscription plan' }] });

                const promoCodeValidated = await validatePromoCode(agentsCollection, sanitizedPromoCode, amount, requestLogger);
                const hashedPassword = await argon2.hash(password);
                const rawAuthKey = crypto.randomBytes(64).toString('hex');

                if (!paymentMethodId) {
                    logMissingPaymentMethod(sanitizedUsername, requestLogger);
                    return res.status(400).json({ errors: [{ field: 'paymentMethodId', message: 'Payment method ID is required' }] });
                }

                const paymentIntent = await createPaymentIntent(amount, paymentMethodId, return_url, requestLogger);
                if (!paymentIntent) return res.status(400).json({ message: 'Payment failed' });

                if (paymentIntent.status === 'requires_action') {
                    return res.json({ requiresAction: true, clientSecret: paymentIntent.client_secret });
                }

                const newUser = await createUser(usersCollection, sanitizedUsername, hashedPassword, expirationDate, parsedSubscriptionPlan, promoCodeValidated, rawAuthKey, requestLogger);
                if (!newUser) return res.status(500).json({ message: 'Failed to create user' });

                // Create 10 portfolio documents for the new user
                const portfoliosCollection = db.collection('Portfolios');
                const portfolioDocs = Array.from({ length: 10 }, (_, i) => ({
                    Username: sanitizedUsername,
                    Number: i + 1,
                    trades: [],
                    portfolio: [],
                    cash: 0
                }));
                try {
                    await portfoliosCollection.insertMany(portfolioDocs);
                } catch (portfolioError) {
                    logger.error({
                        msg: 'Portfolio Creation Failed',
                        error: { message: portfolioError.message, name: portfolioError.name }
                    });
                    // Optionally, you can decide to rollback user creation or just log the error
                }

                await createReceipt(db.collection('Receipts'), newUser.insertedId, amount, parsedSubscriptionPlan, promoCodeValidated, requestLogger);
                logSuccessfulSignup(requestLogger, newUser.insertedId, parsedSubscriptionPlan);

                return res.status(201).json({ message: 'User  created successfully', rawAuthKey });

            } catch (error) {
                handleError(error, requestLogger, req);
                return res.status(500).json({ message: 'An error occurred during signup', error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
            } finally {
                if (client) await client.close();
            }
        }
    );

    // Helper functions
    function createRequestLogger(req) {
        return logger.child({
            requestId: crypto.randomBytes(16).toString('hex'),
            ip: req.ip,
            method: req.method,
        });
    }

    function logSignupAttempt(logger, username, subscriptionPlan, promoCode) {
    }

    async function isUsernameTaken(collection, username, logger) {
        const existingUser = await collection.findOne({ Username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (existingUser) {
            logger.warn({ msg: 'Username Conflict', reason: 'Username already exists' });
            return true;
        }
        return false;
    }

    function calculateSubscription(plan, logger) {
        const today = new Date();
        let expirationDate, amount;

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
                logger.warn({ msg: 'Invalid Subscription Plan', attemptedPlan: plan });
                return { amount: null, expirationDate: null };
        }
        return { amount, expirationDate };
    }

    async function validatePromoCode(collection, promoCode, amount, logger) {
        if (!promoCode) return 'None';

        const promoCodeDoc = await collection.findOne({ CODE: promoCode });
        if (promoCodeDoc) {
            const discountedAmount = Math.round(amount / 2);
            return promoCode; // Return the validated promo code
        } else {
            logger.warn({ msg: 'Invalid Promo Code', providedPromoCode: promoCode });
            return 'None'; // Return 'None' if promo code is invalid
        }
    }

    function logMissingPaymentMethod(username, logger) {
        logger.warn({ msg: 'Signup Attempt Without Payment Method' });
        securityLogger.logSecurityEvent('missing_payment_method', { username });
    }

    async function createPaymentIntent(amount, paymentMethodId, return_url, logger) {
        try {
            return await stripe.paymentIntents.create({
                amount,
                currency: 'eur',
                payment_method: paymentMethodId,
                confirm: true,
                return_url,
                automatic_payment_methods: { enabled: true, allow_redirects: 'always' }
            });
        } catch (paymentError) {
            logger.error({
                msg: 'Stripe Payment Intent Creation Failed',
                error: { message: paymentError.message, name: paymentError.name }
            });
            securityLogger.logSecurityEvent('payment_intent_creation_failed', { username });
            return null; // Return null on failure
        }
    }

    async function createUser(collection, username, hashedPassword, expirationDate, subscriptionPlan, promoCode, rawAuthKey, logger) {
        const newUser = {
            Username: username,
            Password: hashedPassword,
            Expires: expirationDate,
            Paid: false,
            PaymentMethod: 'Credit Card',
            SubscriptionPlan: subscriptionPlan,
            Tier: 'Core',
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
        } catch (insertError) {
            logger.error({
                msg: 'User Insertion Failed',
                error: { message: insertError.message, name: insertError.name }
            });
            return null; // Return null on failure
        }
    }

    async function createReceipt(collection, userId, amount, subscriptionPlan, promoCode, logger) {
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
        } catch (receiptError) {
            logger.error({
                msg: 'Receipt Insertion Failed',
                error: { message: receiptError.message, name: receiptError.name }
            });
            throw new Error('Receipt insertion failed'); // Throw error to handle in main flow
        }
    }

    function logSuccessfulSignup(logger, userId, subscriptionPlan) {
        securityLogger.logAuthAttempt(userId, true, { method: 'signup', subscriptionPlan });
    }

    function handleError(error, logger, req) {
        logger.error({
            msg: 'Signup Process Error',
            error: { message: error.message, name: error.name, code: error.code },
            sensitiveData: { usernameLength: req.body.username ? req.body.username.length : 0 }
        });
        securityLogger.logSecurityEvent('signup_failure', { reason: error.message, ip: req.ip });
    }

    // Endpoint for verifying the token
    app.get('/verify', (req, res) => {
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
        // Extract token from Authorization header
        const authHeader = req.headers['authorization'];

        // Log the verification attempt
        logger.info('Token verification attempt', {
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        // Validate Authorization header format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Invalid Authorization header format', {
                ip: req.ip,
                headerProvided: !!authHeader
            });

            return res.status(401).json({
                message: 'Invalid authorization format',
                status: 'error'
            });
        }

        // Extract token (safely)
        const token = authHeader.split(' ')[1];

        // Validate token existence
        if (!token) {
            logger.warn('No token provided', {
                ip: req.ip
            });

            return res.status(401).json({
                message: 'No authentication token',
                status: 'error'
            });
        }

        try {
            // Verify token
            jwt.verify(token, config.secretKey, (err, decoded) => {
                if (err) {
                    // Log different types of token verification errors
                    if (err.name === 'TokenExpiredError') {
                        logger.warn('Expired token verification attempt', {
                            ip: req.ip,
                            error: err.message
                        });

                        return res.status(401).json({
                            message: 'Token expired',
                            status: 'error'
                        });
                    }

                    logger.error('Token verification failed', {
                        ip: req.ip,
                        error: err.message
                    });

                    return res.status(401).json({
                        message: 'Invalid token',
                        status: 'error'
                    });
                }

                // Optional: You might want to strip sensitive information
                const { password, ...safeUserData } = decoded.user || {};

                return res.status(200).json({
                    user: safeUserData,
                    status: 'success'
                });
            });
        } catch (error) {
            // Catch any unexpected errors
            logger.error('Unexpected error in token verification', {
                ip: req.ip,
                error: error.message,
                stack: error.stack
            });

            res.status(500).json({
                message: 'Internal Server Error',
                status: 'error'
            });
        }
    });

    app.post('/verify-mfa',
        validate([
            validationSchemas.username(),
            validationSchemas.mfaCode(),
            validationSchemas.rememberMe()
        ]),
        async (req, res) => {
            const { username, mfaCode, rememberMe } = req.body;
            const apiKey = req.header('x-api-key');

            // Validate API key
            const sanitizedKey = sanitizeInput(apiKey);
            if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
                logger.warn('Invalid API key', {
                    providedApiKey: !!sanitizedKey
                });
                return res.status(401).json({
                    message: 'Unauthorized API Access'
                });
            }

            // Find the user by username
            const client = new MongoClient(uri);
            try {
                await client.connect();
                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');
                const user = await usersCollection.findOne({
                    Username: { $regex: new RegExp(`^${username}$`, 'i') }
                });

                if (!user) {
                    // Log security event for non-existent username
                    logger.warn('MFA verification attempt with non-existent username', {
                        username,
                        ip: req.ip
                    });
                    return res.status(401).json({
                        message: 'Username doesn\'t exist'
                    });
                }

                // Verify MFA code
                const mfaSecret = user.secret;
                const verified = speakeasy.totp.verify({
                    secret: mfaSecret,
                    encoding: 'base32',
                    token: mfaCode,
                    window: 1 // Optional, allows for a 1-minute window for clock skew
                });

                if (!verified) {
                    // Log security event for invalid MFA code
                    logger.warn('MFA verification attempt with invalid code', {
                        username,
                        ip: req.ip
                    });
                    return res.status(401).json({
                        message: 'Invalid MFA code'
                    });
                }

                // MFA code is valid, proceed with login
                // Generate a JWT token
                let tokenExpiration;
                if (req.body.rememberMe === 'true') {
                    tokenExpiration = '7d';
                } else {
                    tokenExpiration = '1h'; // Temporary session
                }
                const token = jwt.sign({ user: user.Username }, config.secretKey, { expiresIn: tokenExpiration });

                // Return a success response with the token
                return res.status(200).json({
                    message: 'Logged in successfully',
                    token
                });
            } catch (error) {
                // Log database errors
                logger.error('MFA verification database error', {
                    error: error.message,
                    stack: error.stack
                });
                return res.status(500).json({
                    message: 'Database Error',
                    error: error.message
                });
            } finally {
                await client.close();
            }
        }
    );

    // Endpoint for toggling 2FA
    app.post('/twofa',
        validate([
            validationSchemas.username(),
            validationSchemas.enabled()
        ]),
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method,
            });

            try {
                const { username, enabled } = req.body;
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

                // Validate input fields are not empty
                if (!username) {
                    requestLogger.warn('2FA toggle attempt with missing fields', {
                        usernameProvided: !!username
                    });

                    return res.status(400).json({
                        message: 'Please fill the username field'
                    });
                }

                // Additional sanitization
                const sanitizedUsername = sanitizeInput(username);

                const client = new MongoClient(uri);

                try {
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const usersCollection = db.collection('Users');

                    // Find the user by username (case-insensitive)
                    const user = await usersCollection.findOne({
                        Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
                    });

                    if (!user) {
                        // Log security event for non-existent username
                        securityLogger.logSecurityEvent('2FA toggle attempt with non-existent username', {
                            username: sanitizedUsername,
                            ip: req.ip
                        });

                        return res.status(401).json({
                            message: 'Username doesn\'t exist'
                        });
                    }

                    if (enabled) {
                        // Generate 2FA secret and QR code
                        const secret = speakeasy.generateSecret({ length: 20 });
                        const qrCode = speakeasy.otpauthURL({
                            secret: secret.ascii,
                            label: 'Ereuna',
                        });

                        // Update the user's document with the secret and QR code
                        await usersCollection.updateOne(
                            { Username: user.Username },
                            { $set: { MFA: true, secret: secret.base32, qrCode } }
                        );

                        // Return the QR code and secret for the user to enable 2FA
                        return res.status(200).json({
                            message: '2FA enabled',
                            qrCode,
                            secret: secret.ascii
                        });
                    } else {
                        // Remove 2FA associated with the user
                        await usersCollection.updateOne(
                            { Username: user.Username },
                            { $set: { MFA: false, secret: null, qrCode: null } }
                        );

                        return res.status(200).json({
                            message: '2FA disabled'
                        });
                    }
                } catch (error) {
                    // Log database errors
                    requestLogger.error('2FA toggle database error', {
                        error: error.message,
                        stack: error.stack
                    });

                    return res.status(500).json({
                        message: 'Database Error',
                        error: error.message
                    });
                } finally {
                    await client.close();
                }
            } catch (error) {
                // Log any unexpected errors in the main try block
                requestLogger.error('Unexpected 2FA toggle process error', {
                    error: error.message,
                    stack: error.stack
                });

                return res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
            }
        }
    );

    //endpoint that allows for password reset
    app.post('/recover',
        validate([
            validationSchemas.recoveryKey()
        ]),
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method,
                path: req.path
            });

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
                const { recoveryKey } = req.body;

                // Validate and sanitize input
                const sanitizedRecoveryKey = sanitizeInput(recoveryKey);

                const client = new MongoClient(uri);

                try {
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const usersCollection = db.collection('Users');

                    // Find users with AuthKey
                    const users = await usersCollection.find({
                        HashedAuthKey: { $exists: true }
                    }).toArray();

                    // Detailed async comparison with error handling
                    const matchedUser = await Promise.all(users.map(async user => {
                        try {
                            // Compare the input recoveryKey with the stored hashed AuthKey
                            const isMatch = await argon2.verify(user.HashedAuthKey, sanitizedRecoveryKey);
                            return isMatch ? user : null;
                        } catch (compareError) {
                            // Log comparison errors without exposing sensitive details
                            requestLogger.error({
                                msg: 'Recovery Key Comparison Error',
                                userId: user.Username ? user.Username.substring(0, 3) + '...' : 'Unknown'
                            });
                            return null;
                        }
                    })).then(results => {
                        return results.find(user => user !== null);
                    });

                    if (matchedUser) {
                        // Log successful recovery attempt with minimal user information
                        securityLogger.logSecurityEvent('Account Recovery Initiated', {
                            username: matchedUser.Username ? matchedUser.Username.substring(0, 3) + '...' : 'Unknown'
                        });

                        return res.status(200).json({
                            valid: true,
                            username: matchedUser.Username
                        });
                    } else {
                        // Log failed recovery attempt with security context
                        securityLogger.logSecurityEvent('Recovery Key Validation Failed', {
                            ip: req.ip,
                            recoveryKeyAttemptLength: sanitizedRecoveryKey.length
                        });

                        return res.status(401).json({
                            valid: false,
                            errors: [{
                                field: 'recoveryKey',
                                message: 'Invalid recovery key'
                            }]
                        });
                    }
                } catch (error) {
                    // Log database errors with context
                    requestLogger.error({
                        msg: 'Database Error during Recovery',
                        error: {
                            message: error.message,
                            name: error.name,
                            code: error.code
                        }
                    });

                    // Security logging for potential database-related security issues
                    securityLogger.logSecurityEvent('Recovery Process Database Error', {
                        ip: req.ip,
                        errorType: error.name
                    });

                    return res.status(500).json({
                        message: 'Internal Server Error',
                        error: 'Unable to process recovery request'
                    });
                } finally {
                    await client.close();
                }
            } catch (error) {
                // Log unexpected errors with comprehensive context
                requestLogger.error({
                    msg: 'Unexpected Error in Recovery Process',
                    error: {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    }
                });

                // Security logging for unexpected errors
                securityLogger.logSecurityEvent('Unexpected Recovery Process Error', {
                    ip: req.ip,
                    errorType: error.name
                });

                return res.status(500).json({
                    message: 'Internal Server Error',
                    error: 'Unexpected error occurred'
                });
            }
        }
    );

    // endpoint that generates a new recovery key upon validation 
    app.patch('/generate-key',
        validate([
            validationSchemas.user(),
            validationSchemas.password()
        ]),
        async (req, res) => {
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method,
                path: req.path
            });

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
                const { user, password } = req.body;

                // Sanitize and validate input
                const sanitizedUsername = sanitizeInput(user);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Users');

                // Case-insensitive username lookup
                const filter = { Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } };
                const userDoc = await collection.findOne(filter);

                if (!userDoc) {
                    // Log security event for non-existent user
                    securityLogger.logSecurityEvent('Key Generation Attempt for Non-Existent User', {
                        attemptedUsername: sanitizedUsername,
                        ip: req.ip
                    });

                    return res.status(404).json({
                        errors: [{
                            field: 'user',
                            message: 'User  not found'
                        }]
                    });
                }

                // Verify password using Argon2
                const isPasswordCorrect = await argon2.verify(userDoc.Password, password);

                if (!isPasswordCorrect) {
                    // Log security event for incorrect password
                    securityLogger.logSecurityEvent('Key Generation Attempt with Incorrect Password', {
                        username: userDoc.Username,
                        ip: req.ip
                    });

                    return res.status(401).json({
                        errors: [{
                            field: 'password',
                            message: 'Incorrect password'
                        }]
                    });
                }

                // Check subscription status
                const today = new Date();
                const expiresDate = new Date(userDoc.Expires);

                if (today > expiresDate || !userDoc.Paid) {
                    // Log subscription status issue
                    requestLogger.warn({
                        msg: 'Key Generation Attempt with Expired/Inactive Subscription',
                        username: userDoc.Username,
                        subscriptionExpired: today > expiresDate,
                        paid: userDoc.Paid
                    });

                    return res.status(402).json({
                        errors: [{
                            field: 'subscription',
                            message: 'Subscription is expired or inactive'
                        }]
                    });
                }

                // Generate a new raw key
                const rawAuthKey = crypto.randomBytes(64).toString('hex');

                // Hash the raw key using Argon2
                const hashedAuthKey = await argon2.hash(rawAuthKey, {
                    type: argon2.argon2id, // Use Argon2id for better security
                    memoryCost: 65536, // Adjust memory cost as needed
                    timeCost: 3, // Adjust time cost as needed
                    parallelism: 1 // Adjust parallelism as needed
                });

                // Prepare the update document (only store the hashed key)
                const updateDoc = {
                    $set: {
                        HashedAuthKey: hashedAuthKey, // Store only the hashed key
                        LastKeyGenerationTime: new Date() // Track key generation time
                    }
                };

                // Update the user document using the original username from the database
                const result = await collection.updateOne(
                    { Username: userDoc.Username },
                    updateDoc
                );

                if (result.modifiedCount === 0) {
                    // Log update failure
                    requestLogger.error({
                        msg: 'Failed to Update Authentication Key',
                        username: userDoc.Username
                    });

                    return res.status(500).json({
                        message: 'Failed to update authentication key'
                    });
                }

                // Security logging for key generation
                securityLogger.logSecurityEvent('Authentication Key Regenerated', {
                    username: userDoc.Username.substring(0, 3) + '...'
                });

                // Return the raw key to the browser for download
                // Ensure the raw key is not logged or stored in the database
                return res.json({
                    confirm: true,
                    message: 'Key generated successfully',
                    rawAuthKey: rawAuthKey // Return the raw key for download
                });

            } catch (error) {
                // Comprehensive error logging
                requestLogger.error({
                    msg: 'Unexpected Error in Key Generation Process',
                    error: {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    }
                });

                // Security logging for unexpected errors
                securityLogger.logSecurityEvent('Key Generation Unexpected Error', {
                    ip: req.ip,
                    errorType: error.name
                });

                return res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'Unable to generate authentication key'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        requestLogger.warn({
                            msg: 'MongoDB Client Closure Failed',
                            error: {
                                message: closeError.message,
                                name: closeError.name
                            }
                        });
                    }
                }
            }
        }
    );

    // Endpoint to actually retrieve the key using the token
    app.get('/retrieve-key', async (req, res) => {
        // Create a child logger with request-specific context
        const requestLogger = logger.child({
            requestId: crypto.randomBytes(16).toString('hex'),
            ip: req.ip,
            method: req.method,
            path: req.path
        });

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
            const { token } = req.query;

            // Check if the token is provided
            if (!token) {
                requestLogger.warn('Token is required for key retrieval');
                return res.status(400).json({ message: 'Token is required' });
            }

            client = new MongoClient(uri);
            await client.connect();

            const db = client.db('EreunaDB');

            // Find and validate the token
            const tokenDoc = await db.collection('DownloadTokens').findOne({ token });

            if (!tokenDoc) {
                requestLogger.warn('Invalid token provided for key retrieval', { token });
                return res.status(404).json({ message: 'Invalid token' });
            }

            // Check token expiry
            if (Date.now() > tokenDoc.expiresAt.getTime()) {
                await db.collection('DownloadTokens').deleteOne({ token });
                requestLogger.warn('Token has expired', { token });
                return res.status(410).json({ message: 'Token has expired' });
            }

            // Retrieve user document
            const userDoc = await db.collection('Users').findOne({
                Username: tokenDoc.username
            });

            if (!userDoc || !userDoc.AuthKey) {
                requestLogger.warn('User  or key not found for token', { username: tokenDoc.username });
                return res.status(404).json({ message: 'User  or key not found' });
            }

            // Delete the token after use
            await db.collection('DownloadTokens').deleteOne({ token });

            // Return the raw AuthKey
            res.json({ key: userDoc.AuthKey });

        } catch (error) {
            // Comprehensive error logging
            requestLogger.error({
                msg: 'Key retrieval error',
                error: {
                    message: error.message,
                    name: error.name,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                }
            });

            return res.status(500).json({ message: 'Internal server error' });
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    requestLogger.warn({
                        msg: 'MongoDB Client Closure Failed',
                        error: {
                            message: closeError.message,
                            name: closeError.name
                        }
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
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method,
                path: req.path
            });

            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                // Log validation errors
                requestLogger.warn({
                    msg: 'Password Change Validation Failed',
                    errors: errors.array().map(error => ({
                        field: error.path,
                        message: error.msg
                    }))
                });

                return res.status(400).json({
                    errors: errors.array().map(error => ({
                        field: error.path,
                        message: error.msg
                    }))
                });
            }

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
                const { oldPassword, newPassword, user } = req.body;

                // Additional sanitization
                const sanitizedUsername = sanitizeInput(user);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Users');

                // Find user with case-insensitive username
                const userDoc = await collection.findOne({
                    Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
                });

                if (!userDoc) {
                    // Log security event for non-existent user
                    securityLogger.logSecurityEvent('Password Change Attempt for Non-Existent User', {
                        attemptedUsername: sanitizedUsername,
                        ip: req.ip
                    });

                    return res.status(404).json({
                        message: 'User  not found'
                    });
                }

                // Compare the provided old password with the stored hashed password using Argon2
                const isOldPasswordCorrect = await argon2.verify(userDoc.Password, oldPassword);

                if (!isOldPasswordCorrect) {
                    // Log security event for incorrect current password
                    securityLogger.logSecurityEvent('Password Change Attempt with Incorrect Current Password', {
                        username: userDoc.Username,
                        ip: req.ip
                    });

                    return res.status(401).json({
                        message: 'Current password is incorrect'
                    });
                }

                // Check if new password is different from the old password
                const isNewPasswordSameAsOld = await argon2.verify(userDoc.Password, newPassword);
                if (isNewPasswordSameAsOld) {
                    requestLogger.warn({
                        msg: 'Password Change Attempt with Same Password',
                        username: userDoc.Username
                    });

                    return res.status(400).json({
                        message: 'New password must be different from the current password'
                    });
                }

                // Hash the new password using Argon2
                const hashedNewPassword = await argon2.hash(newPassword, {
                    type: argon2.argon2id, // Use Argon2id for better security
                    memoryCost: 65536, // Adjust memory cost as needed
                    timeCost: 3, // Adjust time cost as needed
                    parallelism: 1 // Adjust parallelism as needed
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
                    // Log update failure
                    requestLogger.error({
                        msg: 'Failed to Update Password',
                        username: userDoc.Username
                    });
                    return res.status(500).json({
                        message: 'Failed to update password'
                    });
                }

                // Security logging for password change
                securityLogger.logSecurityEvent('Password Changed', {
                    username: userDoc.Username.substring(0, 3) + '...'
                });

                res.json({
                    message: 'Password successfully changed',
                    confirm: true
                });

            } catch (error) {
                // Comprehensive error logging
                requestLogger.error({
                    msg: 'Unexpected Error in Password Change Process',
                    error: {
                        message: error.message,
                        name: error.name,
                        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                    }
                });

                // Security logging for unexpected errors
                securityLogger.logSecurityEvent('Password Change Unexpected Error', {
                    ip: req.ip,
                    errorType: error.name
                });

                return res.status(500).json({
                    message: 'Internal Server Error',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'Unable to change password'
                });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        requestLogger.warn({
                            msg: 'MongoDB Client Closure Failed',
                            error: {
                                message: closeError.message,
                                name: closeError.name
                            }
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
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method,
                path: req.path
            });

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
                const { recoveryKey, newPassword } = req.body;

                // Validate input fields are not empty
                if (!recoveryKey || !newPassword) {
                    requestLogger.warn('Change Password attempt with missing fields', {
                        recoveryKeyProvided: !!recoveryKey,
                        newPasswordProvided: !!newPassword
                    });

                    return res.status(400).json({
                        message: 'Please fill both recovery key and new password fields'
                    });
                }

                // Additional sanitization
                const sanitizedRecoveryKey = sanitizeInput(recoveryKey);
                const sanitizedNewPassword = sanitizeInput(newPassword);

                const client = new MongoClient(uri);

                try {
                    await client.connect();
                    const db = client.db('EreunaDB');
                    const usersCollection = db.collection('Users');

                    // Find all users to validate the recovery key
                    const users = await usersCollection.find({}).toArray();

                    // Check if the recovery key matches any user's AuthKey using Argon2
                    const matchedUser = await Promise.all(users.map(async user => {
                        try {
                            const isMatch = await argon2.verify(user.HashedAuthKey, sanitizedRecoveryKey);
                            return isMatch ? user : null;
                        } catch (compareError) {
                            requestLogger.warn({
                                msg: 'Recovery Key Comparison Error',
                                username: user.Username,
                                error: compareError.message
                            });
                            return null;
                        }
                    })).then(results => results.find(user => user !== null));

                    if (!matchedUser) {
                        // Log security event for invalid recovery key
                        securityLogger.logSecurityEvent('Change Password attempt with invalid recovery key', {
                            ip: req.ip
                        });

                        return res.status(401).json({
                            message: 'Invalid recovery key'
                        });
                    }

                    // Hash the new password using Argon2
                    const hashedPassword = await argon2.hash(sanitizedNewPassword, {
                        type: argon2.argon2id, // Use Argon2id for better security
                        memoryCost: 65536, // Adjust memory cost as needed
                        timeCost: 3, // Adjust time cost as needed
                        parallelism: 1 // Adjust parallelism as needed
                    });

                    // Update the user's password
                    const updateResult = await usersCollection.updateOne(
                        { HashedAuthKey: matchedUser.HashedAuthKey },
                        {
                            $set: {
                                Password: hashedPassword
                            }
                        }
                    );

                    if (updateResult.modifiedCount === 1) {
                        return res.status(200).json({
                            message: 'Password changed successfully'
                        });
                    } else {
                        // Log update failure
                        requestLogger.error({
                            msg: 'Failed to Update Password',
                            username: matchedUser.Username
                        });

                        return res.status(500).json({
                            message: 'Failed to update password'
                        });
                    }
                } catch (error) {
                    // Log database errors
                    requestLogger.error('Change Password database error', {
                        error: error.message,
                        stack: error.stack
                    });

                    return res.status(500).json({
                        message: 'Database Error',
                        error: error.message
                    });
                } finally {
                    await client.close();
                }
            } catch (error) {
                // Log any unexpected errors in the main try block
                requestLogger.error('Unexpected Change Password process error', {
                    error: error.message,
                    stack: error.stack
                });

                return res.status(500).json({
                    message: 'Internal Server Error',
                    error: error.message
                });
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
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method,
                path: req.path
            });

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
                // Destructure and sanitize inputs
                const { user, newUsername } = req.body;
                const sanitizedCurrentUsername = sanitizeInput(user);
                const sanitizedNewUsername = sanitizeInput(newUsername);

                // Check if usernames are the same
                if (sanitizedCurrentUsername === sanitizedNewUsername) {
                    requestLogger.warn({
                        msg: 'Username Change Rejected',
                        reason: 'Current and new usernames are identical'
                    });

                    return res.status(400).json({
                        errors: [{
                            field: 'newUsername',
                            message: 'Current username and new username cannot be the same'
                        }]
                    });
                }

                // Connect to MongoDB
                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');

                // Check for existing username (case-insensitive)
                const existingUser = await usersCollection.findOne({
                    Username: { $regex: new RegExp(`^${sanitizedNewUsername}$`, 'i') }
                });

                if (existingUser) {
                    // Log username conflict
                    securityLogger.logSecurityEvent('username_conflict', {
                        attemptedUsername: sanitizedNewUsername,
                        ip: req.ip
                    });

                    requestLogger.warn({
                        msg: 'Username Change Rejected',
                        reason: 'Username already exists'
                    });

                    return res.status(400).json({
                        errors: [{
                            field: 'newUsername',
                            message: 'Username already exists'
                        }]
                    });
                }

                // Update username in Users collection
                const userUpdateResult = await usersCollection.updateOne(
                    { Username: sanitizedCurrentUsername },
                    { $set: { Username: sanitizedNewUsername } }
                );

                if (userUpdateResult.modifiedCount === 0) {
                    // Log user not found
                    requestLogger.warn({
                        msg: 'Username Change Failed',
                        reason: 'User not found',
                        username: sanitizedCurrentUsername
                    });

                    return res.status(404).json({
                        errors: [{
                            field: 'user',
                            message: 'User not found'
                        }]
                    });
                }

                // Update related collections
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

                // Perform bulk updates with logging
                for (const collection of collectionsToUpdate) {
                    try {
                        const result = await db.collection(collection.name).updateMany(
                            collection.filter,
                            collection.update
                        );

                        requestLogger.info({
                            msg: `Updated ${collection.name} Collection`,
                            modifiedCount: result.modifiedCount
                        });
                    } catch (updateError) {
                        // Log individual collection update errors
                        requestLogger.error({
                            msg: `Failed to update ${collection.name} Collection`,
                            error: {
                                message: updateError.message,
                                name: updateError.name
                            }
                        });
                    }
                }

                // Security logging with partial username
                securityLogger.logSecurityEvent('username_changed', {
                    username: sanitizedCurrentUsername.substring(0, 3) + '...',
                    ip: req.ip
                });

                // Respond with success
                res.json({
                    message: 'Username changed successfully',
                    confirm: true
                });

            } catch (error) {
                // Comprehensive error logging
                requestLogger.error({
                    msg: 'Username Change Error',
                    error: {
                        message: error.message,
                        name: error.name,
                        code: error.code
                    },
                    sensitiveData: {
                        currentUsernameLength: req.body.user ? req.body.user.length : 0,
                        newUsernameLength: req.body.newUsername ? req.body.newUsername.length : 0
                    }
                });

                // Security event for unexpected error
                securityLogger.logSecurityEvent('username_change_failure', {
                    errorMessage: error.message,
                    ip: req.ip
                });

                // Respond with error
                res.status(500).json({
                    message: 'An error occurred while changing username',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            } finally {
                // Ensure database client is closed
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        requestLogger.warn({
                            msg: 'MongoDB Client Closure Failed',
                            error: {
                                message: closeError.message,
                                name: closeError.name
                            }
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
        async (req, res) => {
            // Create a child logger with request-specific context
            const requestLogger = logger.child({
                requestId: crypto.randomBytes(16).toString('hex'),
                ip: req.ip,
                method: req.method,
                path: req.path
            });

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
                // Destructure and sanitize inputs
                const { user, password } = req.body;
                const sanitizedUsername = sanitizeInput(user);

                // Connect to MongoDB
                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');

                // Find user document
                const userDoc = await usersCollection.findOne({ Username: sanitizedUsername });

                if (!userDoc) {
                    // Log user not found
                    requestLogger.warn({
                        msg: 'Account Deletion Failed',
                        reason: 'User not found',
                        usernamePartial: obfuscateUsername(sanitizedUsername)
                    });

                    // Security logging for potential unauthorized access attempt
                    securityLogger.logSecurityEvent('account_deletion_attempt', {
                        reason: 'user_not_found',
                        usernamePartial: obfuscateUsername(sanitizedUsername),
                        ip: req.ip
                    });

                    return res.status(404).json({
                        errors: [{
                            field: 'user',
                            message: 'User not found'
                        }]
                    });
                }

                // Verify password (assuming password is hashed)
                const isPasswordValid = await argon2.verify(userDoc.Password, password);

                if (!isPasswordValid) {
                    // Log incorrect password attempt
                    requestLogger.warn({
                        msg: 'Account Deletion Failed',
                        reason: 'Incorrect Password',
                        usernamePartial: obfuscateUsername(sanitizedUsername)
                    });

                    // Security logging for potential unauthorized access
                    securityLogger.logSecurityEvent('account_deletion_attempt', {
                        reason: 'password_incorrect',
                        usernamePartial: obfuscateUsername(sanitizedUsername),
                        ip: req.ip
                    });

                    return res.status(401).json({
                        errors: [{
                            field: 'password',
                            message: 'Incorrect password'
                        }]
                    });
                }

                // Collections to clean up
                const collectionsToClean = [
                    {
                        name: 'Users',
                        filter: { Username: sanitizedUsername },
                        logMessage: 'User Document Deleted'
                    },
                    {
                        name: 'Screeners',
                        filter: { UsernameID: sanitizedUsername },
                        logMessage: 'Screeners Cleaned Up'
                    },
                    {
                        name: 'Watchlists',
                        filter: { UsernameID: sanitizedUsername },
                        logMessage: 'Watchlists Cleaned Up'
                    },
                    {
                        name: 'Notes',
                        filter: { Username: sanitizedUsername },
                        logMessage: 'Notes Cleaned Up'
                    }
                ];

                // Perform bulk deletions with logging
                for (const collection of collectionsToClean) {
                    try {
                        const result = await db.collection(collection.name).deleteMany(collection.filter);

                        requestLogger.info({
                            msg: collection.logMessage,
                            usernamePartial: obfuscateUsername(sanitizedUsername),
                            deletedCount: result.deletedCount
                        });
                    } catch (deleteError) {
                        // Log individual collection deletion errors
                        requestLogger.error({
                            msg: `Failed to clean up ${collection.name} Collection`,
                            usernamePartial: obfuscateUsername(sanitizedUsername),
                            error: {
                                message: deleteError.message,
                                name: deleteError.name
                            }
                        });
                    }
                }

                // Security logging for account deletion
                securityLogger.logSecurityEvent('account_deleted', {
                    usernamePartial: obfuscateUsername(sanitizedUsername),
                    ip: req.ip
                });

                // Respond with success
                res.json({
                    message: 'Account deleted successfully',
                    confirm: true
                });

            } catch (error) {
                // Comprehensive error logging
                requestLogger.error({
                    msg: 'Account Deletion Error',
                    error: {
                        message: error.message,
                        name: error.name,
                        code: error.code
                    },
                    sensitiveData: {
                        usernameLength: req.body.user ? req.body.user.length : 0
                    }
                });

                // Security event for unexpected error
                securityLogger.logSecurityEvent('account_deletion_failure', {
                    errorMessage: error.message,
                    ip: req.ip
                });

                // Respond with error
                res.status(500).json({
                    message: 'An error occurred while deleting account',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            } finally {
                // Ensure database client is closed
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        requestLogger.warn({
                            msg: 'MongoDB Client Closure Failed',
                            error: {
                                message: closeError.message,
                                name: closeError.name
                            }
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
                .optional() // removing this invalidates the check 
                .trim()
                .notEmpty().withMessage('Username is required')
        ]),
        async (req, res) => {
            const username = req.query.user; // Keep original query parameter retrieval

            if (!username) {
                return res.status(400).json({
                    errors: [{
                        field: 'user',
                        message: 'Username is required'
                    }]
                });
            }

            const sanitizedUsername = sanitizeInput(username);
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
                const usersCollection = db.collection('Users');

                // Find the user document based on the Username
                const userDoc = await usersCollection.findOne({ Username: sanitizedUsername });

                if (!userDoc) {
                    // Log user not found
                    logger.warn({
                        msg: 'Expiration Date Check Failed',
                        reason: 'User not found',
                        usernamePartial: obfuscateUsername(sanitizedUsername)
                    });

                    return res.status(404).json({ error: 'User not found' });
                }

                const today = new Date();
                const expiresDate = new Date(userDoc.Expires);

                // Calculate the difference in milliseconds
                const differenceInTime = expiresDate - today;

                // Calculate the difference in days
                const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));

                // Send back the difference in days
                res.json({ expirationDays: differenceInDays });
            } catch (error) {
                // Error logging
                logger.error({
                    msg: 'Expiration Date Retrieval Error',
                    error: error.message,
                    usernamePartial: obfuscateUsername(sanitizedUsername)
                });

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
                if (client) {
                    try {
                        await client.close();
                    } catch (closeError) {
                        logger.warn({
                            msg: 'Database Client Closure Failed',
                            error: closeError.message
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
                // Sanitize the username parameter
                const user = sanitizeInput(req.params.user);

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const usersCollection = db.collection('Users');

                // Use a case-insensitive query with regex
                const userDoc = await usersCollection.findOne({
                    Username: { $regex: new RegExp(`^${user}$`, 'i') }
                });

                // Log user lookup
                if (!userDoc) {
                    logger.warn({
                        msg: 'User Not Found',
                        requestId: requestId,
                        username: obfuscateUsername(user)
                    });

                    return res.status(404).json({
                        error: 'User not found',
                        requestId: requestId
                    });
                }

                // Connect to the Receipts collection
                const receiptsCollection = db.collection('Receipts');

                // Find receipts
                const query = { UserID: userDoc._id };

                const userReceipts = await receiptsCollection.find(query).toArray();

                res.json({
                    receipts: userReceipts,
                    requestId: requestId
                });

            } catch (error) {
                // Log detailed error
                logger.error({
                    msg: 'Error Retrieving Receipts',
                    requestId: requestId,
                    username: obfuscateUsername(req.params.user),
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });

                res.status(500).json({
                    error: 'Internal server error',
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

    // endpoint that retrieves default symbol for user
    app.get('/:user/default-symbol',
        validate([
            param('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
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
                // Sanitize input
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
                        msg: 'User  Not Found',
                        requestId: requestId,
                        username: obfuscateUsername(username)
                    });

                    return res.status(404).json({ message: 'User  not found' });
                }

                res.json({ defaultSymbol: userDoc.defaultSymbol });

            } catch (error) {
                // Log detailed error
                logger.error({
                    msg: 'Error Retrieving Default Symbol',
                    requestId: requestId,
                    username: obfuscateUsername(req.params.user),
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
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
                // Run validation
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    logger.warn({
                        msg: 'Validation Failed',
                        requestId: requestId,
                        errors: errors.array(),
                        username: obfuscateUsername(req.params.user)
                    });
                    return res.status(400).json({ errors: errors.array() });
                }

                // Sanitize inputs
                const username = sanitizeInput(req.params.user);
                const defaultSymbol = sanitizeInput(req.body.defaultSymbol).toUpperCase();

                client = new MongoClient(uri);
                await client.connect();

                const db = client.db('EreunaDB');
                const collection = db.collection('Users');
                const assetInfoCollection = db.collection('AssetInfo');

                // Verify symbol exists in AssetInfo
                const symbolExists = await assetInfoCollection.findOne({ Symbol: defaultSymbol });
                if (!symbolExists) {
                    logger.warn({
                        msg: 'Symbol Not Found in Asset Info',
                        requestId: requestId,
                        username: obfuscateUsername(username),
                        symbol: defaultSymbol
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
                        requestId: requestId,
                        username: obfuscateUsername(username)
                    });

                    return res.status(404).json({ message: 'User not found' });
                }

                if (result.modifiedCount === 0) {
                    return res.status(400).json({ message: 'No changes made' });
                }

                res.json({ message: 'Default symbol updated successfully' });

            } catch (error) {
                // Log detailed error
                logger.error({
                    msg: 'Error Updating Default Symbol',
                    requestId: requestId,
                    username: obfuscateUsername(req.params.user),
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
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

    // Endpoint that retrieves the 'Hidden' list for a user
    app.get('/:user/hidden',
        validate([
            param('user')
                .trim()
                .notEmpty().withMessage('Username is required')
                .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
                .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
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
                // Sanitize input
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
                        msg: 'User  Not Found',
                        requestId: requestId,
                        username: obfuscateUsername(username)
                    });

                    return res.status(404).json({ message: 'User  not found' });
                }

                res.json({ Hidden: userDoc.Hidden });

            } catch (error) {
                // Log detailed error
                logger.error({
                    msg: 'Error Retrieving Hidden List',
                    requestId: requestId,
                    username: obfuscateUsername(req.params.user),
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });

                res.status(500).json({ message: 'Internal Server Error' });
            } finally {
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

    // endpoint to create a beta account for testing
    app.post('/trial', validate([
        validationSchemas.username(),
        validationSchemas.password()
    ]), async (req, res) => {
        const requestLogger = createRequestLogger(req);
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

            const { username, password } = req.body;
            const sanitizedUsername = sanitizeInput(username);
            const hashedPassword = await argon2.hash(password);
            const rawAuthKey = crypto.randomBytes(64).toString('hex');

            logSignupAttempt(requestLogger, sanitizedUsername, null, null);

            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');

            if (await isUsernameTaken(usersCollection, sanitizedUsername, requestLogger)) {
                return res.status(400).json({ errors: [{ field: 'username', message: 'Username already exists' }] });
            }

            const creationDate = new Date();
            const expirationDate = new Date(creationDate.getTime() + 30 * 24 * 60 * 60 * 1000); // add 30 days

            const newUser = await createUser(usersCollection, sanitizedUsername, hashedPassword, expirationDate, null, null, rawAuthKey, requestLogger);
            if (!newUser) return res.status(500).json({ message: 'Failed to create user' });

            logSuccessfulSignup(requestLogger, newUser.insertedId, null);

            // Notify Reddit of the conversion
            const redditApiUrl = 'https://ads-api.reddit.com/api/v2.0/conversions/events/a2_gu65ayr0a7y3';
            const redditApiToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IlNIQTI1NjpzS3dsMnlsV0VtMjVmcXhwTU40cWY4MXE2OWFFdWFyMnpLMUdhVGxjdWNZIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ1c2VyIiwiZXhwIjo0OTAxMTY1MzcyLjQ5NzY3LCJpYXQiOjE3NDU0MDUzNzIuNDk3NjcsImp0aSI6InE5THhTUnllZl9naTd5OHZZYVNqNnBYUzBJa0hNQSIsImNpZCI6IjFRMUVPelRQV25ZdmVyaHB0dmdXc1EiLCJsaWQiOiJ0Ml8xbndqanhicmkzIiwiYWlkIjoidDJfMW53amp4YnJpMyIsImxjYSI6MTc0NTM5OTgwMDcwOSwic2NwIjoiZUp5S1ZrcE1LVTdPenl0TExTck96TThyVm9vRkJBQUFfXzlCRmdidSIsImZsbyI6MTAsImxsIjp0cnVlfQ.CZ5nfGsO2KuhmnTuhHTDbt8BqKcrIF_MrjLk2SJ_h2qIDQRwBOVm3EkysHZbRy4S_v5SG8stzkPo05oDs3jOIsX4gV_BRus-giFz_K5Xb5vcENYRT_ZkIO8HWbLHuxS-mcsG9nYeo0ps4_4Ie_rFtGG3ooUqbYLm37ldb0xnlN7PrjNsqAd1jQA9lQaypwJkHkrO4hTe8oc0m4kpjWtiNPpZut6wH9SG8UDbqNHNTLF4UF1qn8YE-sKhavQ30-3KdZY63F1bVq2sdaBcXGSsN-EDQ8eEEa5bPwYmXRCpAvQk427X8KvezFYo_FB6Ti-__uDyoP9FgY-RVS9DcuKA8A';
            const conversionData = {
                test_mode: false,
                events: [
                    {
                        event_at: new Date().toISOString(),
                        event_type: {
                            tracking_type: 'Custom',
                            custom_event_name: 'User Registered'
                        }
                    }
                ]
            };

            const redditApiResponse = await fetch(redditApiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${redditApiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(conversionData)
            });

            if (!redditApiResponse.ok) {
                logger.error('Failed to notify Reddit of conversion', {
                    statusCode: redditApiResponse.status,
                    statusText: redditApiResponse.statusText
                });
            }

            return res.status(201).json({ message: 'User created successfully', rawAuthKey });

        } catch (error) {
            if (error instanceof ValidationError) {
                const validationErrors = error.errors.map(err => ({
                    field: err.path,
                    message: err.message
                }));
                return res.status(400).json({ errors: validationErrors });
            }

            handleError(error, requestLogger, req);
            return res.status(500).json({ message: 'An error occurred during trial signup' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to update the current theme
    app.post('/theme', validate([
        validationSchemas.theme(),
        validationSchemas.username()
    ]), async (req, res) => {
        const requestLogger = createRequestLogger(req);
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
            const { theme, username } = req.body;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');

            const userDocument = await usersCollection.findOne({ Username: sanitizedUser });
            if (!userDocument) {
                return res.status(404).json({ message: 'User  not found' });
            }
            await usersCollection.updateOne({ Username: sanitizedUser }, { $set: { theme } });
            return res.status(200).json({ message: 'Theme updated' });
        } catch (error) {
            if (error instanceof ValidationError) {
                const validationErrors = error.errors.map(err => ({
                    field: err.path,
                    message: err.message
                }));
                return res.status(400).json({ errors: validationErrors });
            }
            handleError(error, requestLogger, req);
            return res.status(500).json({ message: 'An error occurred while updating theme' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to load current them for user 
    app.post('/load-theme', validate([
        validationSchemas.username()
    ]), async (req, res) => {
        const requestLogger = createRequestLogger(req);
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
            const { username } = req.body;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser });
            if (!userDocument) {
                return res.status(404).json({ message: 'User  not found' });
            }
            const theme = userDocument.theme;
            return res.status(200).json({ theme });
        } catch (error) {
            if (error instanceof ValidationError) {
                const validationErrors = error.errors.map(err => ({
                    field: err.path,
                    message: err.message
                }));
                return res.status(400).json({ errors: validationErrors });
            }
            handleError(error, requestLogger, req);
            return res.status(500).json({ message: 'An error occurred while loading theme' });
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
    ]), async (req, res) => {
        const requestLogger = createRequestLogger(req);
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
            const { username, newListOrder } = req.body;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser });
            if (!userDocument) {
                return res.status(404).json({ message: 'User  not found' });
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
                return res.status(201).json({ message: 'Panel list created' });
            } else {
                return res.status(200).json({ message: 'Panel list updated' });
            }
        } catch (error) {
            if (error.errors) {
                const validationErrors = error.errors.map(err => ({
                    field: err.param,
                    message: err.msg
                }));
                return res.status(400).json({ errors: validationErrors });
            }
            handleError(error, requestLogger, req);
            return res.status(500).json({ message: 'An error occurred while updating panel list' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to get the current panel order
    app.get('/panel', validate([
        validationSchemas.usernameQuery()
    ]), async (req, res) => {
        const requestLogger = createRequestLogger(req);
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
            const { username } = req.query;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser }, { projection: { panel: 1 } });
            if (!userDocument) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.status(200).json({ panel: userDocument.panel || [] });
        } catch (error) {
            handleError(error, requestLogger, req);
            return res.status(500).json({ message: 'An error occurred while retrieving the panel list' });
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
    ]), async (req, res) => {
        const requestLogger = createRequestLogger(req);
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
            const { username, newListOrder } = req.body;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser });
            if (!userDocument) {
                return res.status(404).json({ message: 'User  not found' });
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
                return res.status(201).json({ message: 'Panel list created' });
            } else {
                return res.status(200).json({ message: 'Panel list updated' });
            }
        } catch (error) {
            if (error.errors) {
                const validationErrors = error.errors.map(err => ({
                    field: err.param,
                    message: err.msg
                }));
                return res.status(400).json({ errors: validationErrors });
            }
            handleError(error, requestLogger, req);
            return res.status(500).json({ message: 'An error occurred while updating panel list' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to get the current summary panel order
    app.get('/panel2', validate([
        validationSchemas.usernameQuery()
    ]), async (req, res) => {
        const requestLogger = createRequestLogger(req);
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
            const { username } = req.query;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser }, { projection: { panel2: 1 } });
            if (!userDocument) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.status(200).json({ panel2: userDocument.panel2 || [] });
        } catch (error) {
            handleError(error, requestLogger, req);
            return res.status(500).json({ message: 'An error occurred while retrieving the panel list' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to get the current panel order
    app.get('/panel', validate([
        validationSchemas.usernameQuery()
    ]), async (req, res) => {
        const requestLogger = createRequestLogger(req);
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
            const { username } = req.query;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser }, { projection: { panel: 1 } });
            if (!userDocument) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.status(200).json({ panel: userDocument.panel || [] });
        } catch (error) {
            handleError(error, requestLogger, req);
            return res.status(500).json({ message: 'An error occurred while retrieving the panel list' });
        } finally {
            if (client) await client.close();
        }
    });

    // endpoint to get the current tier
    app.get('/tier', validate([
        validationSchemas.usernameQuery()
    ]), async (req, res) => {
        const requestLogger = createRequestLogger(req);
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
            const { username } = req.query;
            const sanitizedUser = sanitizeInput(username);
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db('EreunaDB');
            const usersCollection = db.collection('Users');
            const userDocument = await usersCollection.findOne({ Username: sanitizedUser }, { projection: { Tier: 1 } });
            if (!userDocument) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.status(200).json({ Tier: userDocument.Tier });
        } catch (error) {
            handleError(error, requestLogger, req);
            return res.status(500).json({ message: 'An error occurred while retrieving the panel list' });
        } finally {
            if (client) await client.close();
        }
    });

};