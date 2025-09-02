import mongoose, { Schema, Document } from 'mongoose';

export interface IAdjustment extends Document {
  _id: string;
  userId: string;
  accountId: string;
  previousBalanceCents: number;
  newBalanceCents: number;
  adjustmentAmountCents: number; // Calculated difference
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdjustmentSchema = new Schema<IAdjustment>(
  {
    userId: {
      type: String,
      required: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    previousBalanceCents: {
      type: Number,
      required: true,
    },
    newBalanceCents: {
      type: Number,
      required: true,
    },
    adjustmentAmountCents: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
AdjustmentSchema.index({ userId: 1, accountId: 1, createdAt: -1 });
AdjustmentSchema.index({ userId: 1, createdAt: -1 });

export const Adjustment = mongoose.models.Adjustment || mongoose.model<IAdjustment>('Adjustment', AdjustmentSchema);
