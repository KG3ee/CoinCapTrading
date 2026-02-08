import { connectDB } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';
import { withRateLimit } from '@/lib/middleware/rateLimit';
import { tradeSchema } from '@/lib/validation/schemas';
import { PortfolioService } from '@/lib/services/portfolioService';
import { logger } from '@/lib/utils/logger';
import User from '@/lib/models/User';
export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'TradeRoute' });

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validationResult = tradeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { type, cryptoSymbol, amount, pricePerUnit } = validationResult.data;

    const result = await PortfolioService.executeTrade(session.user.id, {
      type,
      cryptoSymbol,
      amount,
      pricePerUnit,
    });

    await User.findByIdAndUpdate(session.user.id, { lastActiveAt: new Date() });

    log.info(
      { userId: session.user.id, type, cryptoSymbol, amount, pricePerUnit },
      'Trade executed successfully'
    );

    return NextResponse.json(
      {
        message: `${type === 'buy' ? 'Buy' : 'Sell'} order placed successfully`,
        trade: result.trade,
        portfolio: result.portfolio,
      },
      { status: 201 }
    );
  } catch (error: any) {
    log.error({ error }, 'Place trade error');
    
    const errorMessage = error.message || 'Trade execution failed';
    const statusCode = 
      errorMessage.includes('Insufficient') ? 400 :
      errorMessage.includes('not found') ? 404 :
      500;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
