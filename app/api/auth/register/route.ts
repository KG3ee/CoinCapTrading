import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendVerificationEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';
import { withStrictRateLimit } from '@/lib/middleware/rateLimit';
import { registerSchema } from '@/lib/validation/schemas';
import { generateSecureToken, hashToken } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';
import { applyDefaultNewUserTradeOverride } from '@/lib/utils/tradeDefaults';
export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'RegisterRoute' });

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withStrictRateLimit(request, undefined, 3, '1 h');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectDB();

    const body = await request.json();
    
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { fullName, email, password } = validationResult.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    const verificationToken = generateSecureToken();
    const hashedToken = hashToken(verificationToken);
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      fullName,
      email,
      password,
      verificationToken: hashedToken,
      verificationTokenExpires,
    });

    await applyDefaultNewUserTradeOverride(user._id.toString());

    // Send verification email in background — don't block the response
    sendVerificationEmail(email, verificationToken)
      .then((emailResult) => {
        if (!emailResult.success) {
          log.warn({ error: emailResult.error }, 'Failed to send verification email');
        }
      })
      .catch((err) => {
        log.warn({ error: err }, 'Email send threw unexpectedly');
      });

    log.info({ userId: user._id }, 'User registered successfully');

    const response = NextResponse.json(
      {
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          uid: user.uid,
        },
      },
      { status: 201 }
    );

    return response;
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: 'Email, user ID, or referral code already exists' },
        { status: 409 }
      );
    }

    log.error({ error }, 'Register error');
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
