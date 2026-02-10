import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';
import FundingRequest from '@/lib/models/FundingRequest';
import Portfolio from '@/lib/models/Portfolio';
import User from '@/lib/models/User';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import config from '@/lib/config';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminFunding' });

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_financials') || context.admin.role === 'moderator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const status = request.nextUrl.searchParams.get('status');
    const query: any = {};
    if (status && status !== 'all') query.status = status;

    const requests = await FundingRequest.find(query).sort({ createdAt: -1 }).limit(200).lean();
    const userIds = requests.map((r: any) => r.userId);
    const users = await User.find({ _id: { $in: userIds } }, 'fullName email uid').lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    return NextResponse.json({
      requests: requests.map((r: any) => {
        const user = userMap.get(r.userId.toString());
        return {
          id: r._id.toString(),
          requestId: r.requestId,
          type: r.type,
          amount: r.amount,
          asset: r.asset,
          method: r.method,
          address: r.address,
          status: r.status,
          reason: r.reason,
          createdAt: r.createdAt,
          resolvedAt: r.resolvedAt,
          userId: r.userId.toString(),
          userName: user?.fullName || user?.email || 'Unknown',
          userEmail: user?.email || '',
          userUid: user?.uid || '',
        };
      }),
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to load funding requests');
    return NextResponse.json({ error: 'Failed to load funding requests' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_financials') || context.admin.role === 'moderator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const requestId = body?.requestId;
    const action = body?.action;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 });
    }

    const funding = await FundingRequest.findOne({ requestId });
    if (!funding) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (funding.status !== 'pending') {
      return NextResponse.json({ error: 'Request already resolved' }, { status: 400 });
    }

    let portfolio = await Portfolio.findOne({ userId: funding.userId });
    if (!portfolio) {
      portfolio = new Portfolio({
        userId: funding.userId,
        accountBalance: config.app.defaultBalance,
        totalInvested: 0,
        totalReturns: 0,
        holdings: [],
      });
    }

    const user = await User.findById(funding.userId, 'fullName email');

    if (action === 'approve') {
      if (funding.type === 'deposit') {
        portfolio.accountBalance = Number((portfolio.accountBalance + funding.amount).toFixed(6));
        await portfolio.save();
      }
      funding.status = 'approved';
    } else {
      if (funding.type === 'withdraw') {
        portfolio.accountBalance = Number((portfolio.accountBalance + funding.amount).toFixed(6));
        await portfolio.save();
      }
      funding.status = 'rejected';
      funding.reason = reason || 'Rejected by admin';
    }

    funding.resolvedAt = new Date();
    funding.resolvedBy = context.admin._id;
    await funding.save();

    await AdminAuditLog.create({
      actionType: 'funding_request',
      action: funding.status,
      userId: funding.userId.toString(),
      userName: user?.fullName || '',
      userEmail: user?.email || '',
      amount: funding.amount,
      reason: funding.reason || (action === 'approve' ? 'Approved funding request' : 'Rejected funding request'),
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      targetType: 'funding_request',
      targetId: funding._id.toString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
    });

    return NextResponse.json({ message: `Request ${funding.status}`, requestId });
  } catch (error: any) {
    log.error({ error }, 'Failed to update funding request');
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
