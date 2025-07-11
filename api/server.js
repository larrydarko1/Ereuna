import express from 'express';
import fs from 'fs';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import argon2 from 'argon2';
import config from './utils/config.js';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import crypto from 'crypto';
import helmet from 'helmet';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { logger, obfuscateUsername, httpLogger, securityLogger, metricsHandler as importedMetricsHandler } from './utils/logger.js';
import { validate, validationSchemas, validationSets, body, sanitizeInput, query } from './utils/validationUtils.js';

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

// Import Routes 
import Users from './routes/Users.js';
import Notes from './routes/Notes.js';
import Charts from './routes/Charts.js';
import Watchlists from './routes/Watchlists.js';
import Screener from './routes/Screener.js';
import Maintenance from './routes/Maintenance.js';
import Portfolio from './routes/Portfolio.js';

Users(app, { validate, validationSchemas, sanitizeInput, logger, securityLogger, crypto, MongoClient, uri, argon2, jwt, config });
Notes(app, { validate, validationSchemas, validationSets, sanitizeInput, logger, obfuscateUsername, MongoClient, uri });
Charts(app, { validate, validationSchemas, validationSets, sanitizeInput, logger, MongoClient, uri });
Watchlists(app, { validate, validationSchemas, validationSets, body, sanitizeInput, logger, obfuscateUsername, MongoClient, uri });
Screener(app, { validate, validationSchemas, validationSets, sanitizeInput, logger, obfuscateUsername, MongoClient, uri, crypto });
Maintenance(app, { validate, body, sanitizeInput, logger, MongoClient, uri, crypto });
Portfolio(app, { validate, validationSchemas, body, query, sanitizeInput, logger, MongoClient, uri });