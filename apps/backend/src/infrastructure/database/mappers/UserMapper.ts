import { User, SystemRole, UserAccountStatus } from '../../../domain/entities/User';

export interface RawUserPersistence {
  _id?: unknown;
  id?: string;
  tenantId: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  role?: string;
  status?: string;
  aiUsage?: {
    tokensConsumed?: number;
    tokenLimit?: number;
  };
  security?: {
    tokenVersion?: number;
    lastLogin?: Date | string;
    isEmailVerified?: boolean;
  };
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export class UserMapper {
  /**
   * Transforms a database document into a pure Domain User entity.
   * Strips database primitives (ObjectId) and guarantees strict types.
   */
  public static toDomain(raw: RawUserPersistence): User {
    const id = raw._id ? String(raw._id) : raw.id;

    return new User({
      id,
      tenantId: raw.tenantId,
      email: raw.email,
      passwordHash: raw.passwordHash,
      firstName: raw.firstName,
      lastName: raw.lastName,
      role: (raw.role as SystemRole) || SystemRole.STUDENT,
      status: (raw.status as UserAccountStatus) || 'ACTIVE',
      aiUsage: {
        tokensConsumed: raw.aiUsage?.tokensConsumed ?? 0,
        tokenLimit: raw.aiUsage?.tokenLimit ?? 100000,
      },
      security: {
        tokenVersion: raw.security?.tokenVersion ?? 1,
        lastLogin: raw.security?.lastLogin ? new Date(raw.security.lastLogin) : undefined,
        isEmailVerified: raw.security?.isEmailVerified ?? false,
      },
      isDeleted: raw.isDeleted ?? false,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
    });
  }

  /**
   * Transforms a Domain User entity into a raw database persistence payload.
   */
  public static toPersistence(user: User): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      tenantId: user.tenantId,
      email: user.email.toLowerCase().trim(),
      firstName: user.firstName.trim(),
      lastName: user.lastName.trim(),
      role: user.role,
      status: user.status,
      aiUsage: {
        tokensConsumed: user.aiUsage.tokensConsumed,
        tokenLimit: user.aiUsage.tokenLimit,
      },
      security: {
        tokenVersion: user.security.tokenVersion,
        lastLogin: user.security.lastLogin,
        isEmailVerified: user.security.isEmailVerified,
      },
      isDeleted: user.isDeleted,
      updatedAt: user.updatedAt,
    };

    if (user.passwordHash) {
      payload.passwordHash = user.passwordHash;
    }

    if (user.id) {
      payload._id = user.id;
    }

    return payload;
  }
}
