import { connectDB } from '@/lib/mongodb';
import Portfolio from '@/lib/models/Portfolio';
import TimedTrade from '@/lib/models/TimedTrade';
import TradeSettings from '@/lib/models/TradeSettings';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';
import { withRateLimit } from '@/lib/middleware/rateLimit';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'TimedTradeResolve' });

// Determine win/lose based on settings hierarchy:
// 1. Trade-level forcedResult (highest priority)
// 2. Per-user override
// 3. Global mode (all_win / all_lose / random with winRatePercent)
async function determineResult(trade: any): Promise<'win' | 'lose'> {
  // 1. Check trade-level forced result
  if (trade.forcedResult === 'win' || trade.forcedResult === 'lose') {
    return trade.forcedResult;
  }

  // 2 & 3. Check settings
  const settings = await TradeSettings.getSettings();

  // 2. Check per-user override
  const userId = trade.userId.toString();
  const userOverride = settings.userOverrides?.get(userId);
  if (userOverride === 'win' || userOverride === 'lose') {
    return userOverride;
  }

  // 3. Check global mode
  if (settings.globalMode === 'all_win') return 'win';
  if (settings.globalMode === 'all_lose') return 'lose';

  // Random with configurable win rate
  const winRate = (settings.winRatePercent ?? 50) / 100;
  return Math.random() < winRate ? 'win' : 'lose';
}

// POST /api/trades/timed/resolve — resolve a timed trade (called when countdown ends)
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
    const { tradeId } = body;

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
    }

    const trade = await TimedTrade.findOne({
      _id: tradeId,
      userId: session.user.id,
      result: 'pending',
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found or already resolved' }, { status: 404 });
    }

    // Determine result using settings hierarchy
    const result = await determineResult(trade);

    trade.result = result;
    trade.resolvedAt = new Date();

    if (result === 'win') {
      const profitAmount = (trade.amount * trade.profitPercent) / 100;
      trade.profitAmount = profitAmount;

      // Return original amount + profit to wallet
      const portfolio = await Portfolio.findOne({ userId: session.user.id });
      if (portfolio) {
        portfolio.accountBalance += trade.amount + profitAmount;
        portfolio.totalReturns = (portfolio.totalReturns || 0) + profitAmount;
        await portfolio.save();
      }
    } else {
      trade.profitAmount = 0;
      // Amount already deducted, nothing to return
    }

    await trade.save();

    log.info(
      { userId: session.user.id, tradeId: trade._id, result, amount: trade.amount, profitAmount: trade.profitAmount },
      'Timed trade resolved'
    );

    const portfolio = await Portfolio.findOne({ userId: session.user.id });

    return NextResponse.json({
      result: trade.result,
      profitAmount: trade.profitAmount,
      amount: trade.amount,
      newBalance: portfolio?.accountBalance ?? 0,
    });
  } catch (error: any) {
    log.error({ error }, 'Timed trade resolve error');
    return NextResponse.json({ error: error.message || 'Resolve failed' }, { status: 500 });
  }
}
