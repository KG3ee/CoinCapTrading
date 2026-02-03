'use client';

import { TrendingUp, TrendingDown, BarChart3, DollarSign, Activity } from 'lucide-react';
import Image from 'next/image';

export default function HomePage() {
  const cryptoPrices = [
    { name: 'Bitcoin', symbol: 'BTC', price: '43,250.00', change: '+2.5', isUp: true, logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
    { name: 'Ethereum', symbol: 'ETH', price: '2,280.50', change: '+1.8', isUp: true, logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
    { name: 'Ripple', symbol: 'XRP', price: '0.5234', change: '-0.9', isUp: false, logo: 'https://assets.coingecko.com/coins/images/44/large/xrp.png' },
    { name: 'Cardano', symbol: 'ADA', price: '0.4567', change: '+3.2', isUp: true, logo: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
    { name: 'Solana', symbol: 'SOL', price: '98.75', change: '-1.2', isUp: false, logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
    { name: 'Polkadot', symbol: 'DOT', price: '6.89', change: '+0.5', isUp: true, logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' },
  ];

  const recentTransactions = [
    { id: 1, type: 'Buy', coin: 'BTC', amount: '0.025', price: '$1,081.25', time: '2m ago', status: 'Completed' },
    { id: 2, type: 'Sell', coin: 'ETH', amount: '1.5', price: '$3,420.75', time: '15m ago', status: 'Completed' },
    { id: 3, type: 'Buy', coin: 'SOL', amount: '10', price: '$987.50', time: '1h ago', status: 'Pending' },
    { id: 4, type: 'Sell', coin: 'ADA', amount: '500', price: '$228.35', time: '2h ago', status: 'Completed' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Price Ticker */}
      <div className="glass-card overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          {cryptoPrices.slice(0, 4).map((crypto) => (
            <div key={crypto.symbol} className="flex items-center gap-3">
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src={crypto.logo}
                  alt={crypto.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover"
                  priority={false}
                />
              </div>
              <div>
                <p className="text-xs text-gray-400">{crypto.symbol}</p>
                <p className="text-sm font-semibold">${crypto.price}</p>
              </div>
              <span className={`text-xs flex items-center gap-1 ${crypto.isUp ? 'text-success' : 'text-danger'}`}>
                {crypto.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {crypto.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Total Balance</p>
            <DollarSign size={16} className="text-accent" />
          </div>
          <p className="text-xl md:text-2xl font-bold">$24,567.89</p>
          <p className="text-xs text-success">+12.5% ($2,731.00)</p>
        </div>
        
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">24h Volume</p>
            <BarChart3 size={16} className="text-purple-400" />
          </div>
          <p className="text-xl md:text-2xl font-bold">$8,429.12</p>
          <p className="text-xs text-gray-400">15 Transactions</p>
        </div>
        
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Top Gainer</p>
            <TrendingUp size={16} className="text-success" />
          </div>
          <p className="text-xl md:text-2xl font-bold">ADA</p>
          <p className="text-xs text-success">+3.2%</p>
        </div>
        
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Active Orders</p>
            <Activity size={16} className="text-blue-400" />
          </div>
          <p className="text-xl md:text-2xl font-bold">7</p>
          <p className="text-xs text-gray-400">3 Pending</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart Section - Full width on mobile, 2/3 on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trading Chart */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">BTC/USD</h2>
              <div className="flex gap-2">
                <button className="text-xs px-3 py-1 rounded bg-accent text-white min-h-[32px]">1H</button>
                <button className="text-xs px-3 py-1 rounded bg-white/5 hover:bg-white/10 min-h-[32px]">24H</button>
                <button className="text-xs px-3 py-1 rounded bg-white/5 hover:bg-white/10 min-h-[32px]">7D</button>
                <button className="text-xs px-3 py-1 rounded bg-white/5 hover:bg-white/10 min-h-[32px]">1M</button>
              </div>
            </div>
            
            {/* TradingView Chart Placeholder */}
            <div className="relative w-full h-64 md:h-96 bg-black/20 rounded-lg border border-white/5 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 size={48} className="mx-auto mb-2 text-gray-600" />
                <p className="text-gray-500 text-sm">TradingView Chart</p>
                <p className="text-xs text-gray-600 mt-1">Integrate with TradingView Widget</p>
              </div>
            </div>
          </div>

          {/* Market Prices - 2 Column Grid on Mobile */}
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4">Market Prices</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cryptoPrices.map((crypto) => (
                <div
                  key={crypto.symbol}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <Image
                        src={crypto.logo}
                        alt={crypto.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                        priority={false}
                      />
                    </div>
                    <div>
                      <p className="font-semibold">{crypto.symbol}</p>
                      <p className="text-xs text-gray-400">{crypto.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${crypto.price}</p>
                    <p className={`text-xs flex items-center gap-1 justify-end ${crypto.isUp ? 'text-success' : 'text-danger'}`}>
                      {crypto.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {crypto.change}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Trade Section - Full width on mobile, 1/3 on desktop */}
        <div className="space-y-6">
          {/* Buy/Sell Form */}
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4">Quick Trade</h2>
            
            <div className="flex gap-2 mb-4">
              <button className="flex-1 py-2 rounded-lg bg-success text-white font-medium min-h-[44px]">
                Buy
              </button>
              <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 font-medium min-h-[44px]">
                Sell
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-2">Select Coin</label>
                <select className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none min-h-[44px]">
                  <option>Bitcoin (BTC)</option>
                  <option>Ethereum (ETH)</option>
                  <option>Ripple (XRP)</option>
                  <option>Cardano (ADA)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Price (USD)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-white/10">
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-lg font-bold">$0.00</p>
              </div>

              <button className="w-full py-3 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 font-semibold transition-all min-h-[44px]">
                Place Buy Order
              </button>
            </div>
          </div>

          {/* Order Book Preview */}
          <div className="glass-card hidden lg:block">
            <h2 className="text-sm font-semibold mb-3">Order Book</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-400 pb-2 border-b border-white/10">
                <span>Price</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between text-danger">
                <span>43,251.20</span>
                <span>0.125</span>
              </div>
              <div className="flex justify-between text-danger">
                <span>43,250.80</span>
                <span>0.340</span>
              </div>
              <div className="flex justify-between text-danger">
                <span>43,250.50</span>
                <span>0.567</span>
              </div>
              <div className="py-2 border-y border-white/10 text-center font-bold">
                43,250.00
              </div>
              <div className="flex justify-between text-success">
                <span>43,249.50</span>
                <span>0.234</span>
              </div>
              <div className="flex justify-between text-success">
                <span>43,249.20</span>
                <span>0.890</span>
              </div>
              <div className="flex justify-between text-success">
                <span>43,248.80</span>
                <span>0.456</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions - List View on Mobile, Table on Desktop */}
      <div className="glass-card">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        
        {/* Mobile List View */}
        <div className="md:hidden space-y-3">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="p-3 rounded-lg bg-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${tx.type === 'Buy' ? 'text-success' : 'text-danger'}`}>
                  {tx.type} {tx.coin}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${tx.status === 'Completed' ? 'bg-success/20 text-success' : 'bg-yellow-500/20 text-yellow-500'}`}>
                  {tx.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Amount:</span>
                <span className="font-medium">{tx.amount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Price:</span>
                <span className="font-medium">{tx.price}</span>
              </div>
              <div className="text-xs text-gray-400 text-right">{tx.time}</div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                <th className="pb-3">Type</th>
                <th className="pb-3">Coin</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Time</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className={`py-3 font-semibold ${tx.type === 'Buy' ? 'text-success' : 'text-danger'}`}>
                    {tx.type}
                  </td>
                  <td className="py-3">{tx.coin}</td>
                  <td className="py-3">{tx.amount}</td>
                  <td className="py-3">{tx.price}</td>
                  <td className="py-3 text-gray-400">{tx.time}</td>
                  <td className="py-3">
                    <span className={`text-xs px-3 py-1 rounded ${tx.status === 'Completed' ? 'bg-success/20 text-success' : 'bg-yellow-500/20 text-yellow-500'}`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Button for Mobile Quick Trade */}
      <button className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-accent to-purple-500 shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform">
        <DollarSign size={24} />
      </button>
    </div>
  );
}
