import { connectDB } from '@/lib/mongodb';
import Portfolio from '@/lib/models/Portfolio';
import Trade from '@/lib/models/Trade';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get or create portfolio for user
    let portfolio = await Portfolio.findOne({ userId: decoded.userId });

    if (!portfolio) {
      // Create new portfolio with default values
      portfolio = new Portfolio({
        userId: decoded.userId,
        accountBalance: 10000,
        totalInvested: 0,
        totalReturns: 0,
        holdings: [],
      });
      await portfolio.save();
    }

    // Get recent trades (last 10)
    const trades = await Trade.find({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate portfolio stats
    const totalPortfolioValue = portfolio.accountBalance + 
      (portfolio.holdings?.reduce((sum: number, h: any) => sum + (h.totalValue || 0), 0) || 0);

    return NextResponse.json(
      {
        portfolio: {
          accountBalance: portfolio.accountBalance,
          totalPortfolioValue,
          totalInvested: portfolio.totalInvested,
          totalReturns: portfolio.totalReturns,
          holdings: portfolio.holdings || [],
        },
        trades,
        stats: {
          totalHoldings: portfolio.holdings?.length || 0,
          totalTrades: trades.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
