import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import { Account } from '@/models/Account';
import { Transaction } from '@/models/Transaction';
import { createTransactionSchema, transactionQuerySchema } from '@/lib/validations';
import { getTransactionSign } from '@/lib/money';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = transactionQuerySchema.parse({
      accountId: searchParams.get('accountId'),
      type: searchParams.get('type'),
      category: searchParams.get('category'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      limit: searchParams.get('limit'),
      cursor: searchParams.get('cursor'),
    });

    await connectDB();
    
    // Build MongoDB query
    interface TransactionFilter {
      userId: string;
      accountId?: string;
      type?: string;
      category?: { $regex: string; $options: string };
      date?: { $gte?: Date; $lte?: Date };
      _id?: { $lt: string };
    }
    
    const filter: TransactionFilter = { userId };
    
    if (query.accountId) {
      filter.accountId = query.accountId;
    }
    
    if (query.type) {
      filter.type = query.type;
    }
    
    if (query.category) {
      filter.category = { $regex: query.category, $options: 'i' };
    }
    
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) {
        filter.date.$gte = query.from;
      }
      if (query.to) {
        filter.date.$lte = query.to;
      }
    }
    
    if (query.cursor) {
      filter._id = { $lt: query.cursor };
    }
    
    const transactions = await Transaction.find(filter)
      .populate('accountId', 'name type')
      .sort({ date: -1, _id: -1 })
      .limit(query.limit);
    
    const hasMore = transactions.length === query.limit;
    const nextCursor = hasMore ? transactions[transactions.length - 1]._id : null;
    
    return NextResponse.json({
      transactions,
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('GET /api/transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTransactionSchema.parse(body);

    await connectDB();
    
    // Verify account ownership
    const account = await Account.findOne({
      _id: validatedData.accountId,
      userId,
    });
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Create transaction and update account balance atomically
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Create transaction
        const transaction = new Transaction({
          ...validatedData,
          userId,
        });
        
        await transaction.save({ session });
        
        // Update account balance
        const sign = getTransactionSign(validatedData.type);
        const balanceChange = sign * validatedData.amountCents;
        
        await Account.findByIdAndUpdate(
          validatedData.accountId,
          { $inc: { currentBalanceCents: balanceChange } },
          { session }
        );
        
        return transaction;
      });
      
      // Fetch the created transaction with populated account
      const transaction = await Transaction.findOne({
        userId,
        accountId: validatedData.accountId,
      })
        .populate('accountId', 'name type')
        .sort({ createdAt: -1 });
      
      return NextResponse.json(transaction, { status: 201 });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('POST /api/transactions error:', error);
    
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
