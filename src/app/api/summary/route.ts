import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { Account } from '@/models/Account';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get date range for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all time data
    const [
      totalIncome,
      totalExpenses,
      monthlyIncome,
      monthlyExpenses,
      totalAccounts,
      totalTransactions
    ] = await Promise.all([
      // Total income (all time)
      Transaction.aggregate([
        { $match: { userId, type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amountCents' } } }
      ]),
      
      // Total expenses (all time)
      Transaction.aggregate([
        { $match: { userId, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amountCents' } } }
      ]),
      
      // Monthly income
      Transaction.aggregate([
        { 
          $match: { 
            userId, 
            type: 'income',
            date: { $gte: startOfMonth, $lte: endOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amountCents' } } }
      ]),
      
      // Monthly expenses
      Transaction.aggregate([
        { 
          $match: { 
            userId, 
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amountCents' } } }
      ]),
      
      // Total accounts
      Account.countDocuments({ userId }),
      
      // Total transactions
      Transaction.countDocuments({ userId })
    ]);

    // Calculate total balance from all accounts
    const accounts = await Account.find({ userId }, 'currentBalanceCents');
    const totalBalance = accounts.reduce((sum, account) => sum + account.currentBalanceCents, 0);

    // Get recent transactions for activity
    const recentTransactions = await Transaction.find({ userId })
      .populate('accountId', 'name type')
      .sort({ date: -1, _id: -1 })
      .limit(5);

    const summary = {
      totalIncome: totalIncome[0]?.total || 0,
      totalExpenses: totalExpenses[0]?.total || 0,
      totalBalance,
      monthlyIncome: monthlyIncome[0]?.total || 0,
      monthlyExpenses: monthlyExpenses[0]?.total || 0,
      netIncome: (totalIncome[0]?.total || 0) - (totalExpenses[0]?.total || 0),
      monthlyNet: (monthlyIncome[0]?.total || 0) - (monthlyExpenses[0]?.total || 0),
      totalAccounts,
      totalTransactions,
      recentTransactions
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('GET /api/summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
