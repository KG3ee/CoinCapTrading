'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type CoinCapAsset = {
  id: string;
  priceUsd: string;
  changePercent24Hr: string;
};

type PriceMap = Record<
  string,
  {
    priceUsd: number;
    changePercent24Hr: number;
  }
>;

const STORAGE_KEY = 'coincap_prices';

export function useCoinCapPrices(ids: string[], refreshMs = 3000) {
  const [prices, setPrices] = useState<PriceMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const idsKey = useMemo(() => ids.join(','), [ids]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const fetchPrices = async (forceRefresh = false) => {
    try {
      const now = Date.now();
      // Don't fetch more than once per second to avoid rate limiting
      if (!forceRefresh && now - lastFetchTimeRef.current < 1000) {
        return;
      }

      setError(null);
      const controller = new AbortController();
      const response = await fetch(`/api/prices?ids=${idsKey}`, {
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = (await response.json()) as { data: CoinCapAsset[] };
      const nextPrices: PriceMap = {};

      if (json.data && Array.isArray(json.data)) {
        json.data.forEach((asset) => {
          nextPrices[asset.id] = {
            priceUsd: Number(asset.priceUsd),
            changePercent24Hr: Number(asset.changePercent24Hr),
          };
        });

        if (isMountedRef.current) {
          setPrices(nextPrices);
          setIsLoading(false);
          lastFetchTimeRef.current = now;
          
          // Persist to localStorage for seamless tab switching
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPrices));
            } catch (e) {
              console.warn('Failed to save prices to localStorage:', e);
            }
          }
          
          console.log('✓ Prices updated at', new Date(now).toLocaleTimeString());
        }
      }
    } catch (err) {
      if (isMountedRef.current && !(err instanceof Error && err.message === 'The user aborted a request')) {
        console.error('Error fetching prices:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    // Load cached prices from localStorage first (avoid placeholder flicker)
    let shouldFetchFresh = true;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const cachedPrices = JSON.parse(cached);
          setPrices(cachedPrices);
          setIsLoading(false);
          console.log('✓ Loaded cached prices from localStorage');
          // If cache was just loaded, don't force fresh fetch unless it's stale (>10s)
          shouldFetchFresh = false;
          lastFetchTimeRef.current = Date.now();
        }
      } catch (e) {
        console.warn('Failed to load cached prices:', e);
      }
    }

    // Only fetch fresh prices if we didn't load cached data or it's stale
    if (shouldFetchFresh) {
      fetchPrices(true);
    }

    // Handle tab visibility - pause/resume fetching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Tab hidden - pausing price updates');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else {
        console.log('Tab visible - resuming price updates');
        // Force refresh when tab becomes visible (only if more than 5 seconds have passed)
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
        if (timeSinceLastFetch > 5000) {
          fetchPrices(true);
        }
        // Resume polling
        intervalRef.current = setInterval(() => {
          fetchPrices();
        }, refreshMs);
      }
    };

    // Handle window focus - only refresh if prices are stale (>10 seconds old)
    const handleWindowFocus = () => {
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch > 10000) {
        console.log('Window focused - prices stale, refreshing');
        fetchPrices(true);
      }
    };

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      fetchPrices();
    }, refreshMs);

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [idsKey, refreshMs]);

  return { prices, isLoading, error };
}
