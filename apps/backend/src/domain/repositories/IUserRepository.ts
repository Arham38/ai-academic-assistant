import { IBaseRepository } from './IBaseRepository';
import { User } from '../entities/User';

export interface IUserRepository extends IBaseRepository<User> {
  findById(id: string, includeDeleted?: boolean, includePassword?: boolean): Promise<User | null>;
  findByEmail(email: string, includePassword?: boolean): Promise<User | null>;
  findByEmailAndTenant(
    email: string,
    tenantId: string,
    includePassword?: boolean,
  ): Promise<User | null>;
  incrementTokenVersion(userId: string): Promise<number | null>;
  updateAIUsage(userId: string, tokensConsumed: number): Promise<boolean>;
  updateLastLogin(userId: string): Promise<boolean>;
  existsByEmail(email: string, tenantId?: string): Promise<boolean>;
}
