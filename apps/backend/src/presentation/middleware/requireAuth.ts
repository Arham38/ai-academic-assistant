import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ITokenProvider } from '../../domain/providers/ITokenProvider';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { JwtTokenProvider } from '../../infrastructure/security/JwtTokenProvider';
import { MongoUserRepository } from '../../infrastructure/database/mongodb/MongoUserRepository';
import { UserModel } from '../../infrastructure/database/mongodb/models/UserModel';
import { env } from '../../config/env';
import { UnauthorizedError, ForbiddenError } from '../../domain/errors/AppError';

/**
 * Middleware factory to guard routes requiring valid JWT authentication.
 * Enforces:
 *  1. Bearer token extraction
 *  2. Cryptographic signature and expiration verification (HS256)
 *  3. Token version matching against database persistence for instant revocation
 *  4. Hydration of verified user into Express Request context (req.user)
 */
export const createRequireAuth = (
  tokenProvider: ITokenProvider,
  userRepository: IUserRepository,
): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authentication required. Please log in.');
      }

      const token = authHeader.slice(7).trim();
      if (!token) {
        throw new UnauthorizedError('Authentication required. Please log in.');
      }

      let decoded;
      try {
        decoded = tokenProvider.verifyToken(token);
      } catch {
        throw new UnauthorizedError('Token is invalid or has expired.');
      }

      // Hybrid stateful check: verify user exists and token version matches database record
      const user = await userRepository.findById(decoded.id);
      if (!user || user.isDeleted) {
        throw new UnauthorizedError('Token is invalid or has expired.');
      }

      if (user.status === 'SUSPENDED') {
        throw new ForbiddenError('Account is suspended. Please contact institutional support.');
      }

      if (user.security.tokenVersion !== decoded.tokenVersion) {
        throw new UnauthorizedError('Token is invalid or has expired.');
      }

      // Context hydration
      req.user = {
        id: user.id!,
        email: user.email,
        role: user.role,
        tokenVersion: user.security.tokenVersion,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Default singleton instance for application route mounting
const defaultTokenProvider = new JwtTokenProvider(env.JWT_SECRET, env.JWT_EXPIRES_IN);
const defaultUserRepository = new MongoUserRepository(UserModel);

export const requireAuth = createRequireAuth(defaultTokenProvider, defaultUserRepository);
