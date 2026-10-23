import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async Express handlers to catch unhandled Promise rejections and forward to next()
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
