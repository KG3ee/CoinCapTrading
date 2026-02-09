import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminUser from '@/lib/models/AdminUser';
import AdminSettings from '@/lib/models/AdminSettings';
import { logger } from '@/lib/utils/logger';

export type AdminRole = 'superadmin' | 'admin' | 'moderator';
export type AdminPermission =
  | 'view_dashboard'
  | 'manage_trades'
  | 'manage_users'
  | 'manage_financials'
  | 'manage_kyc'
  | 'view_support'
  | 'manage_support'
  | 'view_logs'
  | 'manage_settings'
  | 'manage_admins';

const log = logger.child({ module: 'AdminAuth' });

const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  superadmin: [
    'view_dashboard',
    'manage_trades',
    'manage_users',
    'manage_financials',
    'manage_kyc',
    'manage_support',
    'view_logs',
    'manage_settings',
    'manage_admins',
  ],
  admin: [
    'view_dashboard',
    'manage_trades',
    'manage_users',
    'manage_financials',
    'manage_kyc',
    'manage_support',
    'view_logs',
  ],
  moderator: [
    'view_dashboard',
    'view_logs',
  ],
};

const MODERATOR_READ_ONLY_PERMISSIONS: AdminPermission[] = [
  'view_dashboard',
  'view_support',
  'view_logs',
];

const ROLE_NAME_MAP: Record<AdminRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
};

function hashKey(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]?.trim() : request.ip || '';
  return ip.replace('::ffff:', '');
}

function normalizeRoleName(name: string) {
  return name.toLowerCase().replace(/\s+/g, '');
}

function resolvePermissions(role: AdminRole, settings: any): AdminPermission[] {
  if (!settings?.rbacEnabled) {
    return role === 'moderator'
      ? MODERATOR_READ_ONLY_PERMISSIONS
      : (DEFAULT_ROLE_PERMISSIONS[role] || []);
  }

  const roleKey = normalizeRoleName(ROLE_NAME_MAP[role]);
  const roleEntry = Array.isArray(settings.roles)
    ? settings.roles.find((r: any) => normalizeRoleName(r.name) === roleKey)
    : null;

  if (roleEntry && Array.isArray(roleEntry.permissions)) {
    const resolved = roleEntry.permissions as AdminPermission[];
    if (role === 'moderator') {
      return resolved.filter((permission) => MODERATOR_READ_ONLY_PERMISSIONS.includes(permission));
    }
    return resolved;
  }

  return role === 'moderator'
    ? MODERATOR_READ_ONLY_PERMISSIONS
    : (DEFAULT_ROLE_PERMISSIONS[role] || []);
}

async function ensureRootAdmin(secretKey: string) {
  const rootEmail = process.env.ADMIN_ROOT_EMAIL || 'root@admin.local';
  const hash = hashKey(secretKey);
  const last4 = secretKey.slice(-4);

  let admin = await AdminUser.findOne({ isRoot: true }).select('+keyHash');
  if (!admin) {
    admin = await AdminUser.create({
      name: 'Root Admin',
      email: rootEmail,
      role: 'superadmin',
      status: 'active',
      keyHash: hash,
      keyLast4: last4,
      isRoot: true,
    });
    return admin;
  }

  if (admin.keyHash !== hash) {
    admin.keyHash = hash;
    admin.keyLast4 = last4;
    await admin.save();
  }

  return admin;
}

export type AdminContext = {
  admin: any;
  permissions: AdminPermission[];
  settings: any;
};

export type AdminContextError = {
  error: string;
  status: number;
};

export async function getAdminContext(request: NextRequest): Promise<AdminContext | AdminContextError> {
  const adminKey = request.headers.get('x-admin-key')?.trim();
  if (!adminKey) {
    return { error: 'Unauthorized', status: 401 };
  }

  await connectDB();
  const settings = await (AdminSettings as any).getSettings();
  const ipAddress = getRequestIp(request);

  if (Array.isArray(settings?.security?.ipWhitelist) && settings.security.ipWhitelist.length > 0) {
    const allowed = settings.security.ipWhitelist.includes(ipAddress);
    if (!allowed) {
      log.warn({ ipAddress }, 'Blocked admin request due to IP whitelist');
      return { error: 'IP_NOT_ALLOWED', status: 403 };
    }
  }

  const keyHash = hashKey(adminKey);
  let admin = await AdminUser.findOne({ keyHash, status: 'active' }).select('+keyHash');

  if (!admin && process.env.ADMIN_SECRET_KEY && adminKey === process.env.ADMIN_SECRET_KEY) {
    admin = await ensureRootAdmin(adminKey);
  }

  if (!admin) {
    return { error: 'Unauthorized', status: 401 };
  }

  const now = new Date();
  if (!admin.lastActiveAt || now.getTime() - new Date(admin.lastActiveAt).getTime() > 60_000) {
    admin.lastActiveAt = now;
    admin.lastActiveIp = ipAddress;
    await admin.save();
  }

  const permissions = resolvePermissions(admin.role as AdminRole, settings);

  return { admin, permissions, settings };
}

export function hasPermission(permissions: AdminPermission[], permission: AdminPermission) {
  return permissions.includes(permission);
}
