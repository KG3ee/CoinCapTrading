'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, XCircle, Loader2, X } from 'lucide-react';

interface CountdownPopupProps {
  isOpen: boolean;
  tradeId: string;
  period: number;
  amount: number;
  profitPercent: number;
  tradeType: 'buy' | 'sell';
  cryptoSymbol: string;
  onComplete: (result: { result: 'win' | 'lose'; profitAmount: number; newBalance: number }) => void;
  onClose: () => void;
}

export default function CountdownPopup({
  isOpen,
  tradeId,
  period,
  amount,
  profitPercent,
  tradeType,
  cryptoSymbol,
  onComplete,
  onClose,
}: CountdownPopupProps) {
  const [timeLeft, setTimeLeft] = useState(period);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [profitAmount, setProfitAmount] = useState(0);
  const [newBalance, setNewBalance] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const resolvedRef = useRef(false);

  // Reset when a new trade opens
  useEffect(() => {
    if (isOpen && tradeId) {
      setTimeLeft(period);
      setResult(null);
      setProfitAmount(0);
      setNewBalance(0);
      setIsResolving(false);
      resolvedRef.current = false;
    }
  }, [isOpen, tradeId, period]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || result !== null) return;

    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, result, timeLeft]);

  // Resolve trade when countdown reaches 0
  const resolveTrade = useCallback(async () => {
    if (resolvedRef.current || isResolving) return;
    resolvedRef.current = true;
    setIsResolving(true);

    try {
      const res = await fetch('/api/trades/timed/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Resolve error:', data.error);
        setResult('lose');
        return;
      }

      setResult(data.result);
      setProfitAmount(data.profitAmount || 0);
      setNewBalance(data.newBalance || 0);
      onComplete(data);
    } catch (error) {
      console.error('Resolve fetch error:', error);
      setResult('lose');
    } finally {
      setIsResolving(false);
    }
  }, [tradeId, onComplete, isResolving]);

  useEffect(() => {
    if (timeLeft === 0 && !resolvedRef.current) {
      resolveTrade();
    }
  }, [timeLeft, resolveTrade]);

  if (!isOpen) return null;

  const progressPercent = period > 0 ? ((period - timeLeft) / period) * 100 : 0;

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const isBuy = tradeType === 'buy';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Popup */}
      <div className="relative w-full max-w-sm glass-card border border-white/10 shadow-2xl">
        {/* Close button (only show after result) */}
        {result && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors z-10"
          >
            <X size={18} className="text-gray-400" />
          </button>
        )}

        <div className="p-6 text-center space-y-4">
          {/* Trade info */}
          <div className="space-y-1">
            <p className="text-xs text-gray-400">
              {isBuy ? 'Buy' : 'Sell'} {cryptoSymbol} · {period}s
            </p>
            <p className="text-lg font-bold">{amount.toLocaleString()} USDT</p>
          </div>

          {/* Countdown / Result */}
          {result === null ? (
            <>
              {/* Timer */}
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={isBuy ? '#22c55e' : '#ef4444'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - progressPercent / 100)}`}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {isResolving ? (
                    <Loader2 className="animate-spin text-accent" size={28} />
                  ) : (
                    <>
                      <p className="text-3xl font-bold tabular-nums">{formatTime(timeLeft)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">remaining</p>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Potential profit: <span className="text-success">+{((amount * profitPercent) / 100).toLocaleString()} USDT</span>
              </p>
            </>
          ) : (
            <>
              {/* Result */}
              <div className={`py-6 ${result === 'win' ? 'text-success' : 'text-danger'}`}>
                {result === 'win' ? (
                  <Trophy size={56} className="mx-auto mb-3" />
                ) : (
                  <XCircle size={56} className="mx-auto mb-3" />
                )}
                <p className="text-3xl font-black uppercase tracking-wider">
                  {result === 'win' ? 'WIN' : 'LOSE'}
                </p>
              </div>

              {result === 'win' ? (
                <div className="space-y-1">
                  <p className="text-success text-lg font-bold">
                    +{profitAmount.toLocaleString()} USDT
                  </p>
                  <p className="text-xs text-gray-400">
                    New balance: {newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-danger text-lg font-bold">
                    -{amount.toLocaleString()} USDT
                  </p>
                  <p className="text-xs text-gray-400">
                    New balance: {newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
