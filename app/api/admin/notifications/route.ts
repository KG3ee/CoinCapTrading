import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
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

    const query: any = {};
    if (sinceParam) {
      query.createdAt = { $gt: new Date(sinceParam) };
    }

    const recentUsers = await User.find(query, 'fullName email uid createdAt')
      .sort({ createdAt: -1 })
      .limit(limit);

    const notifications = recentUsers.map((u: any) => ({
      id: u._id.toString(),
      type: 'new_registration',
      userId: u._id.toString(),
      uid: u.uid,
      email: u.email,
      name: u.fullName || u.email,
      timestamp: u.createdAt,
    }));

    return NextResponse.json({
      notifications,
      total: notifications.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
