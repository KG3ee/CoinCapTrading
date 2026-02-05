'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

type PriceData = {
  priceUsd: number;
  changePercent24Hr: number;
};

type PriceMap = Record<string, PriceData>;

// Check if we're in browser
const isBrowser = typeof window !== 'undefined';

export function useRealtimePrices(ids: string[]) {
  const [prices, setPrices] = useState<PriceMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const idsRef = useRef(ids.join(','));

  // Fetch prices via REST API (more reliable)
  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch(`/api/prices?ids=${ids.join(',')}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        const priceMap: PriceMap = {};
        data.data.forEach((asset: any) => {
          priceMap[asset.id] = {
            priceUsd: Number(asset.priceUsd),
            changePercent24Hr: Number(asset.changePercent24Hr),
          };
        });
        setPrices(priceMap);
        setError(null);
        console.log('✓ Prices updated:', Object.keys(priceMap).length, 'assets');
      }
      setIsLoading(false);
    } catch (err) {
      console.error('✗ Failed to fetch prices:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  }, [ids]);

  useEffect(() => {
    idsRef.current = ids.join(',');
    
    // Fetch immediately
    fetchPrices();

    // Poll every 2 seconds for real-time feel
    // (Much more reliable than WebSocket for this API)
    pollIntervalRef.current = setInterval(() => {
      fetchPrices();
    }, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [ids, fetchPrices]);

  return { prices, isLoading, error };
}
