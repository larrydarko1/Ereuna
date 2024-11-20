import express from 'express';
import fs from 'fs';
import cors from 'cors';
import https from 'https';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import config from './config.js';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import crypto from 'crypto';
import helmet from 'helmet';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { validate, validationSchemas, validationResult, validationSets, sanitizeInput } from './validationUtils.js';
import { logger, httpLogger, metricsHandler as importedMetricsHandler } from './logger.js'
import client from 'prom-client';

dotenv.config();
const register = new client.Registry();

// Optional: Add default system metrics
client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_', // Optional prefix for metrics
});

// Create custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5]
});

const totalRequests = new client.Counter({
  name: 'http_total_requests',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code']
});

const activeRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of active requests',
  labelNames: ['method', 'route']
});

// Register metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(totalRequests);
register.registerMetric(activeRequests);

// Middleware for tracking metrics
function prometheusMiddleware(req, res, next) {
  // Track active requests
  const labels = {
    method: req.method,
    route: req.path
  };

  activeRequests.inc(labels);

  // Start timer for request duration
  const end = httpRequestDurationMicroseconds.startTimer();

  // Modify response end to track metrics
  const oldEnd = res.end;
  res.end = function (...args) {
    // Stop timer and record duration
    end({
      method: req.method,
      route: req.path,
      code: res.statusCode
    });

    // Track total requests
    totalRequests.inc({
      method: req.method,
      route: req.path,
      code: res.statusCode
    });

    // Decrease active requests
    activeRequests.dec(labels);

    // Call original end method
    oldEnd.apply(res, args);
  };

  next();
}

function prometheusMetricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  register.metrics().then(
    metrics => res.send(metrics)
  ).catch(
    error => res.status(500).send(error)
  );
}

// Define origins directly
const allowedOrigins = [
  'http://localhost:8080',
  'https://localhost:8080',
  'http://frontend:8080',
  'https://frontend:8080',
  'https://ereuna.co',
  'https://www.ereuna.co'
];

// Add this before your other middleware
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests, please try again later',
    status: 429 // Too Many Requests
  }
});

// Update Stripe import
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5500;
const uri = process.env.MONGODB_URI;
// Apply Prometheus middleware BEFORE other middlewares
app.use(prometheusMiddleware);

// Metrics endpoint
app.get('/metrics', prometheusMetricsHandler);

// middleware
app.use(limiter);
app.use(express.json());
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins.map(origin =>
        origin.replace(/^https?:\/\//, '')
      )]
    }
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.static('front-end'));

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  origin: function (origin, callback) {
    // If no origin (like server-to-server requests), allow
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log unauthorized access attempts
      logger.warn('Unauthorized CORS request', {
        origin: origin,
        timestamp: new Date().toISOString()
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Create a CORS middleware with detailed logging
const corsMiddleware = cors(corsOptions);

app.use((req, res, next) => {
  // Log incoming request details
  const start = Date.now();

  logger.info('CORS check', {
    origin: req.get('origin'),
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  // Modify response end to log response time
  const oldEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;

    logger.info('Request Completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });

    oldEnd.apply(res, args);
  };

  // Apply CORS middleware
  corsMiddleware(req, res, next);
});

// CORS Error Handler
app.use((err, req, res, next) => {
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
  next(err);
});

// SSL/TLS Certificate options
let options;
try {
  options = {
    key: fs.readFileSync(path.join(process.cwd(), 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(process.cwd(), 'localhost.pem'))
  };

  app.use(httpLogger);

  app.use((err, req, res, next) => {
    logger.logError(err, {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query
    });

    res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  });

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
    // Log signup attempt
    logger.info('Signup attempt initiated', {
      username: req.body.username,
      subscriptionPlan: req.body.subscriptionPlan,
      ip: req.ip
    });

    let client;
    try {
      // Destructure and validate inputs
      const {
        username,
        password,
        subscriptionPlan,
        paymentMethodId,
        return_url,
        promoCode
      } = req.body;

      // Additional type and format checks
      const sanitizedUsername = sanitizeInput(username);
      const sanitizedPromoCode = promoCode ? sanitizeInput(promoCode) : null;
      const parsedSubscriptionPlan = parseInt(subscriptionPlan, 10);

      // Database connection and user creation
      client = new MongoClient(uri);
      try {
        await client.connect();
        const db = client.db('EreunaDB');
        const usersCollection = db.collection('Users');
        const receiptsCollection = db.collection('Receipts');
        const agentsCollection = db.collection('Agents');

        // Check for existing username (case-insensitive)
        const existingUser = await usersCollection.findOne({
          Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
        });

        if (existingUser) {
          // Log username conflict
          logger.warn('Signup attempt with existing username', {
            username: sanitizedUsername,
            ip: req.ip
          });

          return res.status(400).json({
            errors: [{
              field: 'username',
              message: 'Username already exists'
            }]
          });
        }

        // Calculate expiration date and amount
        const today = new Date();
        let expirationDate;
        let amount;
        try {
          switch (parsedSubscriptionPlan) {
            case 1: // 1 month
              expirationDate = new Date(today.setMonth(today.getMonth() + 1));
              amount = 599; // Amount in cents
              break;
            case 2: // 4 months
              expirationDate = new Date(today.setMonth(today.getMonth() + 4));
              amount = 2399; // Amount in cents
              break;
            default:
              // Log invalid subscription plan
              logger.warn('Invalid subscription plan attempt', {
                username: sanitizedUsername,
                subscriptionPlan: parsedSubscriptionPlan,
                ip: req.ip
              });

              return res.status(400).json({
                errors: [{
                  field: 'subscriptionPlan',
                  message: 'Invalid subscription plan'
                }]
              });
          }
        } catch (dateError) {
          logger.error('Error calculating subscription expiration', {
            error: dateError.message,
            username: sanitizedUsername
          });
          throw dateError;
        }

        // Check promo code
        let promoCodeValidated = 'None';
        if (sanitizedPromoCode) {
          const promoCodeDoc = await agentsCollection.findOne({ CODE: sanitizedPromoCode });

          if (promoCodeDoc) {
            // Apply 50% discount
            amount = Math.round(amount / 2);
            promoCodeValidated = sanitizedPromoCode;

            // Log promo code usage
            logger.info('Promo code applied', {
              username: sanitizedUsername,
              promoCode: promoCodeValidated,
              originalAmount: amount * 2,
              discountedAmount: amount
            });
          } else {
            // Log invalid promo code attempt
            logger.warn('Invalid promo code attempt', {
              username: sanitizedUsername,
              promoCode: sanitizedPromoCode,
              ip: req.ip
            });
          }
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generate authentication key
        const rawAuthKey = crypto.randomBytes(64).toString('hex');

        // Create new user document
        const newUser = {
          Username: sanitizedUsername,
          Password: hashedPassword,
          Expires: expirationDate,
          Paid: false,
          PaymentMethod: 'Credit Card',
          SubscriptionPlan: parsedSubscriptionPlan,
          Hidden: [],
          Created: new Date(),
          defaultSymbol: 'NVDA',
          PROMOCODE: promoCodeValidated,
          AuthKey: rawAuthKey,
          HashedAuthKey: await bcrypt.hash(rawAuthKey, saltRounds)
        };

        // Validate payment method
        if (!paymentMethodId) {
          // Log missing payment method
          logger.warn('Signup attempt without payment method', {
            username: sanitizedUsername,
            ip: req.ip
          });

          return res.status(400).json({
            errors: [{
              field: 'paymentMethodId',
              message: 'Payment method ID is required'
            }]
          });
        }

        // Create Stripe payment intent
        let paymentIntent;
        try {
          paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'eur',
            payment_method: paymentMethodId,
            confirm: true,
            return_url: return_url,
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: 'always'
            }
          });
        } catch (paymentError) {
          // Log payment intent creation failure
          logger.error('Stripe payment intent creation failed', {
            username: sanitizedUsername,
            error: paymentError.message,
            ip: req.ip
          });
          throw paymentError;
        }

        // Handle payment states
        if (paymentIntent.status === 'requires_action') {
          // Log payment requires additional action
          logger.info('Payment requires additional action', {
            username: sanitizedUsername,
            paymentIntentId: paymentIntent.id
          });

          return res.json({
            requiresAction: true,
            clientSecret: paymentIntent.client_secret
          });
        } else if (paymentIntent.status === 'succeeded') {
          // Set user as paid
          newUser.Paid = true;

          // Insert user
          let userResult;
          try {
            userResult = await usersCollection.insertOne(newUser);
          } catch (insertError) {
            // Log user insertion failure
            logger.error('Failed to insert new user', {
              username: sanitizedUsername,
              error: insertError.message
            });
            throw insertError;
          }

          if (userResult.insertedId) {
            // Create receipt
            const receiptDocument = {
              UserID: userResult.insertedId,
              Amount: amount,
              Date: newUser.Created,
              Method: 'Credit Card',
              Subscription: parsedSubscriptionPlan,
              PROMOCODE: promoCodeValidated
            };

            // Insert receipt
            let receiptResult;
            try {
              receiptResult = await receiptsCollection.insertOne(receiptDocument);
            } catch (receiptError) {
              // Log receipt insertion failure
              logger.error('Failed to create receipt', {
                username: sanitizedUsername,
                error: receiptError.message
              });
              throw receiptError;
            }

            if (receiptResult.insertedId) {
              // Log successful signup
              logger.info('User signup completed successfully', {
                username: sanitizedUsername,
                subscriptionPlan: parsedSubscriptionPlan,
                paymentMethod: 'Credit Card'
              });

              return res.status(201).json({
                message: 'User created successfully',
                rawAuthKey
              });
            } else {
              // Rollback user creation if receipt fails
              await usersCollection.deleteOne({ _id: userResult.insertedId });

              // Log rollback due to receipt insertion failure
              logger.error('Rolled back user creation due to receipt insertion failure', {
                username: sanitizedUsername
              });

              return res.status(500).json({
                message: 'Failed to create receipt'
              });
            }
          } else {
            // Log user insertion failure
            logger.error('Failed to create user document', {
              username: sanitizedUsername
            });

            return res.status(500).json({
              message: 'Failed to create user'
            });
          }
        } else {
          // Log payment failure
          logger.warn('Payment failed', {
            username: sanitizedUsername,
            paymentStatus: paymentIntent.status,
            ip: req.ip
          });

          // Payment failed
          return res.status(400).json({
            message: 'Payment failed',
            status: paymentIntent.status
          });
        }

      } catch (error) {
        // Log signup process error
        logger.error('Signup process error', {
          username: sanitizedUsername,
          error: error.message,
          stack: error.stack,
          ip: req.ip
        });

        return res.status(500).json({
          message: 'An error occurred during signup',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      } finally {
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            logger.warn('Error closing MongoDB client', {
              error: closeError.message
            });
          }
        }
      }
    } catch (error) {
      // Log unexpected validation or processing error
      logger.error('Unexpected signup error', {
        error: error.message,
        stack: error.stack,
        requestBody: JSON.stringify(req.body)
      });

      return res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Unexpected error occurred'
      });
    }
  }
);

// Endpoint for verifying the token
app.get('/verify', async (req, res) => {
  try {
    // Retrieve the token from the Authorization header
    const token = req.headers['authorization']?.split(' ')[1]; // Assuming Bearer token format

    if (token) {
      jwt.verify(token, config.secretKey, (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: 'Invalid token' });
        } else {
          return res.status(200).json({ user: decoded.user });
        }
      });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Endpoint for user login
app.post('/login',
  validate([
    validationSchemas.username(),
    validationSchemas.password()
  ]),
  async (req, res) => {
    try {
      const { username, password } = req.body;

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
          return res.status(401).json({
            errors: [{
              field: 'username',
              message: 'Username doesn\'t exist'
            }]
          });
        }

        // Compare the provided password with the stored hash
        const passwordMatch = await bcrypt.compare(password, user.Password);

        if (!passwordMatch) {
          return res.status(401).json({
            errors: [{
              field: 'password',
              message: 'Password is incorrect'
            }]
          });
        }

        // Extract today's date
        const today = new Date();
        const expiresDate = new Date(user.Expires);

        // Check subscription status
        if (today > expiresDate) {
          // Subscription is expired
          await usersCollection.updateOne(
            { Username: user.Username },
            { $set: { Paid: false } }
          );
          return res.status(402).json({
            errors: [{
              field: 'subscription',
              message: 'Subscription is expired'
            }]
          });
        }

        // Ensure subscription is active
        await usersCollection.updateOne(
          { Username: user.Username },
          { $set: { Paid: true } }
        );

        // Generate a JWT token
        const tokenExpiration = '30d';
        const token = jwt.sign({ user: user.Username }, config.secretKey, { expiresIn: tokenExpiration });

        // Return a success response with the token
        return res.status(200).json({
          message: 'Logged in successfully',
          token
        });

      } catch (error) {
        console.error('Login database error:', error);
        return res.status(500).json({
          message: 'Internal Server Error',
          error: error.message
        });
      } finally {
        client.close();
      }
    } catch (error) {
      console.error('Login process error:', error);
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
    try {
      const { recoveryKey } = req.body;

      // Additional sanitization
      const sanitizedRecoveryKey = sanitizeInput(recoveryKey);

      const client = new MongoClient(uri);
      try {
        await client.connect();
        const db = client.db('EreunaDB');
        const usersCollection = db.collection('Users');

        // Find users with AuthKey
        const users = await usersCollection.find({}).toArray();

        // Detailed async comparison 
        const matchedUser = await Promise.all(users.map(async user => {
          try {
            // Compare the input recoveryKey with the stored hashed AuthKey
            const isMatch = await bcrypt.compare(sanitizedRecoveryKey, user.HashedAuthKey);
            return isMatch ? user : null;
          } catch (compareError) {
            console.error(`Compare error for user ${user.Username}:`, compareError);
            return null;
          }
        })).then(results => {
          return results.find(user => user !== null);
        });

        if (matchedUser) {
          // Optional: Log recovery attempt (consider privacy and security implications)
          logger.info(`Account recovery initiated for user: ${matchedUser.Username}`);

          return res.status(200).json({
            valid: true,
            username: matchedUser.Username
          });
        } else {
          // Log failed recovery attempt
          logger.warn(`Failed recovery attempt with key: ${sanitizedRecoveryKey.substring(0, 10)}...`);

          return res.status(401).json({
            valid: false,
            errors: [{
              field: 'recoveryKey',
              message: 'Invalid recovery key'
            }]
          });
        }
      } catch (error) {
        // Log database errors
        logger.error('Database Error during recovery:', error);

        return res.status(500).json({
          message: 'Internal Server Error',
          error: 'Unable to process recovery request'
        });
      } finally {
        await client.close();
      }
    } catch (error) {
      // Log unexpected errors
      logger.error('Unexpected error in recovery process:', error);

      return res.status(500).json({
        message: 'Internal Server Error',
        error: 'Unexpected error occurred'
      });
    }
  }
);

// endpoint that generates a new recovery key upon validation 
app.patch('/generate-key', validate([
  validationSchemas.user(),
  validationSchemas.password()
]), async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }

  let client;
  try {
    const { user, password } = req.body;

    const sanitizedUsername = sanitizeInput(user);

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Users');

    // Case-insensitive username lookup
    const filter = { Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') } };
    const userDoc = await collection.findOne(filter);

    if (!userDoc) {
      return res.status(404).json({
        errors: [{
          field: 'user',
          message: 'User not found'
        }]
      });
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, userDoc.Password);

    if (!isPasswordCorrect) {
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
      return res.status(402).json({
        errors: [{
          field: 'subscription',
          message: 'Subscription is expired or inactive'
        }]
      });
    }

    // Generate a new raw key
    const rawAuthKey = crypto.randomBytes(64).toString('hex');

    // Prepare the update document
    const updateDoc = {
      $set: {
        AuthKey: rawAuthKey,       // Store the raw key
        HashedAuthKey: await bcrypt.hash(rawAuthKey, 10), // Store a hashed version
        LastKeyGenerationTime: new Date() // Optional: Track key generation time
      }
    };

    // Update the user document using the original username from the database
    const result = await collection.updateOne(
      { Username: userDoc.Username },
      updateDoc
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: 'Failed to update authentication key'
      });
    }

    // Return response without raw key in production
    return res.json({
      confirm: true,
      message: 'Key generated successfully'
    });

  } catch (error) {
    // Log the error for internal tracking
    console.error('Error generating new key:', error);

    return res.status(500).json({
      message: 'Internal Server Error',
      error: 'Unable to generate authentication key'
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// endpoint to download recovery key
app.post('/download-key', validate([
  validationSchemas.user(),
  validationSchemas.password()
]), async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }

  let client;
  try {
    const { user, password } = req.body;

    // Additional sanitization
    const sanitizedUsername = sanitizeInput(user);

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const usersCollection = db.collection('Users');
    const downloadTokensCollection = db.collection('DownloadTokens');

    // Find user with case-insensitive username
    const userDoc = await usersCollection.findOne({
      Username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
    });

    if (!userDoc) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, userDoc.Password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: 'Incorrect password'
      });
    }

    // Check subscription status
    const today = new Date();
    const expiresDate = new Date(userDoc.Expires);

    if (today > expiresDate || !userDoc.Paid) {
      return res.status(402).json({
        message: 'Subscription is expired or inactive'
      });
    }

    // Verify AuthKey exists
    if (!userDoc.AuthKey) {
      return res.status(404).json({
        message: 'Recovery key not found'
      });
    }

    // Clean up existing tokens for this user
    await downloadTokensCollection.deleteMany({
      username: userDoc.Username,
      expiresAt: { $lt: new Date() }
    });

    // Check if user already has an active download token
    const existingActiveToken = await downloadTokensCollection.findOne({
      username: userDoc.Username,
      expiresAt: { $gt: new Date() }
    });

    if (existingActiveToken) {
      return res.status(429).json({
        message: 'An active download token already exists'
      });
    }

    // Generate a one-time download token
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + (15 * 60 * 1000)); // 15 minutes

    // Store token with expiry
    await downloadTokensCollection.insertOne({
      token: downloadToken,
      username: userDoc.Username,
      expiresAt: tokenExpiry,
      createdAt: new Date()
    });

    // Return token
    return res.json({
      token: downloadToken,
      expiryTime: tokenExpiry.getTime()
    });

  } catch (error) {
    console.error('Download key generation error:', error);

    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.toString()
    });
  } finally {
    if (client) await client.close();
  }
});

// Endpoint to actually retrieve the key using the token
app.get('/retrieve-key', async (req, res) => {
  let client;
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');

    // Find and validate the token
    const tokenDoc = await db.collection('DownloadTokens').findOne({ token });

    if (!tokenDoc) {
      return res.status(404).json({ message: 'Invalid token' });
    }

    // Check token expiry
    if (Date.now() > tokenDoc.expiresAt.getTime()) {
      await db.collection('DownloadTokens').deleteOne({ token });
      return res.status(410).json({ message: 'Token has expired' });
    }

    // Retrieve user document
    const userDoc = await db.collection('Users').findOne({
      Username: tokenDoc.username
    });

    if (!userDoc || !userDoc.AuthKey) {
      return res.status(404).json({ message: 'User  or key not found' });
    }

    // Delete the token after use
    await db.collection('DownloadTokens').deleteOne({ token });

    // Return the raw AuthKey
    res.json({ key: userDoc.AuthKey });

  } catch (error) {
    console.error('Key retrieval error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
});

// endpoint that updates user document with new password
app.patch('/password-change', validate([
  validationSchemas.user(),
  validationSchemas.oldPassword(),
  validationSchemas.newPassword()

]), async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }

  let client;
  try {
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
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Compare the provided old password with the stored hashed password
    const isOldPasswordCorrect = await bcrypt.compare(oldPassword, userDoc.Password);

    if (!isOldPasswordCorrect) {
      return res.status(401).json({
        message: 'Current password is incorrect'
      });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    const updateDoc = { $set: { Password: hashedNewPassword } };
    const result = await collection.updateOne(
      { Username: userDoc.Username },
      updateDoc
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({
        message: 'Failed to update password'
      });
    }

    res.json({
      message: 'Password successfully changed',
      confirm: true
    });

  } catch (error) {
    console.error('Error changing password:', error);

    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.toString()
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

//endpoint that changes password with recovery method 
app.patch('/change-password2', validate([
  validationSchemas.user(),
  validationSchemas.newPassword(),
  validationSchemas.recoveryKey()

]), async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }

  const { recoveryKey, newPassword } = req.body;
  let client;

  try {
    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const usersCollection = db.collection('Users');

    // Find user with matching recovery key more efficiently
    const matchedUser = await usersCollection.findOne({
      HashedAuthKey: { $exists: true }
    });

    if (!matchedUser) {
      return res.status(401).json({
        success: false,
        message: 'No user found with this recovery key'
      });
    }

    // Verify recovery key
    const isRecoveryKeyValid = await bcrypt.compare(recoveryKey, matchedUser.HashedAuthKey);

    if (!isRecoveryKeyValid) {
      // Log failed recovery key attempt
      logger.warn(`Failed recovery key attempt for user: ${matchedUser.Username}`);

      return res.status(401).json({
        success: false,
        message: 'Invalid recovery key'
      });
    }

    // Prevent using the same password
    const isNewPasswordSame = await bcrypt.compare(newPassword, matchedUser.Password);
    if (isNewPasswordSame) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as the current password'
      });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password
    const updateResult = await usersCollection.updateOne(
      { _id: matchedUser._id },
      {
        $set: {
          Password: hashedPassword
          // Optionally, you might want to invalidate the recovery key here
          // HashedAuthKey: null
        }
      }
    );

    if (updateResult.modifiedCount === 1) {
      // Log successful password change
      logger.info(`Password changed via recovery key for user: ${matchedUser.Username}`);

      return res.status(200).json({
        success: true,
        message: 'Password successfully changed. Please generate a new recovery key.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }
  } catch (error) {
    console.error('Password recovery error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      errorDetails: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// endpoint that updates username for user
app.patch('/change-username', async (req, res) => {
  try {
    const { user, newUsername } = req.body;

    if (user === newUsername) {
      res.status(400).json({ error: 'current username and new username cannot be the same' });
      return;
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');

    const usersCollection = db.collection('Users');
    const existingUser = await usersCollection.findOne({ Username: newUsername });

    if (existingUser) {
      res.status(400).json({ error: 'username_taken' });
      client.close();
      return;
    }

    const filter = { Username: user };
    const updateDoc = { $set: { Username: newUsername } };
    const result = await usersCollection.updateOne(filter, updateDoc);

    if (result.modifiedCount === 0) {
      res.status(404).json({ error: 'user not found' });
      client.close();
      return;
    }

    const notesCollection = db.collection('Notes');
    const notesFilter = { Username: user };
    const notesUpdateDoc = { $set: { Username: newUsername } };
    await notesCollection.updateMany(notesFilter, notesUpdateDoc);

    const screenersCollection = db.collection('Screeners');
    const screenersFilter = { UsernameID: user };
    const screenersUpdateDoc = { $set: { UsernameID: newUsername } };
    await screenersCollection.updateMany(screenersFilter, screenersUpdateDoc);

    const watchlistsCollection = db.collection('Watchlists');
    const watchlistsFilter = { UsernameID: user };
    const watchlistsUpdateDoc = { $set: { UsernameID: newUsername } };
    await watchlistsCollection.updateMany(watchlistsFilter, watchlistsUpdateDoc);

    client.close();
    res.json({ confirm: true });
  } catch (error) {
    console.error('Error changing username:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.delete('/account-delete', async (req, res) => {
  try {
    const { user, password } = req.body;

    let client;
    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const usersCollection = db.collection('Users');

    const userDoc = await usersCollection.findOne({ Username: user });

    if (!userDoc) {
      res.status(404).json({ error: 'user_not_found' });
      return;
    }

    if (userDoc.Password !== password) {
      res.status(401).json({ error: 'password_incorrect' });
      return;
    }

    // Delete user document
    await usersCollection.deleteOne({ Username: user });

    // Delete associated documents in other collections
    const screenersCollection = db.collection('Screeners');
    await screenersCollection.deleteMany({ UsernameID: user });

    const watchlistsCollection = db.collection('Watchlists');
    await watchlistsCollection.deleteMany({ UsernameID: user });

    const notesCollection = db.collection('Notes');
    await notesCollection.deleteMany({ Username: user });

    res.json({ confirm: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'internal_server_error' });
  } finally {
    client.close();
  }
});

app.get('/get-expiration-date', async (req, res) => {
  const username = req.query.user; // Get the user from query parameters

  if (!username) {
    return res.status(400).json({ error: 'User  parameter is required' });
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('EreunaDB');
    const usersCollection = db.collection('Users');

    // Find the user document based on the Username
    const userDoc = await usersCollection.findOne({ Username: username });

    if (!userDoc) {
      return res.status(404).json({ error: 'User  not found' });
    }

    const today = new Date();
    const expiresDate = new Date(userDoc.Expires); // Assuming 'Expires' is a date string

    // Calculate the difference in milliseconds
    const differenceInTime = expiresDate - today;

    // Calculate the difference in days
    const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));

    // Send back the difference in days
    res.json({ expirationDays: differenceInDays });
  } catch (error) {
    console.error('Error retrieving expiration date:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

//endpoint to display info results
app.get('/chart/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier.toUpperCase();

    const client = new MongoClient(uri);
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
      res.status(404).json({ message: 'Asset not found' });
      return;
    }

    res.json(assetInfo);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint to create new notes 
app.post('/:symbol/notes', async (req, res) => {
  try {
    const ticker = req.params.symbol.toUpperCase();
    const { note, Username } = req.body;

    // Validate character limit
    if (note.length > 350) {
      return res.status(400).json({ message: 'Note exceeds 350 character limit' });
    }

    const currentDate = new Date();

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Notes');

    // Check number of existing notes for the user and symbol
    const existingNotesCount = await collection.countDocuments({
      Symbol: ticker,
      Username: Username
    });

    // Check if user has reached the note limit
    if (existingNotesCount >= 10) {
      await client.close();
      return res.status(400).json({
        message: 'Maximum note limit (25) reached for this symbol'
      });
    }

    // Create a new note object
    const newNote = {
      Symbol: ticker,
      Message: note,
      Username: Username,
      Date: currentDate,
    };

    // Insert the new note object into the MongoDB collection
    const result = await collection.insertOne(newNote);

    if (!result.insertedId) {
      await client.close();
      return res.status(404).json({ message: 'Failed to insert note' });
    }

    await client.close();
    res.status(201).json({
      message: 'Note inserted successfully',
      note: newNote
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint to search notes 
app.get('/:user/:symbol/notes', async (req, res) => {
  try {
    const ticker = req.params.symbol.toUpperCase();
    const Username = req.params.user;

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Notes');

    // Find all notes for the given symbol and Username
    const notes = await collection.find({ Symbol: ticker, Username: Username }).toArray();

    if (!notes) {
      res.status(404).json({ message: 'No notes found' });
      return;
    }

    res.status(200).json(notes);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint to delete a note
app.delete('/:symbol/notes/:noteId', async (req, res) => {
  try {
    const ticker = req.params.symbol.toUpperCase();
    const noteId = req.params.noteId;
    const Username = req.query.user;

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Notes');

    // Find and delete the note with the given id, symbol, and Username
    const result = await collection.findOneAndDelete({ _id: new ObjectId(noteId), Symbol: ticker, Username: Username });

    if (!result.value) {
      res.status(404).json({ message: 'Note not found' });
      return;
    }

    res.status(200).json({ message: 'Note deleted successfully' });

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//this endpoint retrieves OHCL Data for the charts 
app.get('/:ticker/data', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData');

    const Data = await collection.find({ tickerID: ticker }).toArray();

    const formattedData = Data.map(item => ({
      time: item.timestamp.toISOString().slice(0, 10),
      open: parseFloat(item.open.toString().slice(0, 8)),
      high: parseFloat(item.high.toString().slice(0, 8)),
      low: parseFloat(item.low.toString().slice(0, 8)),
      close: parseFloat(item.close.toString().slice(0, 8)),
    }));

    res.send(formattedData);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//this endpoint retrieves volume Data for the charts 
app.get('/:ticker/data2', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData');

    const Data = await collection.find({ tickerID: ticker }).toArray();

    // Restructure and format the data
    const formattedData = Data.map(item => ({
      time: item.timestamp.toISOString().slice(0, 10),
      value: item.volume,
    }));

    res.send(formattedData);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//sends data for 10DMA (SMA)
app.get('/:ticker/data3', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData');

    const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

    // Calculate 20-day moving average
    const movingAverages = [];
    for (let i = 9; i < Data.length; i++) {
      const sum = Data.slice(i - 9, i + 1).reduce((acc, curr) => acc + curr.close, 0);
      const average = sum / 10;
      movingAverages.push({
        time: Data[i].timestamp.toISOString().slice(0, 10),
        value: average,
      });
    }

    res.send(movingAverages);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//sends data for 20DMA (SMA)
app.get('/:ticker/data4', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData');

    const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

    // Calculate 20-day moving average
    const movingAverages = [];
    for (let i = 19; i < Data.length; i++) {
      const sum = Data.slice(i - 19, i + 1).reduce((acc, curr) => acc + curr.close, 0);
      const average = sum / 20;
      movingAverages.push({
        time: Data[i].timestamp.toISOString().slice(0, 10),
        value: average,
      });
    }

    res.send(movingAverages);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//sends data for 50DMA (SMA)
app.get('/:ticker/data5', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData');

    const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

    // Calculate 20-day moving average
    const movingAverages = [];
    for (let i = 49; i < Data.length; i++) {
      const sum = Data.slice(i - 49, i + 1).reduce((acc, curr) => acc + curr.close, 0);
      const average = sum / 50;
      movingAverages.push({
        time: Data[i].timestamp.toISOString().slice(0, 10),
        value: average,
      });
    }

    res.send(movingAverages);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//sends data for 200DMA (SMA)
app.get('/:ticker/data6', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData');

    const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

    // Calculate 20-day moving average
    const movingAverages = [];
    for (let i = 199; i < Data.length; i++) {
      const sum = Data.slice(i - 199, i + 1).reduce((acc, curr) => acc + curr.close, 0);
      const average = sum / 200;
      movingAverages.push({
        time: Data[i].timestamp.toISOString().slice(0, 10),
        value: average,
      });
    }

    res.send(movingAverages);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//Weekly OHCL Data
app.get('/:ticker/data7', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData2');

    const Data = await collection.find({ tickerID: ticker }).toArray();

    // Restructure and format the data
    const formattedData = Data.map(item => ({
      time: item.timestamp.toISOString().slice(0, 10),
      open: parseFloat(item.open.toString().slice(0, 8)),
      high: parseFloat(item.high.toString().slice(0, 8)),
      low: parseFloat(item.low.toString().slice(0, 8)),
      close: parseFloat(item.close.toString().slice(0, 8)),
    }));

    res.send(formattedData);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Weekly Volume Data
app.get('/:ticker/data8', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData2');

    const Data = await collection.find({ tickerID: ticker }).toArray();

    // Restructure and format the data
    const formattedData = Data.map(item => ({
      time: item.timestamp.toISOString().slice(0, 10),
      value: item.volume,
    }));

    res.send(formattedData);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//sends data for 10DMA (SMA)
app.get('/:ticker/data9', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData2');

    const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

    // Calculate 20-day moving average
    const movingAverages = [];
    for (let i = 9; i < Data.length; i++) {
      const sum = Data.slice(i - 9, i + 1).reduce((acc, curr) => acc + curr.close, 0);
      const average = sum / 10;
      movingAverages.push({
        time: Data[i].timestamp.toISOString().slice(0, 10),
        value: average,
      });
    }

    res.send(movingAverages);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//sends data for 20DMA (SMA)
app.get('/:ticker/data10', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData2');

    const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

    // Calculate 20-day moving average
    const movingAverages = [];
    for (let i = 19; i < Data.length; i++) {
      const sum = Data.slice(i - 19, i + 1).reduce((acc, curr) => acc + curr.close, 0);
      const average = sum / 20;
      movingAverages.push({
        time: Data[i].timestamp.toISOString().slice(0, 10),
        value: average,
      });
    }

    res.send(movingAverages);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//sends data for 50DMA (SMA)
app.get('/:ticker/data11', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData2');

    const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

    // Calculate 20-day moving average
    const movingAverages = [];
    for (let i = 49; i < Data.length; i++) {
      const sum = Data.slice(i - 49, i + 1).reduce((acc, curr) => acc + curr.close, 0);
      const average = sum / 50;
      movingAverages.push({
        time: Data[i].timestamp.toISOString().slice(0, 10),
        value: average,
      });
    }

    res.send(movingAverages);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//sends data for 200DMA (SMA)
app.get('/:ticker/data12', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData2');

    const Data = await collection.find({ tickerID: ticker }).sort({ timestamp: 1 }).toArray();

    // Calculate 20-day moving average
    const movingAverages = [];
    for (let i = 199; i < Data.length; i++) {
      const sum = Data.slice(i - 199, i + 1).reduce((acc, curr) => acc + curr.close, 0);
      const average = sum / 200;
      movingAverages.push({
        time: Data[i].timestamp.toISOString().slice(0, 10),
        value: average,
      });
    }

    res.send(movingAverages);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Sends earnings date 
app.get('/:ticker/earningsdate', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('AssetInfo');

    const Data = await collection.find({ Symbol: ticker }).toArray();

    const formattedData = Data.flatMap(item => {
      const quarterlyIncomeArray = item.quarterlyIncome.map(quarterly => {
        const date = new Date(quarterly.fiscalDateEnding);
        return {
          time: {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
          },
        };
      });
      return quarterlyIncomeArray;
    });

    res.send(formattedData);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Sends splits date 
app.get('/:ticker/splitsdate', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('AssetInfo');

    const Data = await collection.find({ Symbol: ticker }).toArray();

    const formattedData = Data.flatMap(item => {
      const quarterlySplitsArray = item.splits.map(i => {
        const date = new Date(i.effective_date);
        return {
          time: {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
          },
        };
      });
      return quarterlySplitsArray;
    });

    res.send(formattedData);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that retrieves watchlists (names)
app.get('/:user/watchlists', async (req, res) => {
  try {
    const user = req.params.user;
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Watchlists');

    const userWatchlists = await collection.find({ UsernameID: user }).toArray();

    if (userWatchlists.length === 0) {
      res.status(404).json({ message: 'User not found or no watchlists found' });
      return;
    }

    res.send(userWatchlists);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that retrieves content of watchlists based on the selected name 
app.get('/:user/watchlists/:list', async (req, res) => {
  try {
    const user = req.params.user;
    const list = req.params.list;
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Watchlists');

    const Watchlists = await collection.findOne({ UsernameID: user, Name: list });

    if (!Watchlists) {
      res.status(404).json({ message: 'User  not found or no watchlists found' });
      return;
    }

    res.send(Watchlists.List);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 
app.get('/:symbol/quotes', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData');

    const documents = await collection.find({ tickerID: symbol }).sort({ timestamp: -1 }).toArray();

    if (documents.length > 0) {
      res.send({ close: documents[0].close });
    } else {
      res.status(404).json({ message: 'No quotes found for the given symbol' });
    }

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that calculates and sends difference in price for watchlist
app.get('/:symbol/changes', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData');

    const documents = await collection.find({ tickerID: symbol }).sort({ timestamp: -1 }).toArray();

    if (documents.length > 1) {
      const [latest, previous] = documents.slice(0, 2);
      const closeDiff = latest.close - previous.close;
      res.send({ closeDiff: closeDiff.toFixed(2) }); // send the difference as a float with 2 decimal places
    } else if (documents.length === 1) {
      res.send({ closeDiff: 0 }); // or some other default value if there's only one document
    } else {
      res.status(404).json({ message: 'No quotes found for the given symbol' });
    }

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that calculates perc change of symbols 
app.get('/:symbol/percchanges', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('OHCLVData');

    const documents = await collection.find({ tickerID: symbol }).sort({ timestamp: -1 }).toArray();

    if (documents.length > 1) {
      const [latest, previous] = documents.slice(0, 2);
      const closeDiff = latest.close - previous.close;
      const percChange = (closeDiff / previous.close) * 100;
      res.send({ percChange: percChange.toFixed(2) }); // send the percentage change as a float with 2 decimal places
    } else if (documents.length === 1) {
      res.send({ percChange: 0 }); // or some other default value if there's only one document
    } else {
      res.status(404).json({ message: 'No quotes found for the given symbol' });
    }

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint to add symbol to selected watchlist 
app.patch('/:user/watchlists/:list', async (req, res) => {
  try {
    const list = req.params.list;
    const user = req.params.user;
    const { Name, symbol } = req.body; // Get the Name and symbol from the request body
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Watchlists');

    const filter = { Name: list, UsernameID: user }; // Use the Name from the request body as the filter
    const update = { $addToSet: { List: symbol } }; // Add the symbol to the List array if it doesn't exist

    const result = await collection.updateOne(filter, update);

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: 'Watchlist not found or symbol already exists' });
      return;
    }

    res.send({ message: 'Ticker added successfully' }); // Return a success message

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that deletes ticker from selected watchlist 
app.patch('/:user/deleteticker/watchlists/:list/:ticker', async (req, res) => {
  try {
    const list = req.params.list;
    const ticker = req.params.ticker;
    const user = req.params.user;

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Watchlists');

    const filter = { Name: list, UsernameID: user }; // Use the Name from the request body as the filter
    const update = { $pull: { List: ticker } }; // Remove the ticker from the List array

    const result = await collection.updateOne(filter, update);

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: 'Watchlist not found' });
      return;
    }

    res.send({ message: 'Ticker deleted successfully' }); // Return a success message

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that deletes selected watchlist
app.delete('/:user/delete/watchlists/:list', async (req, res) => {
  try {
    const list = req.params.list;
    const user = req.params.user;

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Watchlists');

    const filter = { Name: list, UsernameID: user }; // Use the Name from the request body as the filter

    const result = await collection.deleteOne(filter);

    if (result.deletedCount === 0) {
      res.status(404).json({ message: 'Watchlist not found' });
      return;
    }

    res.send({ message: 'watchlist deleted successfully' }); // Return a success message

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that creates a new watchlist 
app.post('/:user/create/watchlists/:list', async (req, res) => {
  try {
    const list = req.params.list;
    const user = req.params.user;

    // Check if the watchlist name exceeds 20 characters
    if (list.length > 20) {
      return res.status(400).json({ message: 'Watchlist name cannot exceed 20 characters.' });
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Watchlists');

    // Check how many watchlists the user already has
    const existingWatchlistsCount = await collection.countDocuments({ UsernameID: user });

    if (existingWatchlistsCount >= 20) {
      return res.status(400).json({ message: 'User  cannot have more than 25 watchlists.' });
    }

    const document = { Name: list, UsernameID: user, List: [] };

    const result = await collection.insertOne(document);

    if (result.insertedCount === 1) {
      res.send({ message: 'Watchlist created successfully' });
    } else {
      res.status(500).json({ message: 'Error creating watchlist' });
    }

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that renames selected watchlist 
app.patch('/:user/rename/watchlists/:oldname', async (req, res) => {
  try {
    const oldname = req.params.oldname;
    const newname = req.body.newname;
    const Username = req.params.user;

    if (!newname) {
      res.status(400).json({ message: 'Please provide a new name' });
      return;
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Watchlists');

    const filter = { UsernameID: Username, Name: oldname };
    const updateDoc = { $set: { Name: newname } };

    const result = await collection.updateOne(filter, updateDoc);

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: 'Watchlist not found' });
      return;
    }

    client.close();
    res.json({ message: 'Watchlist renamed successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that handles creation of new screeners 
app.post('/:user/create/screener/:list', async (req, res) => {
  let client;
  try {
    const user = req.params.user;
    const list = req.params.list;

    // Check if screener name is too long
    if (list.length > 20) {
      return res.status(400).json({
        message: 'Screener name cannot be longer than 20 characters'
      });
    }

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Screeners');

    // Check the number of existing screeners for this user
    const screenerCount = await collection.countDocuments({ UsernameID: user });
    if (screenerCount >= 20) {
      return res.status(400).json({
        message: 'Maximum number of screeners (20) has been reached'
      });
    }

    // Check if a screener with the same name and username already exists
    const existingScreener = await collection.findOne({ UsernameID: user, Name: list });
    if (existingScreener) {
      return res.status(400).json({
        message: 'Screener with the same name already exists'
      });
    }

    // Create a new screener document
    const screenerDoc = {
      UsernameID: user,
      Name: list,
      Include: true,
      CreatedAt: new Date(), // Optional: add creation timestamp
    };

    const result = await collection.insertOne(screenerDoc);

    // Check if insertion was successful
    if (result.insertedCount === 1 || result.acknowledged) {
      return res.json({
        message: 'Screener created successfully',
        screenerCount: screenerCount + 1
      });
    } else {
      return res.status(500).json({ message: 'Failed to create screener' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    // Ensure client is closed if it was opened
    if (client) {
      await client.close();
    }
  }
});

// endpoint that renames selected screener
app.patch('/:user/rename/screener', async (req, res) => {
  let client;
  try {
    console.log('Received request:', req.body);
    const oldname = req.body.oldname; // Access oldname from the request body
    const newname = req.body.newname;
    const Username = req.params.user;

    // Check if new screener name is too long
    if (newname.length > 20) {
      return res.status(400).json({
        message: 'Screener name cannot be longer than 20 characters'
      });
    }

    // Check if new name is provided and different from old name
    if (!newname) {
      return res.status(400).json({ message: 'Please provide a new name' });
    }

    if (oldname === newname) {
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
      return res.status(400).json({
        message: 'A screener with this name already exists'
      });
    }

    const filter = { UsernameID: Username, Name: oldname };
    const updateDoc = { $set: { Name: newname } };

    console.log('Updating screener:', filter, updateDoc);

    const result = await collection.updateOne(filter, updateDoc);

    console.log('Update result:', result);

    // Check if any document was modified
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Screener not found' });
    }

    // Send success response
    return res.json({ message: 'Screener renamed successfully' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    // Ensure client is closed if it was opened
    if (client) {
      await client.close();
    }
  }
});

// endpoint that deletes selected screener 
app.delete('/:user/delete/screener/:list', async (req, res) => {
  try {
    const user = req.params.user;
    const list = req.params.list;

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Screeners');

    const filter = { Name: list, UsernameID: user }; // Use the Name from the request body as the filter

    const result = await collection.deleteOne(filter);

    if (result.deletedCount === 0) {
      res.status(404).json({ message: 'Screener not found' });
      return;
    }

    res.send({ message: 'screener deleted successfully' }); // Return a success message

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that sends unfiltered database data into screener results (minus hidden list for user)
app.get('/:user/screener/results/all', async (req, res) => {
  const user = req.params.user;
  try {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db('EreunaDB');

      // Find the user document and extract the 'Hidden' array
      const usersCollection = db.collection('Users');
      const userDoc = await usersCollection.findOne({ Username: user });
      if (!userDoc) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      const hiddenSymbols = userDoc.Hidden;

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
          DividendYield: 1,
          EPS: 1,
          Beta: 1,
          RSScore1W: 1,
          RSScore1M: 1,
          RSScore4M: 1,
          todaychange: 1,
          ytdchange: 1,
          _id: 0
        }
      }).toArray();

      res.send(filteredAssets);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that updates screener document with price parameters 
app.patch('/screener/price', async (req, res) => {
  try {
    let minPrice = parseFloat(req.body.minPrice);
    let maxPrice = parseFloat(req.body.maxPrice);
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    // Check if both minPrice and maxPrice are empty
    if (isNaN(minPrice) && isNaN(maxPrice)) {
      res.status(400).json({ message: 'Both min price and max price cannot be empty' });
      return;
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Screeners');
    const ohlcCollection = db.collection('OHCLVData');

    // If minPrice is NaN, set it to 0
    if (isNaN(minPrice)) {
      minPrice = 0;
    }

    // If maxPrice is NaN, find the highest 'close' value for the most recent day
    if (isNaN(maxPrice)) {
      // Step 1: Find the most recent timestamp
      const recentDate = await ohlcCollection.find({})
        .sort({ timestamp: -1 }) // Sort by timestamp descending
        .limit(1) // Get the most recent date
        .project({ timestamp: 1 }) // Only return the timestamp
        .toArray();

      if (recentDate.length > 0) {
        const mostRecentTimestamp = recentDate[0].timestamp;

        // Step 2: Extract all 'close' values for the most recent day
        const closeValues = await ohlcCollection.find({
          timestamp: {
            $gte: new Date(mostRecentTimestamp.setHours(0, 0, 0, 0)), // Start of the day
            $lt: new Date(mostRecentTimestamp.setHours(23, 59, 59, 999)) // End of the day
          }
        }).project({ close: 1 }).toArray();

        // Step 3: Sort close values and set maxPrice
        if (closeValues.length > 0) {
          const sortedCloseValues = closeValues.map(doc => doc.close).sort((a, b) => b - a); // Sort in descending order
          maxPrice = sortedCloseValues[0]; // Set maxPrice to the highest close value

          // Round up maxPrice to 2 decimal places
          maxPrice = Math.ceil(maxPrice * 100) / 100; // Rounding up to two decimal places
        }
      }
    }

    // Validate the updated minPrice and maxPrice
    if (minPrice >= maxPrice) {
      res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
      return;
    }

    const filter = { UsernameID: Username, Name: screenerName };
    const updateDoc = { $set: { Price: [minPrice, maxPrice] } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
      return;
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'Price range updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that updates screener document with market cap parameters 
app.patch('/screener/marketcap', async (req, res) => {
  let client;
  try {
    let minPrice = parseFloat(req.body.minPrice) * 1000;
    let maxPrice = parseFloat(req.body.maxPrice) * 1000;
    const Username = req.body.user;
    const screenerName = req.body.screenerName;

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('EreunaDB');

    // Check if both minPrice and maxPrice are empty
    if (isNaN(minPrice) && isNaN(maxPrice)) {
      res.status(400).json({ message: 'Both min price and max price cannot be empty' });
      return;
    }

    // If minPrice is empty, find the lowest MarketCapitalization
    if (isNaN(minPrice) && !isNaN(maxPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');
      const lowestMarketCapDoc = await assetInfoCollection.find({})
        .sort({ MarketCapitalization: 1 }) // Sort by MarketCapitalization ascending
        .limit(1) // Get the lowest value
        .project({ MarketCapitalization: 1 }) // Only return the MarketCapitalization field
        .toArray();

      if (lowestMarketCapDoc.length > 0) {
        minPrice = lowestMarketCapDoc[0].MarketCapitalization; // Set minPrice to the lowest MarketCapitalization
      } else {
        res.status(404).json({ message: 'No assets found to determine minimum price' });
        return;
      }
    }

    // If maxPrice is empty, find the highest MarketCapitalization
    if (isNaN(maxPrice) && !isNaN(minPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');
      const highestMarketCapDoc = await assetInfoCollection.find({})
        .sort({ MarketCapitalization: -1 }) // Sort by MarketCapitalization descending
        .limit(1) // Get the highest value
        .project({ MarketCapitalization: 1 }) // Only return the MarketCapitalization field
        .toArray();

      if (highestMarketCapDoc.length > 0) {
        maxPrice = highestMarketCapDoc[0].MarketCapitalization; // Set maxPrice to the highest MarketCapitalization
      } else {
        res.status(404).json({ message: 'No assets found to determine maximum price' });
        return;
      }
    }

    // Ensure minPrice is less than maxPrice
    if (minPrice >= maxPrice) {
      res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
      return;
    }

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { MarketCap: [minPrice, maxPrice] } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
      return;
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'MarketCap range updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close(); // Ensure client is closed if it was initialized
    }
  }
});

// endpoint that updates screener document with ipo date parameters 
app.patch('/screener/ipo-date', async (req, res) => {
  try {
    let minPrice = new Date(req.body.minPrice); // Parse as Date object
    let maxPrice = new Date(req.body.maxPrice); // Parse as Date object
    const Username = req.body.user;
    const screenerName = req.body.screenerName;

    // Check if both minPrice and maxPrice are invalid dates
    if (isNaN(minPrice.getTime()) && isNaN(maxPrice.getTime())) {
      res.status(400).json({ message: 'At least one of minPrice or maxPrice must be provided' });
      return;
    }

    // If minPrice is provided but maxPrice is not, set maxPrice to today's date
    if (!isNaN(minPrice.getTime()) && isNaN(maxPrice.getTime())) {
      maxPrice = new Date(); // Set to current date
    }

    // If maxPrice is provided but minPrice is not, find the oldest IPO date in the AssetInfo collection
    if (isNaN(minPrice.getTime()) && !isNaN(maxPrice.getTime())) {
      const client = new MongoClient(uri);
      await client.connect();

      const db = client.db('EreunaDB');
      const assetInfoCollection = db.collection('AssetInfo');

      const oldestIpoDate = await assetInfoCollection.find().sort({ IPO: 1 }).limit(1).toArray();
      if (oldestIpoDate.length > 0) {
        minPrice = new Date(oldestIpoDate[0].IPO); // Ensure it's a Date object
      } else {
        res.status(404).json({ message: 'No IPO dates found in AssetInfo collection' });
        return;
      }

      client.close();
    }

    // Validate minPrice and maxPrice
    if (minPrice >= maxPrice) {
      res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
      return;
    }

    // Update the screener document
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const screenerCollection = db.collection('Screeners');

    const filter = { UsernameID: Username, Name: screenerName };
    const updateDoc = { $set: { IPO: [minPrice, maxPrice] } };
    const options = { returnOriginal: false };
    const result = await screenerCollection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
    } else {
      console.log('Document updated');
    }

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: 'Screener not found' });
      return;
    }

    client.close();
    res.json({ message: 'ipo range updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that handles adding symbol to hidden list for user 
app.patch('/screener/:user/hidden/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const Username = req.params.user;

    if (!symbol) {
      res.status(400).json({ message: 'Please provide a symbol' });
      return;
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Users');

    const filter = { Username: Username };
    const updateDoc = { $addToSet: { Hidden: symbol } };
    const result = await collection.updateOne(filter, updateDoc);

    console.log('Document updated');
    client.close();
    res.json({ message: 'Hidden List updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that fetches hidden list for user 
app.get('/screener/results/:user/hidden', async (req, res) => {
  const username = req.params.user;
  try {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db('EreunaDB');
      const collection = db.collection('Users');
      const userDoc = await collection.findOne({ Username: username }, {
        projection: {
          Hidden: 1,
          _id: 0
        }
      });
      if (userDoc) {
        res.send(userDoc.Hidden);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that retrieves all screeners' names for user 
app.get('/screener/:user/names', async (req, res) => {
  const username = req.params.user;
  try {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db('EreunaDB');
      const collection = db.collection('Screeners');
      const userDocs = await collection.find({ UsernameID: username }, {
        projection: {
          Name: 1,
          Include: 1,
          _id: 0
        }
      }).toArray();

      if (userDocs.length > 0) {
        // Send the array of objects with Name and Include properties
        res.send(userDocs);
      } else {
        res.status(404).json({ message: 'Screeners not found' });
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that sends hidden list of user in results 
app.get('/:user/screener/results/hidden', async (req, res) => {
  const user = req.params.user;
  try {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db('EreunaDB');

      // Find the user document and extract the 'Hidden' array
      const usersCollection = db.collection('Users');
      const userDoc = await usersCollection.findOne({ Username: user });
      if (!userDoc) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      const hiddenSymbols = userDoc.Hidden;

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
          DividendYield: 1,
          EPS: 1,
          Beta: 1,
          RSScore1W: 1,
          RSScore1M: 1,
          RSScore4M: 1,
          todaychange: 1,
          ytdchange: 1,
          _id: 0
        }
      }).toArray();

      res.send(filteredAssets);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that removes ticker from hidden list 
app.patch('/screener/:user/show/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const Username = req.params.user;

    if (!symbol) {
      res.status(400).json({ message: 'Please provide a symbol' });
      return;
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Users');

    const filter = { Username: Username };
    const updateDoc = { $pull: { Hidden: symbol } };
    const result = await collection.updateOne(filter, updateDoc);

    console.log('Document updated');
    client.close();
    res.json({ message: 'Hidden List updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that retrieves all available sectors for user (for screener)
app.get('/screener/sectors', async (req, res) => {
  try {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db('EreunaDB');
      const assetInfoCollection = db.collection('AssetInfo');
      const sectors = await assetInfoCollection.distinct('Sector');
      const uniqueSectors = sectors.filter(sector => sector !== null && sector !== undefined);

      res.send(uniqueSectors);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that updates screener document with sector params 
app.patch('/screener/sectors', async (req, res) => {
  try {
    const sectors = req.body.sectors;
    const Username = req.body.user;
    const screenerName = req.body.screenerName;

    if (!sectors || sectors.length === 0) {
      res.status(400).json({ message: 'Please provide at least one sector' });
      return;
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { Sectors: sectors } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
    } else {
      console.log('Document updated');
    }

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: 'Screener not found' });
      return;
    }

    client.close();
    res.json({ message: 'Sectors updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that retrieves all available exchanges for user (screener)
app.get('/screener/exchange', async (req, res) => {
  try {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db('EreunaDB');
      const assetInfoCollection = db.collection('AssetInfo');
      const Exchange = await assetInfoCollection.distinct('Exchange');
      const uniqueExchange = Exchange.filter(Exchange => Exchange !== null && Exchange !== undefined);

      res.send(uniqueExchange);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that updates screener document with exchange params 
app.patch('/screener/exchange', async (req, res) => {
  try {
    const exchanges = req.body.exchanges;
    const Username = req.body.user;
    const screenerName = req.body.screenerName;

    if (!exchanges || exchanges.length === 0) {
      res.status(400).json({ message: 'Please provide at least one exchange' });
      return;
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { Exchanges: exchanges } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
    } else {
      console.log('Document updated');
    }

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: 'Screener not found' });
      return;
    }

    client.close();
    res.json({ message: 'exchanges updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that retrieves all available countries for user (screener)
app.get('/screener/country', async (req, res) => {
  try {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db('EreunaDB');
      const assetInfoCollection = db.collection('AssetInfo');

      // Use the `distinct` method to get an array of unique Sector values
      const Country = await assetInfoCollection.distinct('Country');

      // Remove any null or undefined values from the array
      const uniqueCountry = Country.filter(Country => Country !== null && Country !== undefined);

      res.send(uniqueCountry);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that updates screener document with country params 
app.patch('/screener/country', async (req, res) => {
  try {
    const countries = req.body.countries;
    const Username = req.body.user;
    const screenerName = req.body.screenerName;

    if (!countries || countries.length === 0) {
      res.status(400).json({ message: 'Please provide at least one country' });
      return;
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { Countries: countries } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
    } else {
      console.log('Document updated');
    }

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: 'Screener not found' });
      return;
    }

    client.close();
    res.json({ message: 'countries updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that updates screener document with PE parameters 
app.patch('/screener/pe', async (req, res) => {
  let client; // Declare client here
  try {
    let minPrice = parseFloat(req.body.minPrice);
    let maxPrice = parseFloat(req.body.maxPrice);
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    // Check if both minPrice and maxPrice are empty
    if (isNaN(minPrice) && isNaN(maxPrice)) {
      res.status(400).json({ message: 'Both min price and max price cannot be empty' });
      return;
    }

    // Set default minPrice to 1 if it is not provided or is less than 1
    if (isNaN(minPrice) || minPrice < 1) {
      minPrice = 1;
    }

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('EreunaDB');

    // If maxPrice is empty, find the highest PERatio excluding 'None'
    if (isNaN(maxPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');
      const highestPERatioDoc = await assetInfoCollection.find({
        PERatio: { $ne: 'None' } // Exclude 'None' values
      })
        .sort({ PERatio: -1 }) // Sort by PERatio descending
        .limit(1) // Get the highest value
        .project({ PERatio: 1 }) // Only return the PERatio field
        .toArray();

      if (highestPERatioDoc.length > 0) {
        maxPrice = highestPERatioDoc[0].PERatio; // Set maxPrice to the highest PERatio
      } else {
        res.status(404).json({ message: 'No assets found to determine maximum PE' });
        return;
      }
    }

    // Ensure minPrice is less than maxPrice
    if (minPrice >= maxPrice) {
      res.status(400).json({ message: 'Min cannot be higher than or equal to max' });
      return;
    }

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { PE: [minPrice, maxPrice] } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
      return;
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'document updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close(); // Ensure client is closed if it was initialized
    }
  }
})

// endpoint that updates screener document with Forward PE parameters 
app.patch('/screener/forward-pe', async (req, res) => {
  let client; // Declare client here
  let db; // Declare db here
  try {
    // Initialize the MongoDB client
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('EreunaDB'); // Initialize db here

    let minPrice = parseFloat(req.body.minPrice);
    let maxPrice = parseFloat(req.body.maxPrice);
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    // Check if both minPrice and maxPrice are empty
    if (isNaN(minPrice) && isNaN(maxPrice)) {
      return res.status(400).json({ message: 'Both minPrice and maxPrice cannot be empty' });
    }

    // If maxPrice is filled and minPrice is empty, set minPrice to 1
    if (isNaN(minPrice) && !isNaN(maxPrice)) {
      minPrice = 1; // Set default minPrice to 1
    }

    // If minPrice is filled and maxPrice is empty, find the highest ForwardPE
    if (!isNaN(minPrice) && isNaN(maxPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');

      const highestForwardPEDoc = await assetInfoCollection.find({ ForwardPE: { $gte: 0 } }) // Filter to exclude negative ForwardPE
        .sort({ ForwardPE: -1 }) // Sort by ForwardPE descending
        .limit(1) // Get the highest value
        .project({ ForwardPE: 1 }) // Only return the ForwardPE field
        .toArray();

      if (highestForwardPEDoc.length > 0) {
        maxPrice = highestForwardPEDoc[0].ForwardPE; // Set maxPrice to the highest ForwardPE
      } else {
        return res.status(404).json({ message: 'No assets found to determine maximum ForwardPE' });
      }
    }

    // Ensure minPrice is less than maxPrice
    if (minPrice >= maxPrice) {
      return res.status(400).json({ message: 'Min cannot be higher than or equal to max' });
    }

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { ForwardPE: [minPrice, maxPrice] } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
      return res.status(404).json({ message: 'Screener not found' });
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'document updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close(); // Ensure client is closed if it was initialized
    }
  }
});

// endpoint that updates screener document with PEG parameters 
app.patch('/screener/peg', async (req, res) => {
  let client;
  try {
    let minPrice = parseFloat(req.body.minPrice);
    let maxPrice = parseFloat(req.body.maxPrice);
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('EreunaDB');

    // Check if both minPrice and maxPrice are empty
    if (isNaN(minPrice) && isNaN(maxPrice)) {
      res.status(400).json({ message: 'Both min price and max price cannot be empty' });
      return;
    }

    // If minPrice is empty, find the lowest PEGRatio
    if (isNaN(minPrice) && !isNaN(maxPrice)) {
      minPrice = 1; // Set default minPrice to 1
    }

    // If maxPrice is empty, find the highest PEGRatio excluding 'None'
    if (isNaN(maxPrice) && !isNaN(minPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');
      const highestPERDoc = await assetInfoCollection.find({ PEGRatio: { $ne: 'None' } }) // Exclude 'None'
        .sort({ PEGRatio: -1 }) // Sort by PEGRatio descending
        .limit(1) // Get the highest value
        .project({ PEGRatio: 1 }) // Only return the PEGRatio field
        .toArray();

      if (highestPERDoc.length > 0) {
        maxPrice = highestPERDoc[0].PEGRatio; // Set maxPrice to the highest PEGRatio
      } else {
        res.status(404).json({ message: 'No assets found to determine maximum price' });
        return;
      }
    }

    // Ensure minPrice is less than maxPrice
    if (minPrice >= maxPrice) {
      res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
      return;
    }

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { PEG: [minPrice, maxPrice] } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
      return;
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'PEG range updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close(); // Ensure client is closed if it was initialized
    }
  }
})

// endpoint that updates screener document with PEG parameters 
app.patch('/screener/eps', async (req, res) => {
  let client;
  try {
    let minPrice = parseFloat(req.body.minPrice);
    let maxPrice = parseFloat(req.body.maxPrice);
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('EreunaDB');

    // Check if both minPrice and maxPrice are empty
    if (isNaN(minPrice) && isNaN(maxPrice)) {
      res.status(400).json({ message: 'Both min price and max price cannot be empty' });
      return;
    }

    // If minPrice is empty, set default minPrice to 1
    if (isNaN(minPrice) && !isNaN(maxPrice)) {
      minPrice = 1; // Set default minPrice to 1
    }

    // If maxPrice is empty, find the highest EPS excluding 'None'
    if (isNaN(maxPrice) && !isNaN(minPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');
      const highestEPSDoc = await assetInfoCollection.find({ EPS: { $ne: 'None' } }) // Exclude 'None'
        .sort({ EPS: -1 }) // Sort by EPS descending
        .limit(1) // Get the highest value
        .project({ EPS: 1 }) // Only return the EPS field
        .toArray();

      if (highestEPSDoc.length > 0) {
        maxPrice = highestEPSDoc[0].EPS; // Set maxPrice to the highest EPS
      } else {
        res.status(404).json({ message: 'No assets found to determine maximum price' });
        return;
      }
    }

    // Ensure minPrice is less than maxPrice
    if (minPrice >= maxPrice) {
      res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
      return;
    }

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { EPS: [minPrice, maxPrice] } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
      return;
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'EPS range updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close(); // Ensure client is closed if it was initialized
    }
  }
});

// endpoint that updates screener document with PS Ratio parameters 
app.patch('/screener/ps-ratio', async (req, res) => {
  let client;
  try {
    let minPrice = parseFloat(req.body.minPrice);
    let maxPrice = parseFloat(req.body.maxPrice);
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('EreunaDB');

    // Check if both minPrice and maxPrice are empty
    if (isNaN(minPrice) && isNaN(maxPrice)) {
      res.status(400).json({ message: 'Both min price and max price cannot be empty' });
      return;
    }

    // If minPrice is empty, set default minPrice to 1
    if (isNaN(minPrice) && !isNaN(maxPrice)) {
      minPrice = 1; // Set default minPrice to 1
    }

    // If maxPrice is empty, find the highest PriceToSalesRatioTTM excluding 'None' and '-'
    if (isNaN(maxPrice) && !isNaN(minPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');
      const highestPSRatioDoc = await assetInfoCollection.find({
        PriceToSalesRatioTTM: { $ne: 'None', $ne: '-' } // Exclude 'None' and '-'
      })
        .sort({ PriceToSalesRatioTTM: -1 }) // Sort by PriceToSalesRatioTTM descending
        .limit(1) // Get the highest value
        .project({ PriceToSalesRatioTTM: 1 }) // Only return the PriceToSalesRatioTTM field
        .toArray();

      if (highestPSRatioDoc.length > 0) {
        maxPrice = highestPSRatioDoc[0].PriceToSalesRatioTTM; // Set maxPrice to the highest PriceToSalesRatioTTM
      } else {
        res.status(404).json({ message: 'No assets found to determine maximum price' });
        return;
      }
    }

    // Ensure minPrice is less than maxPrice
    if (minPrice >= maxPrice) {
      res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
      return;
    }

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { PS: [minPrice, maxPrice] } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
      return;
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'Price to Sales Ratio range updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close(); // Ensure client is closed if it was initialized
    }
  }
});

// endpoint that updates screener document with PB Ratio parameters 
app.patch('/screener/pb-ratio', async (req, res) => {
  let client;
  try {
    let minPrice = parseFloat(req.body.minPrice);
    let maxPrice = parseFloat(req.body.maxPrice);
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('EreunaDB');

    // Check if both minPrice and maxPrice are empty
    if (isNaN(minPrice) && isNaN(maxPrice)) {
      res.status(400).json({ message: 'Both min price and max price cannot be empty' });
      return;
    }

    // If minPrice is empty, set default minPrice to 1
    if (isNaN(minPrice) && !isNaN(maxPrice)) {
      minPrice = 1; // Set default minPrice to 1
    }

    // If maxPrice is empty, find the highest PriceToBookRatio excluding 'None' and '-'
    if (isNaN(maxPrice) && !isNaN(minPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');
      const highestPBRatioDoc = await assetInfoCollection.find({
        PriceToBookRatio: { $ne: 'None', $ne: '-' } // Exclude 'None' and '-'
      })
        .sort({ PriceToBookRatio: -1 }) // Sort by PriceToBookRatio descending
        .limit(1) // Get the highest value
        .project({ PriceToBookRatio: 1 }) // Only return the PriceToBookRatio field
        .toArray();

      if (highestPBRatioDoc.length > 0) {
        maxPrice = highestPBRatioDoc[0].PriceToBookRatio; // Set maxPrice to the highest PriceToBookRatio
      } else {
        res.status(404).json({ message: 'No assets found to determine maximum price' });
        return;
      }
    }

    // Ensure minPrice is less than maxPrice
    if (minPrice >= maxPrice) {
      res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
      return;
    }

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { PB: [minPrice, maxPrice] } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    // Check if result is null
    if (!result || !result.value) {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
      return;
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'Price to Book Ratio range updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close(); // Ensure client is closed if it was initialized
    }
  }
});

// endpoint that updates screener document with Beta parameters 
app.patch('/screener/beta', async (req, res) => {
  let client;
  try {
    let minPrice = parseFloat(req.body.minPrice);
    let maxPrice = parseFloat(req.body.maxPrice);
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('EreunaDB');

    // Check if both minPrice and maxPrice are empty
    if (isNaN(minPrice) && isNaN(maxPrice)) {
      res.status(400).json({ message: 'Both min price and max price cannot be empty' });
      return;
    }

    // If minPrice is empty, find the lowest Beta excluding 'None' and '-'
    if (isNaN(minPrice) && !isNaN(maxPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');
      const lowestBetaDoc = await assetInfoCollection.find({
        Beta: { $ne: 'None', $ne: '-' } // Exclude 'None' and '-'
      })
        .sort({ Beta: 1 }) // Sort by Beta ascending
        .limit(1) // Get the lowest value
        .project({ Beta: 1 }) // Only return the Beta field
        .toArray();

      if (lowestBetaDoc.length > 0) {
        minPrice = lowestBetaDoc[0].Beta; // Set minPrice to the lowest Beta
      } else {
        res.status(404).json({ message: 'No assets found to determine minimum price' });
        return;
      }
    }

    // If maxPrice is empty, find the highest Beta excluding 'None' and '-'
    if (isNaN(maxPrice) && !isNaN(minPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');
      const highestBetaDoc = await assetInfoCollection.find({
        Beta: { $ne: 'None' } // Exclude 'None' and '-'
      })
        .sort({ Beta: -1 }) // Sort by Beta descending
        .limit(1) // Get the highest value
        .project({ Beta: 1 }) // Only return the Beta field
        .toArray();

      if (highestBetaDoc.length > 0) {
        maxPrice = highestBetaDoc[0].Beta; // Set maxPrice to the highest Beta
      } else {
        res.status(404).json({ message: 'No assets found to determine maximum price' });
        return;
      }
    }

    // Ensure minPrice is less than maxPrice
    if (minPrice >= maxPrice) {
      res.status(400).json({ message: 'Min price cannot be higher than or equal to max price' });
      return;
    }

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { Beta: [minPrice, maxPrice] } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    // Check if result is null
    if (!result || !result.value) {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
      return;
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'Beta range updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close(); // Ensure client is closed if it was initialized
    }
  }
});

// endpoint that updates screener document with dividend yield parameters 
app.patch('/screener/div-yield', async (req, res) => {
  let client;
  try {
    const minPrice = parseFloat(req.body.minPrice) / 100;
    const maxPrice = parseFloat(req.body.maxPrice) / 100;
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('EreunaDB');

    // Check if both minPrice and maxPrice are empty
    if (isNaN(minPrice) && isNaN(maxPrice)) {
      res.status(400).json({ message: 'Min and Max prices cannot both be empty' });
      return;
    }

    // Set minPrice to 0.001 if it is empty
    let effectiveMinPrice = isNaN(minPrice) ? 0.001 : minPrice;

    // Initialize effectiveMaxPrice
    let effectiveMaxPrice = maxPrice;

    // If maxPrice is empty, find the highest DividendYield from AssetInfo collection
    if (isNaN(maxPrice)) {
      const assetInfoCollection = db.collection('AssetInfo');
      const highestDividendYieldDoc = await assetInfoCollection.find({
        DividendYield: { $ne: 'None', $ne: '-', $exists: true, $type: 'number' } // Exclude 'None', '-' and non-numeric values
      })
        .sort({ DividendYield: -1 }) // Sort by DividendYield descending
        .limit(1) // Get the highest value
        .project({ DividendYield: 1 }) // Only return the DividendYield field
        .toArray();

      if (highestDividendYieldDoc.length > 0) {
        effectiveMaxPrice = highestDividendYieldDoc[0].DividendYield; // Set maxPrice to the highest DividendYield
      } else {
        res.status(404).json({ message: 'No assets found to determine maximum price' });
        return;
      }
    }

    // Validate the effective min and max prices
    if (effectiveMinPrice >= effectiveMaxPrice) {
      res.status(400).json({ message: 'Min cannot be higher than or equal to max' });
      return;
    }

    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');

    const updateDoc = { $set: { DivYield: [effectiveMinPrice, effectiveMaxPrice] } };
    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    // Check if result is null
    if (!result || !result.value) {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
      return;
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'Document updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close(); // Ensure client is closed if it was initialized
    }
  }
});

//endpoint is supposed to update document with growth % 
app.patch('/screener/fundamental-growth', async (req, res) => {
  let client;
  try {
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    if (!screenerName) {
      return res.status(400).json({ message: 'Please provide screener name' });
    }

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const filter = { UsernameID: Username, Name: screenerName };
    const collection = db.collection('Screeners');
    const assetInfoCollection = db.collection('AssetInfo');

    const updateDoc = {
      $set: {}
    };

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

      // If both values are empty, do nothing for that pair
      if (min === null && max === null) {
        continue;
      }

      // If min value is empty and max value is filled
      if (min === null && max !== null) {
        const lowestDoc = await assetInfoCollection.find({ [attribute]: { $ne: 'None', $ne: '-' } })
          .sort({ [attribute]: 1 })
          .limit(1)
          .project({ [attribute]: 1 })
          .toArray();

        if (lowestDoc.length > 0) {
          updateDoc.$set[attribute] = [lowestDoc[0][attribute], parseFloat(max) / 100];
        } else {
          return res.status(404).json({ message: `No assets found to determine minimum ${attribute}` });
        }
      }

      // If max value is empty and min value is filled
      if (max === null && min !== null) {
        const highestDoc = await assetInfoCollection.find({ [attribute]: { $ne: 'None', $ne: '-' } })
          .sort({ [attribute]: -1 })
          .limit(1)
          .project({ [attribute]: 1 })
          .toArray();

        if (highestDoc.length > 0) {
          updateDoc.$set[attribute] = [parseFloat(min) / 100, highestDoc[0][attribute]];
        } else {
          return res.status(404).json({ message: `No assets found to determine maximum ${attribute}` });
        }
      }

      // If both values are provided, divide the min value by 100
      if (min !== null && max !== null) {
        updateDoc.$set[attribute] = [parseFloat(min) / 100, parseFloat(max) / 100];
      }
    }

    const options = { returnOriginal: false };
    const result = await collection.findOneAndUpdate(filter, updateDoc, options);

    if (!result.value) {
      console.log('Document not found');
      return res.status(404).json({ message: 'Screener not found' });
    } else {
      console.log('Document updated');
    }

    res.json({ message: 'Document updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close(); // Ensure client is closed if it was initialized
    }
  }
})

// endpoint that updates screener document with volume parameters 
app.patch('/screener/volume', async (req, res) => {
  try {
    const value1 = req.body.value1 ? Math.max(parseFloat(req.body.value1), 0.1) : null;
    const value2 = req.body.value2 ? parseFloat(req.body.value2) : null;
    const value3 = req.body.value3 ? Math.max(parseFloat(req.body.value3), 1) : null;
    const value4 = req.body.value4 ? parseFloat(req.body.value4) : null;
    const relVolOption = req.body.relVolOption;
    const avgVolOption = req.body.avgVolOption;
    const screenerName = req.body.screenerName;
    const Username = req.body.user;

    const client = new MongoClient(uri);
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

    if (Object.keys(updateDoc).length === 0) {
      console.log('No updates to apply');
      res.status(200).json({ message: 'No updates to apply' });
      return;
    }

    const options = { returnOriginal: false };
    const result = await screenersCollection.findOneAndUpdate(filter, { $set: updateDoc }, options);

    if (!result.value) {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
      return;
    }

    console.log('Document updated');
    client.close();
    res.json({ message: 'document updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that updates screener document with RS Score parameters 
app.patch('/screener/rs-score', async (req, res) => {
  try {
    const value1 = req.body.value1 ? parseFloat(req.body.value1) : null
    const value2 = req.body.value2 ? parseFloat(req.body.value2) : null
    const value3 = req.body.value3 ? parseFloat(req.body.value3) : null
    const value4 = req.body.value4 ? parseFloat(req.body.value4) : null
    const value5 = req.body.value5 ? parseFloat(req.body.value5) : null
    const value6 = req.body.value6 ? parseFloat(req.body.value6) : null
    const screenerName = req.body.screenerName
    const Username = req.body.user

    const client = new MongoClient(uri)
    await client.connect()

    const db = client.db('EreunaDB')

    const filter = { UsernameID: Username, Name: screenerName }
    const collection = db.collection('Screeners')

    const updateDoc = { $set: {} }

    // Define pairs and default values
    const pairs = [
      { key: 'RSScore1M', values: [value1, value2], defaults: [1, 100] },
      { key: 'RSScore4M', values: [value3, value4], defaults: [1, 100] },
      { key: 'RSScore1W', values: [value5, value6], defaults: [1, 100] },
    ]

    // Process pairs
    pairs.forEach((pair) => {
      const values = pair.values
      const defaults = pair.defaults

      // Check if at least one value is present
      if (values.some((value) => value !== null)) {
        // Create a new array with default values for missing pairs
        const newArray = values.map((value, index) => value !== null ? value : defaults[index])

        // Add the new array to the update document
        if (!updateDoc.$set[pair.key]) {
          updateDoc.$set[pair.key] = newArray
        } else {
          updateDoc.$set[pair.key].push(...newArray)
        }
      }
    })

    // Check if any updates are present
    if (Object.keys(updateDoc.$set).length === 0) {
      console.log('No values to update')
      res.status(400).json({ message: 'No values to update' })
      return
    }

    const options = { returnOriginal: false }
    const result = await collection.findOneAndUpdate(filter, updateDoc, options)

    if (!result.value) {
      console.log('Document not found')
      res.status(404).json({ message: 'Screener not found' })
      return
    }

    console.log('Document updated')
    client.close()
    res.json({ message: 'document updated successfully' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

// endpoint that updates screener document with price peformance parameters 
app.patch('/screener/price-performance', async (req, res) => {
  try {
    const value1 = req.body.value1 ? parseFloat(req.body.value1) : null
    const value2 = req.body.value2 ? parseFloat(req.body.value2) : null
    const value3 = req.body.value3 ? req.body.value3.trim() : null
    const value4 = req.body.value4 ? parseFloat(req.body.value4) : null
    const value5 = req.body.value5 ? parseFloat(req.body.value5) : null
    const value6 = req.body.value6 ? parseFloat(req.body.value6) : null
    const value7 = req.body.value7 ? parseFloat(req.body.value7) : null
    const value8 = req.body.value8 ? req.body.value8.trim() : null
    const value9 = req.body.value9 ? req.body.value9.trim() : null
    const value10 = req.body.value10 ? req.body.value10 : null
    const value11 = req.body.value11 ? req.body.value11 : null
    const value12 = req.body.value12 ? req.body.value12 : null
    const value13 = req.body.value13 ? req.body.value13 : null
    const screenerName = req.body.screenerName
    const Username = req.body.user

    const client = new MongoClient(uri)
    await client.connect()

    const db = client.db('EreunaDB')

    const filter = { UsernameID: Username, Name: screenerName }
    const collection = db.collection('Screeners')
    const assetInfoCollection = db.collection('AssetInfo')

    const updateDoc = { $set: {} }

    // New logic for changePerc
    if (value1 !== null || value2 !== null) {
      updateDoc.$set.changePerc = []

      if (value1 === null && value2 !== null) {
        updateDoc.$set.changePerc.push(0.01)
        updateDoc.$set.changePerc.push(value2)
      } else if (value1 !== null && value2 === null) {
        updateDoc.$set.changePerc.push(value1)

        let attributeToCheck
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
        ]).toArray()

        updateDoc.$set.changePerc.push(maxValue[0]?.value || value1)
      } else if (value1 !== null && value2 !== null) {
        updateDoc.$set.changePerc.push(value1)
        updateDoc.$set.changePerc.push(value2)
      }

      if (value3 !== null && value3 !== '') {
        updateDoc.$set.changePerc.push(value3)
      }
    }


    if (value4 !== null || value5 !== null) {
      updateDoc.$set.PercOffWeekHigh = []
      if (value4 !== null && value5 === null) {
        updateDoc.$set.PercOffWeekHigh.push(value4)
        const maxValue = await assetInfoCollection.aggregate([
          { $group: { _id: null, value: { $max: '$percoff52WeekHigh' } } }
        ]).toArray()
        updateDoc.$set.PercOffWeekHigh.push(maxValue[0]?.value)
      } else if (value4 === null && value5 !== null) {
        const minValue = await assetInfoCollection.aggregate([
          { $group: { _id: null, value: { $min: '$percoff52WeekHigh' } } }
        ]).toArray()
        updateDoc.$set.PercOffWeekHigh.push(minValue[0]?.value)
        updateDoc.$set.PercOffWeekHigh.push(value5)
      } else {
        updateDoc.$set.PercOffWeekHigh.push(value4)
        updateDoc.$set.PercOffWeekHigh.push(value5)
      }
    }

    // New logic for PercOffWeekLow
    if (value6 !== null || value7 !== null) {
      updateDoc.$set.PercOffWeekLow = []
      if (value6 !== null && value7 === null) {
        updateDoc.$set.PercOffWeekLow.push(value6)
        const maxValue = await assetInfoCollection.aggregate([
          { $group: { _id: null, value: { $max: '$percoff52WeekLow' } } }
        ]).toArray()
        updateDoc.$set.PercOffWeekLow.push(maxValue[0]?.value)
      } else if (value6 === null && value7 !== null) {
        const minValue = await assetInfoCollection.aggregate([
          { $group: { _id: null, value: { $min: '$percoff52WeekLow' } } }
        ]).toArray()
        updateDoc.$set.PercOffWeekLow.push(minValue[0]?.value)
        updateDoc.$set.PercOffWeekLow.push(value7)
      } else {
        updateDoc.$set.PercOffWeekLow.push(value6)
        updateDoc.$set.PercOffWeekLow.push(value7)
      }
    }

    if (value8 !== null && value8 !== 'no') {
      updateDoc.$set.NewHigh = value8
    }

    if (value9 !== null && value9 !== 'no') {
      updateDoc.$set.NewLow = value9
    }

    if (value10 !== null && value10 !== '-') {
      updateDoc.$set.MA200 = value10
    }

    if (value11 !== null && value11 !== '-') {
      updateDoc.$set.MA50 = value11
    }

    if (value12 !== null && value12 !== '-') {
      updateDoc.$set.MA20 = value12
    }

    if (value13 !== null && value13 !== '-') {
      updateDoc.$set.MA10 = value13
    }

    if (Object.keys(updateDoc.$set).length === 0) {
      console.log('No values to update')
      res.status(400).json({ message: 'No values to update' })
      return
    }

    const options = { returnOriginal: false }
    const result = await collection.findOneAndUpdate(filter, updateDoc, options)

    if (!result.value) {
      console.log('Document not found')
      res.status(404).json({ message: 'Screener not found' })
      return
    }

    console.log('Document updated')
    client.close()
    res.json({ message: 'document updated successfully' })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

app.get('/screener/performance/:ticker', async (req, res) => {
  try {
    const symbol = req.params.ticker;
    const client = new MongoClient(uri);
    try {
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

      res.send(performanceData);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Full Reset screener parameters 
app.patch('/screener/reset/:user/:name', async (req, res) => {
  try {
    const UsernameID = req.params.user;
    const Name = req.body.Name;

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Screeners');

    const filter = { UsernameID: UsernameID, Name: Name };
    console.log('Filter:', filter);

    const updateDoc = {
      $set: {
        UsernameID: UsernameID,
        Name: Name,
      },
      $unset: {}
    };

    const fields = await collection.findOne(filter, { projection: { _id: 0 } });
    Object.keys(fields).forEach(field => {
      if (field !== 'UsernameID' && field !== 'Name') {
        updateDoc.$unset[field] = '';
      }
    });

    const options = { returnOriginal: false };

    const result = await collection.findOneAndUpdate(filter, updateDoc, options);
    console.log('Result:', result);

    if (result.value) {
      console.log('Document updated');
      res.json({ message: 'document updated successfully' });
    } else {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
    }

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Reset Individual screener parameter 
app.patch('/reset/screener/param', async (req, res) => {
  try {
    const UsernameID = req.body.user;
    const Name = req.body.Name;
    const value = req.body.stringValue;

    const client = new MongoClient(uri);
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
      default:
        console.log(`Unknown value: ${value}`);
        res.status(400).json({ message: `Unknown value: ${value}` });
        return;
    }

    const options = { returnOriginal: false };

    const result = await collection.findOneAndUpdate(filter, updateDoc, options);
    console.log('Result:', result); // Log the result of the update operation

    if (result.value) { // Check if a document was found and updated
      console.log('Document updated');
      res.json({ message: 'document updated successfully' });
    } else {
      console.log('Document not found');
      res.status(404).json({ message: 'Screener not found' });
    }

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// retrieves params from individual screener document 
app.get('/screener/datavalues/:user/:name', async (req, res) => {
  const usernameID = req.params.user;
  const name = req.params.name;

  try {
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
        PercOffWeekLow: 1, changePerc: 1, IPO: 1,
      };

      const cursor = assetInfoCollection.find(query, { projection: projection });
      const result = await cursor.toArray();

      if (result.length === 0) {
        res.status(404).send({ message: 'No document found' });
      } else {
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
        };
        res.send(response);
      }
    } finally {
      await client.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Error connecting to database' });
  }
});

// endpoint that sends filtered results for screener
app.get('/screener/:user/results/filtered/:name', async (req, res) => {
  const user = req.params.user;
  try {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db('EreunaDB');
      const screenerName = req.params.name;

      const usersCollection = db.collection('Users');
      const userDoc = await usersCollection.findOne({ Username: user });
      if (!userDoc) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const hiddenSymbols = userDoc.Hidden;

      const screenersCollection = db.collection('Screeners');
      const screenerData = await screenersCollection.findOne({ UsernameID: user, Name: screenerName });
      if (!screenerData) {
        res.status(404).json({ message: 'Screener data not found' });
        return;
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

      if (screenerData.RSScore1W && screenerData.RSScore1W[0] !== 0 && screenerData.RSScore1W[1] !== 0) {
        screenerFilters.RSScore1W = screenerData.RSScore1W;
      }

      if (screenerData.RSScore1M && screenerData.RSScore1M[0] !== 0 && screenerData.RSScore1M[1] !== 0) {
        screenerFilters.RSScore1M = screenerData.RSScore1M;
      }

      if (screenerData.RSScore4M && screenerData.RSScore4M[0] !== 0 && screenerData.RSScore4M[1] !== 0) {
        screenerFilters.RSScore4M = screenerData.RSScore4M;
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
              $gt: screenerFilters.RSScore1W[0],
              $lt: screenerFilters.RSScore1W[1]
            };
            break;
          case 'RSScore1M':
            query.RSScore1M = {
              $gt: screenerFilters.RSScore1M[0],
              $lt: screenerFilters.RSScore1M[1]
            };
            break;
          case 'RSScore4M':
            query.RSScore4M = {
              $gt: screenerFilters.RSScore4M[0],
              $lt: screenerFilters.RSScore4M[1]
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
        DividendYield: 1,
        EPS: 1,
        Beta: 1,
        RSScore1W: 1,
        RSScore1M: 1,
        RSScore4M: 1,
        todaychange: 1,
        _id: 0
      }).toArray();

      res.send(filteredAssets);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that sends summary for selected screener 
app.get('/screener/summary/:usernameID/:name', async (req, res) => {
  try {
    const { usernameID, name } = req.params;
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db('EreunaDB');
      const assetInfoCollection = db.collection('Screeners');
      const filter = { UsernameID: usernameID, Name: name };

      const performanceData = await assetInfoCollection.findOne(filter);

      if (!performanceData) {
        res.status(404).json({ message: 'Document not found' });
        return;
      }

      const attributes = [
        'Price', 'MarketCap', 'Sectors', 'Exchanges', 'Countries', 'PE', 'ForwardPE', 'PEG', 'EPS', 'PS', 'PB', 'Beta', 'DivYield',
        'EPSQoQ', 'EPSYoY', 'EarningsQoQ', 'EarningsYoY', 'RevQoQ', 'RevYoY', 'changePerc', 'PercOffWeekHigh', 'PercOffWeekLow',
        'NewHigh', 'NewLow', 'MA10', 'MA20', 'MA50', 'MA200', 'RSScore1W', 'RSScore1M', 'RSScore4M', 'RSScore1W', 'AvgVolume1W', 'RelVolume1W',
        'AvgVolume1M', 'RelVolume1M', 'AvgVolume6M', 'RelVolume6M', 'AvgVolume1Y', 'RelVolume1Y', '1mchange', '1ychange', '4mchange',
        '6mchange', 'todaychange', 'weekchange', 'ytdchange', 'IPO',
      ];

      const filteredData = attributes.reduce((acc, attribute) => {
        if (Object.prototype.hasOwnProperty.call(performanceData, attribute)) {
          acc[attribute] = performanceData[attribute];
        }
        return acc;
      }, {});

      res.send(filteredData);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that sends combined screener results and removes duplicate values 
app.get('/screener/:usernameID/all', async (req, res) => {
  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db('EreunaDB');
    const screenersCollection = db.collection('Screeners');
    const usernameId = req.params.usernameID;

    const screeners = await screenersCollection.find({ UsernameID: usernameId, Include: true }).toArray();
    const screenerNames = screeners.map(screener => screener.Name); // list of names 

    const usersCollection = db.collection('Users');
    const userDoc = await usersCollection.findOne({ Username: usernameId });

    const tickerScreenerMap = new Map();
    const filteredAssetsArray = [];

    for (const screenerName of screenerNames) {
      try {
        const assetInfoCollection = db.collection('AssetInfo');
        const query = { Symbol: { $nin: userDoc.Hidden } };
        const aggregation = [];

        const screenerData = await screenersCollection.findOne({ UsernameID: usernameId, Name: screenerName, Include: true });
        if (!screenerData) {
          throw new Error('Screener data not found');
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
                $gt: screenerFilters.RSScore1W[0],
                $lt: screenerFilters.RSScore1W[1]
              };
              break;
            case 'RSScore1M':
              query.RSScore1M = {
                $gt: screenerFilters.RSScore1M[0],
                $lt: screenerFilters.RSScore1M[1]
              };
              break;
            case 'RSScore4M':
              query.RSScore4M = {
                $gt: screenerFilters.RSScore4M[0],
                $lt: screenerFilters.RSScore4M[1]
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
          DividendYield: 1,
          EPS: 1,
          Beta: 1,
          RSScore1W: 1,
          RSScore1M: 1,
          RSScore4M: 1,
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
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }

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
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      client.close();
    }
  }
});

app.patch('/watchlists/update-order/:Username/:Name', async (req, res) => {
  try {
    const { user, Name, newListOrder } = req.body;
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Watchlists');

    const filter = { UsernameID: user, Name: Name };
    const update = { $set: { List: newListOrder } };

    const result = await collection.updateOne(filter, update, { upsert: true });

    if (result.upsertedCount === 1) {
      console.log('Document created');
    } else if (result.modifiedCount === 1) {
      console.log('Document updated');
    } else {
      console.log('No documents found that match the filter');
      res.status(404).json({ message: 'Watchlist not found' });
      return;
    }

    res.send({ message: 'Watchlist order updated successfully' });

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.patch('/watchlist/addticker/:isAdding', async (req, res) => {
  let client;
  try {
    const isAdding = req.params.isAdding === 'true';
    const { watchlistName, symbol, user } = req.body;

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Watchlists');

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
      res.status(404).json({ message: 'Watchlist not found' });
      return;
    }

    if (result.modifiedCount === 0) {
      res.status(200).json({ message: isAdding ? 'Symbol already in watchlist' : 'Symbol not in watchlist' });
      return;
    }

    res.status(200).json({
      message: isAdding ? 'Ticker added successfully' : 'Ticker removed successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

app.get('/data/highlow', async (req, res) => {
  try {
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('HighLowIndicator');

    const data = await collection.find().sort({ timestamp: 1 }).toArray();

    const result = data.map((doc) => ({
      time: doc.timestamp.toISOString().slice(0, 10),
      value: doc.NetHighLow,
    }));

    res.send(result);

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that toggles value for screener, to include or exclude from combined list
app.patch('/:user/toggle/screener/:list', async (req, res) => {
  try {
    const user = req.params.user;
    const list = req.params.list;

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Screeners');

    // Find the screener document
    const filter = { Name: list, UsernameID: user };
    const screener = await collection.findOne(filter);

    if (!screener) {
      res.status(404).json({ message: 'Screener not found' });
      return;
    }

    // Toggle the Include attribute
    const updatedIncludeValue = !screener.Include; // Switch the boolean value

    // Update the document in the database
    const updateResult = await collection.updateOne(filter, {
      $set: { Include: updatedIncludeValue }
    });

    if (updateResult.modifiedCount === 0) {
      res.status(500).json({ message: 'Failed to update screener' });
      return;
    }

    res.send({ message: 'Screener updated successfully', Include: updatedIncludeValue });

    client.close();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// endpoint that retrieves watchlists for a specific user
app.get('/:user/full-watchlists', async (req, res) => {
  try {
    const user = req.params.user; // Get the user from the request parameters
    const client = new MongoClient(uri); // Create a new MongoClient
    await client.connect(); // Connect to the MongoDB server

    const db = client.db('EreunaDB'); // Access the EreunaDB database
    const collection = db.collection('Watchlists'); // Access the Watchlists collection

    // Find all watchlists for the given user
    const userWatchlists = await collection.find({ UsernameID: user }, { projection: { _id: 0, Name: 1, List: 1 } }).toArray();

    if (userWatchlists.length === 0) {
      res.status(404).json({ message: 'No watchlists found for the user' });
      return;
    }

    res.send(userWatchlists); // Send the found watchlists back to the client

    client.close(); // Close the database connection
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' }); // Handle any errors
  }
});

// Maintenance status GET endpoint
app.get('/maintenance-status', async (req, res) => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('EreunaDB');
    const systemSettings = db.collection('systemSettings');

    const status = await systemSettings.findOne({ name: 'EreunaApp' });
    return res.json({ maintenance: status ? status.maintenance : false });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    client.close();
  }
});

// Maintenance status POST endpoint
app.post('/maintenance-status', async (req, res) => {
  const client = new MongoClient(uri);
  try {
    const { maintenance } = req.body;

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

    return res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    client.close();
  }
});

// retrieves receipts for the user 
app.get('/get-receipts/:user', async (req, res) => {
  let client;
  try {
    const user = req.params.user;
    console.log('Looking for user:', user);

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const usersCollection = db.collection('Users');

    // Use a case-insensitive query with regex
    const userDoc = await usersCollection.findOne({
      Username: { $regex: new RegExp(`^${user}$`, 'i') }
    });

    console.log('Found user document:', userDoc);

    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Let's also log the _id we're going to use
    console.log('User _id:', userDoc._id);

    // Connect to the Receipts collection
    const receiptsCollection = db.collection('Receipts');

    // Find receipts and log the query we're using
    const query = { UserID: userDoc._id };
    console.log('Receipt query:', query);

    const userReceipts = await receiptsCollection.find(query).toArray();
    console.log('Found receipts:', userReceipts);

    res.json({ receipts: userReceipts });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

app.get('/symbols-exchanges', async (req, res) => {
  let client;
  try {
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
      res.status(404).json({ message: 'No documents found' });
      return;
    }

    res.send(documents);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// endpoint that retrieves default symbol for user
app.get('/:user/default-symbol', async (req, res) => {
  let client;
  try {
    const username = req.params.user;

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Users');

    const userDoc = await collection.findOne(
      { Username: username },
      { projection: { defaultSymbol: 1, _id: 0 } }
    );

    if (!userDoc) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ defaultSymbol: userDoc.defaultSymbol });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// endpoint that updates default symbol for user
app.patch('/:user/update-default-symbol', async (req, res) => {
  let client;
  try {
    const username = req.params.user;
    const { defaultSymbol } = req.body;

    if (!defaultSymbol) {
      res.status(400).json({ message: 'Default symbol is required' });
      return;
    }

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db('EreunaDB');
    const collection = db.collection('Users');

    const result = await collection.updateOne(
      { Username: username },
      { $set: { defaultSymbol: defaultSymbol.toUpperCase() } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (result.modifiedCount === 0) {
      res.status(400).json({ message: 'No changes made' });
      return;
    }

    res.json({ message: 'Default symbol updated successfully' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});