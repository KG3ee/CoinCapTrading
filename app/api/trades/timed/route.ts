import { connectDB } from '@/lib/mongodb';
import Portfolio from '@/lib/models/Portfolio';
import TimedTrade from '@/lib/models/TimedTrade';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';
import { withRateLimit } from '@/lib/middleware/rateLimit';
import { logger } from '@/lib/utils/logger';
import { nanoid } from 'nanoid';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'TimedTradeRoute' });

// Period config: period (seconds) → { profitPercent, minAmount }
const PERIOD_CONFIG: Record<number, { profitPercent: number; minAmount: number }> = {
  30:  { profitPercent: 10,  minAmount: 100 },
  60:  { profitPercent: 15,  minAmount: 10000 },
  90:  { profitPercent: 20,  minAmount: 30000 },
  120: { profitPercent: 40,  minAmount: 50000 },
  180: { profitPercent: 60,  minAmount: 100000 },
  300: { profitPercent: 80,  minAmount: 250000 },
  600: { profitPercent: 120, minAmount: 1000000 },
};

// POST /api/trades/timed — place a timed trade
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectDB();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, cryptoSymbol, amount, period } = body;

    // Validate type
    if (!['buy', 'sell'].includes(type)) {
      return NextResponse.json({ error: 'Invalid trade type' }, { status: 400 });
    }

    // Validate cryptoSymbol
    if (!cryptoSymbol || typeof cryptoSymbol !== 'string') {
      return NextResponse.json({ error: 'Invalid crypto symbol' }, { status: 400 });
    }

    // Validate period
    const periodConfig = PERIOD_CONFIG[period];
    if (!periodConfig) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }

    // Validate amount
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (parsedAmount < periodConfig.minAmount) {
      return NextResponse.json(
        { error: `Minimum amount for ${period}s period is ${periodConfig.minAmount.toLocaleString()} USDT` },
        { status: 400 }
      );
    }

    // Get portfolio and check balance
    let portfolio = await Portfolio.findOne({ userId: session.user.id });
    if (!portfolio) {
      portfolio = new Portfolio({
        userId: session.user.id,
        accountBalance: config.app.defaultBalance,
        totalInvested: 0,
        totalReturns: 0,
        holdings: [],
      });
    }

    if (portfolio.accountBalance < parsedAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Deduct balance
    portfolio.accountBalance -= parsedAmount;
    await portfolio.save();

    // Create timed trade
    const trade = new TimedTrade({
      userId: session.user.id,
      type,
      cryptoSymbol: cryptoSymbol.toUpperCase(),
      amount: parsedAmount,
      period,
      profitPercent: periodConfig.profitPercent,
      result: 'pending',
      transactionId: `TT${nanoid(16)}`,
    });
    await trade.save();

    log.info(
      { userId: session.user.id, tradeId: trade._id, type, cryptoSymbol, amount: parsedAmount, period },
      'Timed trade placed'
    );

    return NextResponse.json(
      {
        message: 'Timed trade placed',
        trade: {
          id: trade._id,
          transactionId: trade.transactionId,
          type: trade.type,
          cryptoSymbol: trade.cryptoSymbol,
          amount: trade.amount,
          period: trade.period,
          profitPercent: trade.profitPercent,
        },
        newBalance: portfolio.accountBalance,
      },
      { status: 201 }
    );
  } catch (error: any) {
    log.error({ error }, 'Timed trade placement error');
    return NextResponse.json({ error: error.message || 'Trade failed' }, { status: 500 });
  }
}
