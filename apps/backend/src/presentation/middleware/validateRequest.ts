import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodTypeAny } from 'zod';

/**
 * Express middleware factory to validate incoming request bodies against a Zod schema.
 * Automatically strips unpermitted properties, performs coercion/sanitization,
 * and delegates validation errors to the centralized error handler.
 */
export const validateRequest = (schema: ZodTypeAny): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};
