import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminBan' });

export async function PUT(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (context.admin.role === 'moderator') {
    return NextResponse.json({ error: 'Moderators have view-only user access' }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const userId = body?.userId;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!userId || reason.length < 3) {
      return NextResponse.json({ error: 'userId and reason are required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.accountStatus = 'banned';
    await user.save();

    await AdminAuditLog.create({
      actionType: 'user_ban',
      action: 'ban',
      userId: user._id,
      userName: user.fullName || '',
      userEmail: user.email || '',
      reason,
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      targetType: 'user',
      targetId: user._id.toString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
    });

    log.info({ userId: user._id.toString(), reason }, 'User banned');

    return NextResponse.json({ message: 'User banned', userId: user._id.toString() });
  } catch (error: any) {
    log.error({ error }, 'Failed to ban user');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
