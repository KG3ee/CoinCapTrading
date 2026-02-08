import { connectDB } from '@/lib/mongodb';
import TradeSettings from '@/lib/models/TradeSettings';
import TimedTrade from '@/lib/models/TimedTrade';
import User from '@/lib/models/User';
import Portfolio from '@/lib/models/Portfolio';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminTradeSettings' });

// Simple admin auth via secret key in header
function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const expected = process.env.ADMIN_SECRET_KEY;
  if (!expected) {
    log.warn('ADMIN_SECRET_KEY not set — admin endpoints disabled');
    return false;
  }
  return adminKey === expected;
}

// GET /api/admin/trade-settings — get current settings + stats
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const settings = await TradeSettings.getSettings();

    // Get recent trade stats
    const totalTrades = await TimedTrade.countDocuments();
    const pendingTrades = await TimedTrade.countDocuments({ result: 'pending' });
    const wins = await TimedTrade.countDocuments({ result: 'win' });
    const losses = await TimedTrade.countDocuments({ result: 'lose' });

    // Get recent trades for display
    const recentTrades = await TimedTrade.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'fullName email');

    // Get all users for user-override dropdown
    const users = await User.find({}, 'fullName email').sort({ fullName: 1 }).limit(100);

    return NextResponse.json({
      settings: {
        globalMode: settings.globalMode,
        winRatePercent: settings.winRatePercent,
        userOverrides: Object.fromEntries(settings.userOverrides || new Map()),
      },
      stats: { totalTrades, pendingTrades, wins, losses },
      recentTrades: recentTrades.map((t: any) => ({
        id: t._id,
        transactionId: t.transactionId,
        user: t.userId?.fullName || t.userId?.email || 'Unknown',
        userId: t.userId?._id,
        type: t.type,
        cryptoSymbol: t.cryptoSymbol,
        amount: t.amount,
        period: t.period,
        profitPercent: t.profitPercent,
        result: t.result,
        profitAmount: t.profitAmount,
        forcedResult: t.forcedResult,
        createdAt: t.createdAt,
      })),
      users: users.map((u: any) => ({
        id: u._id.toString(),
        name: u.fullName || u.email,
        email: u.email,
      })),
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to get trade settings');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/trade-settings — update settings
export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const { globalMode, winRatePercent, userOverrides } = body;

    const settings = await TradeSettings.getSettings();

    if (globalMode && ['random', 'all_win', 'all_lose'].includes(globalMode)) {
      settings.globalMode = globalMode;
    }

    if (winRatePercent !== undefined) {
      const rate = Math.max(0, Math.min(100, Number(winRatePercent)));
      settings.winRatePercent = rate;
    }

    if (userOverrides && typeof userOverrides === 'object') {
      for (const [userId, override] of Object.entries(userOverrides)) {
        if (override === null || override === '') {
          settings.userOverrides.delete(userId);
          const user = await User.findById(userId, 'fullName email');
          await AdminAuditLog.create({
            actionType: 'trade_override',
            action: 'remove',
            userId,
            userName: user?.fullName || '',
            userEmail: user?.email || '',
            reason: 'Removed trade override',
            actor: 'admin',
            ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
          });
        } else if (override === 'win' || override === 'lose') {
          settings.userOverrides.set(userId, override);
          const user = await User.findById(userId, 'fullName email');
          await AdminAuditLog.create({
            actionType: 'trade_override',
            action: override,
            userId,
            userName: user?.fullName || '',
            userEmail: user?.email || '',
            reason: `Set trade override to ${override.toUpperCase()}`,
            actor: 'admin',
            ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
          });
        }
      }
    }

    await settings.save();

    log.info({ globalMode: settings.globalMode, winRatePercent: settings.winRatePercent }, 'Trade settings updated');

    return NextResponse.json({
      message: 'Settings updated',
      settings: {
        globalMode: settings.globalMode,
        winRatePercent: settings.winRatePercent,
        userOverrides: Object.fromEntries(settings.userOverrides || new Map()),
      },
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to update trade settings');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
