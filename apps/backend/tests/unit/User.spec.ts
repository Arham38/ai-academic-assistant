import { describe, it, expect } from 'vitest';
import { User } from '../../src/domain/entities/User';

describe('User Domain Entity', () => {
  const validProps = {
    tenantId: 'tenant_stanford_01',
    email: 'ALAN.TURING@STANFORD.EDU',
    firstName: 'Alan',
    lastName: 'Turing',
    passwordHash: '$2b$12$e8Y...hash',
  };

  it('should instantiate a valid user entity and normalize email to lowercase', () => {
    const user = new User(validProps);

    expect(user.tenantId).toBe('tenant_stanford_01');
    expect(user.email).toBe('alan.turing@stanford.edu');
    expect(user.fullName).toBe('Alan Turing');
    expect(user.role).toBe('STUDENT');
    expect(user.status).toBe('ACTIVE');
    expect(user.security.tokenVersion).toBe(1);
    expect(user.aiUsage.tokensConsumed).toBe(0);
    expect(user.aiUsage.tokenLimit).toBe(100000);
    expect(user.isDeleted).toBe(false);
  });

  it('should reject invalid email formats', () => {
    expect(() => {
      new User({ ...validProps, email: 'invalid-email-format' });
    }).toThrow('Invalid email address format');
  });

  it('should reject missing or whitespace-only first and last names', () => {
    expect(() => {
      new User({ ...validProps, firstName: '   ' });
    }).toThrow('First and last name are required');

    expect(() => {
      new User({ ...validProps, lastName: '' });
    }).toThrow('First and last name are required');
  });

  describe('AI Quota Management', () => {
    it('should correctly calculate available quota', () => {
      const user = new User({
        ...validProps,
        aiUsage: { tokensConsumed: 50000, tokenLimit: 100000 },
      });

      expect(user.hasAvailableQuota(10000)).toBe(true);
      expect(user.hasAvailableQuota(50000)).toBe(true);
      expect(user.hasAvailableQuota(50001)).toBe(false);
    });

    it('should consume quota within limit', () => {
      const user = new User({
        ...validProps,
        aiUsage: { tokensConsumed: 1000, tokenLimit: 5000 },
      });

      user.consumeQuota(2000);
      expect(user.aiUsage.tokensConsumed).toBe(3000);
    });

    it('should throw error when consuming beyond quota limit', () => {
      const user = new User({
        ...validProps,
        aiUsage: { tokensConsumed: 4500, tokenLimit: 5000 },
      });

      expect(() => user.consumeQuota(1000)).toThrow('AI Token quota exceeded');
    });

    it('should reject negative quota consumption', () => {
      const user = new User(validProps);
      expect(() => user.consumeQuota(-500)).toThrow(
        'Cannot consume a negative number of AI tokens',
      );
    });

    it('should reset quota and optionally update token limit', () => {
      const user = new User({
        ...validProps,
        aiUsage: { tokensConsumed: 4500, tokenLimit: 5000 },
      });

      user.resetQuota(200000);
      expect(user.aiUsage.tokensConsumed).toBe(0);
      expect(user.aiUsage.tokenLimit).toBe(200000);
    });
  });

  describe('Security & Lifecycle Operations', () => {
    it('should increment tokenVersion to invalidate existing JWTs', () => {
      const user = new User(validProps);
      expect(user.security.tokenVersion).toBe(1);

      const nextVersion = user.incrementTokenVersion();
      expect(nextVersion).toBe(2);
      expect(user.security.tokenVersion).toBe(2);
    });

    it('should deactivate account and increment tokenVersion', () => {
      const user = new User(validProps);
      user.deactivateAccount();

      expect(user.status).toBe('SUSPENDED');
      expect(user.security.tokenVersion).toBe(2);
      expect(user.hasAvailableQuota()).toBe(false);
    });

    it('should mark account as deleted and revoke access', () => {
      const user = new User(validProps);
      user.markAsDeleted();

      expect(user.isDeleted).toBe(true);
      expect(user.status).toBe('SUSPENDED');
      expect(user.security.tokenVersion).toBe(2);
      expect(user.hasAvailableQuota()).toBe(false);
    });
  });
});
