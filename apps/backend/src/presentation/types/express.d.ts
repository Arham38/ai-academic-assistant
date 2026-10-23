import { SystemRole } from '../../domain/types/Roles';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: SystemRole;
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
