import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import KycVerification from '@/lib/models/KycVerification';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const expected = process.env.ADMIN_SECRET_KEY;
  if (!expected) return false;
  return adminKey === expected;
}

// GET /api/admin/kyc — list KYC submissions for admin review
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const statusFilter = request.nextUrl.searchParams.get('status') || 'pending';
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Number(limitParam) || 50, 100);

    const query: any = {};
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }

    const submissions = await KycVerification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Attach user info
    const userIds = submissions.map((s: any) => s.userId);
    const users = await User.find({ _id: { $in: userIds } }, 'fullName email uid').lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const results = submissions.map((s: any) => {
      const user = userMap.get(s.userId.toString());
      return {
        id: s._id.toString(),
        userId: s.userId.toString(),
        userName: user?.fullName || 'Unknown',
        userEmail: user?.email || 'Unknown',
        userUid: user?.uid || '',
        fullName: s.fullName,
        dateOfBirth: s.dateOfBirth,
        nationality: s.nationality,
        address: s.address,
        documentType: s.documentType,
        documentNumber: s.documentNumber,
        documentFrontImage: s.documentFrontImage,
        documentBackImage: s.documentBackImage,
        selfieImage: s.selfieImage,
        status: s.status,
        rejectionReason: s.rejectionReason,
        submittedAt: s.createdAt,
        reviewedAt: s.reviewedAt,
      };
    });

    // Count by status for badges
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      KycVerification.countDocuments({ status: 'pending' }),
      KycVerification.countDocuments({ status: 'approved' }),
      KycVerification.countDocuments({ status: 'rejected' }),
    ]);

    return NextResponse.json({
      submissions: results,
      counts: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/kyc — approve or reject a KYC submission
export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const { kycId, action, rejectionReason } = await request.json();

    if (!kycId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid kycId or action' }, { status: 400 });
    }

    const kyc = await KycVerification.findById(kycId);
    if (!kyc) {
      return NextResponse.json({ error: 'KYC submission not found' }, { status: 404 });
    }
    if (kyc.status !== 'pending') {
      return NextResponse.json({ error: 'This submission has already been reviewed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    kyc.status = newStatus;
    kyc.reviewedAt = new Date();
    kyc.reviewedBy = 'admin';
    if (action === 'reject' && rejectionReason) {
      kyc.rejectionReason = rejectionReason;
    }
    await kyc.save();

    // Update user's kycStatus
    await User.findByIdAndUpdate(kyc.userId, { kycStatus: newStatus });

    return NextResponse.json({
      message: `KYC ${newStatus} successfully`,
      kycId: kyc._id.toString(),
      status: newStatus,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
