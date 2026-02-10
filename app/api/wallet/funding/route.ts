import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';
import { connectDB } from '@/lib/mongodb';
import { withRateLimit } from '@/lib/middleware/rateLimit';
import { fundingRequestSchema } from '@/lib/validation/schemas';
import FundingRequest from '@/lib/models/FundingRequest';
import Portfolio from '@/lib/models/Portfolio';
import User from '@/lib/models/User';
import config from '@/lib/config';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'WalletFunding' });

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await FundingRequest.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      requests: requests.map((r: any) => ({
        id: r._id.toString(),
        requestId: r.requestId,
        type: r.type,
        amount: r.amount,
        asset: r.asset,
        method: r.method,
        address: r.address,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
      })),
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to load funding requests');
    return NextResponse.json({ error: 'Failed to load funding requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = fundingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, amount } = parsed.data;
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let portfolio = await Portfolio.findOne({ userId: session.user.id });
    if (!portfolio) {
      portfolio = new Portfolio({
        userId: session.user.id,
        accountBalance: config.app.defaultBalance,
        totalInvested: 0,
        totalReturns: 0,
        holdings: [],
      });
    }

    if (type === 'withdraw') {
      if (!user.withdrawalAddress) {
        return NextResponse.json({ error: 'Withdrawal address not set' }, { status: 400 });
      }
      if (portfolio.accountBalance < amount) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }
      portfolio.accountBalance = Number((portfolio.accountBalance - amount).toFixed(6));
      await portfolio.save();
    }

    const requestDoc = await FundingRequest.create({
      requestId: `FR${nanoid(10)}`,
      userId: session.user.id,
      type,
      amount,
      asset: 'USDT',
      method: 'manual',
      address: type === 'withdraw' ? user.withdrawalAddress : '',
      status: 'pending',
    });

    log.info({ userId: session.user.id, type, amount }, 'Funding request created');

    return NextResponse.json({
      message: 'Funding request submitted',
      request: {
        id: requestDoc._id.toString(),
        requestId: requestDoc.requestId,
        type: requestDoc.type,
        amount: requestDoc.amount,
        asset: requestDoc.asset,
        status: requestDoc.status,
        createdAt: requestDoc.createdAt,
      },
    }, { status: 201 });
  } catch (error: any) {
    log.error({ error }, 'Failed to submit funding request');
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
