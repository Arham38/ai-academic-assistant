import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../../src/presentation/middleware/requireRole';
import { SystemRole } from '../../src/domain/types/Roles';
import { UnauthorizedError, ForbiddenError } from '../../src/domain/errors/AppError';

describe('requireRole Middleware Unit Tests', () => {
  it('should throw UnauthorizedError when req.user is undefined (requireAuth not executed)', () => {
    const middleware = requireRole([SystemRole.ADMIN]);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    expect(() => middleware(req, res, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError when user has STUDENT role but route requires RESEARCHER', () => {
    const middleware = requireRole([SystemRole.RESEARCHER]);
    const req = {
      user: {
        id: 'student_123',
        email: 'student@mit.edu',
        role: SystemRole.STUDENT,
        tokenVersion: 1,
      },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    expect(() => middleware(req, res, next)).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() successfully when user role matches one of allowed roles in multi-role array', () => {
    const middleware = requireRole([SystemRole.RESEARCHER, SystemRole.ADMIN]);
    const req = {
      user: {
        id: 'admin_123',
        email: 'admin@mit.edu',
        role: SystemRole.ADMIN,
        tokenVersion: 1,
      },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should call next() successfully when user role exactly matches the single allowed role', () => {
    const middleware = requireRole([SystemRole.STUDENT]);
    const req = {
      user: {
        id: 'student_456',
        email: 'student456@mit.edu',
        role: SystemRole.STUDENT,
        tokenVersion: 1,
      },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
