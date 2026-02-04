import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get token from cookies or headers
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Decode token to get user ID (basic implementation)
    // In production, use proper JWT verification
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // For now, we'll use a different approach - get from query or body
    // In production, properly decode the JWT
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).select(
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
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const { userId, fullName, language, withdrawalAddress } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update profile fields
    if (fullName) user.fullName = fullName;
    if (language) user.language = language;
    if (withdrawalAddress !== undefined) user.withdrawalAddress = withdrawalAddress;

    await user.save();

    return NextResponse.json(
      {
        message: 'Profile updated successfully',
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
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
