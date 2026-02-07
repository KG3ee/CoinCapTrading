import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type CoinCapAsset = {
  id: string;
  priceUsd: string;
  changePercent24Hr: string;
  high24Hr?: string;
  low24Hr?: string;
  volume24Hr?: string;
  marketCap?: string;
};

type PriceResult = {
  id: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
};

// Common headers to avoid cloud-IP blocking
const API_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'User-Agent': 'CoinCapTrading/1.0 (https://coin-cap-trading.vercel.app)',
};

// Map our coin IDs to Binance trading pair symbols
const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'BTCUSDT',
  ethereum: 'ETHUSDT',
  ripple: 'XRPUSDT',
  cardano: 'ADAUSDT',
  solana: 'SOLUSDT',
  polkadot: 'DOTUSDT',
};

const REVERSE_SYMBOL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SYMBOL_MAP).map(([id, sym]) => [sym, id])
);

// Server-side price cache (survives across requests within same serverless instance)
let priceCache: { data: CoinCapAsset[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds — reduces external API calls

function makeAbortController(ms: number): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(timer) };
}

// --- Strategy 1: CoinGecko /coins/markets (most cloud-friendly) ---
async function fetchFromCoinGecko(idsArray: string[]): Promise<PriceResult[]> {
  const geckoIds = idsArray.map((id) => id.toLowerCase()).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${geckoIds}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h`;

  const { controller, clear } = makeAbortController(8000);
  try {
    const response = await fetch(url, {
      headers: API_HEADERS,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clear();

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`CoinGecko ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`CoinGecko returned empty or non-array: ${JSON.stringify(data).slice(0, 200)}`);
    }

    return data.map((coin: Record<string, unknown>) => ({
      id: String(coin.id),
      price: Number(coin.current_price) || 0,
      change24h: Number(coin.price_change_percentage_24h) || 0,
      high24h: Number(coin.high_24h) || 0,
      low24h: Number(coin.low_24h) || 0,
      volume24h: Number(coin.total_volume) || 0,
      marketCap: Number(coin.market_cap) || 0,
    }));
  } finally {
    clear();
  }
}

// --- Strategy 2: CoinGecko /simple/price (lighter weight, different endpoint) ---
async function fetchFromCoinGeckoSimple(idsArray: string[]): Promise<PriceResult[]> {
  const geckoIds = idsArray.map((id) => id.toLowerCase()).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

  const { controller, clear } = makeAbortController(8000);
  try {
    const response = await fetch(url, {
      headers: API_HEADERS,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clear();

    if (!response.ok) {
      throw new Error(`CoinGecko simple ${response.status}`);
    }

    const data = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('CoinGecko simple returned invalid data');
    }

    const results: PriceResult[] = [];
    for (const id of idsArray) {
      const coin = data[id.toLowerCase()];
      if (coin && coin.usd) {
        results.push({
          id: id.toLowerCase(),
          price: Number(coin.usd) || 0,
          change24h: Number(coin.usd_24h_change) || 0,
          high24h: 0,
          low24h: 0,
          volume24h: Number(coin.usd_24h_vol) || 0,
          marketCap: Number(coin.usd_market_cap) || 0,
        });
      }
    }
    return results;
  } finally {
    clear();
  }
}

// --- Strategy 3: Binance BATCH endpoint ---
async function fetchFromBinanceBatch(idsArray: string[]): Promise<PriceResult[]> {
  const symbols = idsArray.map((id) => SYMBOL_MAP[id.toLowerCase()]).filter(Boolean);
  if (symbols.length === 0) return [];

  const symbolsParam = JSON.stringify(symbols);
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`;

  const { controller, clear } = makeAbortController(5000);
  try {
    const response = await fetch(url, {
      headers: API_HEADERS,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clear();

    if (!response.ok) {
      throw new Error(`Binance ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Binance returned non-array');
    }

    return data.map((ticker: Record<string, string>) => {
      const id = REVERSE_SYMBOL_MAP[ticker.symbol];
      if (!id) return null;
      return {
        id,
        price: parseFloat(ticker.lastPrice) || 0,
        change24h: parseFloat(ticker.priceChangePercent) || 0,
        high24h: parseFloat(ticker.highPrice) || 0,
        low24h: parseFloat(ticker.lowPrice) || 0,
        volume24h: parseFloat(ticker.quoteVolume) || 0,
        marketCap: 0,
      };
    }).filter(Boolean) as PriceResult[];
  } finally {
    clear();
  }
}

// --- Strategy 4: Kraken REST API (another major exchange, cloud-friendly) ---
async function fetchFromKraken(idsArray: string[]): Promise<PriceResult[]> {
  const krakenMap: Record<string, string> = {
    bitcoin: 'XXBTZUSD',
    ethereum: 'XETHZUSD',
    ripple: 'XXRPZUSD',
    cardano: 'ADAUSD',
    solana: 'SOLUSD',
    polkadot: 'DOTUSD',
  };

  const pairs = idsArray.map((id) => krakenMap[id.toLowerCase()]).filter(Boolean);
  if (pairs.length === 0) return [];

  const url = `https://api.kraken.com/0/public/Ticker?pair=${pairs.join(',')}`;
  const reverseKrakenMap = Object.fromEntries(
    Object.entries(krakenMap).map(([id, pair]) => [pair, id])
  );

  const { controller, clear } = makeAbortController(6000);
  try {
    const response = await fetch(url, {
      headers: API_HEADERS,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clear();

    if (!response.ok) {
      throw new Error(`Kraken ${response.status}`);
    }

    const json = await response.json();
    if (json.error && json.error.length > 0) {
      throw new Error(`Kraken error: ${json.error.join(', ')}`);
    }

    const results: PriceResult[] = [];
    for (const [pair, ticker] of Object.entries(json.result || {})) {
      const t = ticker as { c: string[]; p: string[]; h: string[]; l: string[]; v: string[] };
      // Kraken returns pairs with slightly different names sometimes
      const id = reverseKrakenMap[pair] || reverseKrakenMap[pairs.find((p) => pair.includes(p.replace('Z', ''))) || ''];
      if (id && t.c) {
        results.push({
          id,
          price: parseFloat(t.c[0]) || 0,
          change24h: 0, // Kraken doesn't give % change directly
          high24h: parseFloat(t.h?.[1]) || 0,
          low24h: parseFloat(t.l?.[1]) || 0,
          volume24h: parseFloat(t.v?.[1]) || 0,
          marketCap: 0,
        });
      }
    }
    return results;
  } finally {
    clear();
  }
}

function toAssetArray(results: PriceResult[]): CoinCapAsset[] {
  return results.map((item) => ({
    id: item.id,
    priceUsd: String(item.price),
    changePercent24Hr: String(item.change24h),
    high24Hr: String(item.high24h),
    low24Hr: String(item.low24h),
    volume24Hr: String(item.volume24h),
    marketCap: String(item.marketCap),
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
  }

  const idsArray = ids.split(',').map((id) => id.trim().toLowerCase());

  // Return cache if still fresh
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL_MS) {
    const cached = priceCache.data.filter((a) => idsArray.includes(a.id));
    if (cached.length > 0) {
      return NextResponse.json({ data: cached, source: 'cache' }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }
  }

  const errors: string[] = [];

  // Race ALL APIs in parallel — take whichever succeeds first
  // This avoids sequential timeout chains that exceed Vercel's function limit
  const apiRace = async (): Promise<{ results: PriceResult[]; source: string } | null> => {
    const strategies = [
      { fn: () => fetchFromCoinGecko(idsArray), name: 'coingecko' },
      { fn: () => fetchFromCoinGeckoSimple(idsArray), name: 'coingecko-simple' },
      { fn: () => fetchFromBinanceBatch(idsArray), name: 'binance' },
      { fn: () => fetchFromKraken(idsArray), name: 'kraken' },
    ];

    // Wrap each strategy to catch errors and filter empty results
    const promises = strategies.map(async ({ fn, name }) => {
      try {
        const results = await fn();
        if (results.length > 0) {
          return { results, source: name };
        }
        errors.push(`${name}: returned empty`);
        throw new Error(`${name} returned empty`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!errors.includes(`${name}: ${msg}`) && !msg.includes('returned empty')) {
          errors.push(`${name}: ${msg}`);
        }
        console.warn(`${name} failed:`, msg);
        throw err; // Re-throw so Promise.any skips it
      }
    });

    try {
      return await Promise.any(promises);
    } catch {
      // All promises rejected
      return null;
    }
  };

  const winner = await apiRace();

  if (winner) {
    const transformed = toAssetArray(winner.results);
    priceCache = { data: transformed, timestamp: Date.now() };
    return NextResponse.json({ data: transformed, source: winner.source }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }

  // All live APIs failed — return stale cache if available (no age limit for stale)
  if (priceCache && priceCache.data.length > 0) {
    console.warn('All price APIs failed, returning stale cache. Errors:', errors);
    const cached = priceCache.data.filter((a) => idsArray.includes(a.id));
    if (cached.length > 0) {
      return NextResponse.json({ data: cached, source: 'stale-cache', errors }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }
  }

  // Absolute last resort — return empty with debug info
  console.error('All price APIs failed and no cache. Errors:', errors);
  return NextResponse.json({ data: [], errors }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
