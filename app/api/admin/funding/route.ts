import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';
import FundingRequest from '@/lib/models/FundingRequest';
import Portfolio from '@/lib/models/Portfolio';
import User from '@/lib/models/User';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import config from '@/lib/config';
import { logger } from '@/lib/utils/logger';
import { fetchRealCryptoData } from '@/lib/mockCryptoData';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'AdminFunding' });
const FALLBACK_ASSET_PRICES: Record<string, number> = {
  USDT: 1,
  BTC: 60000,
  ETH: 3000,
};
const PRICE_FETCH_TIMEOUT_MS = 2800;

function toFiniteNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundToSix(value: number) {
  return Number(toFiniteNumber(value).toFixed(6));
}

async function fetchAssetPriceWithTimeout(symbol: string) {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('price-timeout')), PRICE_FETCH_TIMEOUT_MS);
    });

    const priceData = await Promise.race([fetchRealCryptoData(), timeoutPromise]);
    if (!Array.isArray(priceData)) return 0;
    const priceRecord = priceData.find((record: any) => record.symbol === symbol);
    return toFiniteNumber(priceRecord?.currentPrice, 0);
  } catch (error: any) {
    log.warn({ error, symbol }, 'Failed to fetch real-time price for funding approval');
    return 0;
  }
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_financials') || context.admin.role === 'moderator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const status = request.nextUrl.searchParams.get('status');
    const query: any = {};
    if (status && status !== 'all') query.status = status;

    const requests = await FundingRequest.find(query).sort({ createdAt: -1 }).limit(200).lean();
    const userIds = requests.map((r: any) => r.userId);
    const users = await User.find({ _id: { $in: userIds } }, 'fullName email uid').lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    return NextResponse.json({
      requests: requests.map((r: any) => {
        const user = userMap.get(r.userId.toString());
        return {
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
          proofImageData: r.proofImageData,
          proofImageName: r.proofImageName,
          status: r.status,
          reason: r.reason,
          createdAt: r.createdAt,
          resolvedAt: r.resolvedAt,
          userId: r.userId.toString(),
          userName: user?.fullName || user?.email || 'Unknown',
          userEmail: user?.email || '',
          userUid: user?.uid || '',
        };
      }),
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to load funding requests');
    return NextResponse.json({ error: 'Failed to load funding requests' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_financials') || context.admin.role === 'moderator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const requestId = body?.requestId;
    const action = body?.action;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 });
    }

    const funding = await FundingRequest.findOne({ requestId });
    if (!funding) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (funding.status !== 'pending') {
      return NextResponse.json({ error: 'Request already resolved' }, { status: 400 });
    }

    let portfolio = await Portfolio.findOne({ userId: funding.userId });
    if (!portfolio) {
      portfolio = new Portfolio({
        userId: funding.userId,
        accountBalance: config.app.defaultBalance,
        totalInvested: 0,
        totalReturns: 0,
        holdings: [],
      });
    }

    const user = await User.findById(funding.userId, 'fullName email');

    if (action === 'approve') {
      if (funding.type === 'deposit') {
        const cryptoSymbol = (funding.asset || 'USDT').toUpperCase();
        const fundingAmount = toFiniteNumber(funding.amount);
        if (fundingAmount <= 0) {
          return NextResponse.json({ error: 'Invalid funding amount' }, { status: 400 });
        }

        let assetPrice = await fetchAssetPriceWithTimeout(cryptoSymbol);

        if (assetPrice <= 0) {
          if (cryptoSymbol === 'USDT') {
            assetPrice = 1;
          } else {
            const existingHolding = (portfolio.holdings || []).find(
              (item: any) => item?.cryptoSymbol === cryptoSymbol
            );
            assetPrice = toFiniteNumber(existingHolding?.currentPrice, 0);
          }
        }
        if (assetPrice <= 0) {
          assetPrice = toFiniteNumber(FALLBACK_ASSET_PRICES[cryptoSymbol], 0);
        }

        const normalizedAssetPrice = assetPrice > 0 ? assetPrice : 0;
        const holdings: Array<{
          cryptoSymbol: string;
          amount: number;
          averageBuyPrice: number;
          currentPrice: number;
          totalValue: number;
          gainLoss: number;
          gainLossPercent: number;
        }> = (portfolio.holdings || []).map((item: any) => ({
          cryptoSymbol: (item?.cryptoSymbol || 'USDT').toUpperCase(),
          amount: toFiniteNumber(item?.amount),
          averageBuyPrice: toFiniteNumber(item?.averageBuyPrice),
          currentPrice: toFiniteNumber(item?.currentPrice),
          totalValue: toFiniteNumber(item?.totalValue),
          gainLoss: toFiniteNumber(item?.gainLoss),
          gainLossPercent: toFiniteNumber(item?.gainLossPercent),
        }));

        const depositValue = roundToSix(normalizedAssetPrice * fundingAmount);
        portfolio.accountBalance = roundToSix(
          toFiniteNumber(portfolio.accountBalance, config.app.defaultBalance) + depositValue
        );

        const existingIndex = holdings.findIndex((item) => item.cryptoSymbol === cryptoSymbol);
        if (existingIndex >= 0) {
          const existing = holdings[existingIndex];
          const previousAmount = toFiniteNumber(existing.amount);
          const previousAverageBuy = toFiniteNumber(existing.averageBuyPrice, normalizedAssetPrice);
          const previousCost = previousAverageBuy * previousAmount;
          const depositCost = normalizedAssetPrice * fundingAmount;
          const newAmount = previousAmount + fundingAmount;
          const newAverageBuy = newAmount > 0
            ? (previousCost + depositCost) / newAmount
            : normalizedAssetPrice;
          const newTotalValue = roundToSix(newAmount * normalizedAssetPrice);
          const newCostBasis = roundToSix(newAverageBuy * newAmount);
          const newGainLoss = roundToSix(newTotalValue - newCostBasis);
          const newGainLossPercent = newCostBasis > 0
            ? Number(((newGainLoss / newCostBasis) * 100).toFixed(2))
            : 0;

          holdings[existingIndex] = {
            ...existing,
            amount: roundToSix(newAmount),
            averageBuyPrice: roundToSix(newAverageBuy),
            currentPrice: roundToSix(normalizedAssetPrice),
            totalValue: newTotalValue,
            gainLoss: newGainLoss,
            gainLossPercent: toFiniteNumber(newGainLossPercent),
          };
        } else {
          const totalValue = roundToSix(fundingAmount * normalizedAssetPrice);
          holdings.push({
            cryptoSymbol,
            amount: roundToSix(fundingAmount),
            averageBuyPrice: roundToSix(normalizedAssetPrice),
            currentPrice: roundToSix(normalizedAssetPrice),
            totalValue,
            gainLoss: 0,
            gainLossPercent: 0,
          });
        }

        portfolio.holdings = holdings;
        portfolio.markModified('holdings');
        await portfolio.save();
      }
      funding.status = 'approved';
      funding.reason = '';
    } else {
      if (funding.type === 'withdraw') {
        portfolio.accountBalance = roundToSix(
          toFiniteNumber(portfolio.accountBalance, config.app.defaultBalance) + toFiniteNumber(funding.amount)
        );
        await portfolio.save();
      }
      funding.status = 'rejected';
      funding.reason = reason || 'Rejected by admin';
    }

    funding.resolvedAt = new Date();
    funding.resolvedBy = context.admin._id;
    await funding.save();

    await AdminAuditLog.create({
      actionType: 'funding_request',
      action: funding.status,
      userId: funding.userId,
      userName: user?.fullName || '',
      userEmail: user?.email || '',
      amount: toFiniteNumber(funding.amount),
      reason: funding.reason || (action === 'approve' ? 'Approved funding request' : 'Rejected funding request'),
      actor: context.admin._id.toString(),
      actorName: context.admin.name,
      actorRole: context.admin.role,
      targetType: 'funding_request',
      targetId: funding._id.toString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
    });

    return NextResponse.json({ message: `Request ${funding.status}`, requestId });
  } catch (error: any) {
    log.error({ error }, 'Failed to update funding request');
    return NextResponse.json({ error: error?.message || 'Failed to update request' }, { status: 500 });
  }
}
