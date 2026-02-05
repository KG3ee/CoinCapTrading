import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Validate symbol format (e.g., BTCUSDT)
    if (!/^[A-Z]{2,}USDT$/.test(symbol)) {
      return NextResponse.json(
        { error: 'Invalid symbol format' },
        { status: 400 }
      );
    }

    // Fetch 30 days of daily (1d) candlestick data from Binance
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=30`,
      {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CoinCapTrading/1.0',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      console.error(`Binance API error for ${symbol}:`, response.status, response.statusText);
      return NextResponse.json(
        { error: `Binance API error: ${response.status}`, data: [] },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform Binance data: [timestamp, open, high, low, close, volume, ...]
    const transformedData = data
      .filter((candle: any[]) => Array.isArray(candle) && candle.length >= 5)
      .map((candle: any[]) => ({
        time: Math.floor(candle[0] / 1000),
        price: parseFloat(candle[4]), // Use closing price
      }))
      .sort((a: any, b: any) => a.time - b.time);

    return NextResponse.json(
      { 
        data: transformedData.length > 0 ? transformedData : [],
        symbol,
        count: transformedData.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Chart API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch chart data',
        data: [],
      },
      { status: 500 }
    );
  }
}
