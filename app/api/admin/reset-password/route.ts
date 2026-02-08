import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminResetPassword' });

function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const expected = process.env.ADMIN_SECRET_KEY;
  if (!expected) return false;
  return adminKey === expected;
}

// PUT /api/admin/reset-password — reset a user's password
export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      actor: 'admin',
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
