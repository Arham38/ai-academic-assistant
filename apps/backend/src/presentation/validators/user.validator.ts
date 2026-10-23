import { z } from 'zod';

/**
 * Strict schema for user profile updates.
 * Forbids role escalation, identity overrides (id, email), or quota manipulation.
 */
export const UpdateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name cannot be empty').optional(),
    lastName: z.string().trim().min(1, 'Last name cannot be empty').optional(),
  })
  .strict({ message: 'Unrecognized or unauthorized fields in payload.' })
  .refine((data) => data.firstName !== undefined || data.lastName !== undefined, {
    message: 'At least one field (firstName or lastName) must be provided for update.',
  });

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/**
 * Strict schema for credential rotation.
 * Requires verification of current password alongside password complexity on new password.
 */
export const UpdatePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  })
  .strict({ message: 'Unrecognized or unauthorized fields in payload.' });

export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
