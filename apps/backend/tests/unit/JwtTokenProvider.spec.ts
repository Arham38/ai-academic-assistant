import { describe, it, expect } from 'vitest';
import { JwtTokenProvider } from '../../src/infrastructure/security/JwtTokenProvider';

describe('JwtTokenProvider Unit Tests', () => {
  const secret = 'super_secure_test_secret_key_at_least_32_chars_long';
  const tokenProvider = new JwtTokenProvider(secret, '1h');

  it('should generate a valid JWT access token and verify its decoded payload', () => {
    const payload = {
      id: 'user_mit_123',
      role: 'STUDENT',
      tokenVersion: 1,
    };

    const token = tokenProvider.generateAccessToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // Header, payload, signature

    const decoded = tokenProvider.verifyToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.tokenVersion).toBe(payload.tokenVersion);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  it('should throw an error when verifying a tampered token string', () => {
    const payload = {
      id: 'user_mit_123',
      role: 'STUDENT',
      tokenVersion: 1,
    };

    const token = tokenProvider.generateAccessToken(payload);
    const tamperedToken = `${token}tampered`;

    expect(() => tokenProvider.verifyToken(tamperedToken)).toThrow();
  });

  it('should throw an error when verifying a token signed with a different secret', () => {
    const otherProvider = new JwtTokenProvider(
      'completely_different_secret_key_32_characters_long',
      '1h',
    );
    const token = otherProvider.generateAccessToken({
      id: 'user_456',
      role: 'RESEARCHER',
      tokenVersion: 1,
    });

    expect(() => tokenProvider.verifyToken(token)).toThrow();
  });

  it('should throw an error when verifying an expired token', async () => {
    const shortLivedProvider = new JwtTokenProvider(secret, '1ms');
    const token = shortLivedProvider.generateAccessToken({
      id: 'user_expired',
      role: 'ADMIN',
      tokenVersion: 1,
    });

    // Wait 10ms to ensure expiration
    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(() => shortLivedProvider.verifyToken(token)).toThrow();
  });
});
