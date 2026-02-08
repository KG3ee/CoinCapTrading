import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Portfolio from '@/lib/models/Portfolio';
import Trade from '@/lib/models/Trade';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { registerSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminUsers' });

function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const expected = process.env.ADMIN_SECRET_KEY;
  if (!expected) return false;
  return adminKey === expected;
}

// POST /api/admin/users — create a new user
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    log.info({ userId: user._id, email: user.email, isVerified: user.isVerified }, 'Admin created user');

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json({
      message: `User "${userName}" (${userEmail}) deleted successfully`,
      deletedData: results,
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to delete user');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
