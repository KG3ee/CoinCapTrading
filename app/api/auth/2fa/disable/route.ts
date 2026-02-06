import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

    const { password, code } = await request.json();

    if (!password && !code) {
      return NextResponse.json(
        { error: 'Password or 2FA code required to disable 2FA' },
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

    // Verify using password (for email/password accounts) OR 2FA code (for OAuth accounts)
    let isVerified = false;

    if (password && user.password) {
      // Verify password
      isVerified = await bcrypt.compare(password, user.password);
      if (!isVerified) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
    } else if (code) {
      // Verify 2FA code (for OAuth users or as alternative verification)
      console.log('Attempting to verify 2FA code:', code);
      console.log('User has 2FA secret:', !!user.twoFactorSecret);
      
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token: code,
        window: 6, // Increased window to allow ±3 minutes time difference
      });

      console.log('2FA code verification result:', verified);

      // Also check backup codes
      if (!verified && user.twoFactorBackupCodes && user.twoFactorBackupCodes.includes(code)) {
        console.log('Code matched backup code');
        isVerified = true;
        // Remove used backup code
        user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter((c: string) => c !== code);
      } else if (verified) {
        console.log('Code verified successfully');
        isVerified = true;
      }

      if (!isVerified) {
        console.error('2FA code verification failed for code:', code);
        return NextResponse.json(
          { error: 'Invalid 2FA code. Please try a fresh code from your authenticator app.' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Cannot verify: No password set for this account. Please provide your 2FA code instead.' },
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
