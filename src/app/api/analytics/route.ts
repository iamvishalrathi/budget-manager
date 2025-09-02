import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { analyticsQuerySchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = analyticsQuerySchema.parse({
      granularity: searchParams.get('granularity'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      accountId: searchParams.get('accountId'),
    });

    await connectDB();
    
    // Build match filter
    interface MatchFilter {
      userId: string;
      accountId?: string;
      date?: { $gte?: Date; $lte?: Date };
    }
    
    const matchFilter: MatchFilter = { userId };
    
    if (query.accountId) {
      matchFilter.accountId = query.accountId;
    }
    
    if (query.from || query.to) {
      matchFilter.date = {};
      if (query.from) {
        matchFilter.date.$gte = query.from;
      }
      if (query.to) {
        matchFilter.date.$lte = query.to;
      }
    }
    
    // Determine date truncation format
    let dateFormat: string;
    switch (query.granularity) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%U'; // Year-Week
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }
    
    // Aggregate transactions by time period and type
    const timeSeriesData = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: dateFormat, date: '$date' } },
            type: '$type',
          },
          totalAmountCents: { $sum: '$amountCents' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.period',
          data: {
            $push: {
              type: '$_id.type',
              totalAmountCents: '$totalAmountCents',
              count: '$count',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Aggregate by category
    const categoryData = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            category: '$category',
            type: '$type',
          },
          totalAmountCents: { $sum: '$amountCents' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmountCents: -1 } },
      { $limit: 20 }, // Top 20 categories
    ]);
    
    // Calculate totals
    const totals = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$type',
          totalAmountCents: { $sum: '$amountCents' },
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Calculate net income (income - expenses)
    const incomeTotal = totals.find(t => t._id === 'income')?.totalAmountCents || 0;
    const expenseTotal = totals.find(t => t._id === 'expense')?.totalAmountCents || 0;
    const netIncomeCents = incomeTotal - expenseTotal;
    
    return NextResponse.json({
      timeSeriesData,
      categoryData,
      totals,
      summary: {
        totalIncomeCents: incomeTotal,
        totalExpenseCents: expenseTotal,
        netIncomeCents,
        transactionCount: totals.reduce((sum, t) => sum + t.count, 0),
      },
      period: {
        from: query.from,
        to: query.to,
        granularity: query.granularity,
      },
    });
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    
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
