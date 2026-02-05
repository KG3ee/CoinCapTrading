"use client";

import Image from 'next/image';
import { ArrowDownToLine, ArrowUpRight, Copy, Plus } from 'lucide-react';
import { useCoinCapPrices } from '@/lib/hooks/useCoinCapPrices';

const formatUsd = (value: number) => {
  if (Number.isNaN(value)) return '$0.00';
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
};

const formatChange = (value: number) => {
  if (Number.isNaN(value)) return '+0.00%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const walletSummary = [
  { label: 'Total Balance', value: '$24,567.89', change: '+12.5%', isUp: true },
  { label: 'Available', value: '$18,442.10', change: '+4.1%', isUp: true },
  { label: 'In Orders', value: '$3,927.45', change: '-1.2%', isUp: false },
  { label: 'Rewards', value: '$2,198.34', change: '+0.8%', isUp: true },
];

const assets = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', balance: 0.8245, value: '$35,714.12', change: '+2.4%', isUp: true, logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', balance: 6.12, value: '$13,957.90', change: '+1.3%', isUp: true, logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', balance: 84.5, value: '$8,344.10', change: '-0.8%', isUp: false, logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', balance: 4560, value: '$2,080.45', change: '+3.6%', isUp: true, logo: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
];

const activity = [
  { id: 1, type: 'Deposit', asset: 'USDT', amount: '+1,500.00', time: '10m ago', status: 'Completed' },
  { id: 2, type: 'Withdraw', asset: 'BTC', amount: '-0.025', time: '45m ago', status: 'Processing' },
  { id: 3, type: 'Transfer', asset: 'ETH', amount: '-1.20', time: '2h ago', status: 'Completed' },
  { id: 4, type: 'Reward', asset: 'BNB', amount: '+4.50', time: '1d ago', status: 'Completed' },
];

export default function WalletPage() {
  const { prices } = useCoinCapPrices(assets.map((asset) => asset.id));
  const liveAssets = assets.map((asset) => {
    const live = prices[asset.id];
    if (!live) return asset;
    const liveValue = asset.balance * live.priceUsd;
    return {
      ...asset,
      value: formatUsd(liveValue),
      change: formatChange(live.changePercent24Hr),
      isUp: live.changePercent24Hr >= 0,
    };
  });

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
          <p className="text-sm text-gray-400">Manage balances, deposits, and withdrawals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm min-h-[44px] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <Copy size={16} />
            Deposit Address
          </button>
          <button className="px-4 py-2 rounded-lg bg-accent text-white text-sm min-h-[44px] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <Plus size={16} />
            Add Funds
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {walletSummary.map((stat) => (
          <div key={stat.label} className="glass-card">
            <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
            <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
            <p className={`text-xs ${stat.isUp ? 'text-success' : 'text-danger'}`}>{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Assets</h2>
            <button className="text-xs text-gray-400 hover:text-white">View All</button>
          </div>

          <div className="space-y-3">
            {liveAssets.map((asset) => (
              <div key={asset.symbol} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <Image
                      src={asset.logo}
                      alt={asset.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                      priority={false}
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{asset.name}</p>
                    <p className="text-xs text-gray-400">{asset.symbol}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Balance</p>
                    <p className="font-semibold">{asset.balance.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Value</p>
                    <p className="font-semibold">{asset.value}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">24h</p>
                    <p className={`font-semibold ${asset.isUp ? 'text-success' : 'text-danger'}`}>{asset.change}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    Deposit
                  </button>
                  <button className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 rounded-lg bg-success text-white flex items-center justify-between min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                Deposit
                <ArrowDownToLine size={18} />
              </button>
              <button className="w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-between min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                Withdraw
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>

          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5">
                  <div>
                    <p className="font-semibold">{item.type}</p>
                    <p className="text-xs text-gray-400">{item.asset} • {item.time}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${item.amount.startsWith('+') ? 'text-success' : 'text-danger'}`}>{item.amount}</p>
                    <p className="text-xs text-gray-400">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
