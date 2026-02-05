import { NextResponse } from 'next/server';

type CoinCapAsset = {
  id: string;
  priceUsd: string;
  changePercent24Hr: string;
  high24Hr?: string;
  low24Hr?: string;
  volume24Hr?: string;
  marketCap?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
  }

  try {
    // Map our coin IDs to Binance trading pair symbols
    const symbolMap: Record<string, string> = {
      'bitcoin': 'BTCUSDT',
      'ethereum': 'ETHUSDT',
      'ripple': 'XRPUSDT',
      'cardano': 'ADAUSDT',
      'solana': 'SOLUSDT',
      'polkadot': 'DOTUSDT',
    };

    const idsArray = ids.split(',').map(id => id.trim());
    
    // Fetch 24hr ticker data from Binance for all coins
    const binancePricesPromises = idsArray.map(async (id) => {
      const binanceSymbol = symbolMap[id.toLowerCase()] || `${id.toUpperCase()}USDT`;
      
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
          {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000),
          }
        );

        if (!response.ok) {
          console.warn(`Binance API error for ${binanceSymbol}: ${response.status}`);
          return null;
        }

        const data = await response.json();
        
        return {
          id,
          binanceSymbol,
          price: parseFloat(data.lastPrice),
          change24h: parseFloat(data.priceChangePercent),
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          volume24h: parseFloat(data.quoteAssetVolume), // Volume in USD
        };
      } catch (error) {
        console.warn(`Failed to fetch Binance data for ${id}:`, error);
        return null;
      }
    });

    const binancePrices = await Promise.all(binancePricesPromises);
    
    // Fetch market cap from CoinGecko (just for market cap, not price-critical)
    const marketCapPromises = idsArray.map(async (id) => {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${id.toLowerCase()}&vs_currencies=usd&include_market_cap=true`,
          {
            cache: 'force-cache', // Cache aggressively since this is just for market cap
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const marketCap = data[id.toLowerCase()]?.usd_market_cap;
          return { id, marketCap };
        }
      } catch (error) {
        console.warn(`Failed to fetch market cap for ${id}`);
      }
      return { id, marketCap: null };
    });

    const marketCapData = await Promise.all(marketCapPromises);
    const marketCapMap = new Map(marketCapData.map(d => [d.id, d.marketCap]));

    // Transform and combine data
    const transformedData: CoinCapAsset[] = binancePrices
      .filter((item) => item !== null)
      .map((item) => ({
        id: item!.id,
        priceUsd: String(item!.price),
        changePercent24Hr: String(item!.change24h),
        high24Hr: String(item!.high24h),
        low24Hr: String(item!.low24h),
        volume24Hr: String(item!.volume24h),
        marketCap: marketCapMap.get(item!.id) ? String(marketCapMap.get(item!.id)) : '0',
      }));

    return NextResponse.json({ data: transformedData }, { status: 200 });
  } catch (error) {
    console.error('Prices API error:', error);

    // Return empty data gracefully on error
    return NextResponse.json(
      { data: [] },
      { status: 200 }
    );
  }
}
