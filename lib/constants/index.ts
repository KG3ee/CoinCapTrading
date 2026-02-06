// Static data that doesn't change - moved here for better performance

export const AVAILABLE_CRYPTOS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'ripple', symbol: 'XRP', name: 'Ripple' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
] as const;

// Type helper for crypto selection
export type CryptoType = {
  id: string;
  symbol: string;
  name: string;
};

export const ORDER_BOOK_DATA = {
  asks: [
    { price: '43,252.10', amount: '0.156', total: '6,747.33' },
    { price: '43,251.70', amount: '0.084', total: '3,632.15' },
    { price: '43,251.20', amount: '0.324', total: '14,013.38' },
    { price: '43,250.80', amount: '0.440', total: '19,030.35' },
  ],
  bids: [
    { price: '43,249.90', amount: '0.210', total: '9,082.47' },
    { price: '43,249.50', amount: '0.367', total: '15,869.57' },
    { price: '43,249.10', amount: '0.125', total: '5,406.14' },
    { price: '43,248.60', amount: '0.520', total: '22,489.27' },
  ],
} as const;

export const RECENT_TRADES_DATA = [
  { id: 1, price: '43,250.10', amount: '0.024', time: '12:04:32', isUp: true },
  { id: 2, price: '43,249.80', amount: '0.120', time: '12:04:10', isUp: false },
  { id: 3, price: '43,250.60', amount: '0.065', time: '12:03:58', isUp: true },
  { id: 4, price: '43,249.20', amount: '0.018', time: '12:03:41', isUp: false },
  { id: 5, price: '43,250.30', amount: '0.210', time: '12:03:22', isUp: true },
] as const;

export const PERCENTAGE_OPTIONS = [25, 50, 75, 100] as const;

export const API_ENDPOINTS = {
  COINCAP_BASE: 'https://api.coincap.io/v2',
  ASSETS: '/assets',
  HISTORY: '/assets/:id/history',
} as const;

export const CACHE_KEYS = {
  PRICES: 'coincap_prices',
  CHART_DATA: 'chart_data',
} as const;

export const POLLING_INTERVALS = {
  REALTIME_PRICES: 5000, // 5 seconds
  COIN_PRICES: 8000, // 8 seconds
  CACHE_EXPIRY: 10000, // 10 seconds
} as const;
