import { connectDB } from '@/lib/mongodb';
import Portfolio from '@/lib/models/Portfolio';
import User from '@/lib/models/User';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import config from '@/lib/config';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminBalanceAdjust' });

// GET /api/admin/balance — list all users with balances
export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (
    !hasPermission(context.permissions, 'manage_users') &&
    !hasPermission(context.permissions, 'manage_financials') &&
    !hasPermission(context.permissions, 'view_dashboard')
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const users = await User.find(
      {},
      'fullName email uid accountStatus isDemoUser isVerified isTwoFactorEnabled kycStatus lastActiveAt createdAt'
    ).sort({ fullName: 1 });
    const inactiveCutoff = new Date(Date.now() - 183 * 24 * 60 * 60 * 1000);

    const usersWithBalance = await Promise.all(
      users.map(async (user: any) => {
        const portfolio = await Portfolio.findOne({ userId: user._id });
        const lastActiveAt = user.lastActiveAt || null;
        const referenceDate = lastActiveAt || user.createdAt || null;
        let accountStatus = user.accountStatus;
        if (accountStatus !== 'banned') {
          const isInactive = referenceDate ? new Date(referenceDate) < inactiveCutoff : true;
          if (isInactive) accountStatus = 'inactive';
        }
        return {
          id: user._id.toString(),
          name: user.fullName || user.email,
          email: user.email,
          uid: user.uid,
          isDemoUser: !!user.isDemoUser,
          accountStatus,
          isVerified: !!user.isVerified,
          isTwoFactorEnabled: !!user.isTwoFactorEnabled,
          kycStatus: user.kycStatus || 'none',
          balance: portfolio?.accountBalance ?? config.app.defaultBalance,
          lastActiveAt,
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
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_financials')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (context.admin.role === 'moderator') {
    return NextResponse.json({ error: 'Moderators have view-only user access' }, { status: 403 });
  }

  try {
    await connectDB();

    const body = await request.json();
    const { userId, userIds, action, amount, reason } = body;

    const targetIds: string[] = Array.isArray(userIds) && userIds.length > 0
      ? userIds
      : userId
        ? [userId]
        : [];

    if (!targetIds.length || !action || !amount) {
      return NextResponse.json({ error: 'userId(s), action, and amount are required' }, { status: 400 });
    }

    const parsedAmount = Math.abs(Number(amount));
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!['increase', 'decrease', 'set'].includes(action)) {
      return NextResponse.json({ error: 'Action must be increase, decrease, or set' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    const updated: Array<{ userId: string; name: string; oldBalance: number; newBalance: number }> = [];
    const failed: Array<{ userId: string; error: string }> = [];

    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';

    for (const id of targetIds) {
      try {
        const user = await User.findById(id, 'fullName email');
        if (!user) {
          failed.push({ userId: id, error: 'User not found' });
          continue;
        }

        let portfolio = await Portfolio.findOne({ userId: id });
        if (!portfolio) {
          portfolio = new Portfolio({
            userId: id,
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
          { userId: id, action, amount: parsedAmount, oldBalance, newBalance: portfolio.accountBalance, reason: reason.trim() },
          'Admin adjusted user balance'
        );

        await AdminAuditLog.create({
          actionType: 'balance_adjust',
          action,
          userId: id,
          userName: user.fullName || '',
          userEmail: user.email || '',
          amount: parsedAmount,
          oldBalance,
          newBalance: portfolio.accountBalance,
          reason: reason.trim(),
          actor: context.admin._id.toString(),
          actorName: context.admin.name,
          actorRole: context.admin.role,
          targetType: 'user',
          targetId: id,
          ipAddress,
        });

        updated.push({
          userId: id,
          name: user.fullName || user.email,
          oldBalance,
          newBalance: portfolio.accountBalance,
        });
      } catch (err: any) {
        failed.push({ userId: id, error: err?.message || 'Failed to update' });
      }
    }

    if (!updated.length) {
      return NextResponse.json({ error: failed[0]?.error || 'No balances updated', failed }, { status: 400 });
    }

    return NextResponse.json({
      message: updated.length > 1 ? `Balance updated for ${updated.length} users` : 'Balance updated',
      updated,
      failed,
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to adjust balance');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
