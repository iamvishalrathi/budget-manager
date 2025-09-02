import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import { Account } from '@/models/Account';
import { Adjustment } from '@/models/Adjustment';
import { balanceAdjustmentSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Balance adjustment request:', body);
    const validatedData = balanceAdjustmentSchema.parse(body);

    await connectDB();
    
    // Verify account exists and belongs to the user
    const account = await Account.findOne({ 
      _id: validatedData.accountId, 
      userId 
    });
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const previousBalance = account.currentBalanceCents;
    const newBalance = validatedData.newBalanceCents;
    const adjustmentAmount = newBalance - previousBalance;

    // If no change, don't create adjustment
    if (adjustmentAmount === 0) {
      return NextResponse.json({ 
        message: 'No balance change detected',
        currentBalance: previousBalance 
      });
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Create adjustment record
        const adjustment = new Adjustment({
          userId,
          accountId: validatedData.accountId,
          previousBalanceCents: previousBalance,
          newBalanceCents: newBalance,
          adjustmentAmountCents: adjustmentAmount,
          reason: validatedData.reason,
        });
        
        await adjustment.save({ session });
        
        // Update account balance
        await Account.findByIdAndUpdate(
          validatedData.accountId,
          { currentBalanceCents: newBalance },
          { session }
        );
      });
      
      return NextResponse.json({
        message: 'Balance adjusted successfully',
        adjustment: {
          previousBalance: previousBalance,
          newBalance: newBalance,
          adjustmentAmount: adjustmentAmount,
          reason: validatedData.reason,
        },
      }, { status: 201 });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('POST /api/adjustments error:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    await connectDB();
    
    const filter: { userId: string; accountId?: string } = { userId };
    if (accountId) {
      filter.accountId = accountId;
    }
    
    const adjustments = await Adjustment.find(filter)
      .populate('accountId', 'name type')
      .sort({ createdAt: -1 })
      .limit(50);
    
    return NextResponse.json({ adjustments });
  } catch (error) {
    console.error('GET /api/adjustments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
