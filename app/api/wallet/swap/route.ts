import { connectDB } from '@/lib/mongodb';
import Portfolio from '@/lib/models/Portfolio';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';
import { withRateLimit } from '@/lib/middleware/rateLimit';
import config from '@/lib/config';
import { AVAILABLE_CRYPTOS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const SWAP_FEE_PERCENT = 0.5; // 0.5% fee
const PRICE_ID_BY_SYMBOL: Record<string, string> = AVAILABLE_CRYPTOS.reduce<Record<string, string>>(
  (acc, crypto) => {
    acc[crypto.symbol.toUpperCase()] = crypto.id;
    return acc;
  },
  { USDT: 'tether' }
);

// GET /api/wallet/swap — get conversion rate preview
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const from = request.nextUrl.searchParams.get('from')?.toUpperCase();
    const to = request.nextUrl.searchParams.get('to')?.toUpperCase();
    const amountStr = request.nextUrl.searchParams.get('amount');

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to currencies required' }, { status: 400 });
    }

    const amount = Number(amountStr) || 1;

    const fromId = PRICE_ID_BY_SYMBOL[from];
    const toId = PRICE_ID_BY_SYMBOL[to];

    if (!fromId) {
      return NextResponse.json({ error: `Unsupported currency: ${from}` }, { status: 400 });
    }
    if (!toId) {
      return NextResponse.json({ error: `Unsupported currency: ${to}` }, { status: 400 });
    }

    // Get prices from our price API
    const idsToFetch = [from === 'USDT' ? '' : fromId, to === 'USDT' ? '' : toId].filter(Boolean).join(',');
    let fromPriceUsd = 1; // Default USDT = $1
    let toPriceUsd = 1;

    if (idsToFetch) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const priceRes = await fetch(`${baseUrl}/api/prices?ids=${idsToFetch}`, {
          cache: 'no-store',
        });
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          if (priceData.data && Array.isArray(priceData.data)) {
            for (const asset of priceData.data) {
              if (asset.id === fromId) fromPriceUsd = Number(asset.priceUsd) || 1;
              if (asset.id === toId) toPriceUsd = Number(asset.priceUsd) || 1;
            }
          }
        }
      } catch {
        // Use fallback prices
      }
    }

    if (from === 'USDT') fromPriceUsd = 1;
    if (to === 'USDT') toPriceUsd = 1;

    const rate = fromPriceUsd / toPriceUsd;
    const fee = amount * (SWAP_FEE_PERCENT / 100);
    const netAmount = amount - fee;
    const receiveAmount = netAmount * rate;

    return NextResponse.json({
      from,
      to,
      amount,
      rate,
      feePercent: SWAP_FEE_PERCENT,
      fee,
      netAmount,
      receiveAmount,
      fromPriceUsd,
      toPriceUsd,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/wallet/swap — execute swap
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
    const { from, to, amount } = body;

    if (!from || !to || !amount) {
      return NextResponse.json({ error: 'from, to, and amount required' }, { status: 400 });
    }

    if (from === to) {
      return NextResponse.json({ error: 'Cannot swap same currency' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get portfolio
    let portfolio = await Portfolio.findOne({ userId: session.user.id });
    if (!portfolio) {
      portfolio = new Portfolio({
        userId: session.user.id,
        accountBalance: config.app.defaultBalance,
        holdings: [],
      });
    }

    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    // Validate balance
    if (fromUpper === 'USDT') {
      if (portfolio.accountBalance < parsedAmount) {
        return NextResponse.json({ error: 'Insufficient USDT balance' }, { status: 400 });
      }
    } else {
      const holding = portfolio.holdings?.find((h: any) => h.cryptoSymbol === fromUpper);
      if (!holding || holding.amount < parsedAmount) {
        return NextResponse.json({
          error: `Insufficient ${fromUpper} balance. You have ${holding?.amount || 0}`,
        }, { status: 400 });
      }
    }

    let fromPriceUsd = 1;
    let toPriceUsd = 1;

    const fromId = PRICE_ID_BY_SYMBOL[fromUpper];
    const toId = PRICE_ID_BY_SYMBOL[toUpper];
    if (!fromId || !toId) {
      return NextResponse.json({
        error: `Unsupported currency pair: ${fromUpper} to ${toUpper}`,
      }, { status: 400 });
    }

    const idsToFetch = [fromUpper === 'USDT' ? '' : fromId, toUpper === 'USDT' ? '' : toId].filter(Boolean).join(',');
    if (idsToFetch) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const priceRes = await fetch(`${baseUrl}/api/prices?ids=${idsToFetch}`, { cache: 'no-store' });
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          if (priceData.data && Array.isArray(priceData.data)) {
            for (const asset of priceData.data) {
              if (asset.id === fromId) fromPriceUsd = Number(asset.priceUsd) || 1;
              if (asset.id === toId) toPriceUsd = Number(asset.priceUsd) || 1;
            }
          }
        }
      } catch {}
    }

    if (fromUpper === 'USDT') fromPriceUsd = 1;
    if (toUpper === 'USDT') toPriceUsd = 1;

    const fee = parsedAmount * (SWAP_FEE_PERCENT / 100);
    const netAmount = parsedAmount - fee;
    const rate = fromPriceUsd / toPriceUsd;
    const receiveAmount = netAmount * rate;

    // Deduct from source
    if (fromUpper === 'USDT') {
      portfolio.accountBalance -= parsedAmount;
    } else {
      const holdingIdx = portfolio.holdings.findIndex((h: any) => h.cryptoSymbol === fromUpper);
      if (holdingIdx >= 0) {
        portfolio.holdings[holdingIdx].amount -= parsedAmount;
        portfolio.holdings[holdingIdx].totalValue =
          portfolio.holdings[holdingIdx].amount * portfolio.holdings[holdingIdx].currentPrice;
        if (portfolio.holdings[holdingIdx].amount <= 0.000001) {
          portfolio.holdings.splice(holdingIdx, 1);
        }
      }
    }

    // Add to destination
    if (toUpper === 'USDT') {
      portfolio.accountBalance += receiveAmount;
    } else {
      const existingIdx = portfolio.holdings.findIndex((h: any) => h.cryptoSymbol === toUpper);
      if (existingIdx >= 0) {
        const old = portfolio.holdings[existingIdx];
        const totalAmount = old.amount + receiveAmount;
        const avgPrice = ((old.amount * old.averageBuyPrice) + (receiveAmount * toPriceUsd)) / totalAmount;
        portfolio.holdings[existingIdx].amount = totalAmount;
        portfolio.holdings[existingIdx].averageBuyPrice = avgPrice;
        portfolio.holdings[existingIdx].currentPrice = toPriceUsd;
        portfolio.holdings[existingIdx].totalValue = totalAmount * toPriceUsd;
      } else {
        portfolio.holdings.push({
          cryptoSymbol: toUpper,
          amount: receiveAmount,
          averageBuyPrice: toPriceUsd,
          currentPrice: toPriceUsd,
          totalValue: receiveAmount * toPriceUsd,
          gainLoss: 0,
          gainLossPercent: 0,
        });
      }
    }

    await portfolio.save();

    return NextResponse.json({
      message: `Swapped ${parsedAmount} ${fromUpper} → ${receiveAmount.toFixed(6)} ${toUpper}`,
      from: fromUpper,
      to: toUpper,
      amountSent: parsedAmount,
      amountReceived: receiveAmount,
      fee,
      rate,
      newBalance: portfolio.accountBalance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
