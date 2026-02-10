import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminSettings from '@/lib/models/AdminSettings';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminSettings' });

function sanitizeNewsItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any, index: number) => {
      const title = typeof item?.title === 'string' ? item.title.trim() : '';
      const rawUrl = typeof item?.url === 'string' ? item.url.trim() : '';
      const imageUrl = typeof item?.imageUrl === 'string' ? item.imageUrl.trim() : '';
      if (!rawUrl) return null;

      try {
        const parsedUrl = new URL(rawUrl);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          return null;
        }

        let safeImageUrl = '';
        if (imageUrl) {
          try {
            const parsedImage = new URL(imageUrl);
            if (parsedImage.protocol === 'http:' || parsedImage.protocol === 'https:') {
              safeImageUrl = parsedImage.toString();
            }
          } catch {
            // Ignore invalid image URL
          }
        }

        return {
          id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : `news-${index + 1}`,
          title: title || `News ${index + 1}`,
          url: parsedUrl.toString(),
          imageUrl: safeImageUrl,
        };
      } catch {
        return null;
      }
    })
    .filter((item): item is { id: string; title: string; url: string; imageUrl: string } => Boolean(item))
    .slice(0, 20);
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_settings')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const settings = await (AdminSettings as any).getSettings();
    const newsItems = Array.isArray(settings?.news?.items) ? settings.news.items : [];
    return NextResponse.json({
      settings: {
        rbacEnabled: settings.rbacEnabled,
        roles: settings.roles,
        security: settings.security,
        notifications: settings.notifications,
        maintenance: settings.maintenance,
        news: {
          ...settings.news,
          items: newsItems.length > 0
            ? newsItems
            : [
                {
                  id: 'news-default',
                  title: settings?.news?.title || 'Market News',
                  url: settings?.news?.url || 'https://www.coindesk.com/',
                  imageUrl: '',
                },
              ],
        },
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
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_settings')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    if (body.news && typeof body.news === 'object') {
      const nextItems = sanitizeNewsItems(body.news.items);
      if (nextItems.length > 0) {
        settings.news.items = nextItems;
        settings.news.title = nextItems[0].title;
        settings.news.url = nextItems[0].url;
      }
      if (typeof body.news.title === 'string') {
        settings.news.title = body.news.title.trim() || 'Market News';
      }
      if (typeof body.news.url === 'string') {
        const nextUrl = body.news.url.trim();
        if (nextUrl) {
          try {
            const parsed = new URL(nextUrl);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
              settings.news.url = parsed.toString();
            }
          } catch {
            // Ignore invalid URL and keep existing value.
          }
        }
      }
    }
    if (body.ui && typeof body.ui === 'object') {
      if (body.ui.theme === 'dark' || body.ui.theme === 'light') settings.ui.theme = body.ui.theme;
    }

    await settings.save();
    await AdminAuditLog.create({
      actionType: 'settings_update',
      action: 'update',
      reason: 'Admin settings updated',
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      targetType: 'admin_settings',
      targetId: settings._id.toString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
    });
    return NextResponse.json({ message: 'Settings updated' });
  } catch (error: any) {
    log.error({ error }, 'Failed to update admin settings');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_settings')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_settings')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
