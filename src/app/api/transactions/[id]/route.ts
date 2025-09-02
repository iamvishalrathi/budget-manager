import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import { Account } from '@/models/Account';
import { Transaction } from '@/models/Transaction';
import { updateTransactionSchema } from '@/lib/validations';
import { getTransactionSign } from '@/lib/money';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateTransactionSchema.parse(body);

    await connectDB();
    
    // Get original transaction
    const originalTransaction = await Transaction.findOne({
      _id: id,
      userId,
    });
    
    if (!originalTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // If account is changing, verify new account ownership
    if (validatedData.accountId && validatedData.accountId !== originalTransaction.accountId.toString()) {
      const newAccount = await Account.findOne({
        _id: validatedData.accountId,
        userId,
      });
      
      if (!newAccount) {
        return NextResponse.json({ error: 'New account not found' }, { status: 404 });
      }
    }
    
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Calculate balance changes
        const originalSign = getTransactionSign(originalTransaction.type);
        const originalImpact = originalSign * originalTransaction.amountCents;
        
        const newType = validatedData.type || originalTransaction.type;
        const newAmount = validatedData.amountCents || originalTransaction.amountCents;
        const newSign = getTransactionSign(newType);
        const newImpact = newSign * newAmount;
        
        const oldAccountId = originalTransaction.accountId.toString();
        const newAccountId = validatedData.accountId || oldAccountId;
        
        // Reverse original impact
        await Account.findByIdAndUpdate(
          oldAccountId,
          { $inc: { currentBalanceCents: -originalImpact } },
          { session }
        );
        
        // Apply new impact
        await Account.findByIdAndUpdate(
          newAccountId,
          { $inc: { currentBalanceCents: newImpact } },
          { session }
        );
        
        // Update transaction
        await Transaction.findByIdAndUpdate(
          id,
          validatedData,
          { session }
        );
      });
      
      // Fetch updated transaction
      const updatedTransaction = await Transaction.findById(id)
        .populate('accountId', 'name type');
      
      return NextResponse.json(updatedTransaction);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('PUT /api/transactions/[id] error:', error);
    
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    await connectDB();
    
    const transaction = await Transaction.findOne({
      _id: id,
      userId,
    });
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Reverse transaction impact on account balance
        const sign = getTransactionSign(transaction.type);
        const balanceChange = -(sign * transaction.amountCents);
        
        await Account.findByIdAndUpdate(
          transaction.accountId,
          { $inc: { currentBalanceCents: balanceChange } },
          { session }
        );
        
        // Delete transaction
        await Transaction.findByIdAndDelete(id, { session });
      });
      
      return NextResponse.json({ message: 'Transaction deleted successfully' });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('DELETE /api/transactions/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
