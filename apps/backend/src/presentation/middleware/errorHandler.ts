import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../domain/errors/AppError';
import { logger } from '../../infrastructure/logging/logger';
import { env } from '../../config/env';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const timestamp = new Date().toISOString();

  // 1. Handled Domain AppErrors
  if (err instanceof AppError) {
    logger.warn({
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      message: err.message,
      path: req.originalUrl,
      method: req.method,
    });

    res.status(err.statusCode).json({
      type: `https://errors.academic-assistant.internal/${err.errorCode.toLowerCase()}`,
      title: err.name,
      status: err.statusCode,
      detail: err.message,
      instance: req.originalUrl,
      timestamp,
    });
    return;
  }

  // 2. Request Schema Validation Errors (Zod)
  if (err instanceof ZodError) {
    logger.warn({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
      errors: err.errors,
      path: req.originalUrl,
    });

    res.status(400).json({
      type: 'https://errors.academic-assistant.internal/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'The payload provided does not conform to validation schemas.',
      invalidParams: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      instance: req.originalUrl,
      timestamp,
    });
    return;
  }

  // 3. Unhandled Critical Exceptions
  logger.error({
    err,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    type: 'https://errors.academic-assistant.internal/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail:
      env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please contact institutional support.'
        : err.message,
    instance: req.originalUrl,
    timestamp,
  });
};
