import { RefreshToken } from '../entities/RefreshToken';

/**
 * Domain repository contract for managing Refresh Token session persistence.
 */
export interface IRefreshTokenRepository {
  /**
   * Persists a new refresh token entity.
   */
  create(token: RefreshToken): Promise<RefreshToken>;

  /**
   * Finds a refresh token by its cryptographic SHA-256 hash.
   */
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;

  /**
   * Revokes a specific refresh token by ID and optionally tracks its rotation replacement.
   */
  revokeById(id: string, replacedByTokenHash?: string): Promise<boolean>;

  /**
   * Revokes an entire token family upon reuse detection (session hijacking mitigation).
   */
  revokeFamily(familyId: string): Promise<number>;

  /**
   * Revokes all active sessions for a specific user (e.g. global logout or password reset).
   */
  revokeAllForUser(userId: string): Promise<number>;
}
