'use client';

import { useState, useMemo } from 'react';
import { X, Clock, DollarSign, AlertCircle } from 'lucide-react';

const PERIODS = [
  { seconds: 30,  profitPercent: 10,  minAmount: 100 },
  { seconds: 60,  profitPercent: 15,  minAmount: 10000 },
  { seconds: 90,  profitPercent: 20,  minAmount: 30000 },
  { seconds: 120, profitPercent: 40,  minAmount: 50000 },
  { seconds: 180, profitPercent: 60,  minAmount: 100000 },
  { seconds: 300, profitPercent: 80,  minAmount: 250000 },
  { seconds: 600, profitPercent: 120, minAmount: 1000000 },
] as const;

const QUICK_AMOUNTS = [100, 10000, 30000, 50000, 100000, 250000, 1000000] as const;

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeType: 'buy' | 'sell';
  cryptoSymbol: string;
  walletBalance: number;
  onConfirm: (period: number, amount: number, profitPercent: number) => void;
}

export default function TradeModal({
  isOpen,
  onClose,
  tradeType,
  cryptoSymbol,
  walletBalance,
  onConfirm,
}: TradeModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [amount, setAmount] = useState('');

  const parsedAmount = Number(amount) || 0;

  const selectedPeriodConfig = useMemo(
    () => PERIODS.find((p) => p.seconds === selectedPeriod),
    [selectedPeriod]
  );

  const minAmount = selectedPeriodConfig?.minAmount ?? 0;

  const validation = useMemo(() => {
    if (!selectedPeriod) return { valid: false, message: 'Select a time period' };
    if (!parsedAmount || parsedAmount <= 0) return { valid: false, message: 'Enter an amount' };
    if (parsedAmount < minAmount)
      return { valid: false, message: `Minimum ${minAmount.toLocaleString()} USDT for ${selectedPeriod}s` };
    if (parsedAmount > walletBalance)
      return { valid: false, message: 'Insufficient balance' };
    return { valid: true, message: '' };
  }, [selectedPeriod, parsedAmount, minAmount, walletBalance]);

  const potentialProfit = useMemo(() => {
    if (!selectedPeriodConfig || !parsedAmount) return 0;
    return (parsedAmount * selectedPeriodConfig.profitPercent) / 100;
  }, [selectedPeriodConfig, parsedAmount]);

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleConfirm = () => {
    if (!validation.valid || !selectedPeriodConfig) return;
    onConfirm(selectedPeriodConfig.seconds, parsedAmount, selectedPeriodConfig.profitPercent);
    // Reset state
    setSelectedPeriod(null);
    setAmount('');
  };

  const handleClose = () => {
    setSelectedPeriod(null);
    setAmount('');
    onClose();
  };

  if (!isOpen) return null;

  const isBuy = tradeType === 'buy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isBuy ? 'bg-success' : 'bg-danger'}`} />
            <h2 className="text-lg font-bold">
              {isBuy ? 'Buy' : 'Sell'} {cryptoSymbol}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Period Selection */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={14} className="text-accent" />
              <p className="text-xs font-semibold text-gray-300">Select Period</p>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {PERIODS.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => setSelectedPeriod(p.seconds)}
                  className={`py-2 px-1 rounded-lg text-center transition-all border ${
                    selectedPeriod === p.seconds
                      ? 'border-accent bg-accent/20 text-white'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <p className="text-xs font-bold">{p.seconds}s</p>
                  <p className="text-[10px] text-accent mt-0.5">+{p.profitPercent}%</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Amount Selection */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign size={14} className="text-accent" />
              <p className="text-xs font-semibold text-gray-300">Quick Select Amount</p>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  onClick={() => handleQuickAmount(val)}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-medium transition-all border ${
                    parsedAmount === val
                      ? 'border-accent bg-accent/20 text-white'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {val >= 1000 ? `${(val / 1000).toLocaleString()}K` : val}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div>
            <input
              type="number"
              placeholder="Please enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-sm placeholder-gray-500"
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[11px] text-gray-400">
                Balance: <span className="text-white font-medium">{walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</span>
              </p>
              {selectedPeriodConfig && (
                <p className="text-[11px] text-gray-400">
                  Min: <span className="text-yellow-400">{minAmount.toLocaleString()} USDT</span>
                </p>
              )}
            </div>
          </div>

          {/* Potential Profit */}
          {parsedAmount > 0 && selectedPeriodConfig && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Amount</span>
                <span className="text-white">{parsedAmount.toLocaleString()} USDT</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-400">Period</span>
                <span className="text-white">{selectedPeriodConfig.seconds}s ({selectedPeriodConfig.profitPercent}%)</span>
              </div>
              <div className="flex justify-between text-xs mt-1 pt-1 border-t border-white/10">
                <span className="text-gray-400">Potential Profit</span>
                <span className="text-success font-semibold">+{potentialProfit.toLocaleString()} USDT</span>
              </div>
            </div>
          )}

          {/* Validation Message */}
          {!validation.valid && validation.message && parsedAmount > 0 && (
            <div className="flex items-center gap-1.5 text-yellow-400 text-[11px]">
              <AlertCircle size={12} />
              <span>{validation.message}</span>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={!validation.valid}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
              validation.valid
                ? isBuy
                  ? 'bg-success hover:bg-success/80 text-white'
                  : 'bg-danger hover:bg-danger/80 text-white'
                : 'bg-white/10 text-gray-500 cursor-not-allowed'
            }`}
          >
            Confirm Order
          </button>
        </div>
      </div>
    </div>
  );
}
