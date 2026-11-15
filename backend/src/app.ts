import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { errorHandler, AppError } from './middleware/errorHandler';
import { checkDatabaseConnection } from './db/prisma';
import apiRoutes from './routes';

export const createApp = (): Application => {
  const app = express();

  // Security headers configured for cross-origin assets (images, PDFs, documents)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
      frameguard: false,
    })
  );

  // CORS configuration with strict origin whitelist
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
          (config.nodeEnv !== 'production' &&
            (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) ||
          origin.endsWith('.vercel.app') ||
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

  // Rate limiting (100 requests per 15 minutes per IP)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
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

  // Health check endpoint
  app.get('/api/health', async (_req: Request, res: Response) => {
    const dbStatus = await checkDatabaseConnection();
    res.json({
      success: true,
      message: 'FlowForge API is healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: dbStatus,
    });
  });

  // Mount API Router
  app.use('/api', apiRoutes);

  // Centralized error handling
  app.use(errorHandler);

  return app;
};
