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
    // Map our IDs to CoinGecko IDs
    const idMap: Record<string, string> = {
      'bitcoin': 'bitcoin',
      'ethereum': 'ethereum',
      'ripple': 'ripple',
      'cardano': 'cardano',
      'solana': 'solana',
      'polkadot': 'polkadot',
    };

    const idsArray = ids.split(',').map(id => id.trim());
    const geckoIds = idsArray.map(id => idMap[id] || id).join(',');

    // Use CoinGecko simple/price API for real-time data
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`,
      {
        cache: 'no-store',
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'CoinCapTrading/1.0'
        },
        signal: AbortSignal.timeout(8000), // 8 second timeout
      }
    );

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const geckoData = await response.json();

    // Fetch detailed data (including high/low) for each coin
    const detailedDataPromises = idsArray.map(async (id) => {
      const geckoId = idMap[id] || id;
      try {
        const detailResponse = await fetch(
          `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false`,
          {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000),
          }
        );
        
        if (detailResponse.ok) {
          return await detailResponse.json();
        }
      } catch (e) {
        console.warn(`Failed to fetch details for ${geckoId}`);
      }
      return null;
    });

    const detailedDataArray = await Promise.all(detailedDataPromises);
    const detailedDataMap = new Map();
    detailedDataArray.forEach((coin) => {
      if (coin) {
        detailedDataMap.set(coin.id, coin);
      }
    });

    // Transform CoinGecko response to match our expected format
    const transformedData: CoinCapAsset[] = idsArray
      .map((id) => {
        const geckoId = idMap[id] || id;
        const simpleData = geckoData[geckoId];
        const detailData = detailedDataMap.get(geckoId);

        if (!simpleData) return null;

        const high24h = detailData?.market_data?.high_24h?.usd || 0;
        const low24h = detailData?.market_data?.low_24h?.usd || 0;

        return {
          id,
          priceUsd: String(simpleData.usd || 0),
          changePercent24Hr: String(simpleData.usd_24h_change || 0),
          high24Hr: String(high24h),
          low24Hr: String(low24h),
          volume24Hr: String(simpleData.usd_24h_vol || 0),
          marketCap: String(simpleData.usd_market_cap || 0),
        };
      })
      .filter((item): item is CoinCapAsset => item !== null);

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
