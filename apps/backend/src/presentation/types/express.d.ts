import { UserRole } from '../../domain/entities/User';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
