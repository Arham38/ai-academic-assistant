import crypto from 'crypto';

/**
 * Utility provider for cryptographically secure opaque refresh tokens.
 * Generates high-entropy random strings and handles deterministic SHA-256 hashing
 * so plaintext refresh tokens are never persisted in the database.
 */
export class OpaqueTokenProvider {
  /**
   * Generates a cryptographically strong pseudo-random hex string.
   * Defaults to 64 bytes (128 hex characters).
   */
  public generateToken(byteLength = 64): string {
    return crypto.randomBytes(byteLength).toString('hex');
  }

  /**
   * Hashes a plaintext token using SHA-256 for secure database lookup and storage.
   */
  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Generates a unique family ID linking all rotated tokens in a single device session chain.
   */
  public generateFamilyId(): string {
    return crypto.randomUUID();
  }
}
