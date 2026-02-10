import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import FundingRequest from '@/lib/models/FundingRequest';
import AdminSettings from '@/lib/models/AdminSettings';

export const dynamic = 'force-dynamic';

type UserNotification = {
  id: string;
  type: 'funding' | 'system' | 'promotion';
  title: string;
  message: string;
  timestamp: string;
  targetPath: string;
  status?: string;
  fundingType?: 'deposit' | 'withdraw';
};

function parseDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatFundingTitle(type: 'deposit' | 'withdraw', status: string) {
  const prefix = type === 'withdraw' ? 'Withdrawal' : 'Deposit';
  if (status === 'approved') return `${prefix} approved`;
  if (status === 'rejected') return `${prefix} rejected`;
  return `${prefix} request submitted`;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id, 'lastSeenUserNotificationAt').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [fundingRequests, settings] = await Promise.all([
      FundingRequest.find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .limit(40)
        .lean(),
      (AdminSettings as any).getSettings(),
    ]);

    const fundingNotifications: UserNotification[] = fundingRequests.map((request: any) => {
      const status = request.status || 'pending';
      const fundingType = request.type === 'withdraw' ? 'withdraw' : 'deposit';
      const timestamp = parseDate(request.resolvedAt || request.createdAt).toISOString();
      const amount = toNumber(request.amount).toLocaleString();
      const asset = (request.asset || 'USDT').toUpperCase();
      const network = (request.network || '').toUpperCase();
      const reason = typeof request.reason === 'string' && request.reason.trim().length > 0
        ? ` • ${request.reason.trim()}`
        : '';

      return {
        id: `funding-${request._id.toString()}`,
        type: 'funding',
        title: formatFundingTitle(fundingType, status),
        message: `${amount} ${asset}${network ? ` • ${network}` : ''}${reason}`,
        timestamp,
        targetPath: '/wallet',
        status,
        fundingType,
      };
    });

    const systemNotifications: UserNotification[] = [];

    const promotionMessage = typeof settings?.promotion?.message === 'string' ? settings.promotion.message.trim() : '';
    const promotionEnabled = Boolean(settings?.promotion?.enabled);
    const promotionTargetPath = typeof settings?.promotion?.targetPath === 'string' && settings.promotion.targetPath.startsWith('/')
      ? settings.promotion.targetPath
      : '/news';

    if (promotionEnabled && promotionMessage) {
      systemNotifications.push({
        id: `promotion-message-${parseDate(settings?.promotion?.updatedAt || settings?.updatedAt || new Date()).toISOString()}`,
        type: 'promotion',
        title: 'Promotion',
        message: promotionMessage,
        timestamp: parseDate(settings?.promotion?.updatedAt || settings?.updatedAt || new Date()).toISOString(),
        targetPath: promotionTargetPath,
      });
    }

    if (settings?.maintenance?.enabled && typeof settings.maintenance.message === 'string' && settings.maintenance.message.trim()) {
      systemNotifications.push({
        id: 'system-maintenance',
        type: 'system',
        title: 'System Notice',
        message: settings.maintenance.message.trim(),
        timestamp: parseDate(settings.updatedAt || new Date()).toISOString(),
        targetPath: '/dashboard',
      });
    }

    const notifications = [...fundingNotifications, ...systemNotifications].sort(
      (a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime()
    );

    const lastSeenAt = user.lastSeenUserNotificationAt ? parseDate(user.lastSeenUserNotificationAt) : null;
    const unreadCount = notifications.reduce((count, notification) => {
      if (!lastSeenAt) return count + 1;
      return parseDate(notification.timestamp).getTime() > lastSeenAt.getTime() ? count + 1 : count;
    }, 0);

    return NextResponse.json({
      notifications,
      unreadCount,
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : '',
      total: notifications.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json().catch(() => ({}));
    const seenAtCandidate = typeof body?.seenAt === 'string' ? new Date(body.seenAt) : null;
    const seenAt = seenAtCandidate && !Number.isNaN(seenAtCandidate.getTime()) ? seenAtCandidate : new Date();

    await User.findByIdAndUpdate(session.user.id, { lastSeenUserNotificationAt: seenAt });

    return NextResponse.json({
      message: 'Notifications marked as read',
      unreadCount: 0,
      lastSeenAt: seenAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update notifications' }, { status: 500 });
  }
}
