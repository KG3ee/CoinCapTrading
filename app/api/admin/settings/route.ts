import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminSettings from '@/lib/models/AdminSettings';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminSettings' });

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
    const settings = await (AdminSettings as any).getSettings();
    return NextResponse.json({
      settings: {
        rbacEnabled: settings.rbacEnabled,
        roles: settings.roles,
        security: settings.security,
        notifications: settings.notifications,
        maintenance: settings.maintenance,
        apiKeys: settings.apiKeys?.map((k: any) => ({
          id: k.id,
          name: k.name,
          keyLast4: k.keyLast4,
          scopes: k.scopes,
          createdAt: k.createdAt,
          revokedAt: k.revokedAt,
        })) || [],
        ui: settings.ui,
      },
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to fetch admin settings');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const settings = await (AdminSettings as any).getSettings();

    if (typeof body.rbacEnabled === 'boolean') settings.rbacEnabled = body.rbacEnabled;
    if (Array.isArray(body.roles)) settings.roles = body.roles;
    if (body.security && typeof body.security === 'object') {
      if (typeof body.security.require2fa === 'boolean') settings.security.require2fa = body.security.require2fa;
      if (Array.isArray(body.security.ipWhitelist)) settings.security.ipWhitelist = body.security.ipWhitelist;
    }
    if (body.notifications && typeof body.notifications === 'object') {
      if (typeof body.notifications.newUsers === 'boolean') settings.notifications.newUsers = body.notifications.newUsers;
      if (typeof body.notifications.largeWithdrawals === 'boolean') settings.notifications.largeWithdrawals = body.notifications.largeWithdrawals;
      if (typeof body.notifications.flaggedTrades === 'boolean') settings.notifications.flaggedTrades = body.notifications.flaggedTrades;
    }
    if (body.maintenance && typeof body.maintenance === 'object') {
      if (typeof body.maintenance.enabled === 'boolean') settings.maintenance.enabled = body.maintenance.enabled;
      if (typeof body.maintenance.message === 'string') settings.maintenance.message = body.maintenance.message;
    }
    if (body.ui && typeof body.ui === 'object') {
      if (body.ui.theme === 'dark' || body.ui.theme === 'light') settings.ui.theme = body.ui.theme;
    }

    await settings.save();
    return NextResponse.json({ message: 'Settings updated' });
  } catch (error: any) {
    log.error({ error }, 'Failed to update admin settings');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const { name, scopes } = body;
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    const settings = await (AdminSettings as any).getSettings();
    const rawKey = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyLast4 = rawKey.slice(-4);
    const id = crypto.randomUUID();

    settings.apiKeys.push({
      id,
      name: name.trim(),
      keyLast4,
      scopes: Array.isArray(scopes) ? scopes : [],
      hash,
      createdAt: new Date(),
      revokedAt: null,
    });

    await settings.save();

    return NextResponse.json({
      message: 'API key created',
      apiKey: rawKey,
      key: { id, name: name.trim(), keyLast4, scopes: Array.isArray(scopes) ? scopes : [], createdAt: new Date() },
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to create API key');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'Key id is required' }, { status: 400 });
    }

    const settings = await (AdminSettings as any).getSettings();
    settings.apiKeys = settings.apiKeys.map((k: any) => (
      k.id === id ? { ...k, revokedAt: new Date() } : k
    ));
    await settings.save();

    return NextResponse.json({ message: 'API key revoked' });
  } catch (error: any) {
    log.error({ error }, 'Failed to revoke API key');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
