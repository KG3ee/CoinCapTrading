import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  token: z.string().optional(),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  referralCode: z.string().optional(),
});

export const tradeSchema = z.object({
  type: z.enum(['buy', 'sell'], {
    errorMap: () => ({ message: 'Trade type must be either "buy" or "sell"' }),
  } as any),
  cryptoSymbol: z.string()
    .min(1, 'Crypto symbol is required')
    .max(10, 'Crypto symbol is too long')
    .regex(/^[A-Z]+$/, 'Crypto symbol must be uppercase letters only')
    .transform(val => val.toUpperCase()),
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000000, 'Amount is too large')
    .refine(val => Number.isFinite(val), 'Amount must be a valid number'),
  pricePerUnit: z.number()
    .positive('Price must be positive')
    .max(10000000, 'Price is too large')
    .refine(val => Number.isFinite(val), 'Price must be a valid number'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
  language: z.string().optional(),
  withdrawalAddress: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TradeInput = z.infer<typeof tradeSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
