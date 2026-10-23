import { Request, Response, NextFunction, RequestHandler } from 'express';
import { SystemRole } from '../../domain/types/Roles';
import { UnauthorizedError, ForbiddenError } from '../../domain/errors/AppError';

/**
 * Higher-order Express authorization middleware factory enforcing Role-Based Access Control (RBAC).
 * Evaluates the hydrated req.user object in O(1) time without database or network I/O.
 *
 * @param allowedRoles Explicit allow-list of SystemRoles permitted to access the route.
 * @returns Standard Express RequestHandler.
 */
export const requireRole = (allowedRoles: SystemRole[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // 1. Defensive verification: Ensure requireAuth has already executed and hydrated req.user
    if (!req.user) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    // 2. Explicit allow-list membership check (Fail-Closed Default)
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        'Access Denied: You do not have the required permissions to perform this action.',
      );
    }

    next();
  };
};
