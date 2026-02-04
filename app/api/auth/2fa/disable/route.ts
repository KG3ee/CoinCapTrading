import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isTwoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    // Also check backup codes
    let validBackupCode = false;
    if (!verified && user.twoFactorBackupCodes.includes(code)) {
      validBackupCode = true;
      // Remove used backup code
      user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter((c: string) => c !== code);
    }

    if (!verified && !validBackupCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Disable 2FA
    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = [];

    await user.save();

    return NextResponse.json(
      { message: '2FA disabled successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
