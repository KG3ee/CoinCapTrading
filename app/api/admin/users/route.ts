import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Portfolio from '@/lib/models/Portfolio';
import Trade from '@/lib/models/Trade';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { registerSchema } from '@/lib/validation/schemas';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';
import { applyDefaultNewUserTradeOverride } from '@/lib/utils/tradeDefaults';
import config from '@/lib/config';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminUsers' });

// POST /api/admin/users — create a new user
export async function POST(request: NextRequest) {
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
    await connectDB();

    const body = await request.json();
    const emailCandidate =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : body?.email;

    const validationResult = registerSchema.safeParse({
      fullName: body?.fullName,
      email: emailCandidate,
      password: body?.password,
      passwordConfirm: body?.password,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fullName, email, password } = validationResult.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      isVerified: body?.isVerified === false ? false : true,
      verificationToken: null,
      verificationTokenExpires: null,
    });

    await applyDefaultNewUserTradeOverride(user._id.toString());

    log.info({ userId: user._id, email: user.email, isVerified: user.isVerified }, 'Admin created user');
    await AdminAuditLog.create({
      actionType: 'user_create',
      action: 'create',
      userId: user._id,
      userName: user.fullName || '',
      userEmail: user.email || '',
      reason: 'Admin created user',
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      targetType: 'user',
      targetId: user._id.toString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          uid: user.uid,
          isVerified: user.isVerified,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: 'Email, user ID, or referral code already exists' },
        { status: 409 }
      );
    }

    log.error({ error }, 'Failed to create user');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/users?userId=xxx — delete a user and all their data
export async function DELETE(request: NextRequest) {
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
    await connectDB();

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userName = user.fullName || user.email;
    const userEmail = user.email;

    // Delete all related data
    const results: Record<string, number> = {};

    // Delete portfolio
    const portfolioResult = await Portfolio.deleteMany({ userId });
    results.portfolios = portfolioResult.deletedCount;

    // Delete trades
    const tradeResult = await Trade.deleteMany({ userId });
    results.trades = tradeResult.deletedCount;

    // Delete timed trades (if model exists)
    try {
      const TimedTrade = (await import('@/lib/models/TimedTrade')).default;
      const timedTradeResult = await TimedTrade.deleteMany({ userId });
      results.timedTrades = timedTradeResult.deletedCount;
    } catch {
      results.timedTrades = 0;
    }

    // Delete chat messages (if model exists)
    try {
      const ChatMessage = (await import('@/lib/models/ChatMessage')).default;
      const chatResult = await ChatMessage.deleteMany({ userId });
      results.chatMessages = chatResult.deletedCount;
    } catch {
      results.chatMessages = 0;
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    log.info({ userId, userName, userEmail, results }, 'User deleted by admin');
    await AdminAuditLog.create({
      actionType: 'user_delete',
      action: 'delete',
      userId,
      userName,
      userEmail,
      reason: 'Admin deleted user',
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      targetType: 'user',
      targetId: userId,
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
    });

    return NextResponse.json({
      message: `User "${userName}" (${userEmail}) deleted successfully`,
      deletedData: results,
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to delete user');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/users — update user admin flags (demo mode, etc.)
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
    await connectDB();

    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const isDemoUser = typeof body?.isDemoUser === 'boolean' ? body.isDemoUser : null;

    if (!userId || isDemoUser === null) {
      return NextResponse.json({ error: 'userId and isDemoUser are required' }, { status: 400 });
    }

    const user = await User.findById(userId).select('fullName email uid isDemoUser liveModeLocked liveModeActivatedAt');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (isDemoUser && user.liveModeLocked) {
      return NextResponse.json(
        { error: 'This account has already switched to live mode and cannot return to demo' },
        { status: 400 }
      );
    }

    if (isDemoUser) {
      user.isDemoUser = true;
      await user.save();

      await Portfolio.findOneAndUpdate(
        { userId },
        {
          $set: {
            accountBalance: config.app.defaultBalance,
            totalInvested: 0,
            totalReturns: 0,
            holdings: [],
          },
          $setOnInsert: { userId },
        },
        { upsert: true }
      );
    } else {
      user.isDemoUser = false;
      user.liveModeLocked = true;
      if (!user.liveModeActivatedAt) {
        user.liveModeActivatedAt = new Date();
      }
      await user.save();

      await Portfolio.findOneAndUpdate(
        { userId },
        {
          $set: {
            accountBalance: 0,
            totalInvested: 0,
            totalReturns: 0,
            holdings: [],
          },
          $setOnInsert: { userId },
        },
        { upsert: true }
      );
    }

    await AdminAuditLog.create({
      actionType: 'user_demo_toggle',
      action: isDemoUser ? 'enable_demo' : 'disable_demo',
      userId: user._id,
      userName: user.fullName || '',
      userEmail: user.email || '',
      reason: isDemoUser ? 'Enabled demo user mode' : 'Disabled demo user mode',
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      targetType: 'user',
      targetId: user._id.toString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
    });

    return NextResponse.json({
      message: isDemoUser ? 'User marked as demo' : 'User removed from demo',
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        uid: user.uid,
        isDemoUser: !!(user as any).isDemoUser,
      },
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to update user flags');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
