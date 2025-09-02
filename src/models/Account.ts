import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
  _id: string;
  userId: string;
  name: string;
  type: 'bank' | 'wallet' | 'card' | 'metro' | 'cash';
  currency: string;
  color?: string;
  icon?: string;
  openingBalanceCents: number;
  currentBalanceCents: number;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    userId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['bank', 'wallet', 'card', 'metro', 'cash'],
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    color: {
      type: String,
      default: '#1976d2',
    },
    icon: {
      type: String,
      default: 'AccountBalance',
    },
    openingBalanceCents: {
      type: Number,
      required: true,
      default: 0,
    },
    currentBalanceCents: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
AccountSchema.index({ userId: 1 });

export const Account = mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);
