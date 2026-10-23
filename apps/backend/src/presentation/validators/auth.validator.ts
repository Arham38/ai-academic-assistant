import { z } from 'zod';

/**
 * Zod validation schema for POST /api/v1/auth/register
 * Enforces email formatting, name presence, and password complexity.
 */
export const RegisterSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .trim()
    .min(1, 'First name cannot be empty'),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .trim()
    .min(1, 'Last name cannot be empty'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address format'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  tenantId: z.string().trim().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Zod validation schema for POST /api/v1/auth/login
 */
export const LoginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address format'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty'),
  tenantId: z.string().trim().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
