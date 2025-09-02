import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  _id: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer' | 'refund' | 'adjustment';
  category: string;
  amountCents: number;
  currency: string;
  date: Date;
  merchant?: string;
  note?: string;
  tags?: string[];
  transferId?: string; // Links related transfer transactions
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
      enum: ['income', 'expense', 'transfer', 'refund', 'adjustment'],
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
