import express from 'express';
import fs from 'fs';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import argon2 from 'argon2';
import config from './config.js';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import crypto from 'crypto';
import helmet from 'helmet';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { logger, obfuscateUsername, httpLogger, securityLogger, metricsHandler as importedMetricsHandler } from './logger.js';
import {
  validate,
  validationSchemas,
  validationSets,
  body,
  validationResult,
  validator,
  param,
  sanitizeInput
} from './validationUtils.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { RootNodesUnavailableError } from 'redis';

dotenv.config();

// CORS and Rate Limiting
const allowedOrigins = [
  'http://localhost',
  'http://frontend:80',
  'https://ereuna.co',
  'https://www.ereuna.co'
];

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50000, // Limit each IP to 50000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later',
    status: 429 // Too Many Requests
  }
});

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5500;
const uri = process.env.MONGODB_URI;

// Consolidated middleware
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('front-end'));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins.map(origin => origin.replace(/^https?:\/\//, ''))]
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

const corsOptions = {
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('Unauthorized CORS request', {
        origin: origin,
        timestamp: new Date().toISOString()
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};

// Brute Force Protection Middleware
const bruteForceProtection = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 100 requests per windowMs
  message: 'Too many login attempts, please try again later',
  handler: (req, res) => {
    securityLogger.warn('Potential brute force attack', {
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later'
    });
  }
});

// Apply CORS and Brute Force Protection (max 10 requests per minute)
app.use(/^\/(login|signup|verify|recover|generate-key|download-key|retrieve-key|password-change|change-password2|change-username|account-delete|verify-mfa|twofa)(\/.*)?$/, cors(corsOptions), bruteForceProtection);

// Error Handling Middleware
app.use((err, req, res, next) => {
  // CORS Error Handler
  if (err.name === 'CorsError') {
    logger.error('CORS Error', {
      origin: req.get('origin'),
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    return res.status(403).json({
      error: 'Access denied',
      message: 'Origin not allowed'
    });
  }
});

// SSL/TLS Certificate options
let options;
try {
  options = {
    key: fs.readFileSync(path.join(process.cwd(), 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(process.cwd(), 'localhost.pem'))
  };

  // Use HTTPS server
  https.createServer(options, app).listen(port, () => {
    console.log(`HTTPS Server running on https://localhost:${port}`);
  });
} catch (error) {
  console.error('Error loading SSL certificates:', error);

  // Fallback to HTTP if certificates can't be loaded
  app.listen(port, () => {
    console.log(`HTTP Server running on http://localhost:${port}`);
  });
}

export default app;

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
    Hidden: [],
    Created: new Date(),
    defaultSymbol: 'NVDA',
    PROMOCODE: promoCode,
    HashedAuthKey: await argon2.hash(rawAuthKey),
    MFA: false,
    panel: [
      { order: 1, tag: 'Summary', name: 'Summary', hidden: false },
      { order: 2, tag: 'EpsTable', name: 'EPS Growth Table', hidden: false },
      { order: 3, tag: 'EarnTable', name: 'Earnings Growth Table', hidden: false },
      { order: 4, tag: 'SalesTable', name: 'Sales Growth Table', hidden: false },
      { order: 5, tag: 'DividendsTable', name: 'Dividend Table', hidden: false },
      { order: 6, tag: 'SplitsTable', name: 'Split Table', hidden: false },
      { order: 7, tag: 'Financials', name: 'Financial Statements', hidden: false },
      { order: 8, tag: 'Notes', name: 'Notes', hidden: false },
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

// Endpoint for user login
app.post('/login',
  validate([
    validationSchemas.username(),
    validationSchemas.password(),
    validationSchemas.rememberMe()
  ]),
  async (req, res) => {
    // Create a child logger with request-specific context
    const requestLogger = logger.child({
      requestId: crypto.randomBytes(16).toString('hex'),
      ip: req.ip,
      method: req.method,
    });

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
        requestLogger.warn('Login attempt with missing fields', {
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
          requestLogger.warn('Login attempt with expired subscription', {
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
        requestLogger.error('Login database error', {
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
      requestLogger.error('Unexpected login process error', {
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

//endpoint to display info results
app.get('/chart/:identifier', validate([
  validationSchemas.identifier()
]),
  async (req, res) => {
    const identifier = req.params.identifier.toUpperCase();
    const apiKey = req.header('x-api-key');
    let client;

    const sanitizedKey = sanitizeInput(apiKey);

    if (!sanitizedKey || sanitizedKey !== process.env.VITE_EREUNA_KEY) {
      logger.warn('Invalid API key', {
        providedApiKey: !!sanitizedKey
      });

      return res.status(401).json({
        message: 'Unauthorized API Access'
      });
    }

    try {
      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('AssetInfo');

      // First, try to find by Symbol
      let assetInfo = await collection.findOne({ Symbol: identifier });

      // If not found by Symbol, try to find by ISIN
      if (!assetInfo) {
        const isinAsset = await collection.findOne({ ISIN: identifier });

        // If found by ISIN, get the corresponding Symbol
        if (isinAsset) {
          assetInfo = await collection.findOne({ Symbol: isinAsset.Symbol });
        }
      }

      if (!assetInfo) {
        // Log not found scenario
        logger.warn({
          msg: 'Chart Data Retrieval Failed',
          reason: 'Asset not found',
          identifier: identifier
        });

        return res.status(404).json({ message: 'Asset not found' });
      }

      res.json(assetInfo);
    } catch (error) {
      // Error logging
      logger.error({
        msg: 'Chart Data Retrieval Error',
        error: error.message,
        identifier: identifier
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

// endpoint to create new notes 
app.post('/:symbol/notes',
  validate([
    validationSchemas.symbol('symbol'),
    validationSchemas.note('note'),
    validationSchemas.Username('Username')
  ]),
  async (req, res) => {
    const ticker = req.params.symbol.toUpperCase();
    const { note, Username } = req.body;

    // Sanitize inputs
    const sanitizedNote = sanitizeInput(note);
    const sanitizedUsername = sanitizeInput(Username);

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
      const collection = db.collection('Notes');

      // Check number of existing notes for the user and symbol
      const existingNotesCount = await collection.countDocuments({
        Symbol: ticker,
        Username: sanitizedUsername
      });

      // Check if user has reached the note limit
      if (existingNotesCount >= 10) {
        logger.warn({
          msg: 'Note Creation Failed',
          reason: 'Maximum note limit reached',
          symbol: ticker,
          usernamePartial: obfuscateUsername(sanitizedUsername)
        });

        return res.status(400).json({
          message: 'Maximum note limit (10) reached for this symbol'
        });
      }

      // Create a new note object using sanitized inputs
      const currentDate = new Date();
      const newNote = {
        Symbol: ticker,
        Message: sanitizedNote,
        Username: sanitizedUsername,
        Date: currentDate,
      };

      // Insert the new note object into the MongoDB collection
      const result = await collection.insertOne(newNote);

      if (!result.insertedId) {
        logger.error({
          msg: 'Note Insertion Failed',
          symbol: ticker,
          usernamePartial: obfuscateUsername(sanitizedUsername)
        });

        return res.status(500).json({ message: 'Failed to insert note' });
      }
      res.status(201).json({
        message: 'Note inserted successfully',
        note: newNote
      });

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: 'Note Creation Error',
        error: error.message,
        symbol: ticker,
        usernamePartial: sanitizedUsername ? obfuscateUsername(sanitizedUsername) : 'Unknown'
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

// endpoint to search notes 
app.get('/:user/:symbol/notes', validate(validationSets.notesSearch),
  async (req, res) => {
    const ticker = req.params.symbol.toUpperCase();
    const Username = req.params.user;

    // Light sanitization
    const sanitizedTicker = sanitizeInput(ticker);
    const sanitizedUsername = sanitizeInput(Username);

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
      const collection = db.collection('Notes');

      // Find all notes for the given symbol and Username
      const notes = await collection.find({
        Symbol: sanitizedTicker,
        Username: sanitizedUsername
      }).toArray();

      if (!notes || notes.length === 0) {
        return res.status(404).json({ message: 'No notes found' });
      }

      res.status(200).json(notes);

      client.close();
    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: 'Note Search Error',
        error: error.message,
        symbol: sanitizedTicker,
        usernamePartial: Username ? obfuscateUsername(Username) : 'Unknown'
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

// endpoint to delete a note
app.delete('/:symbol/notes/:noteId', validate(validationSets.notesDeletion),
  async (req, res) => {
    const ticker = req.params.symbol.toUpperCase();
    const noteId = req.params.noteId;
    const Username = req.query.user;
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

    let client;
    try {
      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Notes');

      // Find and delete the note with the given id, symbol, and Username
      const result = await collection.findOneAndDelete({
        _id: new ObjectId(noteId),
        Symbol: ticker,
        Username: Username
      });

      if (!result.value) {
        logger.warn({
          msg: 'Note Not Found',
          symbol: ticker,
          usernamePartial: obfuscateUsername(Username),
          noteId: noteId
        });

        return res.status(404).json({ message: 'Note not found' });
      }

      res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: 'Note Deletion Error',
        error: error.message,
        symbol: ticker,
        usernamePartial: Username ? obfuscateUsername(Username) : 'Unknown',
        noteId: noteId
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      if (client) {
        await client.close();
      }
    }
  }
);

//this endpoint retrieves OHCL Data for the charts 
app.get('/:ticker/data',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData');

      // Find data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Chart Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No data found for this ticker' });
      }

      // Format the data
      const formattedData = Data.map(item => ({
        time: item.timestamp.toISOString().slice(0, 10),
        open: parseFloat(item.open.toString().slice(0, 8)),
        high: parseFloat(item.high.toString().slice(0, 8)),
        low: parseFloat(item.low.toString().slice(0, 8)),
        close: parseFloat(item.close.toString().slice(0, 8)),
      }));

      res.json(formattedData);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: 'Chart Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

//this endpoint retrieves volume Data for the charts 
app.get('/:ticker/data2',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData');

      // Find data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Volume Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No volume data found for this ticker' });
      }

      // Restructure and format the data
      const formattedData = Data.map(item => ({
        time: item.timestamp.toISOString().slice(0, 10),
        value: item.volume,
      }));

      res.json(formattedData);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: 'Volume Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

//sends data for 10DMA (SMA)
app.get('/:ticker/data3',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData');

      // Find and sort data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Moving Average Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No data found for this ticker' });
      }

      // Check if there's enough data to calculate moving average
      if (Data.length < 10) {
        return res.status(400).json({
          message: 'Insufficient data to calculate 10-day moving average',
          availableDataPoints: Data.length
        });
      }

      // Calculate 10-day moving average
      const movingAverages = [];
      for (let i = 9; i < Data.length; i++) {
        const sum = Data.slice(i - 9, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        const average = sum / 10;
        movingAverages.push({
          time: Data[i].timestamp.toISOString().slice(0, 10),
          value: parseFloat(average.toFixed(2)), // Round to 2 decimal places
        });
      }

      res.json(movingAverages);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: 'Moving Average Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

//sends data for 20DMA (SMA)
app.get('/:ticker/data4',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData');

      // Find and sort data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Moving Average Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No data found for this ticker' });
      }

      // Check if there's enough data to calculate moving average
      if (Data.length < 20) {
        return res.status(400).json({
          message: 'Insufficient data to calculate 20-day moving average',
          availableDataPoints: Data.length
        });
      }

      // Calculate 20-day moving average
      const movingAverages = [];
      for (let i = 19; i < Data.length; i++) {
        const sum = Data.slice(i - 19, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        const average = sum / 20;
        movingAverages.push({
          time: Data[i].timestamp.toISOString().slice(0, 10),
          value: parseFloat(average.toFixed(2)), // Round to 2 decimal places
        });
      }

      res.json(movingAverages);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: '20-Day Moving Average Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

//sends data for 50DMA (SMA)
app.get('/:ticker/data5',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData');

      // Find and sort data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Moving Average Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No data found for this ticker' });
      }

      // Check if there's enough data to calculate moving average
      if (Data.length < 50) {
        return res.status(400).json({
          message: 'Insufficient data to calculate 50-day moving average',
          availableDataPoints: Data.length
        });
      }

      // Calculate 50-day moving average
      const movingAverages = [];
      for (let i = 49; i < Data.length; i++) {
        const sum = Data.slice(i - 49, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        const average = sum / 50;
        movingAverages.push({
          time: Data[i].timestamp.toISOString().slice(0, 10),
          value: parseFloat(average.toFixed(2)), // Round to 2 decimal places
        });
      }

      res.json(movingAverages);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: '50-Day Moving Average Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

//sends data for 200DMA (SMA)
app.get('/:ticker/data6',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData');

      // Find and sort data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Moving Average Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No data found for this ticker' });
      }

      // Check if there's enough data to calculate moving average
      if (Data.length < 200) {
        return res.status(400).json({
          message: 'Insufficient data to calculate 200-day moving average',
          availableDataPoints: Data.length
        });
      }

      // Calculate 200-day moving average
      const movingAverages = [];
      for (let i = 199; i < Data.length; i++) {
        const sum = Data.slice(i - 199, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        const average = sum / 200;
        movingAverages.push({
          time: Data[i].timestamp.toISOString().slice(0, 10),
          value: parseFloat(average.toFixed(2)), // Round to 2 decimal places
        });
      }

      res.json(movingAverages);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: '200-Day Moving Average Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

//Weekly OHCL Data
app.get('/:ticker/data7',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData2');

      // Find data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Weekly OHLC Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No weekly data found for this ticker' });
      }

      // Restructure and format the data
      const formattedData = Data.map(item => ({
        time: item.timestamp.toISOString().slice(0, 10),
        open: parseFloat(item.open.toString().slice(0, 8)),
        high: parseFloat(item.high.toString().slice(0, 8)),
        low: parseFloat(item.low.toString().slice(0, 8)),
        close: parseFloat(item.close.toString().slice(0, 8)),
      }));
      res.json(formattedData);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: 'Weekly OHLC Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

// Weekly Volume Data
app.get('/:ticker/data8',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData2');

      // Find data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Weekly Volume Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No weekly volume data found for this ticker' });
      }

      // Restructure and format the data
      const formattedData = Data.map(item => ({
        time: item.timestamp.toISOString().slice(0, 10),
        value: item.volume,
      }));

      res.json(formattedData);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: 'Weekly Volume Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

//sends data for 10DMA (SMA)
app.get('/:ticker/data9',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData2');

      // Find and sort data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Moving Average Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No data found for this ticker' });
      }

      // Check if there's enough data to calculate moving average
      if (Data.length < 10) {
        return res.status(400).json({
          message: 'Insufficient data to calculate 10-day moving average',
          availableDataPoints: Data.length
        });
      }

      // Calculate 10-day moving average
      const movingAverages = [];
      for (let i = 9; i < Data.length; i++) {
        const sum = Data.slice(i - 9, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        const average = sum / 10;
        movingAverages.push({
          time: Data[i].timestamp.toISOString().slice(0, 10),
          value: parseFloat(average.toFixed(2)), // Round to 2 decimal places
        });
      }

      res.json(movingAverages);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: '10-Day Moving Average Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

//sends data for 20DMA (SMA)
app.get('/:ticker/data10',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData2');

      // Find and sort data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Moving Average Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No data found for this ticker' });
      }

      // Check if there's enough data to calculate moving average
      if (Data.length < 20) {
        return res.status(400).json({
          message: 'Insufficient data to calculate 20-day moving average',
          availableDataPoints: Data.length
        });
      }

      // Calculate 20-day moving average
      const movingAverages = [];
      for (let i = 19; i < Data.length; i++) {
        const sum = Data.slice(i - 19, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        const average = sum / 20;
        movingAverages.push({
          time: Data[i].timestamp.toISOString().slice(0, 10),
          value: parseFloat(average.toFixed(2)), // Round to 2 decimal places
        });
      }

      res.json(movingAverages);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: '20-Day Moving Average Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

//sends data for 50DMA (SMA)
app.get('/:ticker/data11',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData2');

      // Find and sort data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Moving Average Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No data found for this ticker' });
      }

      // Check if there's enough data to calculate moving average
      if (Data.length < 50) {
        return res.status(400).json({
          message: 'Insufficient data to calculate 50-day moving average',
          availableDataPoints: Data.length
        });
      }

      // Calculate 50-day moving average
      const movingAverages = [];
      for (let i = 49; i < Data.length; i++) {
        const sum = Data.slice(i - 49, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        const average = sum / 50;
        movingAverages.push({
          time: Data[i].timestamp.toISOString().slice(0, 10),
          value: parseFloat(average.toFixed(2)), // Round to 2 decimal places
        });
      }

      res.json(movingAverages);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: '50-Day Moving Average Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

//sends data for 200DMA (SMA)
app.get('/:ticker/data12',
  validate(validationSets.chartData),
  async (req, res) => {
    const ticker = sanitizeInput(req.params.ticker.toUpperCase());
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
      const collection = db.collection('OHCLVData2');

      // Find and sort data for the specific ticker
      const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

      // Check if data exists
      if (Data.length === 0) {
        logger.warn({
          msg: 'No Moving Average Data Found',
          ticker: ticker
        });
        return res.status(404).json({ message: 'No data found for this ticker' });
      }

      // Check if there's enough data to calculate moving average
      if (Data.length < 200) {
        return res.status(400).json({
          message: 'Insufficient data to calculate 200-day moving average',
          availableDataPoints: Data.length
        });
      }

      // Calculate 200-day moving average
      const movingAverages = [];
      for (let i = 199; i < Data.length; i++) {
        const sum = Data.slice(i - 199, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        const average = sum / 200;
        movingAverages.push({
          time: Data[i].timestamp.toISOString().slice(0, 10),
          value: parseFloat(average.toFixed(2)), // Round to 2 decimal places
        });
      }

      res.json(movingAverages);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: '200-Day Moving Average Data Retrieval Error',
        ticker: ticker,
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

// Sends earnings date 
app.get('/:ticker/earningsdate',
  validate([
    validationSchemas.chartData('ticker')
  ]),
  async (req, res) => {
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
      // Sanitize and validate ticker
      const ticker = sanitizeInput(req.params.ticker).toUpperCase();

      const client = new MongoClient(uri);

      try {
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('AssetInfo');

        // Find data with logging
        const Data = await collection.find({ Symbol: ticker }).toArray();

        // Log if no data found
        if (Data.length === 0) {
          logger.warn('No earnings data found', {
            ticker: ticker
          });
          return res.status(404).json({
            message: 'No earnings data found for this ticker'
          });
        }

        // Process and format earnings dates
        const formattedData = Data.flatMap(item => {
          // Safely handle quarterlyIncome in case it's undefined
          if (!item.quarterlyIncome || !Array.isArray(item.quarterlyIncome)) {
            return [];
          }

          return item.quarterlyIncome.map(quarterly => {
            try {
              const date = new Date(quarterly.fiscalDateEnding);

              // Validate date
              if (isNaN(date.getTime())) {
                logger.warn('Invalid date in earnings data', {
                  ticker: ticker,
                  originalDate: quarterly.fiscalDateEnding
                });
                return null;
              }

              return {
                time: {
                  year: date.getFullYear(),
                  month: date.getMonth() + 1,
                  day: date.getDate(),
                },
              };
            } catch (dateError) {
              logger.error('Error processing date', {
                ticker: ticker,
                error: dateError.message
              });
              return null;
            }
          }).filter(entry => entry !== null); // Remove invalid entries
        });

        // Send formatted data
        res.status(200).json(formattedData);

      } catch (dbError) {
        // Log database-specific errors
        logger.error('Database error retrieving earnings dates', {
          ticker: ticker,
          error: dbError.message,
          stack: dbError.stack
        });

        // Differentiate between different types of database errors
        if (dbError.name === 'MongoError' || dbError.name === 'MongoNetworkError') {
          return res.status(503).json({
            message: 'Database service unavailable',
            error: 'Unable to connect to the database'
          });
        }

        return res.status(500).json({
          message: 'Internal Server Error',
          error: 'Failed to retrieve earnings dates'
        });

      } finally {
        // Ensure database connection is always closed
        try {
          await client.close();
        } catch (closeError) {
          logger.error('Error closing database connection', {
            error: closeError.message
          });
        }
      }

    } catch (unexpectedError) {
      // Catch any unexpected errors in the main try block
      logger.error('Unexpected error in earnings date retrieval', {
        error: unexpectedError.message,
        stack: unexpectedError.stack
      });

      return res.status(500).json({
        message: 'Internal Server Error',
        error: 'An unexpected error occurred'
      });
    }
  }
);

// Sends splits date 
app.get('/:ticker/splitsdate',
  validate([
    validationSchemas.chartData('ticker')
  ]),
  async (req, res) => {
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

      const ticker = sanitizeInput(req.params.ticker).toUpperCase();

      const client = new MongoClient(uri);

      try {
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('AssetInfo');

        const data = await collection.findOne({ Symbol: ticker });

        if (!data || !data.splits) {
          logger.warn('No splits data found', {
            ticker: ticker
          });
          return res.status(404).json({
            message: 'No splits data found for this ticker'
          });
        }

        const splits = data.splits.reverse();

        res.status(200).json(splits);

      } catch (dbError) {
        logger.error('Database error retrieving splits dates', {
          ticker: ticker,
          error: dbError.message,
          stack: dbError.stack
        });

        if (dbError.name === 'MongoError' || dbError.name === 'MongoNetworkError') {
          return res.status(503).json({
            message: 'Database service unavailable',
            error: 'Unable to connect to the database'
          });
        }

        return res.status(500).json({
          message: 'Internal Server Error',
          error: 'Failed to retrieve splits dates'
        });

      } finally {
        try {
          await client.close();
        } catch (closeError) {
          logger.error('Error closing database connection', {
            error: closeError.message
          });
        }
      }

    } catch (unexpectedError) {
      logger.error('Unexpected error in splits date retrieval', {
        error: unexpectedError.message,
        stack: unexpectedError.stack
      });

      return res.status(500).json({
        message: 'Internal Server Error',
        error: 'An unexpected error occurred'
      });
    }
  }
);

// Sends dividend dates
app.get('/:ticker/dividendsdate',
  validate([
    validationSchemas.chartData('ticker')
  ]),
  async (req, res) => {
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

      const ticker = sanitizeInput(req.params.ticker).toUpperCase();

      const client = new MongoClient(uri);

      try {
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('AssetInfo');

        const data = await collection.findOne({ Symbol: ticker });

        if (!data || !data.dividends) {
          logger.warn('No dividend data found', {
            ticker: ticker
          });
          return res.status(404).json({
            message: 'No dividend data found for this ticker'
          });
        }

        const dividends = data.dividends.reverse();

        res.status(200).json(dividends);

      } catch (dbError) {
        logger.error('Database error retrieving dividend dates', {
          ticker: ticker,
          error: dbError.message,
          stack: dbError.stack
        });

        if (dbError.name === 'MongoError' || dbError.name === 'MongoNetworkError') {
          return res.status(503).json({
            message: 'Database service unavailable',
            error: 'Unable to connect to the database'
          });
        }

        return res.status(500).json({
          message: 'Internal Server Error',
          error: 'Failed to retrieve dividend dates'
        });

      } finally {
        try {
          await client.close();
        } catch (closeError) {
          logger.error('Error closing database connection', {
            error: closeError.message
          });
        }
      }

    } catch (unexpectedError) {
      logger.error('Unexpected error in dividend date retrieval', {
        error: unexpectedError.message,
        stack: unexpectedError.stack
      });

      return res.status(500).json({
        message: 'Internal Server Error',
        error: 'An unexpected error occurred'
      });
    }
  }
);

// endpoint that retrieves watchlists (names)
app.get('/:user/watchlists',
  validate([
    validationSchemas.userParam('user')
  ]),
  async (req, res) => {
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
      // Sanitize user parameter
      const user = sanitizeInput(req.params.user);

      const client = new MongoClient(uri);

      try {
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Watchlists');

        // Find user watchlists with logging
        const userWatchlists = await collection.find({ UsernameID: user }).toArray();

        // Log if no watchlists found
        if (userWatchlists.length === 0) {
          logger.warn('No watchlists found', {
            user: obfuscateUsername(user)
          });

          return res.status(404).json({
            message: 'User not found or no watchlists found'
          });
        }
        // Send watchlists with additional security
        res.status(200).json(userWatchlists.map(watchlist => ({
          ...watchlist,
          // Optionally remove any sensitive fields
          _id: undefined // Remove MongoDB internal ID if needed
        })));

      } catch (dbError) {
        // Log database-specific errors
        logger.error('Database error retrieving watchlists', {
          user: obfuscateUsername(user),
          error: dbError.message,
          stack: dbError.stack
        });

        // Differentiate between different types of database errors
        if (dbError.name === 'MongoError' || dbError.name === 'MongoNetworkError') {
          return res.status(503).json({
            message: 'Database service unavailable',
            error: 'Unable to connect to the database'
          });
        }

        return res.status(500).json({
          message: 'Internal Server Error',
          error: 'Failed to retrieve watchlists'
        });

      } finally {
        // Ensure database connection is always closed
        try {
          await client.close();
        } catch (closeError) {
          logger.error('Error closing database connection', {
            error: closeError.message
          });
        }
      }

    } catch (unexpectedError) {
      // Catch any unexpected errors in the main try block
      logger.error('Unexpected error in watchlists retrieval', {
        error: unexpectedError.message,
        stack: unexpectedError.stack
      });

      return res.status(500).json({
        message: 'Internal Server Error',
        error: 'An unexpected error occurred'
      });
    }
  }
);

// endpoint that retrieves content of watchlists based on the selected name 
app.get('/:user/watchlists/:list',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.watchlistName()
  ]),
  async (req, res) => {
    try {
      const user = sanitizeInput(req.params.user);
      const list = sanitizeInput(req.params.list);
      const client = new MongoClient(uri);

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
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Watchlists');

        const Watchlists = await collection.findOne({ UsernameID: user, Name: list });

        if (!Watchlists) {
          logger.warn('Watchlist not found', {
            user: obfuscateUsername(user),
            list: list
          });

          return res.status(404).json({
            message: 'Watchlist not found'
          });
        }

        res.status(200).json(Watchlists.List);

      } catch (dbError) {
        logger.error('Database error retrieving watchlist', {
          user: obfuscateUsername(user),
          list: list,
          error: dbError.message
        });

        return res.status(500).json({
          message: 'Internal Server Error',
          error: 'Failed to retrieve watchlist'
        });

      } finally {
        try {
          await client.close();
        } catch (closeError) {
          logger.error('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    } catch (unexpectedError) {
      logger.error('Unexpected error in watchlist retrieval', {
        error: unexpectedError.message,
        stack: unexpectedError.stack
      });

      return res.status(500).json({
        message: 'Internal Server Error',
        error: 'An unexpected error occurred'
      });
    }
  }
);

// 
app.get('/:symbol/data-values',
  validate([
    validationSchemas.symbolParam('symbol')
  ]),
  async (req, res) => {
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
      const symbol = sanitizeInput(req.params.symbol);
      const client = new MongoClient(uri);

      try {
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('OHCLVData');

        // Fetch the latest two documents for changes and percentage calculations
        const documents = await collection.find({ tickerID: symbol })
          .sort({ timestamp: -1 })
          .limit(2)
          .toArray();

        if (documents.length > 0) {
          const latest = documents[0];
          const responseData = {
            close: latest.close,
            timestamp: latest.timestamp,
          };

          if (documents.length > 1) {
            const previous = documents[1];
            const closeDiff = latest.close - previous.close;
            const percentChange = ((closeDiff / previous.close) * 100).toFixed(2);

            responseData.closeDiff = closeDiff.toFixed(2);
            responseData.percentChange = `${percentChange}%`;
            responseData.latestClose = latest.close;
            responseData.previousClose = previous.close;
            responseData.timestamp.previous = previous.timestamp;
          } else {
            responseData.closeDiff = 0;
            responseData.percentChange = '0%';
            responseData.message = 'Insufficient historical data for comparison';
          }

          res.status(200).json(responseData);
        } else {
          logger.warn('No data found for symbol', { symbol: symbol });
          res.status(404).json({ message: 'No data found for the given symbol' });
        }
      } catch (dbError) {
        logger.error('Database error retrieving data', { symbol: symbol, error: dbError.message });
        res.status(500).json({ message: 'Internal Server Error', error: 'Failed to retrieve data' });
      } finally {
        try {
          await client.close();
        } catch (closeError) {
          logger.error('Error closing database connection', { error: closeError.message });
        }
      }
    } catch (unexpectedError) {
      logger.error('Unexpected error in data retrieval', { error: unexpectedError.message, stack: unexpectedError.stack });
      res.status(500).json({ message: 'Internal Server Error', error: 'An unexpected error occurred' });
    }
  }
);

// endpoint to add symbol to selected watchlist 
app.patch('/:user/watchlists/:list',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.watchlistName(),
    body('Name').trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Watchlist name must be between 1 and 20 characters')
      .matches(/^[a-zA-Z0-9\s_-]+$/)
      .withMessage('Watchlist name can only contain letters, numbers, spaces, underscores, and hyphens'),
    body('symbol')
      .trim()
      .notEmpty().withMessage('Symbol is required')
      .isLength({ min: 1, max: 12 }).withMessage('Symbol must be between 1 and 12 characters')
      .matches(/^[A-Z0-9]+$/).withMessage('Symbol must be uppercase alphanumeric')
  ]),
  async (req, res) => {
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
      const list = sanitizeInput(req.params.list);
      const user = sanitizeInput(req.params.user);
      const { Name, symbol } = req.body;
      const sanitizedSymbol = sanitizeInput(symbol.toUpperCase());
      const sanitizedName = sanitizeInput(Name);

      const client = new MongoClient(uri);

      try {
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Watchlists');

        // Verify watchlist exists and belongs to the user
        const watchlist = await collection.findOne({
          Name: sanitizedName,
          UsernameID: user
        });

        if (!watchlist) {
          return res.status(404).json({
            message: 'Watchlist not found',
            details: 'The specified watchlist does not exist or you do not have access to it'
          });
        }

        // Check if watchlist has reached maximum number of symbols (100)
        if (watchlist.List && watchlist.List.length >= 100) {
          return res.status(400).json({
            message: 'Limit reached, cannot add more than 100 symbols per watchlist',
            details: 'Maximum of 100 symbols per watchlist'
          });
        }

        // Check if symbol already exists in the watchlist
        if (watchlist.List && watchlist.List.includes(sanitizedSymbol)) {
          return res.status(409).json({
            message: 'Symbol already exists in the watchlist',
            symbol: sanitizedSymbol
          });
        }

        // Verify symbol exists in AssetInfo collection
        const assetInfoCollection = db.collection('AssetInfo');
        const assetExists = await assetInfoCollection.findOne({ Symbol: sanitizedSymbol });

        if (!assetExists) {
          return res.status(404).json({
            message: 'Symbol not found',
            symbol: sanitizedSymbol
          });
        }

        // Add symbol to watchlist
        const result = await collection.updateOne(
          { Name: sanitizedName, UsernameID: user },
          {
            $addToSet: { List: sanitizedSymbol },
            $set: { lastUpdated: new Date() }
          }
        );

        if (result.modifiedCount === 1) {

          res.status(200).json({
            message: 'Ticker added successfully',
            symbol: sanitizedSymbol,
            watchlist: sanitizedName
          });
        } else {
          logger.warn('Failed to add symbol to watchlist', {
            user: user,
            listName: sanitizedName,
            symbol: sanitizedSymbol
          });

          res.status(500).json({
            message: 'Failed to update watchlist',
            details: 'An unexpected error occurred while adding the symbol'
          });
        }
      } catch (dbError) {
        logger.error('Database error in adding symbol to watchlist', {
          user: user,
          listName: sanitizedName,
          symbol: sanitizedSymbol,
          error: dbError.message
        });

        res.status(500).json({
          message: 'Internal Server Error',
          error: 'Failed to add symbol to watchlist'
        });
      } finally {
        try {
          await client.close();
        } catch (closeError) {
          logger.error('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    } catch (unexpectedError) {
      logger.error('Unexpected error in adding symbol to watchlist', {
        error: unexpectedError.message,
        stack: unexpectedError.stack
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: 'An unexpected error occurred'
      });
    }
  }
);

// endpoint that deletes ticker from selected watchlist 
app.patch('/:user/deleteticker/watchlists/:list/:ticker',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.watchlistName(),
    validationSchemas.symbolParam('ticker')
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
      // Sanitize input parameters
      const list = sanitizeInput(req.params.list);
      const ticker = sanitizeInput(req.params.ticker).toUpperCase();
      const user = sanitizeInput(req.params.user);

      const client = new MongoClient(uri);

      try {
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Watchlists');

        // Verify watchlist exists and belongs to the user
        const watchlist = await collection.findOne({
          Name: list,
          UsernameID: user
        });

        if (!watchlist) {
          requestLogger.warn('Watchlist not found', {
            user: obfuscateUsername(user),
            list
          });
          return res.status(404).json({
            message: 'Watchlist not found',
            details: 'The specified watchlist does not exist or you do not have access to it'
          });
        }

        // Check if ticker exists in the watchlist
        if (!watchlist.List || !watchlist.List.includes(ticker)) {
          requestLogger.warn('Ticker not found in watchlist', {
            user: obfuscateUsername(user),
            list,
            ticker
          });
          return res.status(404).json({
            message: 'Ticker not found in the watchlist'
          });
        }

        const filter = { Name: list, UsernameID: user };
        const update = {
          $pull: { List: ticker },
          $set: { lastUpdated: new Date() }
        };

        const result = await collection.updateOne(filter, update);

        if (result.modifiedCount === 1) {

          res.status(200).json({
            message: 'Ticker deleted successfully',
            list,
            ticker
          });
        } else {
          requestLogger.warn('Failed to delete ticker', {
            user: obfuscateUsername(user),
            list,
            ticker
          });

          res.status(500).json({
            message: 'Failed to delete ticker',
            details: 'An unexpected error occurred while deleting the symbol'
          });
        }
      } catch (dbError) {
        requestLogger.error('Database error in deleting ticker', {
          user: obfuscateUsername(user),
          list,
          ticker,
          error: dbError.message
        });

        res.status(500).json({
          message: 'Internal Server Error',
          error: 'Failed to delete ticker from watchlist'
        });
      } finally {
        try {
          await client.close();
        } catch (closeError) {
          requestLogger.error('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    } catch (unexpectedError) {
      requestLogger.error('Unexpected error in deleting ticker', {
        error: unexpectedError.message,
        stack: unexpectedError.stack
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: 'An unexpected error occurred'
      });
    }
  }
);

// endpoint that deletes selected watchlist
app.delete('/:user/delete/watchlists/:list',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.watchlistName()
  ]),
  async (req, res) => {
    const requestLogger = logger.child({
      requestId: crypto.randomBytes(16).toString('hex'),
      ip: req.ip,
      method: req.method
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
      const list = sanitizeInput(req.params.list);
      const user = sanitizeInput(req.params.user);

      const client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Watchlists');

      const filter = { Name: list, UsernameID: user };

      const result = await collection.deleteOne(filter);

      if (result.deletedCount === 0) {
        requestLogger.warn('Attempted to delete a non-existent watchlist', {
          user: obfuscateUsername(user),
          list: '[masked]'
        });
        return res.status(404).json({ message: 'Watchlist not found' });
      }

      res.send({ message: 'Watchlist deleted successfully' });

      await client.close();
    } catch (error) {
      requestLogger.error('Error deleting watchlist', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

// endpoint that creates a new watchlist 
app.post('/:user/create/watchlists/:list',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.watchlistName()
  ]),
  async (req, res) => {
    const requestLogger = logger.child({
      requestId: crypto.randomBytes(16).toString('hex'),
      ip: req.ip,
      method: req.method,
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
      const list = sanitizeInput(req.params.list);
      const user = sanitizeInput(req.params.user);

      // Log the attempt to create a new watchlist
      requestLogger.info('Create watchlist attempt', {
        user: obfuscateUsername(user),
        list
      });

      const client = new MongoClient(uri);

      try {
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Watchlists');

        // Check how many watchlists the user already has
        const existingWatchlistsCount = await collection.countDocuments({ UsernameID: user });

        if (existingWatchlistsCount >= 20) {
          requestLogger.warn('Watchlist creation limit reached', {
            user: obfuscateUsername(user),
            existingWatchlistsCount
          });

          return res.status(400).json({
            message: 'Maximum number of watchlists (20) has been reached',
            details: 'You cannot create more than 20 watchlists'
          });
        }

        // Check if a watchlist with the same name already exists
        const existingWatchlist = await collection.findOne({
          Name: list,
          UsernameID: user
        });

        if (existingWatchlist) {
          requestLogger.warn('Watchlist with same name already exists', {
            user: obfuscateUsername(user),
            list
          });

          return res.status(409).json({
            message: 'A watchlist with this name already exists',
            details: 'Please choose a different name'
          });
        }

        const document = {
          Name: list,
          UsernameID: user,
          List: [],
          createdAt: new Date(),
          lastUpdated: new Date()
        };

        const result = await collection.insertOne(document);

        if (result.insertedId) {

          res.status(201).json({
            message: 'Watchlist created successfully',
            watchlist: {
              name: list,
              id: result.insertedId
            }
          });
        } else {
          requestLogger.warn('Failed to create watchlist', {
            user: obfuscateUsername(user),
            list
          });

          res.status(500).json({
            message: 'Error creating watchlist',
            details: 'An unexpected error occurred while creating the watchlist'
          });
        }
      } catch (dbError) {
        requestLogger.error('Database error in creating watchlist', {
          user: obfuscateUsername(user),
          list,
          error: dbError.message
        });

        res.status(500).json({
          message: 'Internal Server Error',
          error: 'Failed to create watchlist'
        });
      } finally {
        try {
          await client.close();
        } catch (closeError) {
          requestLogger.error('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    } catch (unexpectedError) {
      requestLogger.error('Unexpected error in creating watchlist', {
        error: unexpectedError.message,
        stack: unexpectedError.stack
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: 'An unexpected error occurred'
      });
    }
  }
);

// endpoint that renames selected watchlist 
app.patch('/:user/rename/watchlists/:oldname',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.newname()
  ]),
  async (req, res) => {
    // Create a child logger with request-specific context
    const requestLogger = logger.child({
      requestId: crypto.randomBytes(16).toString('hex'),
      ip: req.ip,
      method: req.method
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
      const oldname = sanitizeInput(req.params.oldname);
      const newname = sanitizeInput(req.body.newname);
      const Username = sanitizeInput(req.params.user);

      if (!newname) {
        requestLogger.warn('Attempt to rename watchlist with empty name', {
          user: obfuscateUsername(Username),
          oldname: '[masked]'
        });
        return res.status(400).json({ message: 'Please provide a new name' });
      }

      const client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Watchlists');

      const filter = { UsernameID: Username, Name: oldname };
      const updateDoc = { $set: { Name: newname } };

      const result = await collection.updateOne(filter, updateDoc);

      if (result.modifiedCount === 0) {
        requestLogger.warn('Watchlist not found for renaming', {
          user: obfuscateUsername(Username),
          oldname: '[masked]',
          newname: '[masked]'
        });
        return res.status(404).json({ message: 'Watchlist not found' });
      }

      client.close();
      res.json({ message: 'Watchlist renamed successfully' });
    } catch (error) {
      requestLogger.error('Error renaming watchlist', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

// endpoint that handles creation of new screeners 
app.post('/:user/create/screener/:list',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.screenerName()
  ]),
  async (req, res) => {
    // Create a child logger with request-specific context
    const requestLogger = logger.child({
      requestId: crypto.randomBytes(16).toString('hex'),
      ip: req.ip,
      method: req.method
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
      const user = sanitizeInput(req.params.user);
      const list = sanitizeInput(req.params.list);

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');

      // Check the number of existing screeners for this user
      const screenerCount = await collection.countDocuments({ UsernameID: user });
      if (screenerCount >= 20) {
        requestLogger.warn('Attempt to create screener beyond limit', {
          user: obfuscateUsername(user),
          screenerCount: screenerCount
        });
        return res.status(400).json({
          message: 'Maximum number of screeners (20) has been reached'
        });
      }

      // Check if a screener with the same name and username already exists
      const existingScreener = await collection.findOne({ UsernameID: user, Name: list });
      if (existingScreener) {
        requestLogger.warn('Attempt to create duplicate screener', {
          user: obfuscateUsername(user),
          screenerName: '[masked]'
        });
        return res.status(400).json({
          message: 'Screener with the same name already exists'
        });
      }

      // Create a new screener document
      const screenerDoc = {
        UsernameID: user,
        Name: list,
        Include: true,
        CreatedAt: new Date(),
      };

      const result = await collection.insertOne(screenerDoc);

      // Check if insertion was successful
      if (result.insertedCount === 1 || result.acknowledged) {
        return res.json({
          message: 'Screener created successfully',
          screenerCount: screenerCount + 1
        });
      } else {
        requestLogger.error('Failed to create screener', {
          user: obfuscateUsername(user),
          screenerName: '[masked]'
        });
        return res.status(500).json({ message: 'Failed to create screener' });
      }
    } catch (error) {
      requestLogger.error('Error creating screener', {
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      // Ensure client is closed if it was opened
      if (client) {
        await client.close();
      }
    }
  });

// endpoint that renames selected screener
app.patch('/:user/rename/screener',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.oldname(),
    validationSchemas.newname()
  ]),
  async (req, res) => {
    // Create a child logger with request-specific context
    const requestLogger = logger.child({
      requestId: crypto.randomBytes(16).toString('hex'),
      ip: req.ip,
      method: req.method
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
      const oldname = sanitizeInput(req.body.oldname);
      const newname = sanitizeInput(req.body.newname);
      const Username = sanitizeInput(req.params.user);

      // Check if new name is provided and different from old name
      if (!newname) {
        requestLogger.warn('Attempt to rename screener with empty name', {
          user: obfuscateUsername(Username),
          oldname: '[masked]'
        });
        return res.status(400).json({ message: 'Please provide a new name' });
      }

      if (oldname === newname) {
        requestLogger.warn('Attempt to rename screener with same name', {
          user: obfuscateUsername(Username),
          screenerName: '[masked]'
        });
        return res.status(400).json({
          message: 'New name must be different from the current name'
        });
      }

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');

      // Check if a screener with the new name already exists
      const existingScreener = await collection.findOne({
        UsernameID: Username,
        Name: newname
      });

      if (existingScreener) {
        requestLogger.warn('Attempt to create duplicate screener name', {
          user: obfuscateUsername(Username),
          screenerName: '[masked]'
        });
        return res.status(400).json({
          message: 'A screener with this name already exists'
        });
      }

      const filter = { UsernameID: Username, Name: oldname };
      const updateDoc = { $set: { Name: newname } };

      const result = await collection.updateOne(filter, updateDoc);

      // Check if any document was modified
      if (result.modifiedCount === 0) {
        requestLogger.warn('Screener not found for renaming', {
          user: obfuscateUsername(Username),
          oldname: '[masked]'
        });
        return res.status(404).json({ message: 'Screener not found' });
      }

      // Send success response
      return res.json({ message: 'Screener renamed successfully' });
    } catch (error) {
      requestLogger.error('Error renaming screener', {
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      // Ensure client is closed if it was opened
      if (client) {
        await client.close();
      }
    }
  });

// endpoint that deletes selected screener 
app.delete('/:user/delete/screener/:list',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.screenerName()
  ]),
  async (req, res) => {
    // Create a child logger with request-specific context
    const requestLogger = logger.child({
      requestId: crypto.randomBytes(16).toString('hex'),
      ip: req.ip,
      method: req.method
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
      const user = sanitizeInput(req.params.user);
      const list = sanitizeInput(req.params.list);

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');

      const filter = { Name: list, UsernameID: user };

      const result = await collection.deleteOne(filter);

      if (result.deletedCount === 0) {
        requestLogger.warn('Screener not found for deletion', {
          user: obfuscateUsername(user),
          screenerName: '[masked]'
        });
        return res.status(404).json({ message: 'Screener not found' });
      }

      res.json({ message: 'Screener deleted successfully' });
    } catch (error) {
      requestLogger.error('Error deleting screener', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      // Ensure client is closed if it was opened
      if (client) {
        await client.close();
      }
    }
  });

// endpoint that sends unfiltered database data into screener results (minus hidden list for user)
app.get('/:user/screener/results/all',
  validate([
    validationSchemas.userParam('user')
  ]),
  async (req, res) => {
    // Create a child logger with request-specific context
    const requestLogger = logger.child({
      requestId: crypto.randomBytes(16).toString('hex'),
      ip: req.ip,
      method: req.method
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
      const user = sanitizeInput(req.params.user);

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');

      // Find the user document and extract the 'Hidden' array
      const usersCollection = db.collection('Users');
      const userDoc = await usersCollection.findOne({ Username: user });

      if (!userDoc) {
        requestLogger.warn('User not found', {
          user: obfuscateUsername(user)
        });
        return res.status(404).json({ message: 'User not found' });
      }

      const hiddenSymbols = userDoc.Hidden || [];

      // Filter the AssetInfo collection using the 'Hidden' array
      const assetInfoCollection = db.collection('AssetInfo');
      const filteredAssets = await assetInfoCollection.find({
        Symbol: { $nin: hiddenSymbols }
      }, {
        projection: {
          Symbol: 1,
          Name: 1,
          ISIN: 1,
          MarketCapitalization: 1,
          Close: { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] },
          PERatio: 1,
          PEGRatio: 1,
          PriceToSalesRatioTTM: 1,
          DividendYield: 1,
          EPS: 1,
          Sector: 1,
          Industry: 1,
          Exchange: 1,
          Country: 1,
          RSScore1W: 1,
          RSScore1M: 1,
          RSScore4M: 1,
          todaychange: 1,
          ytdchange: 1,
          ADV1W: 1,
          ADV1M: 1,
          ADV4M: 1,
          ADV1Y: 1,
          _id: 0
        }
      }).toArray();

      res.json(filteredAssets);
    } catch (error) {
      requestLogger.error('Error fetching screener results', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      // Ensure client is closed if it was opened
      if (client) {
        await client.close();
      }
    }
  });

// endpoint that updates screener document with price parameters 
app.patch('/screener/price', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize inputs
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min price and max price cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const ohlcCollection = db.collection('OHCLVData');

        if (isNaN(minPrice)) {
          minPrice = 0.000001;
        }

        if (isNaN(maxPrice)) {
          const recentDate = await ohlcCollection.find({})
            .sort({ timestamp: -1 })
            .limit(1)
            .project({ timestamp: 1 })
            .toArray();

          if (recentDate.length > 0) {
            const mostRecentTimestamp = recentDate[0].timestamp;
            const closeValues = await ohlcCollection.find({
              timestamp: {
                $gte: new Date(mostRecentTimestamp.setHours(0, 0, 0, 0)),
                $lt: new Date(mostRecentTimestamp.setHours(23, 59, 59, 999))
              }
            }).project({ close: 1 }).toArray();

            if (closeValues.length > 0) {
              const sortedCloseValues = closeValues.map(doc => doc.close).sort((a, b) => b - a);
              maxPrice = sortedCloseValues[0];
              maxPrice = Math.ceil(maxPrice * 100) / 100;
            }
          }
        }

        if (minPrice >= maxPrice) {
          return res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { Price: [minPrice, maxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        res.json({
          message: 'Price range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Price Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });


// endpoint that updates screener document with market cap parameters 
app.patch('/screener/marketcap',
  validate([
    validationSchemas.user(),
    validationSchemas.screenerNameBody(),
    validationSchemas.minPrice(),
    validationSchemas.maxPrice()
  ]),
  async (req, res) => {
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
      // Sanitize inputs
      const minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
      const maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
      const Username = sanitizeInput(req.body.user || '');
      const screenerName = sanitizeInput(req.body.screenerName || '');

      // Additional validation
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }

      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min market cap and max market cap cannot be empty' });
      }

      client = new MongoClient(uri);
      await client.connect();
      const db = client.db('EreunaDB');
      const assetInfoCollection = db.collection('AssetInfo');
      const collection = db.collection('Screeners');

      // If minPrice is empty, find the lowest MarketCapitalization
      let finalMinPrice = minPrice;
      if (isNaN(finalMinPrice)) {
        const lowestMarketCapDoc = await assetInfoCollection.find({
          MarketCapitalization: { $ne: null, $ne: undefined, $gt: 0 }
        })
          .sort({ MarketCapitalization: 1 })
          .limit(1)
          .project({ MarketCapitalization: 1 })
          .toArray();

        if (lowestMarketCapDoc.length > 0) {
          finalMinPrice = lowestMarketCapDoc[0].MarketCapitalization;
        } else {
          return res.status(404).json({ message: 'No assets found to determine minimum market cap' });
        }
      }

      // If maxPrice is empty, find the highest MarketCapitalization
      let finalMaxPrice = maxPrice;
      if (isNaN(finalMaxPrice)) {
        const highestMarketCapDoc = await assetInfoCollection.find({
          MarketCapitalization: { $ne: null, $ne: undefined, $gt: 0 }
        })
          .sort({ MarketCapitalization: -1 })
          .limit(1)
          .project({ MarketCapitalization: 1 })
          .toArray();

        if (highestMarketCapDoc.length > 0) {
          finalMaxPrice = highestMarketCapDoc[0].MarketCapitalization;
        } else {
          return res.status(404).json({ message: 'No assets found to determine maximum market cap' });
        }
      }

      // Ensure minPrice is less than maxPrice
      if (finalMinPrice >= finalMaxPrice) {
        return res.status(400).json({ message: 'Min market cap cannot be higher than or equal to max market cap' });
      }

      // Find and update the screener
      const filter = {
        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
      };

      const existingScreener = await collection.findOne(filter);
      if (!existingScreener) {
        return res.status(404).json({
          message: 'Screener not found',
          details: 'No matching screener exists for the given user and name'
        });
      }

      const updateDoc = { $set: { MarketCap: [finalMinPrice, finalMaxPrice] } };
      const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

      if (!result) {
        return res.status(404).json({
          message: 'Screener not found',
          details: 'Unable to update screener'
        });
      }

      res.json({
        message: 'Market Cap range updated successfully',
        updatedScreener: {
          minMarketCap: finalMinPrice,
          maxMarketCap: finalMaxPrice
        }
      });

    } catch (error) {
      // Log the error with sensitive information redacted
      logger.error('Market Cap Update Error', {
        message: error.message,
        stack: error.stack,
        username: obfuscateUsername(req.body.user)
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    }
  }
);

// endpoint that updates screener document with ipo date parameters 
app.patch('/screener/ipo-date',
  validate([
    validationSchemas.user(),
    validationSchemas.screenerNameBody(),
    // Custom validation for dates
    body('minPrice')
      .optional()
      .custom((value) => {
        // If value is provided, ensure it's a valid date
        if (value) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid minimum date');
          }
        }
        return true;
      }),
    body('maxPrice')
      .optional()
      .custom((value) => {
        // If value is provided, ensure it's a valid date
        if (value) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid maximum date');
          }
        }
        return true;
      })
  ]),
  async (req, res) => {
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
      // Sanitize inputs
      const rawMinPrice = sanitizeInput(req.body.minPrice || '');
      const rawMaxPrice = sanitizeInput(req.body.maxPrice || '');
      const Username = sanitizeInput(req.body.user || '');
      const screenerName = sanitizeInput(req.body.screenerName || '');

      // Parse dates
      const minPrice = rawMinPrice ? new Date(rawMinPrice) : new Date('invalid');
      const maxPrice = rawMaxPrice ? new Date(rawMaxPrice) : new Date('invalid');

      // Additional validation
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }

      // Check if both dates are invalid
      if (isNaN(minPrice.getTime()) && isNaN(maxPrice.getTime())) {
        return res.status(400).json({ message: 'At least one of min or max IPO date must be provided' });
      }

      client = new MongoClient(uri);
      await client.connect();
      const db = client.db('EreunaDB');
      const assetInfoCollection = db.collection('AssetInfo');
      const collection = db.collection('Screeners');

      // If minPrice is empty, find the oldest IPO date
      let finalMinPrice = minPrice;
      if (isNaN(finalMinPrice.getTime())) {
        const oldestIpoDoc = await assetInfoCollection.find({
          IPO: { $ne: null, $ne: undefined }
        })
          .sort({ IPO: 1 })
          .limit(1)
          .project({ IPO: 1 })
          .toArray();

        if (oldestIpoDoc.length > 0) {
          finalMinPrice = new Date(oldestIpoDoc[0].IPO);
        } else {
          return res.status(404).json({ message: 'No IPO dates found to determine minimum date' });
        }
      }

      // If maxPrice is empty, set to current date
      let finalMaxPrice = maxPrice;
      if (isNaN(finalMaxPrice.getTime())) {
        finalMaxPrice = new Date(); // Current date
      }

      // Ensure minPrice is less than maxPrice
      if (finalMinPrice >= finalMaxPrice) {
        return res.status(400).json({ message: 'Minimum IPO date cannot be later than or equal to maximum IPO date' });
      }

      // Find and update the screener
      const filter = {
        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
      };

      const existingScreener = await collection.findOne(filter);
      if (!existingScreener) {
        return res.status(404).json({
          message: 'Screener not found',
          details: 'No matching screener exists for the given user and name'
        });
      }

      const updateDoc = { $set: { IPO: [finalMinPrice, finalMaxPrice] } };
      const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

      if (!result) {
        return res.status(404).json({
          message: 'Screener not found',
          details: 'Unable to update screener'
        });
      }

      res.json({
        message: 'IPO date range updated successfully',
        updatedScreener: {
          minIpoDate: finalMinPrice.toISOString(),
          maxIpoDate: finalMaxPrice.toISOString()
        }
      });

    } catch (error) {
      // Log the error with sensitive information redacted
      logger.error('IPO Date Update Error', {
        message: error.message,
        stack: error.stack,
        username: obfuscateUsername(req.body.user)
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    }
  }
);

// endpoint that handles adding symbol to hidden list for user 
app.patch('/screener/:user/hidden/:symbol',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.symbolParam('symbol')
  ]),
  async (req, res) => {
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
      // Sanitize inputs
      const symbol = sanitizeInput(req.params.symbol).toUpperCase();
      const Username = sanitizeInput(req.params.user);

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const usersCollection = db.collection('Users');
      const assetInfoCollection = db.collection('AssetInfo');

      // Verify symbol exists in AssetInfo collection
      const assetExists = await assetInfoCollection.findOne({ Symbol: symbol });
      if (!assetExists) {
        return res.status(404).json({
          message: 'Symbol not found',
          symbol: symbol
        });
      }

      // Find the user
      const userDoc = await usersCollection.findOne({ Username: Username });
      if (!userDoc) {
        return res.status(404).json({
          message: 'User not found',
          username: obfuscateUsername(Username)
        });
      }

      // Check if symbol is already in hidden list
      if (userDoc.Hidden && userDoc.Hidden.includes(symbol)) {
        return res.status(409).json({
          message: 'Symbol already in hidden list',
          symbol: symbol
        });
      }

      // Update hidden list
      const filter = { Username: Username };
      const updateDoc = { $addToSet: { Hidden: symbol } };
      const result = await usersCollection.updateOne(filter, updateDoc);

      res.json({
        message: 'Hidden List updated successfully',
        symbol: symbol
      });

    } catch (error) {
      // Log the error with sensitive information redacted
      logger.error('Hidden List Update Error', {
        message: error.message,
        stack: error.stack,
        username: obfuscateUsername(req.params.user),
        symbol: req.params.symbol
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    }
  }
);

// endpoint that fetches hidden list for user 
app.get('/screener/results/:user/hidden',
  validate([
    validationSchemas.userParam('user')
  ]),
  async (req, res) => {
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

      // Find user document with only Hidden field
      const userDoc = await collection.findOne({ Username: username }, {
        projection: {
          Hidden: 1,
          _id: 0
        }
      });

      // Check if user exists
      if (!userDoc) {
        logger.warn('Hidden List Fetch - User Not Found', {
          username: obfuscateUsername(username)
        });
        return res.status(404).json({
          message: 'User not found',
          username: obfuscateUsername(username)
        });
      }

      // Check if Hidden list exists and is not empty
      if (!userDoc.Hidden || userDoc.Hidden.length === 0) {
        return res.json([]);
      }
      // Send hidden list
      res.json(userDoc.Hidden);

    } catch (error) {
      // Log the error with sensitive information redacted
      logger.error('Hidden List Retrieval Error', {
        message: error.message,
        stack: error.stack,
        username: obfuscateUsername(req.params.user)
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    }
  }
);

// endpoint that retrieves all screeners' names for user 
app.get('/screener/:user/names',
  validate([
    validationSchemas.userParam('user')
  ]),
  async (req, res) => {
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
      // Sanitize username input
      const username = sanitizeInput(req.params.user);

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');

      // Find screeners for the user with specific projection
      const userDocs = await collection.find({ UsernameID: username }, {
        projection: {
          Name: 1,
          Include: 1,
          _id: 0
        }
      }).toArray();

      // Check if any screeners were found
      if (userDocs.length > 0) {
        // Send the array of objects with Name and Include properties
        res.status(200).json(userDocs);
      } else {
        // Log when no screeners are found
        logger.warn('No Screeners Found', {
          username: obfuscateUsername(username)
        });

        res.status(404).json({
          message: 'No screeners found for the user',
          username: obfuscateUsername(username)
        });
      }
    } catch (error) {
      // Log any unexpected errors
      logger.error('Screener Names Retrieval Error', {
        message: error.message,
        stack: error.stack,
        username: obfuscateUsername(req.params.user)
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    } finally {
      // Ensure client is closed
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    }
  }
);

// endpoint that sends hidden list of user in results 
app.get('/:user/screener/results/hidden',
  validate([
    validationSchemas.userParam('user')
  ]),
  async (req, res) => {
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
      const user = sanitizeInput(req.params.user);

      client = new MongoClient(uri);
      await client.connect();
      const db = client.db('EreunaDB');

      // Find the user document and extract the 'Hidden' array
      const usersCollection = db.collection('Users');
      const userDoc = await usersCollection.findOne({ Username: user });

      if (!userDoc) {
        logger.warn('Hidden Results - User Not Found', {
          username: obfuscateUsername(user)
        });
        return res.status(404).json({
          message: 'User not found',
          username: obfuscateUsername(user)
        });
      }

      // Check if hidden symbols exist
      const hiddenSymbols = userDoc.Hidden || [];
      if (hiddenSymbols.length === 0) {
        return res.json([]);
      }

      // Filter the AssetInfo collection to only include symbols in the 'Hidden' array
      const assetInfoCollection = db.collection('AssetInfo');
      const filteredAssets = await assetInfoCollection.find({
        Symbol: { $in: hiddenSymbols }
      }, {
        projection: {
          Symbol: 1,
          Name: 1,
          ISIN: 1,
          MarketCapitalization: 1,
          Close: { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] },
          PERatio: 1,
          PEGRatio: 1,
          PriceToSalesRatioTTM: 1,
          DividendYield: 1,
          EPS: 1,
          Sector: 1,
          Industry: 1,
          Exchange: 1,
          Country: 1,
          RSScore1W: 1,
          RSScore1M: 1,
          RSScore4M: 1,
          ADV1W: 1,
          ADV1M: 1,
          ADV4M: 1,
          ADV1Y: 1,
          todaychange: 1,
          ytdchange: 1,
          _id: 0
        }
      }).toArray();

      res.json(filteredAssets);

    } catch (error) {
      // Log the error with sensitive information redacted
      logger.error('Hidden Results Retrieval Error', {
        message: error.message,
        stack: error.stack,
        username: obfuscateUsername(req.params.user)
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    }
  }
);

// endpoint that removes ticker from hidden list 
app.patch('/screener/:user/show/:symbol',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.symbolParam('symbol')
  ]),
  async (req, res) => {
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
      // Sanitize inputs
      const username = sanitizeInput(req.params.user);
      const symbol = sanitizeInput(req.params.symbol);

      // Validate symbol
      if (!symbol) {
        logger.warn('Show Symbol - Missing Symbol', {
          username: obfuscateUsername(username)
        });
        return res.status(400).json({
          message: 'Please provide a valid symbol',
          username: obfuscateUsername(username)
        });
      }

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Users');

      // Find user to ensure they exist and the symbol is in their hidden list
      const userDoc = await collection.findOne({
        Username: username,
        Hidden: { $in: [symbol] }
      });

      if (!userDoc) {
        logger.warn('Show Symbol - User Not Found or Symbol Not Hidden', {
          username: obfuscateUsername(username),
          symbol: symbol
        });
        return res.status(404).json({
          message: 'User not found or symbol not in hidden list',
          username: obfuscateUsername(username),
          symbol: symbol
        });
      }

      // Remove symbol from hidden list
      const filter = { Username: username };
      const updateDoc = { $pull: { Hidden: symbol } };
      const result = await collection.updateOne(filter, updateDoc);

      // Check if update was successful
      if (result.modifiedCount === 0) {
        return res.status(500).json({
          message: 'Failed to update hidden list',
          username: obfuscateUsername(username),
          symbol: symbol
        });
      }

      res.status(200).json({
        message: 'Hidden List updated successfully',
        username: obfuscateUsername(username),
        symbol: symbol
      });

    } catch (error) {
      // Log the error with sensitive information redacted
      logger.error('Remove Hidden Symbol Error', {
        message: error.message,
        stack: error.stack,
        username: obfuscateUsername(req.params.user),
        symbol: sanitizeInput(req.params.symbol)
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn('Error closing database connection', {
            error: closeError.message
          });
        }
      }
    }
  }
);

// endpoint that retrieves all available sectors for user (for screener)
app.get('/screener/sectors',
  async (req, res) => {
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
      const assetInfoCollection = db.collection('AssetInfo');

      // Retrieve distinct sectors
      const sectors = await assetInfoCollection.distinct('Sector');

      // Basic type and null/undefined filtering
      const uniqueSectors = sectors
        .filter(sector =>
          typeof sector === 'string' &&
          sector.trim() !== '' &&
          sector !== null &&
          sector !== undefined
        )
        .slice(0, 50); // Optional: limit to 50 sectors to prevent potential DoS

      res.status(200).json(uniqueSectors);

    } catch (error) {
      logger.error({ error }, 'Error retrieving sectors');
      res.status(500).json({
        message: 'Internal Server Error'
      });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn({ closeError }, 'Error closing database connection');
        }
      }
    }
  });

// endpoint that updates screener document with sector params 
app.patch('/screener/sectors',
  validate([
    validationSchemas.user(),
    validationSchemas.screenerNameBody(),
    body('sectors')
      .isArray().withMessage('Sectors must be an array')
      .custom((value) => {
        // Ensure each sector is a non-empty string that can include & character
        if (!value.every(sector =>
          typeof sector === 'string' &&
          sector.trim().length > 0 &&
          sector.trim().length <= 50 &&
          /^[a-zA-Z0-9&\s_-]+$/.test(sector) // Allowing letters, numbers, &, spaces, underscores, and hyphens
        )) {
          throw new Error('Each sector must be a non-empty string with max 50 characters and can include &');
        }
        return true;
      })
  ]),
  async (req, res) => {
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
      const sectors = req.body.sectors;
      const Username = req.body.user;
      const screenerName = req.body.screenerName;

      // Sanitize sectors (trim and remove duplicates)
      const sanitizedSectors = [...new Set(
        sectors.map(sector => {
          // Use sanitizeInput but ensure we don't escape & characters
          return sanitizeInput(sector).replace(/&amp;/g, '&'); // Replace &amp; back to &
        })
      )];

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');

      const filter = {
        UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
        Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
      };

      const updateDoc = { $set: { Sectors: sanitizedSectors } };
      const options = { returnOriginal: false };

      const result = await collection.findOneAndUpdate(filter, updateDoc, options);

      if (!result.value) {
        logger.warn('Screener not found', {
          username: obfuscateUsername(Username),
          screenerName
        });
        return res.status(404).json({ message: 'Screener not found' });
      }
      res.json({
        message: 'Sectors updated successfully',
        sectors: sanitizedSectors
      });

    } catch (error) {
      logger.error({
        error,
        username: obfuscateUsername(req.body.user)
      }, 'Error updating screener sectors');

      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn({ closeError }, 'Error closing database connection');
        }
      }
    }
  }
);

// endpoint that retrieves all available exchanges for user (screener)
app.get('/screener/exchange',
  async (req, res) => {
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
      const assetInfoCollection = db.collection('AssetInfo');

      // Retrieve distinct exchanges
      const exchanges = await assetInfoCollection.distinct('Exchange');

      // Basic type and null/undefined filtering 
      const uniqueExchanges = exchanges
        .filter(exchange =>
          typeof exchange === 'string' &&
          exchange.trim() !== '' &&
          exchange !== null &&
          exchange !== undefined
        )
        .slice(0, 10); // Optional: limit to 10 exchanges to prevent potential DoS 

      res.status(200).json(uniqueExchanges);

    } catch (error) {
      // Log the error with more detailed information
      logger.error({ error }, 'Error retrieving exchanges');

      res.status(500).json({
        message: 'Internal Server Error'
      });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn({ closeError }, 'Error closing database connection');
        }
      }
    }
  });

// endpoint that updates screener document with exchange params 
app.patch('/screener/exchange',
  validate([
    validationSchemas.user(),
    validationSchemas.screenerNameBody(),
    body('exchanges')
      .isArray().withMessage('Exchanges must be an array')
      .custom((value) => {
        if (!value.every(exchange =>
          typeof exchange === 'string' &&
          exchange.trim().length > 0 &&
          exchange.trim().length <= 10
        )) {
          throw new Error('Each exchange must be a non-empty string with max 10 characters');
        }
        return true;
      })
  ]),
  async (req, res) => {
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
      const exchanges = req.body.exchanges;
      const Username = req.body.user;
      const screenerName = req.body.screenerName;

      const sanitizedExchanges = [...new Set(
        exchanges.map(exchange => sanitizeInput(exchange))
      )];

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');

      // Comprehensive debugging of user's screeners
      const allUserScreeners = await collection.find({
        UsernameID: Username
      }).toArray();

      logger.debug('All User Screeners', {
        count: allUserScreeners.length,
        screenerNames: allUserScreeners.map(s => s.Name)
      });

      const filter = {
        UsernameID: Username,
        Name: screenerName
      };

      logger.debug('Update Filter', filter);

      // Use updateOne with comprehensive logging
      const updateResult = await collection.updateOne(filter, {
        $set: { Exchanges: sanitizedExchanges }
      });

      logger.debug('Update Operation Result', {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
      });

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({
          message: 'Screener not found',
          details: {
            username: obfuscateUsername(Username),
            screenerName,
            availableScreeners: allUserScreeners.map(s => s.Name)
          }
        });
      }

      res.json({
        message: 'Exchanges updated successfully',
        exchanges: sanitizedExchanges
      });

    } catch (error) {
      logger.error({
        error,
        username: obfuscateUsername(req.body.user)
      }, 'Error updating screener exchanges');

      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn({ closeError }, 'Error closing database connection');
        }
      }
    }
  }
);

// endpoint that retrieves all available countries for user (screener)
app.get('/screener/country',
  async (req, res) => {
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
      const assetInfoCollection = db.collection('AssetInfo');

      // Use the `distinct` method to get an array of unique Country values
      const Country = await assetInfoCollection.distinct('Country');

      // Remove any null or undefined values from the array
      const uniqueCountry = Country.filter(country => country !== null && country !== undefined);

      res.json(uniqueCountry);

    } catch (error) {
      logger.error({
        error,
        endpoint: req.path
      }, 'Error retrieving  countries');

      res.status(500).json({ message: 'Internal Server Error' });

    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn({ closeError }, 'Error closing database connection');
        }
      }
    }
  }
);

// endpoint that updates screener document with country params 
app.patch('/screener/country',
  validate([
    validationSchemas.user(),
    validationSchemas.screenerNameBody(),
    body('countries')
      .isArray().withMessage('Countries must be an array')
      .custom((value) => {
        if (!value.every(country =>
          typeof country === 'string' &&
          country.trim().length > 0 &&
          country.trim().length <= 50
        )) {
          throw new Error('Each country must be a non-empty string with max 50 characters');
        }
        return true;
      })
  ]),
  async (req, res) => {
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
      const countries = req.body.countries;
      const Username = req.body.user;
      const screenerName = req.body.screenerName;

      const sanitizedCountries = [...new Set(
        countries.map(country => sanitizeInput(country))
      )];

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');

      // Comprehensive debugging of user's screeners
      const allUserScreeners = await collection.find({
        UsernameID: Username
      }).toArray();

      logger.debug('All User Screeners', {
        count: allUserScreeners.length,
        screenerNames: allUserScreeners.map(s => s.Name)
      });

      const filter = {
        UsernameID: Username,
        Name: screenerName
      };

      logger.debug('Update Filter', filter);

      // Use updateOne with comprehensive logging
      const updateResult = await collection.updateOne(filter, {
        $set: { Countries: sanitizedCountries }
      });

      logger.debug('Update Operation Result', {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
      });

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({
          message: 'Screener not found',
          details: {
            username: obfuscateUsername(Username),
            screenerName,
            availableScreeners: allUserScreeners.map(s => s.Name)
          }
        });
      }

      res.json({
        message: 'Countries updated successfully',
        countries: sanitizedCountries
      });

    } catch (error) {
      logger.error({
        error,
        username: obfuscateUsername(req.body.user)
      }, 'Error updating screener countries');

      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn({ closeError }, 'Error closing database connection');
        }
      }
    }
  }
);

// endpoint that updates screener document with PE parameters 
app.patch('/screener/pe', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize inputs
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min PE and max PE cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        if (isNaN(minPrice)) {
          minPrice = 1; // Minimum PE ratio typically starts at 1
        }

        if (isNaN(maxPrice)) {
          const highestPERatioDoc = await assetInfoCollection.find({
            PERatio: { $ne: 'None', $ne: null, $ne: undefined },
            PERatio: { $gt: 0 } // Ensure positive PE ratio
          })
            .sort({ PERatio: -1 })
            .limit(1)
            .project({ PERatio: 1 })
            .toArray();

          if (highestPERatioDoc.length > 0) {
            maxPrice = highestPERatioDoc[0].PERatio;
            // Optional: Round to 2 decimal places if needed
            maxPrice = Math.ceil(maxPrice * 100) / 100;
          } else {
            return res.status(404).json({
              message: 'No assets found to determine maximum PE ratio',
              details: 'Unable to find a valid PE ratio in the database'
            });
          }
        }

        if (minPrice >= maxPrice) {
          return res.status(400).json({ message: 'Min PE cannot be higher than or equal to max PE' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { PE: [minPrice, maxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        res.json({
          message: 'PE range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('PE Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

// endpoint that updates screener document with Forward PE parameters 
app.patch('/screener/forward-pe', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize inputs
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min Forward PE and max Forward PE cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minPrice to 1 if it is not provided or is less than 1
        if (isNaN(minPrice) || minPrice < 1) {
          minPrice = 1; // Minimum Forward PE typically starts at 1
        }

        // If maxPrice is empty, find the highest Forward PE
        if (isNaN(maxPrice)) {
          const highestForwardPEDoc = await assetInfoCollection.find({
            ForwardPE: { $gte: 0 } // Filter to exclude negative ForwardPE
          })
            .sort({ ForwardPE: -1 }) // Sort by ForwardPE descending
            .limit(1) // Get the highest value
            .project({ ForwardPE: 1 }) // Only return the ForwardPE field
            .toArray();

          if (highestForwardPEDoc.length > 0) {
            maxPrice = highestForwardPEDoc[0].ForwardPE; // Set maxPrice to the highest ForwardPE
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Forward PE' });
          }
        }

        // Ensure minPrice is less than maxPrice
        if (minPrice >= maxPrice) {
          return res.status(400).json({ message: 'Min Forward PE cannot be higher than or equal to max Forward PE' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { ForwardPE: [minPrice, maxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Forward PE range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Forward PE Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

// endpoint that updates screener document with PEG parameters 
app.patch('/screener/peg', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize inputs
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min PEG and max PEG cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minPrice to 1 if it is not provided
        if (isNaN(minPrice) && !isNaN(maxPrice)) {
          minPrice = 1; // Minimum PEG typically starts at 1
        }

        // If maxPrice is empty, find the highest PEGRatio excluding 'None'
        if (isNaN(maxPrice) && !isNaN(minPrice)) {
          const highestPERDoc = await assetInfoCollection.find({ PEGRatio: { $ne: 'None' } }) // Exclude 'None'
            .sort({ PEGRatio: -1 }) // Sort by PEGRatio descending
            .limit(1) // Get the highest value
            .project({ PEGRatio: 1 }) // Only return the PEGRatio field
            .toArray();

          if (highestPERDoc.length > 0) {
            maxPrice = highestPERDoc[0].PEGRatio; // Set maxPrice to the highest PEGRatio
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum PEG' });
          }
        }

        // Ensure minPrice is less than maxPrice
        if (minPrice >= maxPrice) {
          return res.status(400).json({ message: 'Min PEG cannot be higher than or equal to max PEG' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { PEG: [minPrice, maxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'PEG range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('PEG Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

// endpoint that updates screener document with PEG parameters 
app.patch('/screener/eps', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize inputs
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min EPS and max EPS cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minPrice to 1 if it is not provided
        if (isNaN(minPrice) && !isNaN(maxPrice)) {
          minPrice = 1; // Minimum EPS typically starts at 1
        }

        // If maxPrice is empty, find the highest EPS excluding 'None'
        if (isNaN(maxPrice) && !isNaN(minPrice)) {
          const highestEPSDoc = await assetInfoCollection.find({
            EPS: {
              $ne: 'None',
              $type: 'number' // Ensure it's a numeric value
            }
          })
            .sort({ EPS: -1 }) // Sort by EPS descending
            .limit(1) // Get the highest value
            .project({ EPS: 1 }) // Only return the EPS field
            .toArray();

          if (highestEPSDoc.length > 0) {
            maxPrice = highestEPSDoc[0].EPS; // Set maxPrice to the highest EPS
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum EPS' });
          }
        }

        // Ensure minPrice is less than maxPrice
        if (minPrice >= maxPrice) {
          return res.status(400).json({ message: 'Min EPS cannot be higher than or equal to max EPS' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { EPS: [minPrice, maxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'EPS range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('EPS Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

// endpoint that updates screener document with PS Ratio parameters 
app.patch('/screener/ps-ratio', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize inputs
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min PS Ratio and max PS Ratio cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minPrice to 1 if it is not provided
        if (isNaN(minPrice) && !isNaN(maxPrice)) {
          minPrice = 1; // Minimum PS Ratio typically starts at 1
        }

        // If maxPrice is empty, find the highest PriceToSalesRatioTTM excluding 'None' and '-'
        if (isNaN(maxPrice) && !isNaN(minPrice)) {
          const highestPSRatioDoc = await assetInfoCollection.find({
            PriceToSalesRatioTTM: {
              $ne: 'None',
              $ne: '-',
              $type: 'number' // Ensure it's a numeric value
            }
          })
            .sort({ PriceToSalesRatioTTM: -1 }) // Sort by PriceToSalesRatioTTM descending
            .limit(1) // Get the highest value
            .project({ PriceToSalesRatioTTM: 1 }) // Only return the PriceToSalesRatioTTM field
            .toArray();

          if (highestPSRatioDoc.length > 0) {
            maxPrice = highestPSRatioDoc[0].PriceToSalesRatioTTM; // Set maxPrice to the highest PriceToSalesRatioTTM
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum PS Ratio' });
          }
        }

        // Ensure minPrice is less than maxPrice
        if (minPrice >= maxPrice) {
          return res.status(400).json({ message: 'Min PS Ratio cannot be higher than or equal to max PS Ratio' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { PS: [minPrice, maxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Price to Sales Ratio range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('PS Ratio Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

// endpoint that updates screener document with PB Ratio parameters 
app.patch('/screener/pb-ratio', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize inputs
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min PB Ratio and max PB Ratio cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minPrice to 1 if it is not provided
        if (isNaN(minPrice) && !isNaN(maxPrice)) {
          minPrice = 1; // Minimum PB Ratio typically starts at 1
        }

        // If maxPrice is empty, find the highest PriceToBookRatio excluding 'None' and '-'
        if (isNaN(maxPrice) && !isNaN(minPrice)) {
          const highestPBRatioDoc = await assetInfoCollection.find({
            PriceToBookRatio: {
              $ne: 'None',
              $ne: '-',
              $type: 'number' // Ensure it's a numeric value
            }
          })
            .sort({ PriceToBookRatio: -1 }) // Sort by PriceToBookRatio descending
            .limit(1) // Get the highest value
            .project({ PriceToBookRatio: 1 }) // Only return the PriceToBookRatio field
            .toArray();

          if (highestPBRatioDoc.length > 0) {
            maxPrice = highestPBRatioDoc[0].PriceToBookRatio; // Set maxPrice to the highest PriceToBookRatio
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum PB Ratio' });
          }
        }

        // Ensure minPrice is less than maxPrice
        if (minPrice >= maxPrice) {
          return res.status(400).json({ message: 'Min PB Ratio cannot be higher than or equal to max PB Ratio' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { PB: [minPrice, maxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Price to Book Ratio range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('PB Ratio Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

// endpoint that updates screener document with Beta parameters 
app.patch('/screener/beta', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize inputs
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min Beta and max Beta cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // If minPrice is empty, find the lowest Beta excluding 'None' and '-'
        if (isNaN(minPrice) && !isNaN(maxPrice)) {
          const lowestBetaDoc = await assetInfoCollection.find({
            Beta: {
              $ne: 'None',
              $ne: '-',
              $type: 'number' // Ensure it's a numeric value
            }
          })
            .sort({ Beta: 1 }) // Sort by Beta ascending
            .limit(1) // Get the lowest value
            .project({ Beta: 1 }) // Only return the Beta field
            .toArray();

          if (lowestBetaDoc.length > 0) {
            minPrice = lowestBetaDoc[0].Beta; // Set minPrice to the lowest Beta
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Beta' });
          }
        }

        // If maxPrice is empty, find the highest Beta excluding 'None' and '-'
        if (isNaN(maxPrice) && !isNaN(minPrice)) {
          const highestBetaDoc = await assetInfoCollection.find({
            Beta: {
              $ne: 'None',
              $ne: '-',
              $type: 'number' // Ensure it's a numeric value
            }
          })
            .sort({ Beta: -1 }) // Sort by Beta descending
            .limit(1) // Get the highest value
            .project({ Beta: 1 }) // Only return the Beta field
            .toArray();

          if (highestBetaDoc.length > 0) {
            maxPrice = highestBetaDoc[0].Beta; // Set maxPrice to the highest Beta
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Beta' });
          }
        }

        // Ensure minPrice is less than maxPrice
        if (minPrice >= maxPrice) {
          return res.status(400).json({ message: 'Min Beta cannot be higher than or equal to max Beta' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { Beta: [minPrice, maxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Beta range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Beta Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

// endpoint that updates screener document with dividend yield parameters 
app.patch('/screener/div-yield', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize and convert inputs (dividing by 100 to convert percentage)
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) / 100 : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) / 100 : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min and max Dividend Yield cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set a minimum dividend yield of 0.1% (0.001) if not provided
        let effectiveMinPrice = isNaN(minPrice) ? 0.001 : minPrice;

        // If maxPrice is empty, find the highest DividendYield
        let effectiveMaxPrice = maxPrice;
        if (isNaN(maxPrice)) {
          const highestDividendYieldDoc = await assetInfoCollection.find({
            DividendYield: {
              $ne: 'None',
              $ne: '-',
              $exists: true,
              $type: 'number' // Ensure it's a numeric value
            }
          })
            .sort({ DividendYield: -1 }) // Sort by DividendYield descending
            .limit(1) // Get the highest value
            .project({ DividendYield: 1 }) // Only return the DividendYield field
            .toArray();

          if (highestDividendYieldDoc.length > 0) {
            effectiveMaxPrice = highestDividendYieldDoc[0].DividendYield; // Set maxPrice to the highest DividendYield
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Dividend Yield' });
          }
        }

        // Validate the effective min and max prices
        if (effectiveMinPrice >= effectiveMaxPrice) {
          return res.status(400).json({
            message: 'Minimum Dividend Yield cannot be higher than or equal to maximum Dividend Yield',
            details: {
              minDividendYield: effectiveMinPrice,
              maxDividendYield: effectiveMaxPrice
            }
          });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { DivYield: [effectiveMinPrice, effectiveMaxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Dividend Yield range updated successfully',
          updatedScreener: result.value,
          details: {
            minDividendYield: effectiveMinPrice * 100 + '%',
            maxDividendYield: effectiveMaxPrice * 100 + '%'
          }
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Dividend Yield Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

//endpoint is supposed to update document with growth % 
app.patch('/screener/fundamental-growth', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
]), async (req, res) => {
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
    // Sanitize inputs
    const screenerName = sanitizeInput(req.body.screenerName || '');
    const Username = sanitizeInput(req.body.user || '');

    // Validate inputs
    if (!screenerName) {
      return res.status(400).json({ message: 'Screener name is required' });
    }
    if (!Username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Screeners');
    const assetInfoCollection = db.collection('AssetInfo');

    const updateDoc = { $set: {} };

    const pairs = [
      { min: req.body.minRevYoY, max: req.body.maxRevYoY, attribute: 'RevYoY' },
      { min: req.body.minRevQoQ, max: req.body.maxRevQoQ, attribute: 'RevQoQ' },
      { min: req.body.minEarningsYoY, max: req.body.maxEarningsYoY, attribute: 'EarningsYoY' },
      { min: req.body.minEarningsQoQ, max: req.body.maxEarningsQoQ, attribute: 'EarningsQoQ' },
      { min: req.body.minEPSYoY, max: req.body.maxEPSYoY, attribute: 'EPSYoY' },
      { min: req.body.minEPSQoQ, max: req.body.maxEPSQoQ, attribute: 'EPSQoQ' }
    ];

    for (const pair of pairs) {
      const { min, max, attribute } = pair;

      // Skip if both values are empty
      if (min === null && max === null) {
        continue;
      }

      // Sanitize and parse min and max values
      const sanitizedMin = min !== null ? parseFloat(sanitizeInput(min.toString())) : null;
      const sanitizedMax = max !== null ? parseFloat(sanitizeInput(max.toString())) : null;

      // If min value is empty and max value is filled
      if (sanitizedMin === null && sanitizedMax !== null) {
        const lowestDoc = await assetInfoCollection.find({
          [attribute]: {
            $ne: 'None',
            $ne: '-',
            $type: 'number'
          }
        })
          .sort({ [attribute]: 1 })
          .limit(1)
          .project({ [attribute]: 1 })
          .toArray();

        if (lowestDoc.length > 0) {
          updateDoc.$set[attribute] = [lowestDoc[0][attribute], sanitizedMax / 100];
        } else {
          return res.status(404).json({
            message: `No assets found to determine minimum ${attribute}`,
            details: `Unable to find valid ${attribute} values`
          });
        }
      }

      // If max value is empty and min value is filled
      if (sanitizedMax === null && sanitizedMin !== null) {
        const highestDoc = await assetInfoCollection.find({
          [attribute]: {
            $ne: 'None',
            $ne: '-',
            $type: 'number'
          }
        })
          .sort({ [attribute]: -1 })
          .limit(1)
          .project({ [attribute]: 1 })
          .toArray();

        if (highestDoc.length > 0) {
          updateDoc.$set[attribute] = [sanitizedMin / 100, highestDoc[0][attribute]];
        } else {
          return res.status(404).json({
            message: `No assets found to determine maximum ${attribute}`,
            details: `Unable to find valid ${attribute} values`
          });
        }
      }

      // If both values are provided
      if (sanitizedMin !== null && sanitizedMax !== null) {
        // Validate min is less than max
        if (sanitizedMin / 100 >= sanitizedMax / 100) {
          return res.status(400).json({
            message: `Invalid ${attribute} range`,
            details: `Minimum ${attribute} must be less than maximum ${attribute}`
          });
        }

        updateDoc.$set[attribute] = [sanitizedMin / 100, sanitizedMax / 100];
      }
    }

    // Prepare filter with case-insensitive matching
    const filter = {
      UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
      Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
    };

    // Verify screener exists before updating
    const existingScreener = await collection.findOne(filter);
    if (!existingScreener) {
      return res.status(404).json({
        message: 'Screener not found',
        details: 'No matching screener exists for the given user and name'
      });
    }

    // Perform update
    const result = await collection.findOneAndUpdate(
      filter,
      updateDoc,
      { returnOriginal: false }
    );

    if (!result) {
      return res.status(404).json({
        message: 'Screener update failed',
        details: 'Unable to update screener document'
      });
    }

    res.json({
      message: 'Fundamental growth parameters updated successfully',
      updatedScreener: result.value,
      updatedAttributes: Object.keys(updateDoc.$set)
    });

  } catch (error) {
    logger.error('Fundamental Growth Update Error', {
      message: error.message,
      stack: error.stack,
      username: Username,
      screenerName: screenerName
    });

    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        logger.warn('Error closing database connection', {
          error: closeError.message
        });
      }
    }
  }
});

// endpoint that updates screener document with volume parameters 
app.patch('/screener/volume', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.relativeVolumeOption(),
  validationSchemas.averageVolumeOption(), ,
  ...validationSchemas.volumeValues()
]), async (req, res) => {
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
    // Sanitize and parse inputs
    const value1 = req.body.value1 ? Math.max(parseFloat(sanitizeInput(req.body.value1.toString())), 0.1) : null;
    const value2 = req.body.value2 ? parseFloat(sanitizeInput(req.body.value2.toString())) : null;
    const value3 = req.body.value3 ? Math.max(parseFloat(sanitizeInput(req.body.value3.toString())), 1) : null;
    const value4 = req.body.value4 ? parseFloat(sanitizeInput(req.body.value4.toString())) : null;
    const relVolOption = sanitizeInput(req.body.relVolOption);
    const avgVolOption = sanitizeInput(req.body.avgVolOption);
    const screenerName = sanitizeInput(req.body.screenerName);
    const Username = sanitizeInput(req.body.user);

    // Obfuscate username for logging
    const obfuscatedUsername = obfuscateUsername(Username);

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const screenersCollection = db.collection('Screeners');
    const assetInfoCollection = db.collection('AssetInfo');

    const filter = { UsernameID: Username, Name: screenerName };
    let updateDoc = {};

    async function getMaxValue(attribute) {
      const result = await assetInfoCollection.aggregate([
        { $group: { _id: null, value: { $max: `$${attribute}` } } }
      ]).toArray();
      return result[0]?.value;
    }

    // Process Relative Volume
    if (relVolOption !== '-') {
      const relVolAttributeName = `RelVolume${relVolOption}`;
      let relVolValues = [value1, value2];

      if (value1 !== null && value2 === null) {
        const maxValue = await getMaxValue(relVolAttributeName);
        relVolValues[1] = maxValue;
      } else if (value1 === null && value2 !== null) {
        relVolValues[0] = 0.1; // Fixed minimum value for RelVolume
      }

      if (relVolValues[0] !== null || relVolValues[1] !== null) {
        updateDoc[relVolAttributeName] = relVolValues;
      }
    }

    // Process Average Volume
    if (avgVolOption !== '-') {
      const avgVolAttributeName = `AvgVolume${avgVolOption}`;
      let avgVolValues = [value3, value4];

      if (value3 !== null && value4 === null) {
        const maxValue = await getMaxValue(avgVolAttributeName);
        avgVolValues[1] = maxValue;
      } else if (value3 === null && value4 !== null) {
        avgVolValues[0] = 1; // Fixed minimum value for AvgVolume
      }

      if (avgVolValues[0] !== null || avgVolValues[1] !== null) {
        updateDoc[avgVolAttributeName] = avgVolValues;
      }
    }

    // Check if there are any updates to apply
    if (Object.keys(updateDoc).length === 0) {
      return res.status(200).json({ message: 'No updates to apply' });
    }

    // Perform the update
    const options = { returnOriginal: false };
    const result = await screenersCollection.findOneAndUpdate(filter, { $set: updateDoc }, options);

    // Check if the screener document was found
    if (!result) {
      logger.warn('Screener not found', {
        user: obfuscatedUsername,
        screenerName: screenerName
      });
      return res.status(404).json({ message: 'Screener not found' });
    }

    res.json({ message: 'Document updated successfully', updatedFields: Object.keys(updateDoc) });

  } catch (error) {
    // Log error with obfuscated username and minimal details
    logger.error('Error updating screener', {
      user: obfuscatedUsername,
      errorType: error.constructor.name,
      errorMessage: error.message
    });

    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      try {
        await client.close(); // Ensure client is closed if it was initialized
      } catch (closeError) {
        logger.warn('Error closing database connection', {
          user: obfuscatedUsername,
          error: closeError.message
        });
      }
    }
  }
});

// endpoint that updates screener document with RS Score parameters 
app.patch('/screener/rs-score', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  // Custom validation for RS Score values
  body('value1')
    .optional({ nullable: true }) // Allow null values
    .custom((value) => {
      // If value is null or empty, return true (valid)
      if (value === null || value === '') return true;

      // Validate float between 1 and 100
      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
    })
    .withMessage('Value1 must be a float between 1 and 100 or null'),

  body('value2')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
    })
    .withMessage('Value2 must be a float between 1 and 100 or null'),

  body('value3')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
    })
    .withMessage('Value3 must be a float between 1 and 100 or null'),

  body('value4')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
    })
    .withMessage('Value4 must be a float between 1 and 100 or null'),

  body('value5')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
    })
    .withMessage('Value5 must be a float between 1 and 100 or null'),

  body('value6')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 100;
    })
    .withMessage('Value6 must be a float between 1 and 100 or null')
]), async (req, res) => {
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
    // Sanitize and parse inputs
    const value1 = req.body.value1 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value1.toString())), 1), 100) : null;
    const value2 = req.body.value2 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value2.toString())), 1), 100) : null;
    const value3 = req.body.value3 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value3.toString())), 1), 100) : null;
    const value4 = req.body.value4 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value4.toString())), 1), 100) : null;
    const value5 = req.body.value5 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value5.toString())), 1), 100) : null;
    const value6 = req.body.value6 ? Math.min(Math.max(parseFloat(sanitizeInput(req.body.value6.toString())), 1), 100) : null;

    const screenerName = sanitizeInput(req.body.screenerName);
    const Username = sanitizeInput(req.body.user);

    // Obfuscate username for logging
    const obfuscatedUsername = obfuscateUsername(Username);

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Screeners');

    const filter = { UsernameID: Username, Name: screenerName };
    const updateDoc = { $set: {} };

    // Define pairs and default values
    const pairs = [
      { key: 'RSScore1M', values: [value1, value2], defaults: [1, 100] },
      { key: 'RSScore4M', values: [value3, value4], defaults: [1, 100] },
      { key: 'RSScore1W', values: [value5, value6], defaults: [1, 100] },
    ];

    // Process pairs
    pairs.forEach((pair) => {
      const values = pair.values;
      const defaults = pair.defaults;

      // Check if at least one value is present
      if (values.some((value) => value !== null)) {
        // Create a new array with default values for missing pairs
        const newArray = values.map((value, index) => value !== null ? value : defaults[index]);

        // Add the new array to the update document
        updateDoc.$set[pair.key] = newArray;
      }
    });

    // Check if any updates are present
    if (Object.keys(updateDoc.$set).length === 0) {
      return res.status(200).json({ message: 'No RS Score values to update' });
    }

    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    // Check if the screener document was found
    if (!result) {
      logger.warn('Screener not found for RS Score update', {
        user: obfuscatedUsername,
        screenerName: screenerName
      });
      return res.status(404).json({ message: 'Screener not found' });
    }

    res.json({
      message: 'RS Score updated successfully',
      updatedFields: Object.keys(updateDoc.$set)
    });

  } catch (error) {
    // Log error with obfuscated username and minimal details
    logger.error('Error updating RS Score', {
      user: obfuscatedUsername,
      errorType: error.constructor.name,
      errorMessage: error.message
    });

    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      try {
        await client.close(); // Ensure client is closed if it was initialized
      } catch (closeError) {
        logger.warn('Error closing database connection', {
          user: obfuscatedUsername,
          error: closeError.message
        });
      }
    }
  }
});

// endpoint that updates screener document with Average Daily Volatility (ADV) parameters 
app.patch('/screener/adv', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  // Custom validation for ADV values
  body('value1')
    .optional({ nullable: true }) // Allow null values
    .custom((value) => {
      // If value is null or empty, return true (valid)
      if (value === null || value === '') return true;

      // Validate float
      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) || !isNaN(parsedValue);
    })
    .withMessage('Value1 must be a float, NaN, or null'),

  body('value2')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) || !isNaN(parsedValue);
    })
    .withMessage('Value2 must be a float, NaN, or null'),

  body('value3')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) || !isNaN(parsedValue);
    })
    .withMessage('Value3 must be a float, NaN, or null'),

  body('value4')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) || !isNaN(parsedValue);
    })
    .withMessage('Value4 must be a float, NaN, or null'),

  body('value5')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) || !isNaN(parsedValue);
    })
    .withMessage('Value5 must be a float, NaN, or null'),

  body('value6')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) || !isNaN(parsedValue);
    })
    .withMessage('Value6 must be a float, NaN, or null'),

  body('value7')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) || !isNaN(parsedValue);
    })
    .withMessage('Value7 must be a float, NaN, or null'),

  body('value8')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;

      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) || !isNaN(parsedValue);
    })
    .withMessage('Value8 must be a float, NaN, or null')
]), async (req, res) => {
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
    // Sanitize and parse inputs
    const value1 = req.body.value1 ? parseFloat(sanitizeInput(req.body.value1.toString())) : null;
    const value2 = req.body.value2 ? parseFloat(sanitizeInput(req.body.value2.toString())) : null;
    const value3 = req.body.value3 ? parseFloat(sanitizeInput(req.body.value3.toString())) : null;
    const value4 = req.body.value4 ? parseFloat(sanitizeInput(req.body.value4.toString())) : null;
    const value5 = req.body.value5 ? parseFloat(sanitizeInput(req.body.value5.toString())) : null;
    const value6 = req.body.value6 ? parseFloat(sanitizeInput(req.body.value6.toString())) : null;
    const value7 = req.body.value7 ? parseFloat(sanitizeInput(req.body.value7.toString())) : null;
    const value8 = req.body.value8 ? parseFloat(sanitizeInput(req.body.value8.toString())) : null;

    const screenerName = sanitizeInput(req.body.screenerName);
    const Username = sanitizeInput(req.body.user);

    // Obfuscate username for logging
    const obfuscatedUsername = obfuscateUsername(Username);

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const assetInfoCollection = db.collection('AssetInfo');
    const screenersCollection = db.collection('Screeners');

    const maxValues = await assetInfoCollection.aggregate([
      { $group: { _id: null, ADV1M: { $max: '$ADV1M' }, ADV1W: { $max: '$ADV1W' }, ADV1Y: { $max: '$ADV1Y' }, ADV4M: { $max: '$ADV4M' } } }
    ]).toArray();

    const filter = { UsernameID: Username, Name: screenerName };
    const updateDoc = { $set: {} };

    // Define pairs and default values
    const pairs = [
      { key: 'ADV1W', values: [value1, value2], attribute: 'ADV1W' },
      { key: 'ADV1M', values: [value3, value4], attribute: 'ADV1M' },
      { key: 'ADV4M', values: [value5, value6], attribute: 'ADV4M' },
      { key: 'ADV1Y', values: [value7, value8], attribute: 'ADV1Y' },
    ];

    // Process pairs
    pairs.forEach((pair) => {
      const values = pair.values;
      const attribute = pair.attribute;

      // Check if at least one value is present
      if (values.some((value) => value !== null && !isNaN(value))) {
        // Create a new array with default values for missing pairs
        const max = maxValues[0][attribute];

        const newArray = values.map((value, index) => value !== null && !isNaN(value) ? value : (index === 0 ? 0.01 : max));

        // Add the new array to the update document
        updateDoc.$set[pair.key] = newArray;
      }
    });

    // Check if any updates are present
    if (Object.keys(updateDoc.$set).length === 0) {
      return res.status(200).json({ message: 'No ADV values to update' });
    }

    const options = { returnOriginal: false };
    const result = await screenersCollection.findOneAndUpdate(filter, updateDoc, options);

    // Check if the screener document was found
    if (!result) {
      logger.warn('Screener not found for ADV update', {
        user: obfuscatedUsername,
        screenerName: screenerName
      });
      return res.status(404).json({ message: 'Screener not found' });
    }

    res.json({
      message: 'ADV updated successfully',
      updatedFields: Object.keys(updateDoc.$set)
    });

  } catch (error) {
    // Log error with obfuscated username and minimal details
    logger.error('Error updating ADV', {
      user: obfuscatedUsername,
      errorType: error.constructor.name,
      errorMessage: error.message
    });

    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      try {
        await client.close(); // Ensure client is closed if it was initialized
      } catch (closeError) {
        logger.warn('Error closing database connection', {
          user: obfuscatedUsername,
          error: closeError.message
        });
      }
    }
  }
});

// endpoint that updates screener document with price peformance parameters 
app.patch('/screener/price-performance', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),

  // Validation for changePerc values
  body('value1')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;
      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue);
    })
    .withMessage('Value1 must be a valid number or null'),

  body('value2')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;
      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue);
    })
    .withMessage('Value2 must be a valid number or null'),

  body('value3')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '' || value === '-') return true;
      const validOptions = ['1D', '1W', '1M', '4M', '6M', '1Y', 'YTD'];
      return validOptions.includes(value.trim());
    })
    .withMessage('Value3 must be a valid time period or null'),

  // Validation for percentage off week high/low
  body('value4')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;
      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue);
    })
    .withMessage('Value4 must be a valid number or null'),

  body('value5')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;
      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue);
    })
    .withMessage('Value5 must be a valid number or null'),

  body('value6')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;
      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue);
    })
    .withMessage('Value6 must be a valid number or null'),

  body('value7')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;
      const parsedValue = parseFloat(value);
      return !isNaN(parsedValue);
    })
    .withMessage('Value7 must be a valid number or null'),

  // Validation for NewHigh and NewLow
  body('value8')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;
      // Allow specific values or return true
      const allowedValues = ['yes', 'no', 'Yes', 'No'];
      return allowedValues.includes(value.trim());
    })
    .withMessage('Value8 must be "yes" or "no"'),

  body('value9')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;
      // Allow specific values or return true
      const allowedValues = ['yes', 'no', 'Yes', 'No'];
      return allowedValues.includes(value.trim());
    })
    .withMessage('Value9 must be "yes" or "no"'),
]), async (req, res) => {
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
    // Sanitize and parse inputs
    const value1 = req.body.value1 ? parseFloat(sanitizeInput(req.body.value1.toString())) : null;
    const value2 = req.body.value2 ? parseFloat(sanitizeInput(req.body.value2.toString())) : null;
    const value3 = req.body.value3 ? sanitizeInput(req.body.value3.trim()) : null;
    const value4 = req.body.value4 ? parseFloat(sanitizeInput(req.body.value4.toString())) : null;
    const value5 = req.body.value5 ? parseFloat(sanitizeInput(req.body.value5.toString())) : null;
    const value6 = req.body.value6 ? parseFloat(sanitizeInput(req.body.value6.toString())) : null;
    const value7 = req.body.value7 ? parseFloat(sanitizeInput(req.body.value7.toString())) : null;
    const value8 = req.body.value8 ? sanitizeInput(req.body.value8.trim()) : null;
    const value9 = req.body.value9 ? sanitizeInput(req.body.value9.trim()) : null;
    const value10 = req.body.value10 ? sanitizeInput(req.body.value10) : null;
    const value11 = req.body.value11 ? sanitizeInput(req.body.value11) : null;
    const value12 = req.body.value12 ? sanitizeInput(req.body.value12) : null;
    const value13 = req.body.value13 ? sanitizeInput(req.body.value13) : null;

    const screenerName = sanitizeInput(req.body.screenerName);
    const Username = sanitizeInput(req.body.user);

    // Obfuscate username for logging
    const obfuscatedUsername = obfuscateUsername(Username);

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Screeners');
    const assetInfoCollection = db.collection('AssetInfo');

    const filter = { UsernameID: Username, Name: screenerName };
    const updateDoc = { $set: {} };

    // New logic for changePerc
    if (value1 !== null || value2 !== null) {
      updateDoc.$set.changePerc = [];

      if (value1 === null && value2 !== null) {
        updateDoc.$set.changePerc.push(0.01);
        updateDoc.$set.changePerc.push(value2);
      } else if (value1 !== null && value2 === null) {
        updateDoc.$set.changePerc.push(value1);

        let attributeToCheck;
        switch (value3) {
          case '1D': attributeToCheck = 'todaychange'; break;
          case '1W': attributeToCheck = 'weekchange'; break;
          case '1M': attributeToCheck = 'Imchange'; break;
          case '4M': attributeToCheck = '4mchange'; break;
          case '6M': attributeToCheck = '6mchange'; break;
          case '1Y': attributeToCheck = 'lychange'; break;
          case 'YTD': attributeToCheck = 'ytdchange'; break;
          default: attributeToCheck = 'todaychange';
        }

        const maxValue = await assetInfoCollection.aggregate([
          {
            $match: {
              [attributeToCheck]: { $ne: 'N/A', $type: 'number' }
            }
          },
          {
            $group: {
              _id: null,
              value: { $max: { $toDouble: `$${attributeToCheck}` } }
            }
          }
        ]).toArray();

        updateDoc.$set.changePerc.push(maxValue[0]?.value || value1);
      } else if (value1 !== null && value2 !== null) {
        updateDoc.$set.changePerc.push(value1);
        updateDoc.$set.changePerc.push(value2);
      }

      if (value3 !== null && value3 !== '') {
        updateDoc.$set.changePerc.push(value3);
      }
    }

    if (value4 !== null || value5 !== null) {
      updateDoc.$set.PercOffWeekHigh = [];
      if (value4 !== null && value5 === null) {
        updateDoc.$set.PercOffWeekHigh.push(value4);
        const maxValue = await assetInfoCollection.aggregate([
          { $group: { _id: null, value: { $max: '$percoff52WeekHigh' } } }
        ]).toArray();
        updateDoc.$set.PercOffWeekHigh.push(maxValue[0]?.value);
      } else if (value4 === null && value5 !== null) {
        const minValue = await assetInfoCollection.aggregate([
          { $group: { _id: null, value: { $min: '$percoff52WeekHigh' } } }
        ]).toArray();
        updateDoc.$set.PercOffWeekHigh.push(minValue[0]?.value);
        updateDoc.$set.PercOffWeekHigh.push(value5);
      } else {
        updateDoc.$set.PercOffWeekHigh.push(value4);
        updateDoc.$set.PercOffWeekHigh.push(value5);
      }
    }

    // New logic for PercOffWeekLow
    if (value6 !== null || value7 !== null) {
      updateDoc.$set.PercOffWeekLow = [];
      if (value6 !== null && value7 === null) {
        updateDoc.$set.PercOffWeekLow.push(value6);
        const maxValue = await assetInfoCollection.aggregate([
          { $group: { _id: null, value: { $max: '$percoff52WeekLow' } } }
        ]).toArray();
        updateDoc.$set.PercOffWeekLow.push(maxValue[0]?.value);
      } else if (value6 === null && value7 !== null) {
        const minValue = await assetInfoCollection.aggregate([
          { $group: { _id: null, value: { $min: '$percoff52WeekLow' } } }
        ]).toArray();
        updateDoc.$set.PercOffWeekLow.push(minValue[0]?.value);
        updateDoc.$set.PercOffWeekLow.push(value7);
      } else {
        updateDoc.$set.PercOffWeekLow.push(value6);
        updateDoc.$set.PercOffWeekLow.push(value7);
      }
    }

    // Update NewHigh
    if (value8 !== null && value8 !== 'no') {
      updateDoc.$set.NewHigh = value8;
    }

    // Update NewLow
    if (value9 !== null && value9 !== 'no') {
      updateDoc.$set.NewLow = value9;
    }

    // Update Moving Averages
    if (value10 !== null && value10 !== '-') {
      updateDoc.$set.MA200 = value10;
    }

    if (value11 !== null && value11 !== '-') {
      updateDoc.$set.MA50 = value11;
    }

    if (value12 !== null && value12 !== '-') {
      updateDoc.$set.MA20 = value12;
    }

    if (value13 !== null && value13 !== '-') {
      updateDoc.$set.MA10 = value13;
    }

    // Check if there are any updates to apply
    if (Object.keys(updateDoc.$set).length === 0) {
      return res.status(200).json({ message: 'No price performance values to update' });
    }

    // Perform the update
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    // Check if the screener document was found
    if (!result) {
      logger.warn('Screener not found for price performance update', {
        user: obfuscatedUsername,
        screenerName: screenerName
      });
      return res.status(404).json({ message: 'Screener not found' });
    }

    res.json({
      message: 'Price performance updated successfully',
      updatedFields: Object.keys(updateDoc.$set)
    });

  } catch (error) {
    // Log error with obfuscated username and minimal details
    logger.error('Error updating price performance', {
      user: obfuscatedUsername,
      errorType: error.constructor.name,
      errorMessage: error.message
    });

    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      try {
        await client.close(); // Ensure client is closed if it was initialized
      } catch (closeError) {
        logger.warn('Error closing database connection', {
          user: obfuscatedUsername,
          error: closeError.message
        });
      }
    }
  }
});

// i don't think this endpoint is used at the moment...great fucking mess 
app.get('/screener/performance/:ticker', [
  validationSchemas.chartData('ticker')
], validate([validationSchemas.chartData('ticker')]), async (req, res) => {
  const obfuscatedUsername = req.user ? obfuscateUsername(req.user.username) : 'unknown';
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
    const symbol = req.params.ticker.toUpperCase();

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('EreunaDB');
    const assetInfoCollection = db.collection('AssetInfo');

    // Filter by 'Symbol' and retrieve the specified attributes
    const filter = { Symbol: symbol };
    const projection = {
      _id: 0,
      '1mchange': 1,
      '1ychange': 1,
      '4mchange': 1,
      '6mchange': 1,
      'todaychange': 1,
      'weekchange': 1,
      'ytdchange': 1
    };

    const performanceData = await assetInfoCollection.findOne(filter, { projection });

    // Handle case when no data is found
    if (!performanceData) {
      logger.warn('Performance data not found', {
        user: obfuscatedUsername,
        symbol: symbol
      });
      return res.status(404).json({ message: `No performance data found for ${symbol}` });
    }

    res.json(performanceData);

  } catch (error) {
    // Log error with obfuscated username
    logger.error('Error retrieving performance data', {
      user: obfuscatedUsername,
      symbol: symbol,
      errorMessage: error.message,
      errorStack: error.stack
    });

    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        logger.warn('Error closing database connection', {
          user: obfuscatedUsername,
          errorMessage: closeError.message
        });
      }
    }
  }
});

// Full Reset screener parameters 
app.patch('/screener/reset/:user/:name',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.screenerNameParam()
  ]),
  async (req, res) => {
    const obfuscatedUsername = req.user ? obfuscateUsername(req.user.username) : 'unknown';
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
      // Sanitize input parameters
      const UsernameID = sanitizeInput(req.params.user);
      const Name = sanitizeInput(req.params.name); // Sanitize the name parameter

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');

      const filter = { UsernameID: UsernameID, Name: Name };
      logger.debug('Resetting screener parameters', {
        user: obfuscatedUsername,
        screenerName: Name
      });

      const updateDoc = {
        $set: {
          UsernameID: UsernameID,
          Name: Name,
        },
        $unset: {}
      };

      // Find existing fields to unset
      const fields = await collection.findOne(filter, { projection: { _id: 0 } });

      if (!fields) {
        logger.warn('Screener not found during reset', {
          user: obfuscatedUsername,
          screenerName: Name
        });
        return res.status(404).json({ message: 'Screener not found' });
      }

      Object.keys(fields).forEach(field => {
        if (field !== 'UsernameID' && field !== 'Name') {
          updateDoc.$unset[field] = '';
        }
      });

      const options = { returnDocument: 'after' };

      const result = await collection.findOneAndUpdate(filter, updateDoc, options);

      if (result) {
        res.json({ message: 'Screener parameters reset successfully' });
      } else {
        logger.warn('Screener update failed', {
          user: obfuscatedUsername,
          screenerName: Name
        });
        res.status(500).json({ message: 'Failed to reset screener parameters' });
      }
    } catch (error) {
      logger.error('Error resetting screener parameters', {
        user: obfuscatedUsername,
        errorMessage: error.message,
        errorStack: error.stack
      });
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          logger.warn('Error closing database connection', {
            user: obfuscatedUsername,
            errorMessage: closeError.message
          });
        }
      }
    }
  }
);

// Reset Individual screener parameter 
app.patch('/reset/screener/param',
  validate([
    validationSchemas.user(),
    body('Name')
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Screener name must be between 1 and 20 characters')
      .matches(/^[a-zA-Z0-9\s_-]+$/)
      .withMessage('Screener name can only contain letters, numbers, spaces, underscores, and hyphens'), // Validate screener name
    body('stringValue')
      .trim()
      .isIn([
        'price', 'marketCap', 'IPO', 'Sector', 'Exchange', 'Country',
        'PE', 'ForwardPE', 'PEG', 'EPS', 'PS', 'PB', 'Beta',
        'DivYield', 'FundGrowth', 'PricePerformance', 'RSscore', 'Volume', 'ADV', 'ROE', 'ROA', 'CurrentRatio', 'CurrentAssets',
        'CurrentLiabilities', 'CurrentDebt', 'CashEquivalents', 'FCF', 'ProfitMargin', 'GrossMargin',
        'DebtEquity', 'BookValue', 'EV', 'RSI', 'Gap',
      ])
      .withMessage('Invalid parameter to reset')
  ]),
  async (req, res) => {
    // Create a child logger with request-specific context
    const requestLogger = logger.child({
      requestId: crypto.randomBytes(16).toString('hex'),
      user: obfuscateUsername(req.body.user),
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
      // Sanitize inputs
      const UsernameID = sanitizeInput(req.body.user);
      const Name = sanitizeInput(req.body.Name);
      const value = sanitizeInput(req.body.stringValue);

      // Log the reset parameter attempt
      requestLogger.info('Attempting to reset screener parameter', {
        parameter: value,
        username: obfuscateUsername(UsernameID),
        screenerName: Name
      });

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');

      const filter = { UsernameID: UsernameID, Name: Name };

      const updateDoc = {
        $unset: {}
      };

      switch (value) {
        case 'price':
          updateDoc.$unset.Price = '';
          break;
        case 'marketCap':
          updateDoc.$unset.MarketCap = '';
          break;
        case 'IPO':
          updateDoc.$unset.IPO = '';
          break;
        case 'Sector':
          updateDoc.$unset.Sectors = '';
          break;
        case 'Exchange':
          updateDoc.$unset.Exchanges = '';
          break;
        case 'Country':
          updateDoc.$unset.Countries = '';
          break;
        case 'PE':
          updateDoc.$unset.PE = '';
          break;
        case 'ForwardPE':
          updateDoc.$unset.ForwardPE = '';
          break;
        case 'PEG':
          updateDoc.$unset.PEG = '';
          break;
        case 'EPS':
          updateDoc.$unset.EPS = '';
          break;
        case 'PS':
          updateDoc.$unset.PS = '';
          break;
        case 'PB':
          updateDoc.$unset.PB = '';
          break;
        case 'Beta':
          updateDoc.$unset.Beta = '';
          break;
        case 'DivYield':
          updateDoc.$unset.DivYield = '';
          break;
        case 'FundGrowth':
          updateDoc.$unset.EPSQoQ = '';
          updateDoc.$unset.EPSYoY = '';
          updateDoc.$unset.EarningsQoQ = '';
          updateDoc.$unset.EarningsYoY = '';
          updateDoc.$unset.RevQoQ = '';
          updateDoc.$unset.RevYoY = '';
          break;
        case 'PricePerformance':
          updateDoc.$unset.MA10 = '';
          updateDoc.$unset.MA20 = '';
          updateDoc.$unset.MA50 = '';
          updateDoc.$unset.MA200 = '';
          updateDoc.$unset.NewHigh = '';
          updateDoc.$unset.NewLow = '';
          updateDoc.$unset.PercOffWeekHigh = '';
          updateDoc.$unset.PercOffWeekLow = '';
          updateDoc.$unset.changePerc = '';
          break;
        case 'RSscore':
          updateDoc.$unset.RSScore1M = '';
          updateDoc.$unset.RSScore4M = '';
          updateDoc.$unset.RSScore1W = '';
          break;
        case 'Volume':
          updateDoc.$unset.AvgVolume1W = '';
          updateDoc.$unset.RelVolume1W = '';
          updateDoc.$unset.AvgVolume1M = '';
          updateDoc.$unset.RelVolume1M = '';
          updateDoc.$unset.AvgVolume6M = '';
          updateDoc.$unset.RelVolume6M = '';
          updateDoc.$unset.AvgVolume1Y = '';
          updateDoc.$unset.RelVolume1Y = '';
          break;
        case 'ADV':
          updateDoc.$unset.ADV1W = '';
          updateDoc.$unset.ADV1M = '';
          updateDoc.$unset.ADV4M = '';
          updateDoc.$unset.ADV1Y = '';
          break;
        case 'ROE':
          updateDoc.$unset.ROE = '';
          break;
        case 'ROA':
          updateDoc.$unset.ROA = '';
          break;
        case 'CurrentRatio':
          updateDoc.$unset.currentRatio = '';
          break;
        case 'CurrentAssets':
          updateDoc.$unset.assetsCurrent = '';
          break;
        case 'CurrentLiabilities':
          updateDoc.$unset.liabilitiesCurrent = '';
          break;
        case 'CurrentDebt':
          updateDoc.$unset.debtCurrent = '';
          break;
        case 'CashEquivalents':
          updateDoc.$unset.cashAndEq = '';
          break;
        case 'FCF':
          updateDoc.$unset.freeCashFlow = '';
          break;
        case 'ProfitMargin':
          updateDoc.$unset.profitMargin = '';
          break;
        case 'GrossMargin':
          updateDoc.$unset.grossMargin = '';
          break;
        case 'DebtEquity':
          updateDoc.$unset.debtEquity = '';
          break;
        case 'BookValue':
          updateDoc.$unset.bookVal = '';
          break;
        case 'EV':
          updateDoc.$unset.EV = '';
          break;
        case 'RSI':
          updateDoc.$unset.RSI = '';
          break;
        case 'Gap':
          updateDoc.$unset.Gap = '';
          break;
        default:
          // Log unknown value attempt
          requestLogger.warn('Attempted to reset with unknown parameter', {
            parameter: value,
            username: obfuscateUsername(UsernameID),
            screenerName: Name
          });

          return res.status(400).json({
            message: `Unknown reset parameter: ${value}`
          });
      }

      const options = { returnOriginal: false };

      const result = await collection.findOneAndUpdate(filter, updateDoc, options);

      if (result) { // Check if the document was found and updated

        res.json({
          message: 'Parameter reset successfully',
          resetParameter: value
        });
      } else {
        // Log when no document is found
        requestLogger.warn('No screener found for reset', {
          username: obfuscateUsername(UsernameID),
          screenerName: Name
        });

        res.status(404).json({
          message: 'Screener not found',
          details: 'Unable to reset parameter'
        });
      }

    } catch (error) {
      // Log any unexpected errors
      requestLogger.error('Error resetting screener parameter', {
        errorMessage: error.message,
        errorName: error.name,
        username: obfuscateUsername(req.body.user),
        screenerName: sanitizeInput(req.body.Name)
      });

      // Security event logging
      securityLogger.logSecurityEvent('screener_parameter_reset_failed', {
        username: obfuscateUsername(req.body.user),
        errorType: error.constructor.name
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          requestLogger.warn('Error closing database connection', {
            errorMessage: closeError.message
          });
        }
      }
    }
  });

// retrieves params from individual screener document 
app.get('/screener/datavalues/:user/:name',
  validate([
    validationSchemas.userParam('user'),
    validationSchemas.screenerNameParam(),
  ]),
  async (req, res) => {
    const usernameID = req.params.user;
    const name = req.params.name;

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
      const client = new MongoClient(uri);
      try {
        await client.connect();
        const db = client.db('EreunaDB');
        const assetInfoCollection = db.collection('Screeners');

        const query = { UsernameID: usernameID, Name: name };
        const projection = {
          Price: 1, MarketCap: 1, Sectors: 1, Exchanges: 1, Countries: 1, PE: 1,
          ForwardPE: 1, PEG: 1, EPS: 1, PS: 1, PB: 1, Beta: 1, DivYield: 1, EPSQoQ: 1, EPSYoY: 1,
          EarningsQoQ: 1, EarningsYoY: 1, RevQoQ: 1, RevYoY: 1, AvgVolume1W: 1, AvgVolume1M: 1,
          AvgVolume6M: 1, AvgVolume1Y: 1, RelVolume1W: 1, RelVolume1M: 1, RelVolume6M: 1, RelVolume1Y: 1,
          RSScore1W: 1, RSScore1M: 1, RSScore4M: 1, MA10: 1, MA20: 1, MA50: 1, MA200: 1, NewHigh: 1, NewLow: 1, PercOffWeekHigh: 1,
          PercOffWeekLow: 1, changePerc: 1, IPO: 1, ADV1W: 1, ADV1M: 1, ADV4M: 1, ADV1Y: 1, ROE: 1, ROA: 1, currentRatio: 1,
          assetsCurrent: 1, liabilitiesCurrent: 1, debtCurrent: 1, cashAndEq: 1, freeCashFlow: 1, profitMargin: 1, grossMargin: 1,
          debtEquity: 1, bookVal: 1, EV: 1, RSI: 1, Gap: 1,
        };

        const cursor = assetInfoCollection.find(query, { projection: projection });
        const result = await cursor.toArray();

        if (result.length === 0) {
          // Log the not found scenario
          logger.warn('Screener data not found', {
            usernameID: obfuscateUsername(usernameID),
            screenerName: name
          });

          return res.status(404).json({
            message: 'No document found',
            details: 'Screener data could not be retrieved'
          });
        }

        const document = result[0];
        const response = {
          Price: document.Price,
          MarketCap: document.MarketCap,
          Sectors: document.Sectors,
          Exchanges: document.Exchanges,
          Countries: document.Countries,
          PE: document.PE,
          ForwardPE: document.ForwardPE,
          PEG: document.PEG,
          EPS: document.EPS,
          PS: document.PS,
          PB: document.PB,
          Beta: document.Beta,
          DivYield: document.DivYield,
          EPSQoQ: document.EPSQoQ,
          EPSYoY: document.EPSYoY,
          EarningsQoQ: document.EarningsQoQ,
          EarningsYoY: document.EarningsYoY,
          RevQoQ: document.RevQoQ,
          RevYoY: document.RevYoY,
          AvgVolume1W: document.AvgVolume1W,
          AvgVolume1M: document.AvgVolume1M,
          AvgVolume6M: document.AvgVolume6M,
          AvgVolume1Y: document.AvgVolume1Y,
          RelVolume1W: document.RelVolume1W,
          RelVolume1M: document.RelVolume1M,
          RelVolume6M: document.RelVolume6M,
          RelVolume1Y: document.RelVolume1Y,
          RSScore1W: document.RSScore1W,
          RSScore1M: document.RSScore1M,
          RSScore4M: document.RSScore4M,
          ADV1W: document.ADV1W,
          ADV1M: document.ADV1M,
          ADV4M: document.ADV4M,
          ADV1Y: document.ADV1Y,
          todaychange: document.todaychange,
          ytdchange: document.ytdchange,
          MA10: document.MA10,
          MA20: document.MA20,
          MA50: document.MA50,
          MA200: document.MA200,
          NewHigh: document.NewHigh,
          NewLow: document.NewLow,
          PercOffWeekHigh: document.PercOffWeekHigh,
          PercOffWeekLow: document.PercOffWeekLow,
          changePerc: document.changePerc,
          IPO: document.IPO,
          ROE: document.ROE,
          ROA: document.ROA,
          currentRatio: document.currentRatio,
          assetsCurrent: document.assetsCurrent,
          liabilitiesCurrent: document.liabilitiesCurrent,
          debtCurrent: document.debtCurrent,
          cashAndEq: document.cashAndEq,
          freeCashFlow: document.freeCashFlow,
          profitMargin: document.profitMargin,
          grossMargin: document.grossMargin,
          debtEquity: document.debtEquity,
          bookVal: document.bookVal,
          EV: document.EV,
          RSI: document.RSI,
          Gap: document.Gap,
        };

        res.json(response);
      } finally {
        await client.close();
      }
    } catch (err) {
      // Log the error
      logger.error('Error retrieving screener data', {
        errorMessage: err.message,
        usernameID: obfuscateUsername(usernameID),
        screenerName: name
      });

      // Security event logging
      securityLogger.logSecurityEvent('screener_data_retrieval_failed', {
        username: obfuscateUsername(usernameID),
        errorType: err.constructor.name
      });

      res.status(500).json({
        message: 'Error connecting to database',
        details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
      });
    }
  }
);

// endpoint that sends filtered results for screener
app.get('/screener/:user/results/filtered/:name',
  validate([
    param('user')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    param('name')
      .trim()
      .notEmpty().withMessage('Screener name is required')
      .isLength({ min: 1, max: 20 }).withMessage('Screener name must be between 1 and 20 characters')
      .matches(/^[a-zA-Z0-9\s_\-+()]+$/).withMessage('Screener name can only contain letters, numbers, spaces, underscores, hyphens, plus, and parentheses')
  ]),
  async (req, res) => {
    const user = sanitizeInput(req.params.user); // Sanitize user input
    const screenerName = sanitizeInput(req.params.name); // Sanitize screener name input

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
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db('EreunaDB');

      const usersCollection = db.collection('Users');
      const userDoc = await usersCollection.findOne({ Username: user });
      if (!userDoc) {
        logger.warn('User  not found', { user: obfuscateUsername(user) });
        return res.status(404).json({ message: 'User  not found' });
      }

      const hiddenSymbols = userDoc.Hidden;

      const screenersCollection = db.collection('Screeners');
      const screenerData = await screenersCollection.findOne({ UsernameID: user, Name: screenerName });
      if (!screenerData) {
        logger.warn('Screener data not found', { user: obfuscateUsername(user), screenerName: screenerName });
        return res.status(404).json({ message: 'Screener data not found' });
      }

      // Extract filters from screenerData
      const screenerFilters = {};

      if (screenerData.Price && screenerData.Price[0] !== 0 && screenerData.Price[1] !== 0) {
        screenerFilters.Price = screenerData.Price;
      }

      if (screenerData.MarketCap && screenerData.MarketCap[0] !== 0 && screenerData.MarketCap[1] !== 0) {
        screenerFilters.MarketCap = screenerData.MarketCap;
      }

      if (screenerData.Sectors && screenerData.Sectors.length > 0) {
        screenerFilters.sectors = screenerData.Sectors;
      }

      if (screenerData.Exchanges && screenerData.Exchanges.length > 0) {
        screenerFilters.exchanges = screenerData.Exchanges;
      }

      if (screenerData.Countries && screenerData.Countries.length > 0) {
        screenerFilters.countries = screenerData.Countries;
      }

      if (screenerData.NewHigh && screenerData.NewHigh.length > 0) {
        screenerFilters.NewHigh = screenerData.NewHigh;
      }

      if (screenerData.NewLow && screenerData.NewLow.length > 0) {
        screenerFilters.NewLow = screenerData.NewLow;
      }

      if (screenerData.MA200 && screenerData.MA200.length > 0) {
        screenerFilters.MA200 = screenerData.MA200;
      }

      if (screenerData.MA50 && screenerData.MA50.length > 0) {
        screenerFilters.MA50 = screenerData.MA50;
      }

      if (screenerData.MA20 && screenerData.MA20.length > 0) {
        screenerFilters.MA20 = screenerData.MA20;
      }

      if (screenerData.MA10 && screenerData.MA10.length > 0) {
        screenerFilters.MA10 = screenerData.MA10;
      }

      if (screenerData.PE && screenerData.PE[0] !== 0 && screenerData.PE[1] !== 0) {
        screenerFilters.PE = screenerData.PE;
      }

      if (screenerData.ForwardPE && screenerData.ForwardPE[0] !== 0 && screenerData.ForwardPE[1] !== 0) {
        screenerFilters.ForwardPE = screenerData.ForwardPE;
      }

      if (screenerData.PEG && screenerData.PEG[0] !== 0 && screenerData.PEG[1] !== 0) {
        screenerFilters.PEG = screenerData.PEG;
      }

      if (screenerData.EPS && screenerData.EPS[0] !== 0 && screenerData.EPS[1] !== 0) {
        screenerFilters.EPS = screenerData.EPS;
      }

      if (screenerData.PS && screenerData.PS[0] !== 0 && screenerData.PS[1] !== 0) {
        screenerFilters.PS = screenerData.PS;
      }

      if (screenerData.PB && screenerData.PB[0] !== 0 && screenerData.PB[1] !== 0) {
        screenerFilters.PB = screenerData.PB;
      }

      if (screenerData.Beta && screenerData.Beta[0] !== 0 && screenerData.Beta[1] !== 0) {
        screenerFilters.Beta = screenerData.Beta;
      }

      if (screenerData.DivYield && screenerData.DivYield[0] !== 0 && screenerData.DivYield[1] !== 0) {
        screenerFilters.DivYield = screenerData.DivYield;
      }

      if (screenerData.EPSQoQ && screenerData.EPSQoQ[0] !== 0 && screenerData.EPSQoQ[1] !== 0) {
        screenerFilters.EPSQoQ = screenerData.EPSQoQ;
      }

      if (screenerData.EPSYoY && screenerData.EPSYoY[0] !== 0 && screenerData.EPSYoY[1] !== 0) {
        screenerFilters.EPSYoY = screenerData.EPSYoY;
      }

      if (screenerData.EarningsQoQ && screenerData.EarningsQoQ[0] !== 0 && screenerData.EarningsQoQ[1] !== 0) {
        screenerFilters.EarningsQoQ = screenerData.EarningsQoQ;
      }

      if (screenerData.EarningsYoY && screenerData.EarningsYoY[0] !== 0 && screenerData.EarningsYoY[1] !== 0) {
        screenerFilters.EarningsYoY = screenerData.EarningsYoY;
      }

      if (screenerData.RevQoQ && screenerData.RevQoQ[0] !== 0 && screenerData.RevQoQ[1] !== 0) {
        screenerFilters.RevQoQ = screenerData.RevQoQ;
      }

      if (screenerData.RevYoY && screenerData.RevYoY[0] !== 0 && screenerData.RevYoY[1] !== 0) {
        screenerFilters.RevYoY = screenerData.RevYoY;
      }

      if (screenerData.AvgVolume1W && screenerData.AvgVolume1W[0] !== 0 && screenerData.AvgVolume1W[1] !== 0) {
        screenerFilters.AvgVolume1W = screenerData.AvgVolume1W;
      }

      if (screenerData.AvgVolume1M && screenerData.AvgVolume1M[0] !== 0 && screenerData.AvgVolume1M[1] !== 0) {
        screenerFilters.AvgVolume1M = screenerData.AvgVolume1M;
      }

      if (screenerData.AvgVolume6M && screenerData.AvgVolume6M[0] !== 0 && screenerData.AvgVolume6M[1] !== 0) {
        screenerFilters.AvgVolume6M = screenerData.AvgVolume6M;
      }

      if (screenerData.AvgVolume1Y && screenerData.AvgVolume1Y[0] !== 0 && screenerData.AvgVolume1Y[1] !== 0) {
        screenerFilters.AvgVolume1Y = screenerData.AvgVolume1Y;
      }

      if (screenerData.RelVolume1W && screenerData.RelVolume1W[0] !== 0 && screenerData.RelVolume1W[1] !== 0) {
        screenerFilters.RelVolume1W = screenerData.RelVolume1W;
      }

      if (screenerData.RelVolume1M && screenerData.RelVolume1M[0] !== 0 && screenerData.RelVolume1M[1] !== 0) {
        screenerFilters.RelVolume1M = screenerData.RelVolume1M;
      }

      if (screenerData.RelVolume6M && screenerData.RelVolume6M[0] !== 0 && screenerData.RelVolume6M[1] !== 0) {
        screenerFilters.RelVolume6M = screenerData.RelVolume6M;
      }

      if (screenerData.RelVolume1Y && screenerData.RelVolume1Y[0] !== 0 && screenerData.RelVolume1Y[1] !== 0) {
        screenerFilters.RelVolume1Y = screenerData.RelVolume1Y;
      }

      if (screenerData.RSScore1W && screenerData.RSScore1W[0] !== 0 && screenerData.RSScore1W[1] !== 0) {
        screenerFilters.RSScore1W = screenerData.RSScore1W;
      }

      if (screenerData.RSScore1M && screenerData.RSScore1M[0] !== 0 && screenerData.RSScore1M[1] !== 0) {
        screenerFilters.RSScore1M = screenerData.RSScore1M;
      }

      if (screenerData.RSScore4M && screenerData.RSScore4M[0] !== 0 && screenerData.RSScore4M[1] !== 0) {
        screenerFilters.RSScore4M = screenerData.RSScore4M;
      }

      if (screenerData.ADV1W && screenerData.ADV1W[0] !== 0 && screenerData.ADV1W[1] !== 0) {
        screenerFilters.ADV1W = screenerData.ADV1W;
      }

      if (screenerData.ADV1M && screenerData.ADV1M[0] !== 0 && screenerData.ADV1M[1] !== 0) {
        screenerFilters.ADV1M = screenerData.ADV1M;
      }

      if (screenerData.ADV4M && screenerData.ADV4M[0] !== 0 && screenerData.ADV4M[1] !== 0) {
        screenerFilters.ADV4M = screenerData.ADV4M;
      }

      if (screenerData.ADV1Y && screenerData.ADV1Y[0] !== 0 && screenerData.ADV1Y[1] !== 0) {
        screenerFilters.ADV1Y = screenerData.ADV1Y;
      }

      if (screenerData.PercOffWeekHigh && screenerData.PercOffWeekHigh[0] !== 0 && screenerData.PercOffWeekHigh[1] !== 0) {
        screenerFilters.PercOffWeekHigh = screenerData.PercOffWeekHigh;
      }

      if (screenerData.PercOffWeekLow && screenerData.PercOffWeekLow[0] !== 0 && screenerData.PercOffWeekLow[1] !== 0) {
        screenerFilters.PercOffWeekLow = screenerData.PercOffWeekLow;
      }

      if (screenerData.IPO && screenerData.IPO[0] !== 0 && screenerData.IPO[1] !== 0) {
        screenerFilters.IPO = screenerData.IPO;
      }

      if (screenerData.changePerc &&
        screenerData.changePerc[0] !== 0 &&
        screenerData.changePerc[1] !== 0) {
        screenerFilters.changePerc = screenerData.changePerc;
        if (screenerData.changePerc[2] && screenerData.changePerc[2].length > 0) {
          screenerFilters.changePerc[2] = screenerData.changePerc[2];
        }
      }

      if (screenerData.ROE && screenerData.ROE[0] !== 0 && screenerData.ROE[1] !== 0) {
        screenerFilters.ROE = screenerData.ROE;
      }

      if (screenerData.ROA && screenerData.ROA[0] !== 0 && screenerData.ROA[1] !== 0) {
        screenerFilters.ROA = screenerData.ROA;
      }

      if (screenerData.currentRatio && screenerData.currentRatio[0] !== 0 && screenerData.currentRatio[1] !== 0) {
        screenerFilters.currentRatio = screenerData.currentRatio;
      }

      if (screenerData.assetsCurrent && screenerData.assetsCurrent[0] !== 0 && screenerData.assetsCurrent[1] !== 0) {
        screenerFilters.assetsCurrent = screenerData.assetsCurrent;
      }

      if (screenerData.liabilitiesCurrent && screenerData.liabilitiesCurrent[0] !== 0 && screenerData.liabilitiesCurrent[1] !== 0) {
        screenerFilters.liabilitiesCurrent = screenerData.liabilitiesCurrent;
      }

      if (screenerData.debtCurrent && screenerData.debtCurrent[0] !== 0 && screenerData.debtCurrent[1] !== 0) {
        screenerFilters.debtCurrent = screenerData.debtCurrent;
      }

      if (screenerData.cashAndEq && screenerData.cashAndEq[0] !== 0 && screenerData.cashAndEq[1] !== 0) {
        screenerFilters.cashAndEq = screenerData.cashAndEq;
      }

      if (screenerData.freeCashFlow && screenerData.freeCashFlow[0] !== 0 && screenerData.freeCashFlow[1] !== 0) {
        screenerFilters.freeCashFlow = screenerData.freeCashFlow;
      }

      if (screenerData.profitMargin && screenerData.profitMargin[0] !== 0 && screenerData.profitMargin[1] !== 0) {
        screenerFilters.profitMargin = screenerData.profitMargin;
      }

      if (screenerData.grossMargin && screenerData.grossMargin[0] !== 0 && screenerData.grossMargin[1] !== 0) {
        screenerFilters.grossMargin = screenerData.grossMargin;
      }

      if (screenerData.debtEquity && screenerData.debtEquity[0] !== 0 && screenerData.debtEquity[1] !== 0) {
        screenerFilters.debtEquity = screenerData.debtEquity;
      }

      if (screenerData.bookVal && screenerData.bookVal[0] !== 0 && screenerData.bookVal[1] !== 0) {
        screenerFilters.bookVal = screenerData.bookVal;
      }

      if (screenerData.EV && screenerData.EV[0] !== 0 && screenerData.EV[1] !== 0) {
        screenerFilters.EV = screenerData.EV;
      }

      if (screenerData.RSI && screenerData.RSI[0] !== 0 && screenerData.RSI[1] !== 0) {
        screenerFilters.RSI = screenerData.RSI;
      }

      if (screenerData.Gap && screenerData.Gap[0] !== 0 && screenerData.Gap[1] !== 0) {
        screenerFilters.Gap = screenerData.Gap;
      }

      // Filter the AssetInfo collection 
      const assetInfoCollection = db.collection('AssetInfo');
      const query = {
        Symbol: { $nin: hiddenSymbols }
      };

      Object.keys(screenerFilters).forEach((key) => {
        switch (key) {
          case 'Price':
            query.$expr = {
              $and: [
                { $gt: [{ $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] }, screenerFilters.Price[0]] },
                { $lt: [{ $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] }, screenerFilters.Price[1]] }
              ]
            };
            break;
          case 'MarketCap':
            query.MarketCapitalization = {
              $gt: screenerFilters.MarketCap[0],
              $lt: screenerFilters.MarketCap[1]
            };
            break;
          case 'IPO':
            query.IPO = {
              $gt: screenerFilters.IPO[0],
              $lt: screenerFilters.IPO[1]
            };
            break;
          case 'sectors':
            query.Sector = { $in: screenerFilters.sectors };
            break;
          case 'exchanges':
            query.Exchange = { $in: screenerFilters.exchanges };
            break;
          case 'countries':
            query.Country = { $in: screenerFilters.countries };
            break;
          case 'PE':
            query.PERatio = {
              $gt: screenerFilters.PE[0],
              $lt: screenerFilters.PE[1]
            };
            break;
          case 'ForwardPE':
            query.ForwardPE = {
              $gt: screenerFilters.ForwardPE[0],
              $lt: screenerFilters.ForwardPE[1]
            };
            break;
          case 'PEG':
            query.PEGRatio = {
              $gt: screenerFilters.PEG[0],
              $lt: screenerFilters.PEG[1]
            };
            break;
          case 'EPS':
            query.EPS = {
              $gt: screenerFilters.EPS[0],
              $lt: screenerFilters.EPS[1]
            };
            break;
          case 'PS':
            query.PriceToSalesRatioTTM = {
              $gt: screenerFilters.PS[0],
              $lt: screenerFilters.PS[1]
            };
            break;
          case 'PB':
            query.PriceToBookRatio = {
              $gt: screenerFilters.PB[0],
              $lt: screenerFilters.PB[1]
            };
            break;
          case 'Beta':
            query.Beta = {
              $gt: screenerFilters.Beta[0],
              $lt: screenerFilters.Beta[1]
            };
            break;
          case 'DivYield':
            query.DividendYield = {
              $gt: screenerFilters.DivYield[0],
              $lt: screenerFilters.DivYield[1]
            };
            break;
          case 'EPSQoQ':
            query.EPSQoQ = {
              $gt: screenerFilters.EPSQoQ[0],
              $lt: screenerFilters.EPSQoQ[1]
            };
            break;
          case 'EPSYoY':
            query.EPSYoY = {
              $gt: screenerFilters.EPSYoY[0],
              $lt: screenerFilters.EPSYoY[1]
            };
            break;
          case 'EarningsQoQ':
            query.EarningsQoQ = {
              $gt: screenerFilters.EarningsQoQ[0],
              $lt: screenerFilters.EarningsQoQ[1]
            };
            break;
          case 'EarningsYoY':
            query.EarningsYoY = {
              $gt: screenerFilters.EarningsYoY[0],
              $lt: screenerFilters.EarningsYoY[1]
            };
            break;
          case 'RevQoQ':
            query.RevQoQ = {
              $gt: screenerFilters.RevQoQ[0],
              $lt: screenerFilters.RevQoQ[1]
            };
            break;
          case 'RevYoY':
            query.RevYoY = {
              $gt: screenerFilters.RevYoY[0],
              $lt: screenerFilters.RevYoY[1]
            };
            break;
          case 'AvgVolume1W':
            query.AvgVolume1W = {
              $gt: screenerFilters.AvgVolume1W[0],
              $lt: screenerFilters.AvgVolume1W[1]
            };
            break;
          case 'AvgVolume1M':
            query.AvgVolume1M = {
              $gt: screenerFilters.AvgVolume1M[0],
              $lt: screenerFilters.AvgVolume1M[1]
            };
            break;
          case 'AvgVolume6M':
            query.AvgVolume6M = {
              $gt: screenerFilters.AvgVolume6M[0],
              $lt: screenerFilters.AvgVolume6M[1]
            };
            break;
          case 'AvgVolume1Y':
            query.AvgVolume1Y = {
              $gt: screenerFilters.AvgVolume1Y[0],
              $lt: screenerFilters.AvgVolume1Y[1]
            };
            break;
          case 'RelVolume1W':
            query.RelVolume1W = {
              $gt: screenerFilters.RelVolume1W[0],
              $lt: screenerFilters.RelVolume1W[1]
            };
            break;
          case 'RelVolume1M':
            query.RelVolume1M = {
              $gt: screenerFilters.RelVolume1M[0],
              $lt: screenerFilters.RelVolume1M[1]
            };
            break;
          case 'RelVolume6M':
            query.RelVolume6M = {
              $gt: screenerFilters.RelVolume6M[0],
              $lt: screenerFilters.RelVolume6M[1]
            };
            break;
          case 'RelVolume1Y':
            query.RelVolume1Y = {
              $gt: screenerFilters.RelVolume1Y[0],
              $lt: screenerFilters.RelVolume1Y[1]
            };
            break;
          case 'RSScore1W':
            query.RSScore1W = {
              $gte: Math.max(screenerFilters.RSScore1W[0], 1),
              $lte: Math.min(screenerFilters.RSScore1W[1], 100)
            };
            break;
          case 'RSScore1M':
            query.RSScore1M = {
              $gte: Math.max(screenerFilters.RSScore1M[0], 1),
              $lte: Math.min(screenerFilters.RSScore1M[1], 100)
            };
            break;
          case 'RSScore4M':
            query.RSScore4M = {
              $gte: Math.max(screenerFilters.RSScore4M[0], 1),
              $lte: Math.min(screenerFilters.RSScore4M[1], 100)
            };
            break;
          case 'ADV1W':
            query.ADV1W = {
              $gt: screenerFilters.ADV1W[0],
              $lt: screenerFilters.ADV1W[1]
            };
            break;
          case 'ADV1M':
            query.ADV1M = {
              $gt: screenerFilters.ADV1M[0],
              $lt: screenerFilters.ADV1M[1]
            };
            break;
          case 'ADV4M':
            query.ADV4M = {
              $gt: screenerFilters.ADV4M[0],
              $lt: screenerFilters.ADV4M[1]
            };
            break;
          case 'ADV1Y':
            query.ADV1Y = {
              $gt: screenerFilters.ADV1Y[0],
              $lt: screenerFilters.ADV1Y[1]
            };
            break;
          case 'changePerc':
            switch (screenerFilters.changePerc[2]) {
              case '1D':
                query.todaychange = {
                  $gt: screenerFilters.changePerc[0],
                  $lt: screenerFilters.changePerc[1]
                };
                break;
              case '1W':
                query.weekchange = {
                  $gt: screenerFilters.changePerc[0],
                  $lt: screenerFilters.changePerc[1]
                };
                break;
              case '1M':
                query['1mchange'] = {
                  $gt: screenerFilters.changePerc[0],
                  $lt: screenerFilters.changePerc[1]
                };
                break;
              case '4M':
                query['4mchange'] = {
                  $gt: screenerFilters.changePerc[0],
                  $lt: screenerFilters.changePerc[1]
                };
                break;
              case '6M':
                query['6mchange'] = {
                  $gt: screenerFilters.changePerc[0],
                  $lt: screenerFilters.changePerc[1]
                };
                break;
              case '1Y':
                query['1ychange'] = {
                  $gt: screenerFilters.changePerc[0],
                  $lt: screenerFilters.changePerc[1]
                };
                break;
              case 'YTD':
                query.ytdchange = {
                  $gt: screenerFilters.changePerc[0],
                  $lt: screenerFilters.changePerc[1]
                };
                break;
            }
            break;
          case 'PercOffWeekHigh':
            query.percoff52WeekHigh = {
              $gt: -screenerFilters.PercOffWeekHigh[0] / 100,
              $lt: 0.0001
            };
            break;
          case 'PercOffWeekLow':
            query.percoff52WeekLow = {
              $gt: screenerFilters.PercOffWeekLow[0] / 100,
              $lt: screenerFilters.PercOffWeekLow[1] / 100
            };
            break;
          case 'NewHigh':
            if (screenerFilters.NewHigh === 'yes') {
              query.$expr = {
                $gt: [
                  { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] },
                  "$AlltimeHigh"
                ]
              };
            }
            break;
          case 'NewLow':
            if (screenerFilters.NewLow === 'yes') {
              query.$expr = {
                $lt: [
                  { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] },
                  "$AlltimeLow"
                ]
              };
            }
            break;
          case 'MA200':
            if (screenerFilters.MA200 === 'abv50') {
              query.$expr = {
                $gt: ["$MA200", "$MA50"]
              };
            } else if (screenerFilters.MA200 === 'abv20') {
              query.$expr = {
                $gt: ["$MA200", "$MA20"]
              };
            } else if (screenerFilters.MA200 === 'abv10') {
              query.$expr = {
                $gt: ["$MA200", "$MA10"]
              };
            } else if (screenerFilters.MA200 === 'blw50') {
              query.$expr = {
                $lt: ["$MA200", "$MA50"]
              };
            } else if (screenerFilters.MA200 === 'blw20') {
              query.$expr = {
                $lt: ["$MA200", "$MA20"]
              };
            } else if (screenerFilters.MA200 === 'blw10') {
              query.$expr = {
                $lt: ["$MA200", "$MA10"]
              };
            }
            break;
          case 'MA50':
            if (screenerFilters.MA50 === 'abv200') {
              query.$expr = {
                $gt: ["$MA50", "$MA200"]
              };
            } else if (screenerFilters.MA50 === 'abv20') {
              query.$expr = {
                $gt: ["$MA50", "$MA20"]
              };
            } else if (screenerFilters.MA50 === 'abv10') {
              query.$expr = {
                $gt: ["$MA50", "$MA10"]
              };
            } else if (screenerFilters.MA50 === 'blw200') {
              query.$expr = {
                $lt: ["$MA50", "$MA200"]
              };
            } else if (screenerFilters.MA50 === 'blw20') {
              query.$expr = {
                $lt: ["$MA50", "$MA20"]
              };
            } else if (screenerFilters.MA50 === 'blw10') {
              query.$expr = {
                $lt: ["$MA50", "$MA10"]
              };
            }
            break;
          case 'MA20':
            if (screenerFilters.MA20 === 'abv200') {
              query.$expr = {
                $gt: ["$MA20", "$MA200"]
              };
            } else if (screenerFilters.MA50 === 'abv50') {
              query.$expr = {
                $gt: ["$MA20", "$MA50"]
              };
            } else if (screenerFilters.MA50 === 'abv10') {
              query.$expr = {
                $gt: ["$MA20", "$MA10"]
              };
            } else if (screenerFilters.MA50 === 'blw200') {
              query.$expr = {
                $lt: ["$MA20", "$MA200"]
              };
            } else if (screenerFilters.MA50 === 'blw50') {
              query.$expr = {
                $lt: ["$MA20", "$MA50"]
              };
            } else if (screenerFilters.MA50 === 'blw10') {
              query.$expr = {
                $lt: ["$MA20", "$MA10"]
              };
            }
            break;
          case 'MA10':
            if (screenerFilters.MA10 === 'abv200') {
              query.$expr = {
                $gt: ["$MA10", "$MA200"]
              };
            } else if (screenerFilters.MA50 === 'abv50') {
              query.$expr = {
                $gt: ["$MA10", "$MA50"]
              };
            } else if (screenerFilters.MA50 === 'abv20') {
              query.$expr = {
                $gt: ["$MA10", "$MA20"]
              };
            } else if (screenerFilters.MA50 === 'blw200') {
              query.$expr = {
                $lt: ["$MA10", "$MA200"]
              };
            } else if (screenerFilters.MA50 === 'blw50') {
              query.$expr = {
                $lt: ["$MA10", "$MA50"]
              };
            } else if (screenerFilters.MA50 === 'blw20') {
              query.$expr = {
                $lt: ["$MA10", "$MA20"]
              };
            }
            break;
          case 'ROE':
            query['quarterlyFinancials.0.roe'] = {
              $gt: screenerFilters.ROE[0],
              $lt: screenerFilters.ROE[1]
            };
            break;
          case 'ROA':
            query['quarterlyFinancials.0.roa'] = {
              $gt: screenerFilters.ROA[0],
              $lt: screenerFilters.ROA[1]
            };
            break;
          case 'currentRatio':
            query['quarterlyFinancials.0.currentRatio'] = {
              $gt: screenerFilters.currentRatio[0],
              $lt: screenerFilters.currentRatio[1]
            };
            break;
          case 'assetsCurrent':
            query['quarterlyFinancials.0.assetsCurrent'] = {
              $gt: screenerFilters.assetsCurrent[0],
              $lt: screenerFilters.assetsCurrent[1]
            };
            break;
          case 'liabilitiesCurrent':
            query['quarterlyFinancials.0.liabilitiesCurrent'] = {
              $gt: screenerFilters.liabilitiesCurrent[0],
              $lt: screenerFilters.liabilitiesCurrent[1]
            };
            break;
          case 'debtCurrent':
            query['quarterlyFinancials.0.debtCurrent'] = {
              $gt: screenerFilters.debtCurrent[0],
              $lt: screenerFilters.debtCurrent[1]
            };
            break;
          case 'cashAndEq':
            query['quarterlyFinancials.0.cashAndEq'] = {
              $gt: screenerFilters.cashAndEq[0],
              $lt: screenerFilters.cashAndEq[1]
            };
            break;
          case 'freeCashFlow':
            query['quarterlyFinancials.0.freeCashFlow'] = {
              $gt: screenerFilters.freeCashFlow[0],
              $lt: screenerFilters.freeCashFlow[1]
            };
            break;
          case 'profitMargin':
            query['quarterlyFinancials.0.profitMargin'] = {
              $gt: screenerFilters.profitMargin[0],
              $lt: screenerFilters.profitMargin[1]
            };
            break;
          case 'grossMargin':
            query['quarterlyFinancials.0.grossMargin'] = {
              $gt: screenerFilters.grossMargin[0],
              $lt: screenerFilters.grossMargin[1]
            };
            break;
          case 'debtEquity':
            query['quarterlyFinancials.0.debtEquity'] = {
              $gt: screenerFilters.debtEquity[0],
              $lt: screenerFilters.debtEquity[1]
            };
            break;
          case 'bookVal':
            query['quarterlyFinancials.0.bookVal'] = {
              $gt: screenerFilters.bookVal[0],
              $lt: screenerFilters.bookVal[1]
            };
            break;
          case 'EV':
            query.EV = {
              $gt: screenerFilters.EV[0],
              $lt: screenerFilters.EV[1]
            };
            break;
          case 'RSI':
            query.RSI = {
              $gt: screenerFilters.RSI[0],
              $lt: screenerFilters.RSI[1]
            };
            break;
          case 'Gap':
            query.Gap = {
              $gt: screenerFilters.Gap[0],
              $lt: screenerFilters.Gap[1]
            };
            break;
          default:
            break;
        }
      });

      const aggregation = [
        {
          $match: query
        },
        {
          $addFields: {
            Close: {
              $arrayElemAt: [
                {
                  $map: {
                    input: { $objectToArray: "$TimeSeries" },
                    as: "item",
                    in: { $getField: { field: "4. close", input: "$$item.v" } }
                  }
                },
                0
              ]
            }
          }
        }
      ];

      const filteredAssets = await assetInfoCollection.aggregate(aggregation).project({
        Symbol: 1,
        Name: 1,
        ISIN: 1,
        MarketCapitalization: 1,
        Close: 1,
        PERatio: 1,
        PEGRatio: 1,
        PriceToSalesRatioTTM: 1,
        DividendYield: 1,
        EPS: 1,
        Sector: 1,
        Industry: 1,
        Exchange: 1,
        Country: 1,
        RSScore1W: 1,
        RSScore1M: 1,
        RSScore4M: 1,
        ADV1W: 1,
        ADV1M: 1,
        ADV4M: 1,
        ADV1Y: 1,
        todaychange: 1,
        _id: 0
      }).toArray();

      res.send(filteredAssets);
    } catch (error) {
      logger.error('Error fetching screener results', {
        user: obfuscateUsername(user),
        screenerName: screenerName,
        error: error.message
      });
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
);

// endpoint that sends summary for selected screener 
app.get('/screener/summary/:usernameID/:name',
  validate([
    validationSchemas.userParam2(),
    validationSchemas.screenerNameParam(),
  ]),
  async (req, res) => {
    const startTime = Date.now();
    const requestId = crypto.randomBytes(16).toString('hex');

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
      // Sanitize input parameters
      const usernameID = sanitizeInput(req.params.usernameID);
      const name = sanitizeInput(req.params.name);

      const client = new MongoClient(uri);

      try {
        await client.connect();
        const db = client.db('EreunaDB');
        const assetInfoCollection = db.collection('Screeners');
        const filter = { UsernameID: usernameID, Name: name };

        // Log database query
        logger.debug({
          msg: 'Executing Database Query',
          requestId: requestId,
          collection: 'Screeners',
          filter: {
            UsernameID: obfuscateUsername(usernameID),
            Name: name
          }
        });

        const performanceData = await assetInfoCollection.findOne(filter);

        if (!performanceData) {
          // Log not found scenario
          logger.warn({
            msg: 'Screener Summary Not Found',
            requestId: requestId,
            usernameID: obfuscateUsername(usernameID),
            screenerName: name
          });

          return res.status(404).json({
            message: 'Document not found',
            requestId: requestId
          });
        }

        // Maintain original attributes list and filtering logic
        const attributes = [
          'Price', 'MarketCap', 'Sectors', 'Exchanges', 'Countries', 'PE', 'ForwardPE', 'PEG', 'EPS', 'PS', 'PB', 'Beta', 'DivYield',
          'EPSQoQ', 'EPSYoY', 'EarningsQoQ', 'EarningsYoY', 'RevQoQ', 'RevYoY', 'changePerc', 'PercOffWeekHigh', 'PercOffWeekLow',
          'NewHigh', 'NewLow', 'MA10', 'MA20', 'MA50', 'MA200', 'RSScore1W', 'RSScore1M', 'RSScore4M', 'AvgVolume1W', 'RelVolume1W',
          'AvgVolume1M', 'RelVolume1M', 'AvgVolume6M', 'RelVolume6M', 'AvgVolume1Y', 'RelVolume1Y', '1mchange', '1ychange', '4mchange',
          '6mchange', 'todaychange', 'weekchange', 'ytdchange', 'IPO', 'ADV1W', 'ADV1M', 'ADV4M', 'ADV1Y', 'ROE', 'ROA', 'currentRatio',
          'assetsCurrent', 'liabilitiesCurrent', 'debtCurrent', 'cashAndEq', 'freeCashFlow', 'profitMargin', 'grossMargin', 'debtEquity', 'bookVal', 'EV',
          'RSI', 'Gap'
        ];

        const filteredData = attributes.reduce((acc, attribute) => {
          if (Object.prototype.hasOwnProperty.call(performanceData, attribute)) {
            acc[attribute] = performanceData[attribute];
          }
          return acc;
        }, {});

        // Send response exactly as in original implementation
        res.send(filteredData);
      } catch (error) {
        // Log database errors
        logger.error({
          msg: 'Database Error',
          requestId: requestId,
          error: error.message,
          stack: error.stack
        });

        // Security logging
        securityLogger.logSecurityEvent('database_error', {
          usernameID: obfuscateUsername(usernameID),
          screenerName: name,
          error: error.message
        });

        res.status(500).json({ message: 'Internal Server Error' });
      } finally {
        await client.close();
      }
    } catch (error) {
      // Catch-all error handler
      logger.error({
        msg: 'Unexpected Error in Screener Summary',
        requestId: requestId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({ message: 'Unexpected Error' });
    }
  }
);

// endpoint that sends combined screener results and removes duplicate values 
app.get('/screener/:usernameID/all',
  validate([
    param('usernameID')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
  ]),
  async (req, res) => {
    const startTime = Date.now();
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
      const usernameId = sanitizeInput(req.params.usernameID);

      client = new MongoClient(uri);
      await client.connect();
      const db = client.db('EreunaDB');
      const screenersCollection = db.collection('Screeners');

      const screeners = await screenersCollection.find({ UsernameID: usernameId, Include: true }).toArray();
      const screenerNames = screeners.map(screener => screener.Name);

      const usersCollection = db.collection('Users');
      const userDoc = await usersCollection.findOne({ Username: usernameId });

      if (!userDoc) {
        logger.warn({
          msg: 'User Not Found',
          requestId: requestId,
          usernameID: obfuscateUsername(usernameId)
        });
        return res.status(404).json({ message: 'User not found' });
      }

      const tickerScreenerMap = new Map();
      const filteredAssetsArray = [];

      for (const screenerName of screenerNames) {
        try {
          const assetInfoCollection = db.collection('AssetInfo');
          const query = { Symbol: { $nin: userDoc.Hidden } };
          const aggregation = [];

          const screenerData = await screenersCollection.findOne({ UsernameID: usernameId, Name: screenerName, Include: true });
          if (!screenerData) {
            logger.warn({
              msg: 'Screener Data Not Found',
              requestId: requestId,
              screenerName: screenerName
            });
            continue;
          }

          // Extract filters from screenerData
          const screenerFilters = {};

          if (screenerData.Price && screenerData.Price[0] !== 0 && screenerData.Price[1] !== 0) {
            screenerFilters.Price = screenerData.Price;
          }

          if (screenerData.MarketCap && screenerData.MarketCap[0] !== 0 && screenerData.MarketCap[1] !== 0) {
            screenerFilters.MarketCap = screenerData.MarketCap;
          }

          if (screenerData.IPO && screenerData.IPO[0] !== 0 && screenerData.IPO[1] !== 0) {
            screenerFilters.IPO = screenerData.IPO;
          }

          if (screenerData.Sectors && screenerData.Sectors.length > 0) {
            screenerFilters.sectors = screenerData.Sectors;
          }

          if (screenerData.Exchanges && screenerData.Exchanges.length > 0) {
            screenerFilters.exchanges = screenerData.Exchanges;
          }

          if (screenerData.Countries && screenerData.Countries.length > 0) {
            screenerFilters.countries = screenerData.Countries;
          }

          if (screenerData.NewHigh && screenerData.NewHigh.length > 0) {
            screenerFilters.NewHigh = screenerData.NewHigh;
          }

          if (screenerData.NewLow && screenerData.NewLow.length > 0) {
            screenerFilters.NewLow = screenerData.NewLow;
          }

          if (screenerData.MA200 && screenerData.MA200.length > 0) {
            screenerFilters.MA200 = screenerData.MA200;
          }

          if (screenerData.MA50 && screenerData.MA50.length > 0) {
            screenerFilters.MA50 = screenerData.MA50;
          }

          if (screenerData.MA20 && screenerData.MA20.length > 0) {
            screenerFilters.MA20 = screenerData.MA20;
          }

          if (screenerData.MA10 && screenerData.MA10.length > 0) {
            screenerFilters.MA10 = screenerData.MA10;
          }

          if (screenerData.PE && screenerData.PE[0] !== 0 && screenerData.PE[1] !== 0) {
            screenerFilters.PE = screenerData.PE;
          }

          if (screenerData.ForwardPE && screenerData.ForwardPE[0] !== 0 && screenerData.ForwardPE[1] !== 0) {
            screenerFilters.ForwardPE = screenerData.ForwardPE;
          }

          if (screenerData.PEG && screenerData.PEG[0] !== 0 && screenerData.PEG[1] !== 0) {
            screenerFilters.PEG = screenerData.PEG;
          }

          if (screenerData.EPS && screenerData.EPS[0] !== 0 && screenerData.EPS[1] !== 0) {
            screenerFilters.EPS = screenerData.EPS;
          }

          if (screenerData.PS && screenerData.PS[0] !== 0 && screenerData.PS[1] !== 0) {
            screenerFilters.PS = screenerData.PS;
          }

          if (screenerData.PB && screenerData.PB[0] !== 0 && screenerData.PB[1] !== 0) {
            screenerFilters.PB = screenerData.PB;
          }

          if (screenerData.Beta && screenerData.Beta[0] !== 0 && screenerData.Beta[1] !== 0) {
            screenerFilters.Beta = screenerData.Beta;
          }

          if (screenerData.DivYield && screenerData.DivYield[0] !== 0 && screenerData.DivYield[1] !== 0) {
            screenerFilters.DivYield = screenerData.DivYield;
          }

          if (screenerData.EPSQoQ && screenerData.EPSQoQ[0] !== 0 && screenerData.EPSQoQ[1] !== 0) {
            screenerFilters.EPSQoQ = screenerData.EPSQoQ;
          }

          if (screenerData.EPSYoY && screenerData.EPSYoY[0] !== 0 && screenerData.EPSYoY[1] !== 0) {
            screenerFilters.EPSYoY = screenerData.EPSYoY;
          }

          if (screenerData.EarningsQoQ && screenerData.EarningsQoQ[0] !== 0 && screenerData.EarningsQoQ[1] !== 0) {
            screenerFilters.EarningsQoQ = screenerData.EarningsQoQ;
          }

          if (screenerData.EarningsYoY && screenerData.EarningsYoY[0] !== 0 && screenerData.EarningsYoY[1] !== 0) {
            screenerFilters.EarningsYoY = screenerData.EarningsYoY;
          }

          if (screenerData.RevQoQ && screenerData.RevQoQ[0] !== 0 && screenerData.RevQoQ[1] !== 0) {
            screenerFilters.RevQoQ = screenerData.RevQoQ;
          }

          if (screenerData.RevYoY && screenerData.RevYoY[0] !== 0 && screenerData.RevYoY[1] !== 0) {
            screenerFilters.RevYoY = screenerData.RevYoY;
          }

          if (screenerData.AvgVolume1W && screenerData.AvgVolume1W[0] !== 0 && screenerData.AvgVolume1W[1] !== 0) {
            screenerFilters.AvgVolume1W = screenerData.AvgVolume1W;
          }

          if (screenerData.AvgVolume1M && screenerData.AvgVolume1M[0] !== 0 && screenerData.AvgVolume1M[1] !== 0) {
            screenerFilters.AvgVolume1M = screenerData.AvgVolume1M;
          }

          if (screenerData.AvgVolume6M && screenerData.AvgVolume6M[0] !== 0 && screenerData.AvgVolume6M[1] !== 0) {
            screenerFilters.AvgVolume6M = screenerData.AvgVolume6M;
          }

          if (screenerData.AvgVolume1Y && screenerData.AvgVolume1Y[0] !== 0 && screenerData.AvgVolume1Y[1] !== 0) {
            screenerFilters.AvgVolume1Y = screenerData.AvgVolume1Y;
          }

          if (screenerData.RelVolume1W && screenerData.RelVolume1W[0] !== 0 && screenerData.RelVolume1W[1] !== 0) {
            screenerFilters.RelVolume1W = screenerData.RelVolume1W;
          }

          if (screenerData.RelVolume1M && screenerData.RelVolume1M[0] !== 0 && screenerData.RelVolume1M[1] !== 0) {
            screenerFilters.RelVolume1M = screenerData.RelVolume1M;
          }

          if (screenerData.RelVolume6M && screenerData.RelVolume6M[0] !== 0 && screenerData.RelVolume6M[1] !== 0) {
            screenerFilters.RelVolume6M = screenerData.RelVolume6M;
          }

          if (screenerData.RSScore1W && screenerData.RSScore1W[0] !== 0 && screenerData.RSScore1W[1] !== 0) {
            screenerFilters.RSScore1W = screenerData.RSScore1W;
          }

          if (screenerData.RSScore1M && screenerData.RSScore1M[0] !== 0 && screenerData.RSScore1M[1] !== 0) {
            screenerFilters.RSScore1M = screenerData.RSScore1M;
          }

          if (screenerData.RSScore4M && screenerData.RSScore4M[0] !== 0 && screenerData.RSScore4M[1] !== 0) {
            screenerFilters.RSScore4M = screenerData.RSScore4M;
          }

          if (screenerData.ADV1W && screenerData.ADV1W[0] !== 0 && screenerData.ADV1W[1] !== 0) {
            screenerFilters.ADV1W = screenerData.ADV1W;
          }

          if (screenerData.ADV1M && screenerData.ADV1M[0] !== 0 && screenerData.ADV1M[1] !== 0) {
            screenerFilters.ADV1M = screenerData.ADV1M;
          }

          if (screenerData.ADV4M && screenerData.ADV4M[0] !== 0 && screenerData.ADV4M[1] !== 0) {
            screenerFilters.ADV4M = screenerData.ADV4M;
          }

          if (screenerData.ADV1Y && screenerData.ADV1Y[0] !== 0 && screenerData.ADV1Y[1] !== 0) {
            screenerFilters.ADV1Y = screenerData.ADV1Y;
          }

          if (screenerData.PercOffWeekHigh && screenerData.PercOffWeekHigh[0] !== 0 && screenerData.PercOffWeekHigh[1] !== 0) {
            screenerFilters.PercOffWeekHigh = screenerData.PercOffWeekHigh;
          }

          if (screenerData.PercOffWeekLow && screenerData.PercOffWeekLow[0] !== 0 && screenerData.PercOffWeekLow[1] !== 0) {
            screenerFilters.PercOffWeekLow = screenerData.PercOffWeekLow;
          }

          if (screenerData.changePerc &&
            screenerData.changePerc[0] !== 0 &&
            screenerData.changePerc[1] !== 0) {
            screenerFilters.changePerc = screenerData.changePerc;
            if (screenerData.changePerc[2] && screenerData.changePerc[2].length > 0) {
              screenerFilters.changePerc[2] = screenerData.changePerc[2];
            }
          }

          if (screenerData.ROE && screenerData.ROE[0] !== 0 && screenerData.ROE[1] !== 0) {
            screenerFilters.ROE = screenerData.ROE;
          }

          if (screenerData.ROA && screenerData.ROA[0] !== 0 && screenerData.ROA[1] !== 0) {
            screenerFilters.ROA = screenerData.ROA;
          }

          if (screenerData.currentRatio && screenerData.currentRatio[0] !== 0 && screenerData.currentRatio[1] !== 0) {
            screenerFilters.currentRatio = screenerData.currentRatio;
          }

          if (screenerData.assetsCurrent && screenerData.assetsCurrent[0] !== 0 && screenerData.assetsCurrent[1] !== 0) {
            screenerFilters.assetsCurrent = screenerData.assetsCurrent;
          }

          if (screenerData.liabilitiesCurrent && screenerData.liabilitiesCurrent[0] !== 0 && screenerData.liabilitiesCurrent[1] !== 0) {
            screenerFilters.liabilitiesCurrent = screenerData.liabilitiesCurrent;
          }

          if (screenerData.debtCurrent && screenerData.debtCurrent[0] !== 0 && screenerData.debtCurrent[1] !== 0) {
            screenerFilters.debtCurrent = screenerData.debtCurrent;
          }

          if (screenerData.cashAndEq && screenerData.cashAndEq[0] !== 0 && screenerData.cashAndEq[1] !== 0) {
            screenerFilters.cashAndEq = screenerData.cashAndEq;
          }

          if (screenerData.freeCashFlow && screenerData.freeCashFlow[0] !== 0 && screenerData.freeCashFlow[1] !== 0) {
            screenerFilters.freeCashFlow = screenerData.freeCashFlow;
          }

          if (screenerData.profitMargin && screenerData.profitMargin[0] !== 0 && screenerData.profitMargin[1] !== 0) {
            screenerFilters.profitMargin = screenerData.profitMargin;
          }

          if (screenerData.grossMargin && screenerData.grossMargin[0] !== 0 && screenerData.grossMargin[1] !== 0) {
            screenerFilters.grossMargin = screenerData.grossMargin;
          }

          if (screenerData.debtEquity && screenerData.debtEquity[0] !== 0 && screenerData.debtEquity[1] !== 0) {
            screenerFilters.debtEquity = screenerData.debtEquity;
          }

          if (screenerData.bookVal && screenerData.bookVal[0] !== 0 && screenerData.bookVal[1] !== 0) {
            screenerFilters.bookVal = screenerData.bookVal;
          }

          if (screenerData.EV && screenerData.EV[0] !== 0 && screenerData.EV[1] !== 0) {
            screenerFilters.EV = screenerData.EV;
          }

          if (screenerData.RSI && screenerData.RSI[0] !== 0 && screenerData.RSI[1] !== 0) {
            screenerFilters.RSI = screenerData.RSI;
          }

          if (screenerData.Gap && screenerData.Gap[0] !== 0 && screenerData.Gap[1] !== 0) {
            screenerFilters.Gap = screenerData.Gap;
          }

          Object.keys(screenerFilters).forEach((key) => {
            switch (key) {
              case 'Price':
                query.$expr = {
                  $and: [
                    { $gt: [{ $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] }, screenerFilters.Price[0]] },
                    { $lt: [{ $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] }, screenerFilters.Price[1]] }
                  ]
                };
                break;
              case 'MarketCap':
                query.MarketCapitalization = {
                  $gt: screenerFilters.MarketCap[0],
                  $lt: screenerFilters.MarketCap[1]
                };
                break;
              case 'IPO':
                query.IPO = {
                  $gt: screenerFilters.IPO[0],
                  $lt: screenerFilters.IPO[1]
                };
                break;
              case 'sectors':
                query.Sector = { $in: screenerFilters.sectors };
                break;
              case 'exchanges':
                query.Exchange = { $in: screenerFilters.exchanges };
                break;
              case 'countries':
                query.Country = { $in: screenerFilters.countries };
                break;
              case 'PE':
                query.PERatio = {
                  $gt: screenerFilters.PE[0],
                  $lt: screenerFilters.PE[1]
                };
                break;
              case 'ForwardPE':
                query.ForwardPE = {
                  $gt: screenerFilters.ForwardPE[0],
                  $lt: screenerFilters.ForwardPE[1]
                };
                break;
              case 'PEG':
                query.PEGRatio = {
                  $gt: screenerFilters.PEG[0],
                  $lt: screenerFilters.PEG[1]
                };
                break;
              case 'EPS':
                query.EPS = {
                  $gt: screenerFilters.EPS[0],
                  $lt: screenerFilters.EPS[1]
                };
                break;
              case 'PS':
                query.PriceToSalesRatioTTM = {
                  $gt: screenerFilters.PS[0],
                  $lt: screenerFilters.PS[1]
                };
                break;
              case 'PB':
                query.PriceToBookRatio = {
                  $gt: screenerFilters.PB[0],
                  $lt: screenerFilters.PB[1]
                };
                break;
              case 'Beta':
                query.Beta = {
                  $gt: screenerFilters.Beta[0],
                  $lt: screenerFilters.Beta[1]
                };
                break;
              case 'DivYield':
                query.DividendYield = {
                  $gt: screenerFilters.DivYield[0],
                  $lt: screenerFilters.DivYield[1]
                };
                break;
              case 'EPSQoQ':
                query.EPSQoQ = {
                  $gt: screenerFilters.EPSQoQ[0],
                  $lt: screenerFilters.EPSQoQ[1]
                };
                break;
              case 'EPSYoY':
                query.EPSYoY = {
                  $gt: screenerFilters.EPSYoY[0],
                  $lt: screenerFilters.EPSYoY[1]
                };
                break;
              case 'EarningsQoQ':
                query.EarningsQoQ = {
                  $gt: screenerFilters.EarningsQoQ[0],
                  $lt: screenerFilters.EarningsQoQ[1]
                };
                break;
              case 'EarningsYoY':
                query.EarningsYoY = {
                  $gt: screenerFilters.EarningsYoY[0],
                  $lt: screenerFilters.EarningsYoY[1]
                };
                break;
              case 'RevQoQ':
                query.RevenueQoQ = {
                  $gt: screenerFilters.RevQoQ[0],
                  $lt: screenerFilters.RevQoQ[1]
                };
                break;
              case 'RevYoY':
                query.RevenueYoY = {
                  $gt: screenerFilters.RevYoY[0],
                  $lt: screenerFilters.RevYoY[1]
                };
                break;
              case 'AvgVolume1W':
                query.AvgVolume1W = {
                  $gt: screenerFilters.AvgVolume1W[0],
                  $lt: screenerFilters.AvgVolume1W[1]
                };
                break;
              case 'AvgVolume1M':
                query.AvgVolume1M = {
                  $gt: screenerFilters.AvgVolume1M[0],
                  $lt: screenerFilters.AvgVolume1M[1]
                };
                break;
              case 'AvgVolume6M':
                query.AvgVolume6M = {
                  $gt: screenerFilters.AvgVolume6M[0],
                  $lt: screenerFilters.AvgVolume6M[1]
                };
                break;
              case 'AvgVolume1Y':
                query.AvgVolume1Y = {
                  $gt: screenerFilters.AvgVolume1Y[0],
                  $lt: screenerFilters.AvgVolume1Y[1]
                };
                break;
              case 'RelVolume1W':
                query.RelVolume1W = {
                  $gt: screenerFilters.RelVolume1W[0],
                  $lt: screenerFilters.RelVolume1W[1]
                };
                break;
              case 'RelVolume1M':
                query.RelVolume1M = {
                  $gt: screenerFilters.RelVolume1M[0],
                  $lt: screenerFilters.RelVolume1M[1]
                };
                break;
              case 'RelVolume6M':
                query.RelVolume6M = {
                  $gt: screenerFilters.RelVolume6M[0],
                  $lt: screenerFilters.RelVolume6M[1]
                };
                break;
              case 'RelVolume1Y':
                query.RelVolume1Y = {
                  $gt: screenerFilters.RelVolume1Y[0],
                  $lt: screenerFilters.RelVolume1Y[1]
                };
                break;
              case 'RSScore1W':
                query.RSScore1W = {
                  $gte: Math.max(screenerFilters.RSScore1W[0], 1),
                  $lte: Math.min(screenerFilters.RSScore1W[1], 100)
                };
                break;
              case 'RSScore1M':
                query.RSScore1M = {
                  $gte: Math.max(screenerFilters.RSScore1M[0], 1),
                  $lte: Math.min(screenerFilters.RSScore1M[1], 100)
                };
                break;
              case 'RSScore4M':
                query.RSScore4M = {
                  $gte: Math.max(screenerFilters.RSScore4M[0], 1),
                  $lte: Math.min(screenerFilters.RSScore4M[1], 100)
                };
                break;
              case 'ADV1W':
                query.ADV1W = {
                  $gt: screenerFilters.ADV1W[0],
                  $lt: screenerFilters.ADV1W[1]
                };
                break;
              case 'ADV1M':
                query.ADV1M = {
                  $gt: screenerFilters.ADV1M[0],
                  $lt: screenerFilters.ADV1M[1]
                };
                break;
              case 'ADV4M':
                query.ADV4M = {
                  $gt: screenerFilters.ADV4M[0],
                  $lt: screenerFilters.ADV4M[1]
                };
                break;
              case 'ADV1Y':
                query.ADV1Y = {
                  $gt: screenerFilters.ADV1Y[0],
                  $lt: screenerFilters.ADV1Y[1]
                };
                break;
              case 'changePerc':
                switch (screenerFilters.changePerc[2]) {
                  case '1D':
                    query.todaychange = {
                      $gt: screenerFilters.changePerc[0] / 100,
                      $lt: screenerFilters.changePerc[1] / 100
                    };
                    break;
                  case '1W':
                    query.weekchange = {
                      $gt: screenerFilters.changePerc[0] / 100,
                      $lt: screenerFilters.changePerc[1] / 100
                    };
                    break;
                  case '1M':
                    query['1mchange'] = {
                      $gt: screenerFilters.changePerc[0] / 100,
                      $lt: screenerFilters.changePerc[1] / 100
                    };
                    break;
                  case '4M':
                    query['4mchange'] = {
                      $gt: screenerFilters.changePerc[0] / 100,
                      $lt: screenerFilters.changePerc[1] / 100
                    };
                    break;
                  case '6M':
                    query['6mchange'] = {
                      $gt: screenerFilters.changePerc[0] / 100,
                      $lt: screenerFilters.changePerc[1] / 100
                    };
                    break;
                  case '1Y':
                    query['1ychange'] = {
                      $gt: screenerFilters.changePerc[0] / 100,
                      $lt: screenerFilters.changePerc[1] / 100
                    };
                    break;
                  case 'YTD':
                    query.ytdchange = {
                      $gt: screenerFilters.changePerc[0] / 100,
                      $lt: screenerFilters.changePerc[1] / 100
                    };
                    break;
                }
                break;
              case 'PercOffWeekHigh':
                query.percoff52WeekHigh = {
                  $gt: -screenerFilters.PercOffWeekHigh[0] / 100,
                  $lt: -screenerFilters.PercOffWeekHigh[1] / 100
                };
                break;
              case 'PercOffWeekLow':
                query.percoff52WeekLow = {
                  $gt: screenerFilters.PercOffWeekLow[0] / 100,
                  $lt: screenerFilters.PercOffWeekLow[1] / 100
                };
                break;
              case 'NewHigh':
                if (screenerFilters.NewHigh === 'yes') {
                  query.$expr = {
                    $gt: [
                      { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] },
                      "$AlltimeHigh"
                    ]
                  };
                }
                break;
              case 'NewLow':
                if (screenerFilters.NewLow === 'yes') {
                  query.$expr = {
                    $lt: [
                      { $arrayElemAt: [{ $map: { input: { $objectToArray: "$TimeSeries" }, as: "item", in: { $getField: { field: "4. close", input: "$$item.v" } } } }, 0] },
                      "$AlltimeLow"
                    ]
                  };
                }
                break;
              case 'MA200':
                if (screenerFilters.MA200 === 'abv50') {
                  query.$expr = {
                    $gt: ["$MA200", "$MA50"]
                  };
                } else if (screenerFilters.MA200 === 'abv20') {
                  query.$expr = {
                    $gt: ["$MA200", "$MA20"]
                  };
                } else if (screenerFilters.MA200 === 'abv10') {
                  query.$expr = {
                    $gt: ["$MA200", "$MA10"]
                  };
                } else if (screenerFilters.MA200 === 'blw50') {
                  query.$expr = {
                    $lt: ["$MA200", "$MA50"]
                  };
                } else if (screenerFilters.MA200 === 'blw20') {
                  query.$expr = {
                    $lt: ["$MA200", "$MA20"]
                  };
                } else if (screenerFilters.MA200 === 'blw10') {
                  query.$expr = {
                    $lt: ["$MA200", "$MA10"]
                  };
                }
                break;
              case 'MA50':
                if (screenerFilters.MA50 === 'abv200') {
                  query.$expr = {
                    $gt: ["$MA50", "$MA200"]
                  };
                } else if (screenerFilters.MA50 === 'abv20') {
                  query.$expr = {
                    $gt: ["$MA50", "$MA20"]
                  };
                } else if (screenerFilters.MA50 === 'abv10') {
                  query.$expr = {
                    $gt: ["$MA50", "$MA10"]
                  };
                } else if (screenerFilters.MA50 === 'blw200') {
                  query.$expr = {
                    $lt: ["$MA50", "$MA200"]
                  };
                } else if (screenerFilters.MA50 === 'blw20') {
                  query.$expr = {
                    $lt: ["$MA50", "$MA20"]
                  };
                } else if (screenerFilters.MA50 === 'blw10') {
                  query.$expr = {
                    $lt: ["$MA50", "$MA10"]
                  };
                }
                break;
              case 'MA20':
                if (screenerFilters.MA20 === 'abv200') {
                  query.$expr = {
                    $gt: ["$MA20", "$MA200"]
                  };
                } else if (screenerFilters.MA50 === 'abv50') {
                  query.$expr = {
                    $gt: ["$MA20", "$MA50"]
                  };
                } else if (screenerFilters.MA50 === 'abv10') {
                  query.$expr = {
                    $gt: ["$MA20", "$MA10"]
                  };
                } else if (screenerFilters.MA50 === 'blw200') {
                  query.$expr = {
                    $lt: ["$MA20", "$MA200"]
                  };
                } else if (screenerFilters.MA50 === 'blw50') {
                  query.$expr = {
                    $lt: ["$MA20", "$MA50"]
                  };
                } else if (screenerFilters.MA50 === 'blw10') {
                  query.$expr = {
                    $lt: ["$MA20", "$MA10"]
                  };
                }
                break;
              case 'MA10':
                if (screenerFilters.MA10 === 'abv200') {
                  query.$expr = {
                    $gt: ["$MA10", "$MA200"]
                  };
                } else if (screenerFilters.MA50 === 'abv50') {
                  query.$expr = {
                    $gt: ["$MA10", "$MA50"]
                  };
                } else if (screenerFilters.MA50 === 'abv20') {
                  query.$expr = {
                    $gt: ["$MA10", "$MA20"]
                  };
                } else if (screenerFilters.MA50 === 'blw200') {
                  query.$expr = {
                    $lt: ["$MA10", "$MA200"]
                  };
                } else if (screenerFilters.MA50 === 'blw50') {
                  query.$expr = {
                    $lt: ["$MA10", "$MA50"]
                  };
                } else if (screenerFilters.MA50 === 'blw20') {
                  query.$expr = {
                    $lt: ["$MA10", "$MA20"]
                  };
                }
                break;
              case 'ROE':
                query['quarterlyFinancials.0.roe'] = {
                  $gt: screenerFilters.ROE[0],
                  $lt: screenerFilters.ROE[1]
                };
                break;
              case 'ROA':
                query['quarterlyFinancials.0.roa'] = {
                  $gt: screenerFilters.ROA[0],
                  $lt: screenerFilters.ROA[1]
                };
                break;
              case 'currentRatio':
                query['quarterlyFinancials.0.currentRatio'] = {
                  $gt: screenerFilters.currentRatio[0],
                  $lt: screenerFilters.currentRatio[1]
                };
                break;
              case 'assetsCurrent':
                query['quarterlyFinancials.0.assetsCurrent'] = {
                  $gt: screenerFilters.assetsCurrent[0],
                  $lt: screenerFilters.assetsCurrent[1]
                };
                break;
              case 'liabilitiesCurrent':
                query['quarterlyFinancials.0.liabilitiesCurrent'] = {
                  $gt: screenerFilters.liabilitiesCurrent[0],
                  $lt: screenerFilters.liabilitiesCurrent[1]
                };
                break;
              case 'debtCurrent':
                query['quarterlyFinancials.0.debtCurrent'] = {
                  $gt: screenerFilters.debtCurrent[0],
                  $lt: screenerFilters.debtCurrent[1]
                };
                break;
              case 'cashAndEq':
                query['quarterlyFinancials.0.cashAndEq'] = {
                  $gt: screenerFilters.cashAndEq[0],
                  $lt: screenerFilters.cashAndEq[1]
                };
                break;
              case 'freeCashFlow':
                query['quarterlyFinancials.0.freeCashFlow'] = {
                  $gt: screenerFilters.freeCashFlow[0],
                  $lt: screenerFilters.freeCashFlow[1]
                };
                break;
              case 'profitMargin':
                query['quarterlyFinancials.0.profitMargin'] = {
                  $gt: screenerFilters.profitMargin[0],
                  $lt: screenerFilters.profitMargin[1]
                };
                break;
              case 'grossMargin':
                query['quarterlyFinancials.0.grossMargin'] = {
                  $gt: screenerFilters.grossMargin[0],
                  $lt: screenerFilters.grossMargin[1]
                };
                break;
              case 'debtEquity':
                query['quarterlyFinancials.0.debtEquity'] = {
                  $gt: screenerFilters.debtEquity[0],
                  $lt: screenerFilters.debtEquity[1]
                };
                break;
              case 'bookVal':
                query['quarterlyFinancials.0.bookVal'] = {
                  $gt: screenerFilters.bookVal[0],
                  $lt: screenerFilters.bookVal[1]
                };
                break;
              case 'EV':
                query.EV = {
                  $gt: screenerFilters.EV[0],
                  $lt: screenerFilters.EV[1]
                };
                break;
              case 'RSI':
                query.RSI = {
                  $gt: screenerFilters.RSI[0],
                  $lt: screenerFilters.RSI[1]
                };
                break;
              case 'Gap':
                query.Gap = {
                  $gt: screenerFilters.Gap[0],
                  $lt: screenerFilters.Gap[1]
                };
                break;
              default:
                break;
            }
          });

          aggregation.push({ $match: query });
          aggregation.push({
            $addFields: {
              Close: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: { $objectToArray: "$TimeSeries" },
                      as: "item",
                      in: { $getField: { field: "4. close", input: "$$item.v" } }
                    }
                  },
                  0
                ]
              }
            }
          });

          const filteredAssets = await assetInfoCollection.aggregate(aggregation).project({
            Symbol: 1,
            Name: 1,
            ISIN: 1,
            MarketCapitalization: 1,
            Close: 1,
            PERatio: 1,
            PEGRatio: 1,
            PriceToSalesRatioTTM: 1,
            DividendYield: 1,
            EPS: 1,
            Sector: 1,
            Industry: 1,
            Exchange: 1,
            Country: 1,
            RSScore1W: 1,
            RSScore1M: 1,
            RSScore4M: 1,
            ADV1W: 1,
            ADV1M: 1,
            ADV4M: 1,
            ADV1Y: 1,
            todaychange: 1,
            _id: 0
          }).toArray();

          filteredAssets.forEach(asset => {
            const key = asset.Symbol;
            if (!tickerScreenerMap.has(key)) {
              tickerScreenerMap.set(key, []);
            }
            tickerScreenerMap.get(key).push(screenerName);
          });

          filteredAssetsArray.push(...filteredAssets);
        } catch (error) {
          logger.error({
            msg: 'Error Processing Screener',
            requestId: requestId,
            screenerName: screenerName,
            error: error.message
          });
          // Continue to next screener instead of stopping entire process
          continue;
        }
      }

      // Existing deduplication logic remains unchanged
      const uniqueFilteredAssetsArray = Array.from(new Set(filteredAssetsArray.map(a => JSON.stringify(a)))).map(a => JSON.parse(a));

      // Add screener information to the unique assets
      const finalResults = uniqueFilteredAssetsArray.map(asset => {
        const screenerNames = tickerScreenerMap.get(asset.Symbol) || [];
        return {
          ...asset,
          screenerNames: screenerNames,
          isDuplicate: screenerNames.length > 1
        };
      });

      res.send(finalResults);

    } catch (error) {
      // Comprehensive error logging
      logger.error({
        msg: 'Unexpected Error in Combined Screener Results',
        requestId: requestId,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      // Ensure client is closed
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

// endpoint that updates the watchlist oder after sortable.js is used 
app.patch('/watchlists/update-order/:Username/:Name',
  validate([
    param('Username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    param('Name')
      .trim()
      .notEmpty().withMessage('Watchlist name is required')
      .isLength({ min: 1, max: 50 }).withMessage('Watchlist name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z0-9\s_\-+()]+$/).withMessage('Watchlist name can only contain letters, numbers, spaces, underscores, hyphens, plus signs, and parentheses'),

    body('newListOrder')
      .isArray().withMessage('New list order must be an array')
      .custom((value) => {
        if (!value.every(item => typeof item === 'string' && item.length <= 12)) {
          throw new Error('Each list item must be a string with max 12 characters');
        }
        return true;
      })
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
      // Sanitize inputs
      const user = sanitizeInput(req.body.user);
      const Name = sanitizeInput(req.params.Name);
      const newListOrder = req.body.newListOrder.map(item => sanitizeInput(item));

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Watchlists');

      const filter = { UsernameID: user, Name: Name };
      const update = { $set: { List: newListOrder } };

      const result = await collection.updateOne(filter, update, { upsert: true });

      if (result.upsertedCount === 1) {
      } else if (result.modifiedCount === 1) {
      } else {
        logger.warn({
          msg: 'No Matching Watchlist Found',
          requestId: requestId,
          user: obfuscateUsername(user),
          watchlistName: Name
        });
        return res.status(404).json({ message: 'Watchlist not found' });
      }

      res.send({
        message: 'Watchlist order updated successfully',
        requestId: requestId
      });

    } catch (error) {
      // Comprehensive error logging
      logger.error({
        msg: 'Error Updating Watchlist Order',
        requestId: requestId,
        user: req.body.user ? obfuscateUsername(req.body.user) : 'Unknown',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      res.status(500).json({
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

// endpoint that should add/remove tickers with inputs 
app.patch('/watchlist/addticker/:isAdding',
  validate([
    param('isAdding')
      .isIn(['true', 'false']).withMessage('isAdding must be true or false'),

    body('watchlistName')
      .trim()
      .notEmpty().withMessage('Watchlist name is required')
      .isLength({ min: 1, max: 50 }).withMessage('Watchlist name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z0-9\s_\-+()]+$/).withMessage('Watchlist name can only contain letters, numbers, spaces, underscores, hyphens, plus signs, and parentheses'),

    body('symbol')
      .trim()
      .notEmpty().withMessage('Symbol is required')
      .isLength({ min: 1, max: 12 }).withMessage('Symbol must be between 1 and 12 characters')
      .matches(/^[A-Z0-9.]+$/).withMessage('Symbol can only contain uppercase letters, numbers, and dots'),

    body('user')
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
      // Sanitize inputs
      const isAdding = req.params.isAdding === 'true';
      const watchlistName = sanitizeInput(req.body.watchlistName);
      const symbol = sanitizeInput(req.body.symbol);
      const user = sanitizeInput(req.body.user);

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Watchlists');

      // Verify watchlist exists and belongs to the user
      const watchlist = await collection.findOne({
        Name: watchlistName,
        UsernameID: user
      });

      if (!watchlist) {
        logger.warn({
          msg: 'Watchlist Not Found',
          requestId: requestId,
          user: obfuscateUsername(user),
          watchlistName: watchlistName
        });
        return res.status(404).json({ message: 'Watchlist not found' });
      }

      // Check symbol limit when adding
      if (isAdding && watchlist.List && watchlist.List.length >= 100) {
        return res.status(400).json({
          message: 'Limit reached, cannot add more than 100 symbol per watchlist',
          details: 'Maximum of 100 symbols per watchlist'
        });
      }

      let result;
      if (isAdding) {
        // Add the symbol to the List array if it doesn't exist
        result = await collection.updateOne(
          { Name: watchlistName, UsernameID: user },
          { $addToSet: { List: symbol } }
        );
      } else {
        // Remove the symbol from the List array
        result = await collection.updateOne(
          { Name: watchlistName },
          { $pull: { List: symbol } }
        );
      }

      if (result.matchedCount === 0) {
        logger.warn({
          msg: 'Watchlist Not Found',
          requestId: requestId,
          user: obfuscateUsername(user),
          watchlistName: watchlistName
        });
        return res.status(404).json({ message: 'Watchlist not found' });
      }

      if (result.modifiedCount === 0) {
        return res.status(200).json({
          message: isAdding
            ? 'Symbol already in watchlist'
            : 'Symbol not in watchlist'
        });
      }

      res.status(200).json({
        message: isAdding
          ? 'Ticker added successfully'
          : 'Ticker removed successfully',
        requestId: requestId
      });

    } catch (error) {
      // Comprehensive error logging
      logger.error({
        msg: 'Error Updating Watchlist Ticker',
        requestId: requestId,
        user: req.body.user ? obfuscateUsername(req.body.user) : 'Unknown',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      res.status(500).json({
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

// endpoint that toggles value for screener, to include or exclude from combined list
app.patch('/:user/toggle/screener/:list',
  validate([
    param('user')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 25 }).withMessage('Username must be between 3 and 25 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

    param('list')
      .trim()
      .notEmpty().withMessage('Screener name is required')
      .isLength({ min: 1, max: 50 }).withMessage('Screener name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z0-9\s_\-+()]+$/).withMessage('Screener name can only contain letters, numbers, spaces, underscores, hyphens, plus signs, and parentheses')
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
      // Sanitize inputs
      const user = sanitizeInput(req.params.user);
      const list = sanitizeInput(req.params.list);

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');

      // Find the screener document
      const filter = { Name: list, UsernameID: user };
      const screener = await collection.findOne(filter);

      if (!screener) {
        logger.warn({
          msg: 'Screener Not Found',
          requestId: requestId,
          user: obfuscateUsername(user),
          screenerName: list
        });
        return res.status(404).json({ message: 'Screener not found' });
      }

      // Toggle the Include attribute
      const updatedIncludeValue = !screener.Include; // Switch the boolean value

      // Update the document in the database
      const updateResult = await collection.updateOne(filter, {
        $set: { Include: updatedIncludeValue }
      });

      if (updateResult.modifiedCount === 0) {
        logger.error({
          msg: 'Failed to Update Screener',
          requestId: requestId,
          user: obfuscateUsername(user),
          screenerName: list
        });
        return res.status(500).json({ message: 'Failed to update screener' });
      }

      res.send({
        message: 'Screener updated successfully',
        Include: updatedIncludeValue,
        requestId: requestId
      });

    } catch (error) {
      // Comprehensive error logging
      logger.error({
        msg: 'Error Toggling Screener',
        requestId: requestId,
        user: req.params.user ? obfuscateUsername(req.params.user) : 'Unknown',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      res.status(500).json({
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

// endpoint that retrieves watchlists for a specific user
app.get('/:user/full-watchlists',
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
      const user = sanitizeInput(req.params.user);

      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('Watchlists');

      // Find all watchlists for the given user
      const userWatchlists = await collection.find({ UsernameID: user }, { projection: { _id: 0, Name: 1, List: 1 } }).toArray();

      if (userWatchlists.length === 0) {
        // Log no watchlists found
        logger.warn({
          msg: 'No Watchlists Found',
          requestId: requestId,
          user: obfuscateUsername(user)
        });

        res.status(404).json({ message: 'No watchlists found for the user' });
        return;
      }

      res.send(userWatchlists);

    } catch (error) {
      // Log error
      logger.error({
        msg: 'Error Retrieving Watchlists',
        requestId: requestId,
        user: req.params.user ? obfuscateUsername(req.params.user) : 'Unknown',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      // Ensure client is closed
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

//endpoint that retrieves exchanges for each symbol (related to assigning pictures correctly)
app.get('/symbols-exchanges',
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
      const collection = db.collection('AssetInfo');

      // Find all documents but only return Symbol and Exchange fields
      const documents = await collection.find(
        {},
        {
          projection: {
            _id: 0,  // Exclude the _id field
            Symbol: 1,
            Exchange: 1
          }
        }
      ).toArray();

      if (documents.length === 0) {
        logger.warn({
          msg: 'No Symbols and Exchanges Found',
          requestId: requestId
        });

        return res.status(404).json({ message: 'No documents found' });
      }

      res.json(documents);

    } catch (error) {
      // Log detailed error
      logger.error({
        msg: 'Error Retrieving Symbols and Exchanges',
        requestId: requestId,
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
  });

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

// Endpoint that retrieves the last update date
app.get('/getlastupdate',
  async (req, res) => {
    const requestId = crypto.randomBytes(16).toString('hex');
    let client;

    // Get the API key from the request header
    const apiKey = req.header('X-API-KEY');

    // Validate the API key
    if (!apiKey || apiKey !== process.env.VITE_EREUNA_KEY) {
      logger.warn('Invalid API key', {
        providedApiKey: !!apiKey,
      });

      return res.status(401).json({
        message: 'Unauthorized API Access',
      });
    }

    try {
      client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const collection = db.collection('OHCLVData');

      const query = {};
      const options = {
        sort: { timestamp: -1 },
        limit: 1
      };
      const result = await collection.findOne(query, options);

      if (!result) {
        logger.warn({
          msg: 'No documents found',
          requestId: requestId
        });

        return res.status(404).json({ message: 'No documents found' });
      }

      const date = result.timestamp;
      const formattedDate = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      res.json({ date: formattedDate });

    } catch (error) {
      // Log detailed error
      logger.error({
        msg: 'Error Retrieving Last Update',
        requestId: requestId,
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

// Sends annual and quarterly financials
app.get('/:ticker/financials',
  validate([
    validationSchemas.chartData('ticker')
  ]),
  async (req, res) => {
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

      const ticker = sanitizeInput(req.params.ticker).toUpperCase();

      const client = new MongoClient(uri);

      try {
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('AssetInfo');

        const data = await collection.findOne({ Symbol: ticker });

        if (!data || !data.AnnualFinancials || !data.quarterlyFinancials) {
          logger.warn('No financial data found', {
            ticker: ticker
          });
          return res.status(404).json({
            message: 'No financial data found for this ticker'
          });
        }

        const annualFinancials = data.AnnualFinancials;
        const quarterlyFinancials = data.quarterlyFinancials;

        res.status(200).json({
          annualFinancials,
          quarterlyFinancials
        });

      } catch (dbError) {
        logger.error('Database error retrieving financial data', {
          ticker: ticker,
          error: dbError.message,
          stack: dbError.stack
        });

        if (dbError.name === 'MongoError' || dbError.name === 'MongoNetworkError') {
          return res.status(503).json({
            message: 'Database service unavailable',
            error: 'Unable to connect to the database'
          });
        }

        return res.status(500).json({
          message: 'Internal Server Error',
          error: 'Failed to retrieve financial data'
        });

      } finally {
        try {
          await client.close();
        } catch (closeError) {
          logger.error('Error closing database connection', {
            error: closeError.message
          });
        }
      }

    } catch (unexpectedError) {
      logger.error('Unexpected error in financial data retrieval', {
        error: unexpectedError.message,
        stack: unexpectedError.stack
      });

      return res.status(500).json({
        message: 'Internal Server Error',
        error: 'An unexpected error occurred'
      });
    }
  }
);

app.get('/markets',
  async (req, res) => {
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
      const collection = db.collection('OHCLVData');

      const tickers = ['SPY', 'QQQ', 'DIA', 'IWM'];
      const marketsData = [];

      for (const ticker of tickers) {
        const data = await collection.find({ tickerID: ticker }).sort({ timestamp: -1 }).limit(2).toArray();

        if (data.length < 2) {
          logger.warn({
            msg: 'Insufficient Data Found',
            ticker: ticker
          });
          continue;
        }

        const latestClose = parseFloat(data[0].close.toString().slice(0, 8));
        const previousClose = parseFloat(data[1].close.toString().slice(0, 8));
        const percentageChange = ((latestClose - previousClose) / previousClose) * 100;

        marketsData.push({
          Symbol: ticker,
          percentageReturn: percentageChange.toFixed(2) + '%'
        });
      }

      res.json(marketsData);

    } catch (error) {
      // Log any unexpected errors
      logger.error({
        msg: 'Markets Data Retrieval Error',
        error: error.message
      });

      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      // Ensure client is closed
      if (client) {
        await client.close();
      }
    }
  }
);

// endpoint that updates screener document with ROE parameters
app.patch('/screener/roe', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minROE, maxROE, screenerName, Username;

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
      // Sanitize inputs
      minROE = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxROE = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minROE) && isNaN(maxROE)) {
        return res.status(400).json({ message: 'Both min ROE and max ROE cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minROE to minimum ROE if it is not provided
        if (isNaN(minROE) && !isNaN(maxROE)) {
          const minROEDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                roe: { $ifNull: [{ $first: "$quarterlyFinancials.roe" }, null] },
              },
            },
            {
              $match: { roe: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                minROE: { $min: "$roe" },
              },
            },
          ]).toArray();

          if (minROEDoc.length > 0) {
            minROE = minROEDoc[0].minROE;
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum ROE' });
          }
        }

        // If maxROE is empty, find the highest ROE excluding 'None'
        if (isNaN(maxROE) && !isNaN(minROE)) {
          const maxROEDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                roe: { $ifNull: [{ $first: "$quarterlyFinancials.roe" }, null] },
              },
            },
            {
              $match: { roe: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                maxROE: { $max: "$roe" },
              },
            },
          ]).toArray();

          if (maxROEDoc.length > 0) {
            maxROE = maxROEDoc[0].maxROE;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum ROE' });
          }
        }

        // Ensure minROE is less than maxROE
        if (minROE >= maxROE) {
          return res.status(400).json({ message: 'Min ROE cannot be higher than or equal to max ROE' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { ROE: [minROE, maxROE] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'ROE range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('ROE Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/roa', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minROA, maxROA, screenerName, Username;

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
      // Sanitize inputs
      minROA = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxROA = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minROA) && isNaN(maxROA)) {
        return res.status(400).json({ message: 'Both min ROA and max ROA cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minROA to minimum ROA if it is not provided
        if (isNaN(minROA) && !isNaN(maxROA)) {
          const minROADoc = await assetInfoCollection.aggregate([
            {
              $project: {
                roa: { $ifNull: [{ $first: "$quarterlyFinancials.roa" }, null] },
              },
            },
            {
              $match: { roa: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                minROA: { $min: "$roa" },
              },
            },
          ]).toArray();

          if (minROADoc.length > 0) {
            minROA = minROADoc[0].minROA;
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum ROA' });
          }
        }

        // If maxROA is empty, find the highest ROA excluding 'None'
        if (isNaN(maxROA) && !isNaN(minROA)) {
          const maxROADoc = await assetInfoCollection.aggregate([
            {
              $project: {
                roa: { $ifNull: [{ $first: "$quarterlyFinancials.roa" }, null] },
              },
            },
            {
              $match: { roa: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                maxROA: { $max: "$roa" },
              },
            },
          ]).toArray();

          if (maxROADoc.length > 0) {
            maxROA = maxROADoc[0].maxROA;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum ROA' });
          }
        }

        // Ensure minROA is less than maxROA
        if (minROA >= maxROA) {
          return res.status(400).json({ message: 'Min ROA cannot be higher than or equal to max ROA' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { ROA: [minROA, maxROA] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'ROA range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('ROA Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/current-ratio', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minCurrentRatio, maxCurrentRatio, screenerName, Username;

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
      // Sanitize inputs
      minCurrentRatio = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxCurrentRatio = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minCurrentRatio) && isNaN(maxCurrentRatio)) {
        return res.status(400).json({ message: 'Both min Current Ratio and max Current Ratio cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minCurrentRatio to minimum Current Ratio if it is not provided
        if (isNaN(minCurrentRatio) && !isNaN(maxCurrentRatio)) {
          const minCurrentRatioDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                currentRatio: { $ifNull: [{ $first: "$quarterlyFinancials.currentRatio" }, null] },
              },
            },
            {
              $match: { currentRatio: { $ne: NaN } },
            },
            {
              $group: {
                _id: null,
                minCurrentRatio: { $min: "$currentRatio" },
              },
            },
          ]).toArray();

          if (minCurrentRatioDoc.length > 0) {
            minCurrentRatio = minCurrentRatioDoc[0].minCurrentRatio;
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Current Ratio' });
          }
        }

        // If maxCurrentRatio is empty, find the highest Current Ratio excluding 'None'
        if (isNaN(maxCurrentRatio) && !isNaN(minCurrentRatio)) {
          const maxCurrentRatioDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                currentRatio: { $ifNull: [{ $first: "$quarterlyFinancials.currentRatio" }, null] },
              },
            },
            {
              $match: { currentRatio: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                maxCurrentRatio: { $max: "$currentRatio" },
              },
            },
          ]).toArray();

          if (maxCurrentRatioDoc.length > 0) {
            maxCurrentRatio = maxCurrentRatioDoc[0].maxCurrentRatio;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Current Ratio' });
          }
        }

        // Ensure minCurrentRatio is less than maxCurrentRatio
        if (minCurrentRatio >= maxCurrentRatio) {
          return res.status(400).json({ message: 'Min Current Ratio cannot be higher than or equal to max Current Ratio' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { currentRatio: [minCurrentRatio, maxCurrentRatio] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Current Ratio range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Current Ratio Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/current-assets', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minCurrentAssets, maxCurrentAssets, screenerName, Username;

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
      // Sanitize inputs
      minCurrentAssets = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
      maxCurrentAssets = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minCurrentAssets) && isNaN(maxCurrentAssets)) {
        return res.status(400).json({ message: 'Both min Current Assets and max Current Assets cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minCurrentAssets to minimum Current Assets if it is not provided
        if (isNaN(minCurrentAssets) && !isNaN(maxCurrentAssets)) {
          const minCurrentAssetsDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                assetsCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.assetsCurrent" }, null] },
              },
            },
            {
              $match: { assetsCurrent: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                minCurrentAssets: { $min: "$assetsCurrent" },
              },
            },
          ]).toArray();

          if (minCurrentAssetsDoc.length > 0) {
            minCurrentAssets = minCurrentAssetsDoc[0].minCurrentAssets;
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Current Assets' });
          }
        }

        // If maxCurrentAssets is empty, find the highest Current Assets excluding 'None'
        if (isNaN(maxCurrentAssets) && !isNaN(minCurrentAssets)) {
          const maxCurrentAssetsDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                assetsCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.assetsCurrent" }, null] },
              },
            },
            {
              $match: { assetsCurrent: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                maxCurrentAssets: { $max: "$assetsCurrent" },
              },
            },
          ]).toArray();

          if (maxCurrentAssetsDoc.length > 0) {
            maxCurrentAssets = maxCurrentAssetsDoc[0].maxCurrentAssets;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Current Assets' });
          }
        }

        // Ensure minCurrentAssets is less than maxCurrentAssets
        if (minCurrentAssets >= maxCurrentAssets) {
          return res.status(400).json({ message: 'Min Current Assets cannot be higher than or equal to max Current Assets' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { assetsCurrent: [minCurrentAssets, maxCurrentAssets] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Current Assets range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Current Assets Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/current-liabilities', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minCurrentLiabilities, maxCurrentLiabilities, screenerName, Username;

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
      // Sanitize inputs
      minCurrentLiabilities = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
      maxCurrentLiabilities = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minCurrentLiabilities) && isNaN(maxCurrentLiabilities)) {
        return res.status(400).json({ message: 'Both min Current Liabilities and max Current Liabilities cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minCurrentLiabilities to minimum Current Liabilities if it is not provided
        if (isNaN(minCurrentLiabilities) && !isNaN(maxCurrentLiabilities)) {
          const minCurrentLiabilitiesDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                liabilitiesCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.liabilitiesCurrent" }, null] },
              },
            },
            {
              $match: { liabilitiesCurrent: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                minCurrentLiabilities: { $min: "$liabilitiesCurrent" },
              },
            },
          ]).toArray();

          if (minCurrentLiabilitiesDoc.length > 0) {
            minCurrentLiabilities = minCurrentLiabilitiesDoc[0].minCurrentLiabilities;
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Current Liabilities' });
          }
        }

        // If maxCurrentLiabilities is empty, find the highest Current Liabilities excluding 'None'
        if (isNaN(maxCurrentLiabilities) && !isNaN(minCurrentLiabilities)) {
          const maxCurrentLiabilitiesDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                liabilitiesCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.liabilitiesCurrent" }, null] },
              },
            },
            {
              $match: { liabilitiesCurrent: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                maxCurrentLiabilities: { $max: "$liabilitiesCurrent" },
              },
            },
          ]).toArray();

          if (maxCurrentLiabilitiesDoc.length > 0) {
            maxCurrentLiabilities = maxCurrentLiabilitiesDoc[0].maxCurrentLiabilities;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Current Liabilities' });
          }
        }

        // Ensure minCurrentLiabilities is less than maxCurrentLiabilities
        if (minCurrentLiabilities >= maxCurrentLiabilities) {
          return res.status(400).json({ message: 'Min Current Liabilities cannot be higher than or equal to max Current Liabilities' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { liabilitiesCurrent: [minCurrentLiabilities, maxCurrentLiabilities] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Current Liabilities range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Current Liabilities Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/current-debt', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minCurrentDebt, maxCurrentDebt, screenerName, Username;

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
      // Sanitize inputs
      minCurrentDebt = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
      maxCurrentDebt = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minCurrentDebt) && isNaN(maxCurrentDebt)) {
        return res.status(400).json({ message: 'Both min Current Debt and max Current Debt cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minCurrentDebt to minimum Current Debt if it is not provided
        if (isNaN(minCurrentDebt) && !isNaN(maxCurrentDebt)) {
          const minCurrentDebtDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                debtCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.debtCurrent" }, null] },
              },
            },
            {
              $match: { debtCurrent: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                minCurrentDebt: { $min: "$debtCurrent" },
              },
            },
          ]).toArray();

          if (minCurrentDebtDoc.length > 0) {
            minCurrentDebt = minCurrentDebtDoc[0].minCurrentDebt;
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Current Debt' });
          }
        }

        // If maxCurrentDebt is empty, find the highest Current Debt excluding 'None'
        if (isNaN(maxCurrentDebt) && !isNaN(minCurrentDebt)) {
          const maxCurrentDebtDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                debtCurrent: { $ifNull: [{ $first: "$quarterlyFinancials.debtCurrent" }, null] },
              },
            },
            {
              $match: { debtCurrent: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                maxCurrentDebt: { $max: "$debtCurrent" },
              },
            },
          ]).toArray();

          if (maxCurrentDebtDoc.length > 0) {
            maxCurrentDebt = maxCurrentDebtDoc[0].maxCurrentDebt;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Current Debt' });
          }
        }

        // Ensure minCurrentDebt is less than maxCurrentDebt
        if (minCurrentDebt >= maxCurrentDebt) {
          return res.status(400).json({ message: 'Min Current Debt cannot be higher than or equal to max Current Debt' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { debtCurrent: [minCurrentDebt, maxCurrentDebt] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Current Debt range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Current Debt Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/cash-equivalents', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minCashEquivalents, maxCashEquivalents, screenerName, Username;

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
      // Sanitize inputs
      minCashEquivalents = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
      maxCashEquivalents = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minCashEquivalents) && isNaN(maxCashEquivalents)) {
        return res.status(400).json({ message: 'Both min Cash Equivalents and max Cash Equivalents cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minCashEquivalents to minimum Cash Equivalents if it is not provided
        if (isNaN(minCashEquivalents) && !isNaN(maxCashEquivalents)) {
          const minCashEquivalentsDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                cashAndEq: { $ifNull: [{ $first: "$quarterlyFinancials.cashAndEq" }, null] },
              },
            },
            {
              $match: { cashAndEq: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                minCashEquivalents: { $min: "$cashAndEq" },
              },
            },
          ]).toArray();

          if (minCashEquivalentsDoc.length > 0) {
            minCashEquivalents = minCashEquivalentsDoc[0].minCashEquivalents;
            if (minCashEquivalents === 0) {
              minCashEquivalents = 0.001; // Set minimum value to 0.001 if it's 0
            }
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Cash Equivalents' });
          }
        }

        // If maxCashEquivalents is empty, find the highest Cash Equivalents excluding 'None'
        if (isNaN(maxCashEquivalents) && !isNaN(minCashEquivalents)) {
          const maxCashEquivalentsDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                cashAndEq: { $ifNull: [{ $first: "$quarterlyFinancials.cashAndEq" }, null] },
              },
            },
            {
              $match: { cashAndEq: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                maxCashEquivalents: { $max: "$cashAndEq" },
              },
            },
          ]).toArray();

          if (maxCashEquivalentsDoc.length > 0) {
            maxCashEquivalents = maxCashEquivalentsDoc[0].maxCashEquivalents;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Cash Equivalents' });
          }
        }

        // Ensure minCashEquivalents is less than maxCashEquivalents
        if (minCashEquivalents >= maxCashEquivalents) {
          return res.status(400).json({ message: 'Min Cash Equivalents cannot be higher than or equal to max Cash Equivalents' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { cashAndEq: [minCashEquivalents, maxCashEquivalents] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Cash Equivalents range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Cash Equivalents Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/free-cash-flow', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minFreeCashFlow, maxFreeCashFlow, screenerName, Username;

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
      // Sanitize inputs
      minFreeCashFlow = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
      maxFreeCashFlow = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minFreeCashFlow) && isNaN(maxFreeCashFlow)) {
        return res.status(400).json({ message: 'Both min Free Cash Flow and max Free Cash Flow cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minFreeCashFlow to minimum Free Cash Flow if it is not provided
        if (isNaN(minFreeCashFlow) && !isNaN(maxFreeCashFlow)) {
          const minFreeCashFlowDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                freeCashFlow: { $ifNull: [{ $first: "$quarterlyFinancials.freeCashFlow" }, null] },
              },
            },
            {
              $match: { freeCashFlow: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                minFreeCashFlow: { $min: "$freeCashFlow" },
              },
            },
          ]).toArray();

          if (minFreeCashFlowDoc.length > 0) {
            minFreeCashFlow = minFreeCashFlowDoc[0].minFreeCashFlow;
            if (minFreeCashFlow === 0) {
              minFreeCashFlow = 0.001; // Set minimum value to 0.001 if it's 0
            }
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Free Cash Flow' });
          }
        }

        // If maxFreeCashFlow is empty, find the highest Free Cash Flow excluding 'None'
        if (isNaN(maxFreeCashFlow) && !isNaN(minFreeCashFlow)) {
          const maxFreeCashFlowDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                freeCashFlow: { $ifNull: [{ $first: "$quarterlyFinancials.freeCashFlow" }, null] },
              },
            },
            {
              $match: { freeCashFlow: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                maxFreeCashFlow: { $max: "$freeCashFlow" },
              },
            },
          ]).toArray();

          if (maxFreeCashFlowDoc.length > 0) {
            maxFreeCashFlow = maxFreeCashFlowDoc[0].maxFreeCashFlow;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Free Cash Flow' });
          }
        }

        // Ensure minFreeCashFlow is less than maxFreeCashFlow
        if (minFreeCashFlow >= maxFreeCashFlow) {
          return res.status(400).json({ message: 'Min Free Cash Flow cannot be higher than or equal to max Free Cash Flow' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { freeCashFlow: [minFreeCashFlow, maxFreeCashFlow] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Free Cash Flow range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Free Cash Flow Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/profit-margin', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minProfitMargin, maxProfitMargin, screenerName, Username;

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
      // Sanitize inputs
      minProfitMargin = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxProfitMargin = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minProfitMargin) && isNaN(maxProfitMargin)) {
        return res.status(400).json({ message: 'Both min Profit Margin and max Profit Margin cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minProfitMargin to minimum Profit Margin if it is not provided
        if (isNaN(minProfitMargin) && !isNaN(maxProfitMargin)) {
          const minProfitMarginDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                profitMargin: { $ifNull: [{ $first: "$quarterlyFinancials.profitMargin" }, null] },
              },
            },
            {
              $match: { profitMargin: { $ne: NaN } },
            },
            {
              $group: {
                _id: null,
                minProfitMargin: { $min: "$profitMargin" },
              },
            },
          ]).toArray();

          if (minProfitMarginDoc.length > 0) {
            minProfitMargin = minProfitMarginDoc[0].minProfitMargin;
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Profit Margin' });
          }
        }

        // If maxProfitMargin is empty, find the highest Profit Margin excluding 'None'
        if (isNaN(maxProfitMargin) && !isNaN(minProfitMargin)) {
          const maxProfitMarginDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                profitMargin: { $ifNull: [{ $first: "$quarterlyFinancials.profitMargin" }, null] },
              },
            },
            {
              $match: { profitMargin: { $ne: NaN } },
            },
            {
              $group: {
                _id: null,
                maxProfitMargin: { $max: "$profitMargin" },
              },
            },
          ]).toArray();

          if (maxProfitMarginDoc.length > 0) {
            maxProfitMargin = maxProfitMarginDoc[0].maxProfitMargin;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Profit Margin' });
          }
        }

        // Ensure minProfitMargin is less than maxProfitMargin
        if (minProfitMargin >= maxProfitMargin) {
          return res.status(400).json({ message: 'Min Profit Margin cannot be higher than or equal to max Profit Margin' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { profitMargin: [minProfitMargin, maxProfitMargin] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Profit Margin range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Profit Margin Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/gross-margin', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minGrossMargin, maxGrossMargin, screenerName, Username;

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
      // Sanitize inputs
      minGrossMargin = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxGrossMargin = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minGrossMargin) && isNaN(maxGrossMargin)) {
        return res.status(400).json({ message: 'Both min Gross Margin and max Gross Margin cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minGrossMargin to minimum Gross Margin if it is not provided
        if (isNaN(minGrossMargin) && !isNaN(maxGrossMargin)) {
          const minGrossMarginDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                grossMargin: { $ifNull: [{ $first: "$quarterlyFinancials.grossMargin" }, null] },
              },
            },
            {
              $match: { grossMargin: { $ne: NaN } },
            },
            {
              $group: {
                _id: null,
                minGrossMargin: { $min: "$grossMargin" },
              },
            },
          ]).toArray();

          if (minGrossMarginDoc.length > 0) {
            minGrossMargin = minGrossMarginDoc[0].minGrossMargin;
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Gross Margin' });
          }
        }

        // If maxGrossMargin is empty, find the highest Gross Margin excluding 'None'
        if (isNaN(maxGrossMargin) && !isNaN(minGrossMargin)) {
          const maxGrossMarginDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                grossMargin: { $ifNull: [{ $first: "$quarterlyFinancials.grossMargin" }, null] },
              },
            },
            {
              $match: { grossMargin: { $ne: NaN } },
            },
            {
              $group: {
                _id: null,
                maxGrossMargin: { $max: "$grossMargin" },
              },
            },
          ]).toArray();

          if (maxGrossMarginDoc.length > 0) {
            maxGrossMargin = maxGrossMarginDoc[0].maxGrossMargin;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Gross Margin' });
          }
        }

        // Ensure minGrossMargin is less than maxGrossMargin
        if (minGrossMargin >= maxGrossMargin) {
          return res.status(400).json({ message: 'Min Gross Margin cannot be higher than or equal to max Gross Margin' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { grossMargin: [minGrossMargin, maxGrossMargin] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Gross Margin range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Gross Margin Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/debt-to-equity-ratio', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minDebtToEquityRatio, maxDebtToEquityRatio, screenerName, Username;

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
      // Sanitize inputs
      minDebtToEquityRatio = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxDebtToEquityRatio = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minDebtToEquityRatio) && isNaN(maxDebtToEquityRatio)) {
        return res.status(400).json({ message: 'Both min Debt to Equity Ratio and max Debt to Equity Ratio cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minDebtToEquityRatio to minimum Debt to Equity Ratio if it is not provided
        if (isNaN(minDebtToEquityRatio) && !isNaN(maxDebtToEquityRatio)) {
          const minDebtToEquityRatioDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                debtEquity: { $ifNull: [{ $first: "$quarterlyFinancials.debtEquity" }, null] },
              },
            },
            {
              $match: { debtEquity: { $ne: NaN } },
            },
            {
              $group: {
                _id: null,
                minDebtToEquityRatio: { $min: "$debtEquity" },
              },
            },
          ]).toArray();

          if (minDebtToEquityRatioDoc.length > 0) {
            minDebtToEquityRatio = minDebtToEquityRatioDoc[0].minDebtToEquityRatio;
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Debt to Equity Ratio' });
          }
        }

        // If maxDebtToEquityRatio is empty, find the highest Debt to Equity Ratio excluding 'None'
        if (isNaN(maxDebtToEquityRatio) && !isNaN(minDebtToEquityRatio)) {
          const maxDebtToEquityRatioDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                debtEquity: { $ifNull: [{ $first: "$quarterlyFinancials.debtEquity" }, null] },
              },
            },
            {
              $match: { debtEquity: { $ne: NaN } },
            },
            {
              $group: {
                _id: null,
                maxDebtToEquityRatio: { $max: "$debtEquity" },
              },
            },
          ]).toArray();

          if (maxDebtToEquityRatioDoc.length > 0) {
            maxDebtToEquityRatio = maxDebtToEquityRatioDoc[0].maxDebtToEquityRatio;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Debt to Equity Ratio' });
          }
        }

        // Ensure minDebtToEquityRatio is less than maxDebtToEquityRatio
        if (minDebtToEquityRatio >= maxDebtToEquityRatio) {
          return res.status(400).json({ message: 'Min Debt to Equity Ratio cannot be higher than or equal to max Debt to Equity Ratio' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { debtEquity: [minDebtToEquityRatio, maxDebtToEquityRatio] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Debt to Equity Ratio range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Debt to Equity Ratio Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/book-value', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minBookValue, maxBookValue, screenerName, Username;

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
      // Sanitize inputs
      minBookValue = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
      maxBookValue = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minBookValue) && isNaN(maxBookValue)) {
        return res.status(400).json({ message: 'Both min Book Value and max Book Value cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        // Set default minBookValue to minimum Book Value if it is not provided
        if (isNaN(minBookValue) && !isNaN(maxBookValue)) {
          const minBookValueDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                bookVal: { $ifNull: [{ $first: "$quarterlyFinancials.bookVal" }, null] },
              },
            },
            {
              $match: { bookVal: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                minBookValue: { $min: "$bookVal" },
              },
            },
          ]).toArray();

          if (minBookValueDoc.length > 0) {
            minBookValue = minBookValueDoc[0].minBookValue;
            if (minBookValue === 0) {
              minBookValue = 0.001; // Set minimum value to 0.001 if it's 0
            }
          } else {
            return res.status(404).json({ message: 'No assets found to determine minimum Book Value' });
          }
        }

        // If maxBookValue is empty, find the highest Book Value excluding 'None'
        if (isNaN(maxBookValue) && !isNaN(minBookValue)) {
          const maxBookValueDoc = await assetInfoCollection.aggregate([
            {
              $project: {
                bookVal: { $ifNull: [{ $first: "$quarterlyFinancials.bookVal" }, null] },
              },
            },
            {
              $match: { bookVal: { $ne: null } },
            },
            {
              $group: {
                _id: null,
                maxBookValue: { $max: "$bookVal" },
              },
            },
          ]).toArray();

          if (maxBookValueDoc.length > 0) {
            maxBookValue = maxBookValueDoc[0].maxBookValue;
          } else {
            return res.status(404).json({ message: 'No assets found to determine maximum Book Value' });
          }
        }

        // Ensure minBookValue is less than maxBookValue
        if (minBookValue >= maxBookValue) {
          return res.status(400).json({ message: 'Min Book Value cannot be higher than or equal to max Book Value' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { bookVal: [minBookValue, maxBookValue] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'Unable to update screener'
          });
        }

        res.json({
          message: 'Book Value range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Book Value Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/ev', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize inputs
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) * 1000 : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) * 1000 : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min EV and max EV cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        if (isNaN(minPrice)) {
          const minEV = await assetInfoCollection.aggregate([
            {
              $match: {
                EV: { $ne: 'None', $ne: null, $ne: undefined }
              }
            },
            {
              $group: {
                _id: null,
                minEV: { $min: '$EV' }
              }
            }
          ]).toArray();

          if (minEV.length > 0) {
            minPrice = minEV[0].minEV;
          } else {
            return res.status(404).json({
              message: 'No assets found to determine minimum EV',
              details: 'Unable to find a valid EV in the database'
            });
          }
        }

        if (isNaN(maxPrice)) {
          const maxEV = await assetInfoCollection.aggregate([
            {
              $match: {
                EV: { $ne: 'None', $ne: null, $ne: undefined }
              }
            },
            {
              $group: {
                _id: null,
                maxEV: { $max: '$EV' }
              }
            }
          ]).toArray();

          if (maxEV.length > 0) {
            maxPrice = maxEV[0].maxEV;
          } else {
            return res.status(404).json({
              message: 'No assets found to determine maximum EV',
              details: 'Unable to find a valid EV in the database'
            });
          }
        }

        if (minPrice >= maxPrice) {
          return res.status(400).json({ message: 'Min EV cannot be higher than or equal to max EV' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { EV: [minPrice, maxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        res.json({
          message: 'EV range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('EV Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/rsi', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minRSI, maxRSI, screenerName, Username;

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
      // Sanitize inputs
      minRSI = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxRSI = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minRSI) && isNaN(maxRSI)) {
        return res.status(400).json({ message: 'Both min RSI and max RSI cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        if (isNaN(minRSI)) {
          minRSI = 1;
        }
        if (isNaN(maxRSI)) {
          maxRSI = 100;
        }

        if (minRSI >= maxRSI) {
          return res.status(400).json({ message: 'Min RSI cannot be higher than or equal to max RSI' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { RSI: [minRSI, maxRSI] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        res.json({
          message: 'RSI range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('RSI Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

app.patch('/screener/gap-percent', validate([
  validationSchemas.user(),
  validationSchemas.screenerNameBody(),
  validationSchemas.minPrice(),
  validationSchemas.maxPrice()
]),
  async (req, res) => {
    let minPrice, maxPrice, screenerName, Username;

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
      // Sanitize inputs
      minPrice = req.body.minPrice ? parseFloat(sanitizeInput(req.body.minPrice.toString())) : NaN;
      maxPrice = req.body.maxPrice ? parseFloat(sanitizeInput(req.body.maxPrice.toString())) : NaN;
      screenerName = sanitizeInput(req.body.screenerName || '');
      Username = sanitizeInput(req.body.user || '');

      // Validate inputs
      if (!screenerName) {
        return res.status(400).json({ message: 'Screener name is required' });
      }
      if (!Username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      if (isNaN(minPrice) && isNaN(maxPrice)) {
        return res.status(400).json({ message: 'Both min Gap and max Gap cannot be empty' });
      }

      let client;
      try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('EreunaDB');
        const collection = db.collection('Screeners');
        const assetInfoCollection = db.collection('AssetInfo');

        if (isNaN(minPrice)) {
          const minGap = await assetInfoCollection.aggregate([
            {
              $match: {
                Gap: { $ne: 'None', $ne: null, $ne: undefined, $ne: NaN }
              }
            },
            {
              $group: {
                _id: null,
                minGap: { $min: '$Gap' }
              }
            }
          ]).toArray();

          if (minGap.length > 0) {
            minPrice = minGap[0].minGap;
          } else {
            return res.status(404).json({
              message: 'No assets found to determine minimum Gap',
              details: 'Unable to find a valid Gap in the database'
            });
          }
        }

        if (isNaN(maxPrice)) {
          const maxGap = await assetInfoCollection.aggregate([
            {
              $match: {
                Gap: { $ne: 'None', $ne: null, $ne: undefined, $ne: NaN }
              }
            },
            {
              $group: {
                _id: null,
                maxGap: { $max: '$Gap' }
              }
            }
          ]).toArray();

          if (maxGap.length > 0) {
            maxPrice = maxGap[0].maxGap;
          } else {
            return res.status(404).json({
              message: 'No assets found to determine maximum Gap',
              details: 'Unable to find a valid Gap in the database'
            });
          }
        }

        if (minPrice >= maxPrice) {
          return res.status(400).json({ message: 'Min Gap cannot be higher than or equal to max Gap' });
        }

        const filter = {
          UsernameID: { $regex: new RegExp(`^${Username}$`, 'i') },
          Name: { $regex: new RegExp(`^${screenerName}$`, 'i') }
        };

        const existingScreener = await collection.findOne(filter);
        if (!existingScreener) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        const updateDoc = { $set: { Gap: [minPrice, maxPrice] } };
        const result = await collection.findOneAndUpdate(filter, updateDoc, { returnOriginal: false });

        if (!result) {
          return res.status(404).json({
            message: 'Screener not found',
            details: 'No matching screener exists for the given user and name'
          });
        }

        res.json({
          message: 'Gap range updated successfully',
          updatedScreener: result.value
        });

      } catch (dbError) {
        logger.error('Database Operation Error', {
          error: dbError.message,
          stack: dbError.stack,
          Username,
          screenerName
        });
        res.status(500).json({
          message: 'Database operation failed',
          error: dbError.message
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing database connection', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('Gap Update Error', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message
      });
    }
  });

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

app.post('/panel', validate([
  validationSchemas.username(),
  body('newListOrder')
    .isArray({ min: 1, max: 8 })
    .withMessage('Panel list must contain between 1 and 8 items'),
  body('newListOrder.*.order')
    .isInt({ min: 1, max: 8 })
    .withMessage('Order must be an integer between 1 and 8'),
  body('newListOrder.*.tag')
    .isIn(['Summary', 'EpsTable', 'EarnTable', 'SalesTable', 'DividendsTable', 'SplitsTable', 'Financials', 'Notes'])
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