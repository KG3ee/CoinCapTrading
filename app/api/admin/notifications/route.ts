import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import AdminUser from '@/lib/models/AdminUser';
import FundingRequest from '@/lib/models/FundingRequest';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET /api/admin/notifications — get recent registrations as notifications
export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'view_dashboard')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const sinceParam = request.nextUrl.searchParams.get('since');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Number(limitParam) || 50, 100);
    const lastSeenAt = context.admin.lastSeenNotificationAt
      ? new Date(context.admin.lastSeenNotificationAt)
      : null;

    const query: any = {};
    if (sinceParam) {
      query.createdAt = { $gt: new Date(sinceParam) };
    }

    const [recentUsers, recentFundings] = await Promise.all([
      User.find(query, 'fullName email uid createdAt')
        .sort({ createdAt: -1 })
        .limit(limit),
      FundingRequest.find(query)
        .sort({ createdAt: -1 })
        .limit(limit),
    ]);

    const fundingUserIds = Array.from(
      new Set(recentFundings.map((funding: any) => funding.userId?.toString()).filter(Boolean))
    );
    const fundingUsers = fundingUserIds.length > 0
      ? await User.find({ _id: { $in: fundingUserIds } }, 'fullName email uid').lean()
      : [];
    const fundingUserMap = new Map(fundingUsers.map((user: any) => [user._id.toString(), user]));

    const notifications = [
      ...recentUsers.map((u: any) => ({
        id: `user-${u._id.toString()}`,
        type: 'new_registration',
        userId: u._id.toString(),
        uid: u.uid,
        email: u.email,
        name: u.fullName || u.email,
        timestamp: u.createdAt,
        message: `${u.fullName || u.email} joined`,
      })),
      ...recentFundings.map((funding: any) => {
        const fundingUser = fundingUserMap.get(funding.userId.toString());
        return {
          id: `funding-${funding._id.toString()}`,
          type: 'funding',
          fundingType: funding.type,
          asset: funding.asset,
          amount: funding.amount,
          status: funding.status,
          userId: funding.userId.toString(),
          name: fundingUser?.fullName || fundingUser?.email || 'Unknown user',
          email: fundingUser?.email || '',
          uid: fundingUser?.uid || '',
          timestamp: funding.createdAt,
          message: `${funding.type === 'withdraw' ? 'Withdrawal' : 'Deposit'} request • ${funding.amount} ${funding.asset}`,
        };
      }),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const unreadQuery = lastSeenAt ? { createdAt: { $gt: lastSeenAt } } : {};
    const [unreadUsers, unreadFundings] = await Promise.all([
      User.countDocuments(unreadQuery),
      FundingRequest.countDocuments(unreadQuery),
    ]);
    const unreadCount = unreadUsers + unreadFundings;

    return NextResponse.json({
      notifications,
      unreadCount,
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : '',
      total: notifications.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/notifications — mark all notifications as read
export async function PUT(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'view_dashboard')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const candidate = typeof body?.seenAt === 'string' ? new Date(body.seenAt) : null;
    const seenAt = candidate && !Number.isNaN(candidate.getTime()) ? candidate : new Date();

    await AdminUser.findByIdAndUpdate(context.admin._id, { lastSeenNotificationAt: seenAt });

    return NextResponse.json({
      message: 'Notifications marked as read',
      unreadCount: 0,
      lastSeenAt: seenAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
