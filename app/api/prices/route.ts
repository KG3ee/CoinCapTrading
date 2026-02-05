import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.coincap.io/v2/assets?ids=${ids}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch CoinCap data' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
