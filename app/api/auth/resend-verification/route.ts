import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendVerificationEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';
import { withStrictRateLimit } from '@/lib/middleware/rateLimit';
import { generateSecureToken, hashToken } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';

const log = logger.child({ module: 'ResendVerificationRoute' });

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withStrictRateLimit(request, undefined, 3, '1 h');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectDB();

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return NextResponse.json(
        { message: 'If an account with this email exists and is unverified, a verification email has been sent.' },
        { status: 200 }
      );
    }

    // Check if already verified
    if (user.isVerified) {
      return NextResponse.json(
        { error: 'This email is already verified. Please login.' },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = generateSecureToken();
    const hashedToken = hashToken(verificationToken);
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.verificationToken = hashedToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken);

    if (!emailResult.success) {
      log.warn({ email, error: emailResult.error }, 'Failed to resend verification email');
    } else {
      log.info({ email }, 'Verification email resent successfully');
    }

    return NextResponse.json(
      { message: 'If an account with this email exists and is unverified, a verification email has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    log.error({ error }, 'Resend verification error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
