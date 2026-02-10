import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminSettings from '@/lib/models/AdminSettings';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';
import { getEffectiveDepositWalletOptions, sanitizeDepositWalletOptions } from '@/lib/constants/funding';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminFundingWallets' });

function getIpAddress(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0]?.trim() || '' : request.ip || '';
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_financials') || context.admin.role === 'moderator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const settings = await (AdminSettings as any).getSettings();
    const wallets = getEffectiveDepositWalletOptions(settings?.funding?.wallets);
    return NextResponse.json({ wallets });
  } catch (error: any) {
    log.error({ error }, 'Failed to fetch funding wallets');
    return NextResponse.json({ error: 'Failed to fetch funding wallets' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_financials') || context.admin.role === 'moderator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const wallets = sanitizeDepositWalletOptions(body?.wallets);
    if (wallets.length === 0) {
      return NextResponse.json({ error: 'At least one valid wallet is required' }, { status: 400 });
    }
    if (wallets.length > 30) {
      return NextResponse.json({ error: 'Wallet list is too large' }, { status: 400 });
    }

    const settings = await (AdminSettings as any).getSettings();
    settings.funding = settings.funding || { wallets: [] };
    settings.funding.wallets = wallets;
    await settings.save();

    await AdminAuditLog.create({
      actionType: 'funding_wallets_update',
      action: 'update',
      reason: `Updated ${wallets.length} deposit wallet address(es)`,
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      targetType: 'funding_wallets',
      targetId: settings._id.toString(),
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json({ message: 'Funding wallets updated', wallets });
  } catch (error: any) {
    log.error({ error }, 'Failed to update funding wallets');
    return NextResponse.json({ error: 'Failed to update funding wallets' }, { status: 500 });
  }
}
