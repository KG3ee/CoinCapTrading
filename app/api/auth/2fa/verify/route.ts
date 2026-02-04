import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';

function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

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

    const { secret, code } = await request.json();

    if (!secret || !code) {
      return NextResponse.json(
        { error: 'Secret and verification code required' },
        { status: 400 }
      );
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Find user and update 2FA settings
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Save 2FA settings
    user.twoFactorSecret = secret;
    user.isTwoFactorEnabled = true;
    user.twoFactorBackupCodes = backupCodes;

    await user.save();

    return NextResponse.json(
      {
        message: '2FA enabled successfully',
        backupCodes,
        warning: 'Save these backup codes in a safe place. You can use them to access your account if you lose access to your authenticator app.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
