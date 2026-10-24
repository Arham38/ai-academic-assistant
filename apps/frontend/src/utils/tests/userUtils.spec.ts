import { describe, it, expect } from 'vitest';
import { formatUserDisplayName, formatUserInitials } from '../userUtils';

describe('userUtils', () => {
  describe('formatUserDisplayName', () => {
    it('should format full name when both firstName and lastName exist', () => {
      expect(formatUserDisplayName({ firstName: 'Alan', lastName: 'Turing' })).toBe('Alan Turing');
    });

    it('should format firstName when lastName is omitted or empty', () => {
      expect(formatUserDisplayName({ firstName: 'Alan', lastName: '' })).toBe('Alan');
      expect(formatUserDisplayName({ firstName: 'Alan' })).toBe('Alan');
    });

    it('should fall back to email username when names are not provided', () => {
      expect(formatUserDisplayName({ email: 'scholar@mit.edu' })).toBe('scholar');
    });

    it('should fall back to default fallback when user is null or empty', () => {
      expect(formatUserDisplayName(null)).toBe('Scholar');
      expect(formatUserDisplayName(undefined)).toBe('Scholar');
      expect(formatUserDisplayName({}, 'Custom Scholar')).toBe('Custom Scholar');
    });
  });

  describe('formatUserInitials', () => {
    it('should return 2 initials when firstName and lastName exist', () => {
      expect(formatUserInitials({ firstName: 'Alan', lastName: 'Turing' })).toBe('AT');
    });

    it('should return first 2 letters of firstName when lastName is missing', () => {
      expect(formatUserInitials({ firstName: 'Ada' })).toBe('AD');
    });

    it('should return first 2 letters of email when name is missing', () => {
      expect(formatUserInitials({ email: 'scholar@mit.edu' })).toBe('SC');
    });

    it('should return fallback when user is null or empty', () => {
      expect(formatUserInitials(null)).toBe('AA');
      expect(formatUserInitials(undefined, 'U')).toBe('U');
    });
  });
});
