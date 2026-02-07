import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';
import { withRateLimit } from '@/lib/middleware/rateLimit';
import { logger } from '@/lib/utils/logger';
export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'MeRoute' });

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user from database - select password existence without loading hash
    const user = await User.findById(session.user.id).select(
      'fullName email uid referralCode isVerified isTwoFactorEnabled accountStatus language withdrawalAddress profilePicture kycStatus createdAt'
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has password set separately with a lean count query
    const hasPassword = await User.countDocuments({ _id: session.user.id, password: { $ne: null } }) > 0;

    return NextResponse.json(
      {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          uid: user.uid,
          referralCode: user.referralCode,
          isVerified: user.isVerified,
          isTwoFactorEnabled: user.isTwoFactorEnabled,
          hasPassword,
          accountStatus: user.accountStatus,
          language: user.language,
          withdrawalAddress: user.withdrawalAddress,
          profilePicture: user.profilePicture,
          kycStatus: user.kycStatus || 'none',
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    log.error({ error }, 'Get user error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
