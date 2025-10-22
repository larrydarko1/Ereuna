import express, { Request, Response } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import argon2 from 'argon2';
import config from './utils/config.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger, { handleError } from './utils/logger.js';
// TLS is handled by Traefik at the edge. Run the API as plain HTTP and let Traefik terminate TLS.
import { validate, validationSchemas, validationSets, body, sanitizeInput, query, sanitizeUsername, sanitizeUsernameCanonical } from './utils/validationUtils.js';

dotenv.config();

// CORS and Rate Limiting
// In production, requests come through nginx proxy so they appear same-origin
// In development, frontend runs on :3500 and backend on :5500 (different ports = CORS needed)
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
    'https://ereuna.io',
    'https://www.ereuna.io',
    // For internal container-to-container communication if needed
    'http://frontend:3500'
  ]
  : [
    'http://localhost:3500',
    'https://localhost:3500',
    'http://localhost',
    'https://localhost'
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

const app = express();
app.set('trust proxy', 1); // Trust the proxy (Traefik)
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
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (origin && allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Use logger.error for unauthorized CORS requests
      logger.error({
        msg: 'Unauthorized CORS request',
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
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many login attempts, please try again later',
  handler: (req: Request, res: Response) => {
    // Use handleError for brute force attacks and log security event
    logger.warn({
      msg: 'Potential brute force attack',
      ip: req.ip,
      path: req.path
    });
    const errResponse = handleError('Too many requests, possible brute force', 'BruteForceProtection', {
      ip: req.ip,
      path: req.path
    }, 429);
    res.status(429).json({
      status: 'error',
      message: errResponse.message
    });
  }
});

// Apply CORS and Brute Force Protection (max 10 requests per minute)
app.use(/^\/(login|signup-paywall|verify|recover|generate-key|download-key|retrieve-key|password-change|change-password2|change-username|account-delete|verify-mfa|twofa)(\/.*)?$/, cors(corsOptions), bruteForceProtection);

// Start HTTP server. Traefik will terminate TLS and forward requests to this service over the internal network.
app.listen(port, () => {
  console.log(`HTTP Server running on http://localhost:${port}`);
});

export default app;

// Import Routes 
import Users from './routes/Users.js';
import Notes from './routes/Notes.js';
import Charts from './routes/Charts.js';
import Watchlists from './routes/Watchlists.js';
import Screener from './routes/Screener.js';
import Maintenance from './routes/Maintenance.js';
import Portfolio from './routes/Portfolio.js';
import Dashboard from './routes/Dashboard.js';

Users(app, { validate, validationSchemas, sanitizeInput, sanitizeUsername, sanitizeUsernameCanonical, logger, crypto, MongoClient, uri, argon2, jwt, config });
Notes(app, { validate, validationSchemas, validationSets, sanitizeInput, logger, MongoClient, uri });
Charts(app, { validate, validationSchemas, validationSets, sanitizeInput, logger, MongoClient, uri });
Watchlists(app, { validate, validationSchemas, validationSets, body, sanitizeInput, logger, MongoClient, uri });
Screener(app, { validate, validationSchemas, validationSets, sanitizeInput, logger, MongoClient, uri, crypto, query });
Maintenance(app, { validate, body, sanitizeInput, logger, MongoClient, uri, crypto });
Portfolio(app, { validate, validationSchemas, body, query, sanitizeInput, logger, MongoClient, uri });
Dashboard(app, { sanitizeInput, logger, MongoClient, uri });

// Error-handling middleware (must be last before export)
import type { ErrorRequestHandler } from 'express';
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const errResponse = handleError(err, 'Express Middleware', {
    path: req.path,
    method: req.method,
    ip: req.ip
  }, err.status || 500);
  if (err.name === 'CorsError') {
    res.status(403).json({
      error: 'Access denied',
      message: 'Origin not allowed'
    });
    return;
  }
  res.status(errResponse.statusCode).json({
    error: 'Internal Server Error',
    message: errResponse.message
  });
};
app.use(errorHandler);
