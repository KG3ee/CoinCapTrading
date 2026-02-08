import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import AdminUser from '@/lib/models/AdminUser';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { getAdminContext, hasPermission, AdminRole } from '@/lib/adminAuth';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminUsersMgmt' });

const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
};

function hashKey(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  const { admin } = context;
  const canManage = hasPermission(context.permissions, 'manage_admins');
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const admins = await AdminUser.find({ status: 'active' }).sort({ createdAt: -1 });
    return NextResponse.json({
      admins: admins.map((a: any) => ({
        id: a._id.toString(),
        name: a.name,
        email: a.email,
        role: a.role,
        roleLabel: ROLE_LABELS[a.role as AdminRole] || a.role,
        keyLast4: a.keyLast4,
        status: a.status,
        isRoot: a.isRoot,
        lastActiveAt: a.lastActiveAt,
        createdAt: a.createdAt,
        createdByName: a.createdByName,
        createdByRole: a.createdByRole,
      })),
      currentAdminId: admin._id?.toString(),
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to list admin users');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_admins')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (context.admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Only Super Admin can create admin accounts' }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = (body?.role as AdminRole) || 'admin';

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }
    if (!['superadmin', 'admin', 'moderator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const exists = await AdminUser.findOne({ email });
    if (exists) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const rawKey = crypto.randomBytes(24).toString('hex');
    const keyHash = hashKey(rawKey);
    const keyLast4 = rawKey.slice(-4);

    const created = await AdminUser.create({
      name,
      email,
      role,
      status: 'active',
      keyHash,
      keyLast4,
      createdById: context.admin._id,
      createdByName: context.admin.name,
      createdByRole: context.admin.role,
    });

    await AdminAuditLog.create({
      actionType: 'admin_create',
      action: 'create',
      targetType: 'admin_user',
      targetId: created._id.toString(),
      userName: created.name,
      userEmail: created.email,
      reason: `Created ${ROLE_LABELS[role] || role} account`,
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
    });

    return NextResponse.json({
      message: 'Admin created',
      admin: {
        id: created._id.toString(),
        name: created.name,
        email: created.email,
        role: created.role,
        roleLabel: ROLE_LABELS[role] || role,
        keyLast4: created.keyLast4,
      },
      adminKey: rawKey,
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to create admin user');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_admins')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const adminId = request.nextUrl.searchParams.get('adminId');
    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    const target = await AdminUser.findById(adminId);
    if (!target) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    if (target.isRoot) {
      return NextResponse.json({ error: 'Cannot delete root admin' }, { status: 403 });
    }

    if (target.role === 'superadmin' && context.admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only Super Admin can delete another Super Admin' }, { status: 403 });
    }

    await AdminUser.deleteOne({ _id: target._id });

    await AdminAuditLog.create({
      actionType: 'admin_delete',
      action: 'delete',
      targetType: 'admin_user',
      targetId: target._id.toString(),
      userName: target.name,
      userEmail: target.email,
      reason: `Deleted ${ROLE_LABELS[target.role as AdminRole] || target.role} account`,
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
    });

    return NextResponse.json({ message: 'Admin deleted' });
  } catch (error: any) {
    log.error({ error }, 'Failed to delete admin user');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
