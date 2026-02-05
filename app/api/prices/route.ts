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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
          {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
          }
        );

        clearTimeout(timeout);

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
    
    // If Binance calls fail, try CoinGecko as fallback
    const failedCoins = idsArray.filter((id, idx) => binancePrices[idx] === null);
    let fallbackData: any[] = [];

    if (failedCoins.length > 0) {
      console.log(`Binance failed for ${failedCoins.length} coins, trying CoinGecko fallback...`);
      
      try {
        const geckoResponse = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${failedCoins.join(',')}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
          {
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
          }
        );

        if (geckoResponse.ok) {
          const geckoData = await geckoResponse.json();
          fallbackData = failedCoins.map(id => ({
            id,
            price: geckoData[id.toLowerCase()]?.usd || 0,
            change24h: geckoData[id.toLowerCase()]?.usd_24h_change || 0,
            high24h: 0,
            low24h: 0,
            volume24h: geckoData[id.toLowerCase()]?.usd_24h_vol || 0,
          }));
        }
      } catch (error) {
        console.warn('CoinGecko fallback also failed:', error);
      }
    }

    // Merge Binance and fallback data
    const allData = [...binancePrices.filter(p => p !== null), ...fallbackData];

    // Transform to expected format
    const transformedData: CoinCapAsset[] = allData
      .filter((item) => item !== null && item !== undefined)
      .map((item) => ({
        id: item.id,
        priceUsd: String(item.price || 0),
        changePercent24Hr: String(item.change24h || 0),
        high24Hr: String(item.high24h || 0),
        low24Hr: String(item.low24h || 0),
        volume24Hr: String(item.volume24h || 0),
        marketCap: '0', // Can be fetched separately if needed
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
