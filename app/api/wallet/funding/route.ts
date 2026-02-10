import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';
import { connectDB } from '@/lib/mongodb';
import { withRateLimit } from '@/lib/middleware/rateLimit';
import { fundingRequestSchema } from '@/lib/validation/schemas';
import FundingRequest from '@/lib/models/FundingRequest';
import Portfolio from '@/lib/models/Portfolio';
import User from '@/lib/models/User';
import AdminSettings from '@/lib/models/AdminSettings';
import config from '@/lib/config';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/utils/logger';
import { getEffectiveDepositWalletOptions, getFundingMetaFromWalletOptions, getWalletOptionById } from '@/lib/constants/funding';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'WalletFunding' });
const MAX_PROOF_IMAGE_BYTES = 5 * 1024 * 1024;

function estimateBase64Bytes(dataUrl: string) {
  const parts = dataUrl.split(',');
  if (parts.length < 2) return 0;
  const base64 = parts[1];
  return Math.ceil((base64.length * 3) / 4);
}

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
    const settings = await (AdminSettings as any).getSettings();
    const depositWalletOptions = getEffectiveDepositWalletOptions(settings?.funding?.wallets);
    const fundingMeta = getFundingMetaFromWalletOptions(depositWalletOptions);

    return NextResponse.json({
      requests: requests.map((r: any) => ({
        id: r._id.toString(),
        requestId: r.requestId,
        type: r.type,
        amount: r.amount,
        asset: r.asset,
        network: r.network || '',
        method: r.method,
        platformWalletId: r.platformWalletId,
        platformWalletAddress: r.platformWalletAddress,
        senderWalletAddress: r.senderWalletAddress,
        address: r.address,
        proofImageName: r.proofImageName,
        hasProofImage: !!r.proofImageData,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
      })),
      depositWalletOptions,
      fundingAssets: fundingMeta.assets,
      fundingNetworksByAsset: fundingMeta.networksByAsset,
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

    const {
      type,
      amount,
      asset: rawAsset,
      network: rawNetwork,
      platformWalletId,
      senderWalletAddress,
      proofImageData,
      proofImageName,
      withdrawPassword,
    } = parsed.data;

    const settings = await (AdminSettings as any).getSettings();
    const depositWalletOptions = getEffectiveDepositWalletOptions(settings?.funding?.wallets);
    const fundingMeta = getFundingMetaFromWalletOptions(depositWalletOptions);

    let asset = (rawAsset || fundingMeta.assets[0] || 'USDT').toUpperCase();
    const fallbackNetwork = fundingMeta.networksByAsset[asset]?.[0] || 'TRC20';
    let network = (rawNetwork || fallbackNetwork).toUpperCase();

    const user = await User.findById(session.user.id).select('+password');
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
      if (!withdrawPassword) {
        return NextResponse.json({ error: 'Password is required for withdrawal' }, { status: 400 });
      }
      if (!user.password) {
        return NextResponse.json({ error: 'Please set an account password before withdrawing' }, { status: 400 });
      }
      const validPassword = await user.matchPassword(withdrawPassword);
      if (!validPassword) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
      }
      if (portfolio.accountBalance < amount) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }
      portfolio.accountBalance = Number((portfolio.accountBalance - amount).toFixed(6));
      await portfolio.save();
    }

    let resolvedDepositWalletAddress = '';
    let resolvedDepositWalletId = '';
    let normalizedProofImageData = '';
    let normalizedProofImageName = '';
    if (type === 'deposit') {
      const wallet = platformWalletId ? getWalletOptionById(platformWalletId, depositWalletOptions) : null;
      if (!wallet) {
        return NextResponse.json({ error: 'Please select a valid deposit wallet address' }, { status: 400 });
      }
      asset = wallet.asset;
      network = wallet.network;

      normalizedProofImageData = proofImageData || '';
      normalizedProofImageName = proofImageName || '';
      if (!normalizedProofImageData) {
        return NextResponse.json({ error: 'Proof image is required for deposit' }, { status: 400 });
      }
      if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(normalizedProofImageData)) {
        return NextResponse.json({ error: 'Proof image format must be PNG/JPG/WEBP' }, { status: 400 });
      }
      if (estimateBase64Bytes(normalizedProofImageData) > MAX_PROOF_IMAGE_BYTES) {
        return NextResponse.json({ error: 'Proof image must be 5MB or less' }, { status: 400 });
      }

      resolvedDepositWalletAddress = wallet.address;
      resolvedDepositWalletId = wallet.id;
    }

    const requestDoc = await FundingRequest.create({
      requestId: `FR${nanoid(10)}`,
      userId: session.user.id,
      type,
      amount,
      asset,
      network,
      method: 'manual',
      address: type === 'withdraw' ? user.withdrawalAddress : '',
      platformWalletId: resolvedDepositWalletId,
      platformWalletAddress: resolvedDepositWalletAddress,
      senderWalletAddress: senderWalletAddress || '',
      proofImageData: normalizedProofImageData,
      proofImageName: normalizedProofImageName,
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
