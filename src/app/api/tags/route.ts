import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import { Transaction } from '@/models/Transaction';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Get all unique tags used by the user
    const tagsAggregation = await Transaction.aggregate([
      {
        $match: { 
          userId,
          tags: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$tags'
      },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1, _id: 1 }
      },
      {
        $limit: 100 // Limit to top 100 most used tags
      }
    ]);
    
    const tags = tagsAggregation.map(item => ({
      tag: item._id,
      count: item.count
    }));
    
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('GET /api/tags error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
