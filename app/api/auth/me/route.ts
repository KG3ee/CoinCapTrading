import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    // Fetch user from database
    const user = await User.findById(decoded.id).select(
      'fullName email uid referralCode isVerified accountStatus language withdrawalAddress createdAt'
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          uid: user.uid,
          referralCode: user.referralCode,
          isVerified: user.isVerified,
          accountStatus: user.accountStatus,
          language: user.language,
          withdrawalAddress: user.withdrawalAddress,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get user error:', error);

    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
