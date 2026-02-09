import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/adminAuth';
import AdminUser from '@/lib/models/AdminUser';
import { connectDB } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  return NextResponse.json({
    admin: {
      id: context.admin._id.toString(),
      name: context.admin.name,
      email: context.admin.email,
      role: context.admin.role,
      uiTheme: context.admin.uiTheme || 'dark',
    },
    permissions: context.permissions,
    rbacEnabled: context.settings?.rbacEnabled ?? false,
  });
}

export async function PUT(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (context.admin.role === 'moderator') {
    return NextResponse.json({ error: 'Moderators have monitor-only access' }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const uiTheme = body?.uiTheme === 'light' ? 'light' : 'dark';
    await AdminUser.findByIdAndUpdate(context.admin._id, { uiTheme });
    return NextResponse.json({ message: 'Theme updated', uiTheme });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
