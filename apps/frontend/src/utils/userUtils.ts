export interface UserLike {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

/**
 * Standardizes user display name formatting across all components.
 * Prioritizes: "First Last" -> "First" -> Email username -> Fallback.
 */
export const formatUserDisplayName = (user?: UserLike | null, fallback = 'Scholar'): string => {
  if (!user) return fallback;
  const firstName = user.firstName?.trim() || '';
  const lastName = user.lastName?.trim() || '';
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  if (user.email) {
    const username = user.email.split('@')[0];
    return username || fallback;
  }
  return fallback;
};

/**
 * Standardizes derivation of 2-character user initials for avatars.
 */
export const formatUserInitials = (user?: UserLike | null, fallback = 'AA'): string => {
  if (!user) return fallback;
  const firstName = user.firstName?.trim() || '';
  const lastName = user.lastName?.trim() || '';
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName && firstName.length >= 2) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (firstName) {
    return firstName[0].toUpperCase();
  }
  if (user.email && user.email.length >= 2) {
    return user.email.slice(0, 2).toUpperCase();
  }
  return fallback;
};
