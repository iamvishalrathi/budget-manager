import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import { Account } from '@/models/Account';
import { Transaction } from '@/models/Transaction';
import { createTransferSchema } from '@/lib/validations';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTransferSchema.parse(body);

    if (validatedData.fromAccountId === validatedData.toAccountId) {
      return NextResponse.json(
        { error: 'Source and destination accounts cannot be the same' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Verify both accounts exist and belong to the user
    const [fromAccount, toAccount] = await Promise.all([
      Account.findOne({ _id: validatedData.fromAccountId, userId }),
      Account.findOne({ _id: validatedData.toAccountId, userId }),
    ]);
    
    if (!fromAccount) {
      return NextResponse.json({ error: 'Source account not found' }, { status: 404 });
    }
    
    if (!toAccount) {
      return NextResponse.json({ error: 'Destination account not found' }, { status: 404 });
    }
    
    // Check if source account has sufficient balance
    if (fromAccount.currentBalanceCents < validatedData.amountCents) {
      return NextResponse.json(
        { error: 'Insufficient balance in source account' },
        { status: 400 }
      );
    }
    
    const session = await mongoose.startSession();
    const transferId = randomUUID();
    
    try {
      await session.withTransaction(async () => {
        // Create outgoing transaction (expense from source account)
        const outgoingTransaction = new Transaction({
          userId,
          accountId: validatedData.fromAccountId,
          type: 'expense',
          category: validatedData.category,
          amountCents: validatedData.amountCents,
          currency: fromAccount.currency,
          date: validatedData.date,
          note: validatedData.note ? `Transfer to ${toAccount.name}: ${validatedData.note}` : `Transfer to ${toAccount.name}`,
          transferId,
        });
        
        // Create incoming transaction (income to destination account)
        const incomingTransaction = new Transaction({
          userId,
          accountId: validatedData.toAccountId,
          type: 'income',
          category: validatedData.category,
          amountCents: validatedData.amountCents,
          currency: toAccount.currency,
          date: validatedData.date,
          note: validatedData.note ? `Transfer from ${fromAccount.name}: ${validatedData.note}` : `Transfer from ${fromAccount.name}`,
          transferId,
        });
        
        // Save both transactions
        await Promise.all([
          outgoingTransaction.save({ session }),
          incomingTransaction.save({ session }),
        ]);
        
        // Update account balances
        await Promise.all([
          Account.findByIdAndUpdate(
            validatedData.fromAccountId,
            { $inc: { currentBalanceCents: -validatedData.amountCents } },
            { session }
          ),
          Account.findByIdAndUpdate(
            validatedData.toAccountId,
            { $inc: { currentBalanceCents: validatedData.amountCents } },
            { session }
          ),
        ]);
      });
      
      // Fetch the created transactions
      const transactions = await Transaction.find({ transferId })
        .populate('accountId', 'name type')
        .sort({ type: 1 }); // expense first, then income
      
      return NextResponse.json({
        transferId,
        transactions,
        message: 'Transfer completed successfully',
      }, { status: 201 });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('POST /api/transfers error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
