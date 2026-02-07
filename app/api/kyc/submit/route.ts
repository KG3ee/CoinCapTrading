import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import KycVerification from '@/lib/models/KycVerification';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';

export const dynamic = 'force-dynamic';

// POST /api/kyc/submit — user submits KYC verification
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check if user already has a pending or approved KYC
    const existing = await KycVerification.findOne({
      userId: session.user.id,
      status: { $in: ['pending', 'approved'] },
    });

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Your identity is already verified' }, { status: 400 });
      }
      return NextResponse.json({ error: 'You already have a pending verification. Please wait for review.' }, { status: 400 });
    }

    const body = await request.json();
    const {
      fullName, dateOfBirth, nationality, address,
      documentType, documentNumber,
      documentFrontImage, documentBackImage, selfieImage,
    } = body;

    // Validate required fields
    if (!fullName?.trim() || !dateOfBirth || !nationality?.trim() || !address?.trim()) {
      return NextResponse.json({ error: 'All personal details are required' }, { status: 400 });
    }
    if (!documentType || !['national_id', 'drivers_license', 'passport'].includes(documentType)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }
    if (!documentNumber?.trim()) {
      return NextResponse.json({ error: 'Document number is required' }, { status: 400 });
    }
    if (!documentFrontImage) {
      return NextResponse.json({ error: 'Document front image is required' }, { status: 400 });
    }
    if (!selfieImage) {
      return NextResponse.json({ error: 'Selfie image is required' }, { status: 400 });
    }

    // Validate image sizes (base64 max ~7MB each)
    const maxSize = 7 * 1024 * 1024;
    if (documentFrontImage.length > maxSize || (documentBackImage && documentBackImage.length > maxSize) || selfieImage.length > maxSize) {
      return NextResponse.json({ error: 'Image files must be under 5MB each' }, { status: 400 });
    }

    const kyc = await KycVerification.create({
      userId: session.user.id,
      fullName: fullName.trim(),
      dateOfBirth,
      nationality: nationality.trim(),
      address: address.trim(),
      documentType,
      documentNumber: documentNumber.trim(),
      documentFrontImage,
      documentBackImage: documentBackImage || null,
      selfieImage,
      status: 'pending',
    });

    // Update user kycStatus to pending
    await User.findByIdAndUpdate(session.user.id, { kycStatus: 'pending' });

    return NextResponse.json({
      message: 'Verification submitted successfully. You will be notified once reviewed.',
      kycId: kyc._id.toString(),
      status: 'pending',
    });
  } catch (error: any) {
    console.error('KYC submit error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// GET /api/kyc/submit — get user's current KYC status
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const kyc = await KycVerification.findOne(
      { userId: session.user.id },
      'status documentType rejectionReason createdAt reviewedAt'
    ).sort({ createdAt: -1 });

    if (!kyc) {
      return NextResponse.json({ kycStatus: 'none', submission: null });
    }

    return NextResponse.json({
      kycStatus: kyc.status,
      submission: {
        id: kyc._id.toString(),
        status: kyc.status,
        documentType: kyc.documentType,
        rejectionReason: kyc.rejectionReason,
        submittedAt: kyc.createdAt,
        reviewedAt: kyc.reviewedAt,
      },
    });
  } catch (error: any) {
    console.error('KYC status error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
