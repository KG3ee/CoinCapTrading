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

export function useCoinCapPrices(ids: string[], refreshMs = 10000) {
  const [prices, setPrices] = useState<PriceMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const idsKey = useMemo(() => ids.join(','), [ids]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchPrices = async () => {
      try {
        setError(null);
        const response = await fetch(`/api/prices?ids=${idsKey}`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch prices');
        }

        const json = (await response.json()) as { data: CoinCapAsset[] };
        const nextPrices: PriceMap = {};

        json.data.forEach((asset) => {
          nextPrices[asset.id] = {
            priceUsd: Number(asset.priceUsd),
            changePercent24Hr: Number(asset.changePercent24Hr),
          };
        });

        if (isMounted) {
          setPrices(nextPrices);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    fetchPrices();

    intervalRef.current = setInterval(fetchPrices, refreshMs);

    return () => {
      isMounted = false;
      controller.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [idsKey, refreshMs]);

  return { prices, isLoading, error };
}
