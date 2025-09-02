import { z } from 'zod';

// Account schemas
export const accountTypeSchema = z.enum(['bank', 'wallet', 'card', 'debit_card', 'credit_card', 'metro', 'cash', 'investments', 'others']);
export const currencySchema = z.string().min(3).max(3);

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: accountTypeSchema,
  currency: currencySchema,
  color: z.string().optional(),
  icon: z.string().optional(),
  openingBalanceCents: z.number().int(),
});

export const updateAccountSchema = createAccountSchema.partial();

// Transaction schemas
export const transactionTypeSchema = z.enum(['income', 'expense', 'transfer', 'refund', 'adjustment']);

export const createTransactionSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  type: transactionTypeSchema,
  category: z.string().min(1, 'Category is required').max(50),
  amountCents: z.number().int().positive('Amount must be positive'),
  currency: currencySchema,
  date: z.coerce.date(),
  merchant: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  tags: z.array(z.string().max(30)).optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// Transfer schema
export const createTransferSchema = z.object({
  fromAccountId: z.string().min(1, 'Source account ID is required'),
  toAccountId: z.string().min(1, 'Destination account ID is required'),
  amountCents: z.number().int().positive('Amount must be positive'),
  date: z.coerce.date().default(() => new Date()),
  note: z.string().max(500).optional(),
  category: z.string().max(50).default('Transfer'),
});

// Query schemas
export const transactionQuerySchema = z.object({
  accountId: z.string().optional(),
  type: transactionTypeSchema.optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const analyticsQuerySchema = z.object({
  granularity: z.enum(['day', 'week', 'month', 'year']).default('month'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  accountId: z.string().optional(),
});

// Types
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
