import { connectDB } from '@/lib/mongodb';
import Portfolio from '@/lib/models/Portfolio';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminBalanceAdjust' });

function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const expected = process.env.ADMIN_SECRET_KEY;
  if (!expected) return false;
  return adminKey === expected;
}

// GET /api/admin/balance — list all users with balances
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const users = await User.find({}, 'fullName email uid').sort({ fullName: 1 });

    const usersWithBalance = await Promise.all(
      users.map(async (user: any) => {
        const portfolio = await Portfolio.findOne({ userId: user._id });
        return {
          id: user._id.toString(),
          name: user.fullName || user.email,
          email: user.email,
          uid: user.uid,
          balance: portfolio?.accountBalance ?? config.app.defaultBalance,
        };
      })
    );

    return NextResponse.json({ users: usersWithBalance });
  } catch (error: any) {
    log.error({ error }, 'Failed to list user balances');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/balance — adjust a user's balance
export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const body = await request.json();
    const { userId, action, amount } = body;

    if (!userId || !action || !amount) {
      return NextResponse.json({ error: 'userId, action, and amount are required' }, { status: 400 });
    }

    const parsedAmount = Math.abs(Number(amount));
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!['increase', 'decrease', 'set'].includes(action)) {
      return NextResponse.json({ error: 'Action must be increase, decrease, or set' }, { status: 400 });
    }

    // Verify user exists
    const user = await User.findById(userId, 'fullName email');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      portfolio = new Portfolio({
        userId,
        accountBalance: config.app.defaultBalance,
        totalInvested: 0,
        totalReturns: 0,
        holdings: [],
      });
    }

    const oldBalance = portfolio.accountBalance;

    if (action === 'increase') {
      portfolio.accountBalance += parsedAmount;
    } else if (action === 'decrease') {
      portfolio.accountBalance = Math.max(0, portfolio.accountBalance - parsedAmount);
    } else if (action === 'set') {
      portfolio.accountBalance = parsedAmount;
    }

    await portfolio.save();

    log.info(
      { userId, action, amount: parsedAmount, oldBalance, newBalance: portfolio.accountBalance },
      'Admin adjusted user balance'
    );

    return NextResponse.json({
      message: 'Balance updated',
      user: { id: userId, name: user.fullName || user.email },
      oldBalance,
      newBalance: portfolio.accountBalance,
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to adjust balance');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
