import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { errorHandler, AppError } from './middleware/errorHandler';
import { checkDatabaseConnection } from './db/prisma';
import { db } from './db/store';
import apiRoutes from './routes';

export const createApp = (): Application => {
  const app = express();

  // Trust reverse proxy (Vercel, Cloudflare, AWS)
  app.set('trust proxy', 1);

  // Security headers configured for cross-origin assets (images, PDFs, documents)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
      frameguard: false,
    })
  );

  // CORS configuration with permissive support for Vercel deployments and devices
  const allowedOrigins = [
    config.clientUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        const isAllowed =
          config.clientUrl === '*' ||
          allowedOrigins.includes(origin) ||
          origin.includes('vercel.app') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.onrender.com');

        if (isAllowed) {
          return callback(null, true);
        }

        // Strictly reject unauthorized origins
        return callback(new AppError(`CORS policy violation: Origin '${origin}' is not authorized`, 403));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate limiting (300 requests per 15 minutes per IP)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
    },
  });
  app.use('/api', limiter);

  // Parse JSON payloads
  app.use(express.json());

  // Synchronize cloud database state before routing API requests
  app.use(async (_req: Request, _res: Response, next) => {
    try {
      await db.syncFromDb();
    } catch {}
    next();
  });

  // Health check and root endpoints
  const healthHandler = async (_req: Request, res: Response) => {
    let dbStatus;
    try {
      dbStatus = await checkDatabaseConnection();
    } catch (e: any) {
      dbStatus = { connected: false, error: e?.message };
    }
    res.json({
      success: true,
      message: 'FlowForge Enterprise API is healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: dbStatus,
    });
  };

  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'FlowForge Enterprise API Server is Online',
      health: '/api/health',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Router on both /api and / so all Vercel serverless rewrite paths match
  app.use('/api', apiRoutes);
  app.use('/', apiRoutes);

  // Centralized error handling
  app.use(errorHandler);

  return app;
};
