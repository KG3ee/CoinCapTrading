import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminResetPassword' });

// PUT /api/admin/reset-password — reset a user's password
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
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'userId and newPassword are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Set new password — the pre('save') hook will auto-hash it
    user.password = newPassword;
    await user.save();

    log.info({ userId, email: user.email }, 'Admin reset user password');
    await AdminAuditLog.create({
      actionType: 'password_reset',
      action: 'reset',
      userId: user._id,
      userName: user.fullName || '',
      userEmail: user.email || '',
      reason: 'Admin reset user password',
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      targetType: 'user',
      targetId: user._id.toString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
    });

    return NextResponse.json({
      success: true,
      message: `Password reset for ${user.fullName || user.email}`,
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to reset password');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
