import { describe, it, expect } from 'vitest';
import { BcryptHashProvider } from '../../src/infrastructure/security/BcryptHashProvider';

describe('BcryptHashProvider Unit Tests', () => {
  const hashProvider = new BcryptHashProvider(8); // Lower rounds for fast unit tests

  it('should successfully hash a plaintext password', async () => {
    const plaintext = 'SecureAcademicPassword123!';
    const hashed = await hashProvider.hash(plaintext);

    expect(hashed).toBeDefined();
    expect(typeof hashed).toBe('string');
    expect(hashed).not.toBe(plaintext);
    expect(hashed).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
  });

  it('should return true when comparing a valid plaintext password with its hash', async () => {
    const plaintext = 'SecretResearch123$';
    const hashed = await hashProvider.hash(plaintext);

    const isMatch = await hashProvider.compare(plaintext, hashed);
    expect(isMatch).toBe(true);
  });

  it('should return false when comparing an invalid plaintext password with a hash', async () => {
    const plaintext = 'SecretResearch123$';
    const hashed = await hashProvider.hash(plaintext);

    const isMatch = await hashProvider.compare('WrongPassword', hashed);
    expect(isMatch).toBe(false);
  });
});
