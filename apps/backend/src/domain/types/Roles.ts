/**
 * Centralized Domain Enum for system roles in the enterprise role hierarchy.
 * Enforces compile-time type safety across domain, application, and presentation layers.
 */
export enum SystemRole {
  STUDENT = 'STUDENT',
  RESEARCHER = 'RESEARCHER',
  ADMIN = 'ADMIN',
}
