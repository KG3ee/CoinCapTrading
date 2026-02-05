interface CryptoData {
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent24Hr: number;
  marketCap: number;
}

export const formatPrice = (value: number): string => {
  if (Number.isNaN(value)) return '0.00';
  if (value >= 1000) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (value >= 1) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
};

export const formatLargeNumber = (value: number): string => {
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(2) + 'B';
  }
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(2) + 'M';
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(2) + 'K';
  }
  return value.toFixed(2);
};

export const fetchRealCryptoData = async (): Promise<CryptoData[]> => {
  try {
    const ids = ['bitcoin', 'ethereum', 'cardano', 'solana', 'ripple', 'polkadot', 'dogecoin'];
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch crypto data');
    }

    const data = await response.json();

    return ids.map(id => ({
      symbol: id.toUpperCase().substring(0, 3),
      name: id.charAt(0).toUpperCase() + id.slice(1),
      currentPrice: data[id]?.usd || 0,
      changePercent24Hr: data[id]?.['usd_24h_change'] || 0,
      marketCap: data[id]?.['usd_market_cap'] || 0,
    }));
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    // Return mock data as fallback
    return [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        currentPrice: 43250.00,
        changePercent24Hr: 2.5,
        marketCap: 850000000000,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        currentPrice: 2280.00,
        changePercent24Hr: 1.8,
        marketCap: 274000000000,
      },
      {
        symbol: 'ADA',
        name: 'Cardano',
        currentPrice: 1.05,
        changePercent24Hr: 0.5,
        marketCap: 37000000000,
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        currentPrice: 195.50,
        changePercent24Hr: 3.2,
        marketCap: 85000000000,
      },
      {
        symbol: 'XRP',
        name: 'Ripple',
        currentPrice: 2.45,
        changePercent24Hr: -0.8,
        marketCap: 135000000000,
      },
      {
        symbol: 'DOT',
        name: 'Polkadot',
        currentPrice: 8.25,
        changePercent24Hr: 1.2,
        marketCap: 24000000000,
      },
      {
        symbol: 'DOGE',
        name: 'Dogecoin',
        currentPrice: 0.38,
        changePercent24Hr: 2.1,
        marketCap: 56000000000,
      },
    ];
  }
};
