import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendPasswordResetEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';
import { generateSecureToken, hashToken } from '@/lib/auth';
import { withStrictRateLimit } from '@/lib/middleware/rateLimit';
import { logger } from '@/lib/utils/logger';

const log = logger.child({ module: 'ForgotPasswordRoute' });

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
        { message: 'If an account with this email exists, a password reset link has been sent.' },
        { status: 200 }
      );
    }

    // Generate secure reset token
    const resetToken = generateSecureToken();
    const hashedToken = hashToken(resetToken);
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetToken = hashedToken;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();

    // Send password reset email with plain token (user receives this)
    const emailResult = await sendPasswordResetEmail(email, resetToken);

    if (!emailResult.success) {
      log.warn({ email, error: emailResult.error }, 'Failed to send password reset email');
    } else {
      log.info({ email }, 'Password reset email sent successfully');
    }

    return NextResponse.json(
      { message: 'If an account with this email exists, a password reset link has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
