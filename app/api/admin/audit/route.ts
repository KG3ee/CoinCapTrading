import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { logger } from '@/lib/utils/logger';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminAuditLog' });

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'view_logs')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
        actorName: l.actorName,
        actorRole: l.actorRole,
        targetType: l.targetType,
        targetId: l.targetId,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to fetch audit logs');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
