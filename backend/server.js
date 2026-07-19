import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger.js';
import leadsRoutes from './routes/leads.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import scanRouter from './routes/scan.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Simple Rate Limiting Implementation
const rateLimitWindow = 60 * 1000; // 1 minute
const rateLimitMax = 200; // Max 200 requests per minute
const ipRequestCounts = new Map();

app.use((req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  
  if (!ipRequestCounts.has(ip)) {
    ipRequestCounts.set(ip, []);
  }

  const timestamps = ipRequestCounts.get(ip);
  // Filter out expired timestamps
  const validTimestamps = timestamps.filter(time => now - time < rateLimitWindow);
  
  if (validTimestamps.length >= rateLimitMax) {
    logger.warn(`Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again in a minute.'
    });
  }

  validTimestamps.push(now);
  ipRequestCounts.set(ip, validTimestamps);
  next();
});

// Routes
app.use('/api/leads', leadsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/scan', scanRouter);


// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Global error handler: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});


// Start Server
app.listen(PORT, '0.0.0.0', () => {
  logger.success(`==================================================`);
  logger.success(` LeadHunter AI Backend Service Running`);
  logger.success(` Port: ${PORT}`);
  logger.success(` Mode: ${process.env.NODE_ENV || 'development'}`);
  logger.success(` Database Path: ${process.env.DB_PATH || './database/leadhunter.db'}`);
  logger.success(` CORS Allowed Origin: ${corsOrigin}`);
  logger.success(`==================================================`);
});
