import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

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

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if 2FA is already enabled
    if (user.isTwoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled. Disable it first to set up again.' },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `CoinCapTrading (${user.email})`,
      issuer: 'CoinCapTrading',
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Store temporary secret (not saved yet, only after verification)
    // We'll store it in the response and verify it on the next step

    return NextResponse.json(
      {
        secret: secret.base32,
        qrCode,
        manualEntryKey: secret.base32,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
