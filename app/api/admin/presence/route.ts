import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminUser from '@/lib/models/AdminUser';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

function statusFromLastActive(lastActiveAt: Date | null) {
  if (!lastActiveAt) return { state: 'offline', label: 'Offline' };
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  if (diff <= 2 * 60 * 1000) return { state: 'online', label: 'Online' };
  if (diff <= 10 * 60 * 1000) return { state: 'idle', label: 'Idle' };
  return { state: 'offline', label: 'Offline' };
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'view_dashboard')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const admins = await AdminUser.find({ status: 'active' }).sort({ lastActiveAt: -1, createdAt: 1 });

  const list = admins.map((a: any) => {
    const status = statusFromLastActive(a.lastActiveAt);
    return {
      id: a._id.toString(),
      name: a.name,
      email: a.email,
      role: a.role,
      status: status.state,
      statusLabel: status.label,
      lastActiveAt: a.lastActiveAt,
    };
  });

  return NextResponse.json({ admins: list });
}
