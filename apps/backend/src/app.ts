import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { v1Router } from './presentation/routes';
import { errorHandler } from './presentation/middleware/errorHandler';
import { NotFoundError } from './domain/errors/AppError';

const app: Application = express();

// 1. Foundational Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Service-Key'],
  }),
);
app.use(hpp());

// 2. Body Parsing & Cookie Middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Mount Versioned API Routes
app.use('/api/v1', v1Router);

// 4. Catch-all for unhandled routes (404)
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

// 5. Centralized Error Handling Middleware (must be registered last)
app.use(errorHandler);

export default app;
