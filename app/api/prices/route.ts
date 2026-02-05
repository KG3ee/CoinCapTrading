import { NextResponse } from 'next/server';

type CoinCapAsset = {
  id: string;
  priceUsd: string;
  changePercent24Hr: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
  }

  try {
    // Map our IDs to CoinGecko IDs for better real-time data
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

    // Use CoinGecko API for real-time data (more reliable)
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

    // Transform CoinGecko response to match our expected format
    const transformedData: CoinCapAsset[] = idsArray
      .map((id) => {
        const geckoId = idMap[id] || id;
        const data = geckoData[geckoId];

        if (!data) return null;

        return {
          id,
          priceUsd: String(data.usd || 0),
          changePercent24Hr: String(data.usd_24h_change || 0),
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
