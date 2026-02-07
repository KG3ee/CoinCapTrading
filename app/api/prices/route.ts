import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

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
  'User-Agent': 'Mozilla/5.0 (compatible; CoinCapTrading/1.0)',
};

// MongoDB price cache collection name
const PRICE_CACHE_COLLECTION = 'price_cache';
const CACHE_TTL_MS = 30_000; // 30 seconds — shared between all instances

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

// In-memory cache (per-instance, short TTL)
let memCache: { data: CoinCapAsset[]; ts: number } | null = null;
const MEM_CACHE_TTL = 10_000; // 10 seconds

function makeAbortController(ms: number): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(timer) };
}

// --- MongoDB cache operations ---
async function getCachedPrices(): Promise<CoinCapAsset[] | null> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return null;
    const collection = db.collection(PRICE_CACHE_COLLECTION);
    const doc = await collection.findOne({ _id: 'latest_prices' as unknown as mongoose.Types.ObjectId });
    if (!doc) return null;
    const age = Date.now() - (doc.timestamp || 0);
    if (age > CACHE_TTL_MS) return null; // Stale
    return doc.prices as CoinCapAsset[];
  } catch (err) {
    console.warn('MongoDB cache read failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function setCachedPrices(prices: CoinCapAsset[]): Promise<void> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return;
    const collection = db.collection(PRICE_CACHE_COLLECTION);
    await collection.updateOne(
      { _id: 'latest_prices' as unknown as mongoose.Types.ObjectId },
      { $set: { prices, timestamp: Date.now() } },
      { upsert: true }
    );
  } catch (err) {
    console.warn('MongoDB cache write failed:', err instanceof Error ? err.message : err);
  }
}

async function getStalePrices(): Promise<CoinCapAsset[] | null> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return null;
    const collection = db.collection(PRICE_CACHE_COLLECTION);
    const doc = await collection.findOne({ _id: 'latest_prices' as unknown as mongoose.Types.ObjectId });
    if (!doc || !doc.prices) return null;
    return doc.prices as CoinCapAsset[];
  } catch {
    return null;
  }
}

// --- Strategy 1: CoinGecko /simple/price (lightest, fastest) ---
async function fetchFromCoinGeckoSimple(idsArray: string[]): Promise<PriceResult[]> {
  const geckoIds = idsArray.map((id) => id.toLowerCase()).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

  const { controller, clear } = makeAbortController(8000);
  try {
    const response = await fetch(url, {
      headers: API_HEADERS,
      signal: controller.signal,
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

// --- Strategy 2: CoinGecko /coins/markets (richer data) ---
async function fetchFromCoinGecko(idsArray: string[]): Promise<PriceResult[]> {
  const geckoIds = idsArray.map((id) => id.toLowerCase()).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${geckoIds}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h`;

  const { controller, clear } = makeAbortController(8000);
  try {
    const response = await fetch(url, {
      headers: API_HEADERS,
      signal: controller.signal,
    });
    clear();

    if (!response.ok) {
      throw new Error(`CoinGecko markets ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('CoinGecko markets returned empty');
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
    });
    clear();

    if (!response.ok) throw new Error(`Binance ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Binance returned non-array');

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

// --- Strategy 4: Kraken REST API ---
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
    });
    clear();

    if (!response.ok) throw new Error(`Kraken ${response.status}`);

    const json = await response.json();
    if (json.error && json.error.length > 0) throw new Error(`Kraken: ${json.error.join(', ')}`);

    const results: PriceResult[] = [];
    for (const [pair, ticker] of Object.entries(json.result || {})) {
      const t = ticker as { c: string[]; p: string[]; h: string[]; l: string[]; v: string[] };
      const id = reverseKrakenMap[pair] || reverseKrakenMap[pairs.find((p) => pair.includes(p.replace('Z', ''))) || ''];
      if (id && t.c) {
        results.push({
          id,
          price: parseFloat(t.c[0]) || 0,
          change24h: 0,
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
  const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' };

  // 1. Check in-memory cache (fastest)
  if (memCache && Date.now() - memCache.ts < MEM_CACHE_TTL && memCache.data.length > 0) {
    const filtered = memCache.data.filter((a) => idsArray.includes(a.id));
    if (filtered.length >= idsArray.length * 0.5) {
      return NextResponse.json({ data: filtered, source: 'mem-cache' }, { status: 200, headers });
    }
  }

  // 2. Check MongoDB shared cache
  try {
    const mongoCached = await getCachedPrices();
    if (mongoCached && mongoCached.length > 0) {
      const filtered = mongoCached.filter((a) => idsArray.includes(a.id));
      if (filtered.length >= idsArray.length * 0.5) {
        // Update in-memory cache too
        memCache = { data: mongoCached, ts: Date.now() };
        return NextResponse.json({ data: filtered, source: 'db-cache' }, { status: 200, headers });
      }
    }
  } catch (err) {
    console.warn('MongoDB cache check failed:', err instanceof Error ? err.message : err);
  }

  // 3. Fetch from external APIs — race them
  const errors: string[] = [];
  const allCoins = ['bitcoin', 'ethereum', 'ripple', 'cardano', 'solana', 'polkadot'];

  const strategies = [
    { fn: () => fetchFromCoinGeckoSimple(allCoins), name: 'coingecko-simple' },
    { fn: () => fetchFromCoinGecko(allCoins), name: 'coingecko' },
    { fn: () => fetchFromBinanceBatch(allCoins), name: 'binance' },
    { fn: () => fetchFromKraken(allCoins), name: 'kraken' },
  ];

  const promises = strategies.map(async ({ fn, name }) => {
    try {
      const results = await fn();
      if (results.length > 0) return { results, source: name };
      throw new Error(`${name} returned empty`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${name}: ${msg}`);
      throw err;
    }
  });

  try {
    const winner = await Promise.any(promises);
    const transformed = toAssetArray(winner.results);

    // Update both caches
    memCache = { data: transformed, ts: Date.now() };
    setCachedPrices(transformed).catch(() => {}); // Fire and forget

    const filtered = transformed.filter((a) => idsArray.includes(a.id));
    return NextResponse.json({ data: filtered, source: winner.source }, { status: 200, headers });
  } catch {
    // All APIs failed
    console.error('All price APIs failed. Errors:', errors);
  }

  // 4. Last resort: return stale MongoDB data (any age)
  try {
    const stale = await getStalePrices();
    if (stale && stale.length > 0) {
      const filtered = stale.filter((a) => idsArray.includes(a.id));
      if (filtered.length > 0) {
        memCache = { data: stale, ts: Date.now() - MEM_CACHE_TTL + 5000 }; // Keep for 5s
        return NextResponse.json({ data: filtered, source: 'stale-db', errors }, { status: 200, headers });
      }
    }
  } catch {}

  return NextResponse.json({ data: [], errors }, { status: 200, headers });
}
