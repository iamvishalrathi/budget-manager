import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  _id: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense' | 'adjustment' | 'transfer';
  category: string;
  amountCents: number;
  currency: string;
  date: Date;
  time?: string;
  paymentMode?: 'cash' | 'debit_card' | 'credit_card' | 'upi' | 'net_banking' | 'wallet' | 'cheque' | 'other';
  merchant?: string;
  note?: string;
  tags?: string[];
  transferId?: string; // Links related transfer transactions
  transferToAccountId?: string; // For transfer transactions, stores the destination account
  transferFromAccountId?: string; // For transfer transactions, stores the source account
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: String,
      required: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense', 'adjustment', 'transfer'],
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amountCents: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    time: {
      type: String,
      trim: true,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'debit_card', 'credit_card', 'upi', 'net_banking', 'wallet', 'cheque', 'other'],
      trim: true,
    },
    merchant: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    transferId: {
      type: String,
      // Used to link transfer transactions
    },
    transferToAccountId: {
      type: String,
      // For transfer transactions, stores the destination account
    },
    transferFromAccountId: {
      type: String,
      // For transfer transactions, stores the source account
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
TransactionSchema.index({ userId: 1, accountId: 1, date: -1 });
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, type: 1 });
TransactionSchema.index({ userId: 1, category: 1 });

export const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
