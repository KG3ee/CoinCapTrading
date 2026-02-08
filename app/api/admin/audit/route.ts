import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminAuditLog' });

function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const expected = process.env.ADMIN_SECRET_KEY;
  if (!expected) {
    log.warn('ADMIN_SECRET_KEY not set — admin endpoints disabled');
    return false;
  }
  return adminKey === expected;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const type = request.nextUrl.searchParams.get('type') || 'balance';
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 200);
    const actionType = type === 'balance' ? 'balance_adjust' : type;
    const query = type === 'all' ? {} : { actionType };

    const logs = await AdminAuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({
      logs: logs.map((l: any) => ({
        id: l._id.toString(),
        actionType: l.actionType,
        action: l.action,
        userId: l.userId?.toString(),
        userName: l.userName,
        userEmail: l.userEmail,
        amount: l.amount,
        oldBalance: l.oldBalance,
        newBalance: l.newBalance,
        reason: l.reason,
        actor: l.actor,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to fetch audit logs');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
