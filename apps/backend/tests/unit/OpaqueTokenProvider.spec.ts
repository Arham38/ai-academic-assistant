import { describe, it, expect } from 'vitest';
import { OpaqueTokenProvider } from '../../src/infrastructure/security/OpaqueTokenProvider';

describe('OpaqueTokenProvider Unit Tests', () => {
  const provider = new OpaqueTokenProvider();

  it('should generate a high-entropy 128-character hex string', () => {
    const token1 = provider.generateToken();
    const token2 = provider.generateToken();

    expect(token1).toHaveLength(128);
    expect(token2).toHaveLength(128);
    expect(token1).not.toBe(token2);
    expect(token1).toMatch(/^[0-9a-f]{128}$/);
  });

  it('should deterministically hash tokens using SHA-256', () => {
    const token = 'sample_plaintext_refresh_token_string_12345';
    const hash1 = provider.hashToken(token);
    const hash2 = provider.hashToken(token);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(token);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should generate valid UUID v4 family IDs', () => {
    const familyId1 = provider.generateFamilyId();
    const familyId2 = provider.generateFamilyId();

    expect(familyId1).not.toBe(familyId2);
    expect(familyId1).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
