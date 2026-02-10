'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  BarChart3,
  TrendingDown,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  RefreshCw,
  Loader2,
  ChevronDown,
  X,
} from 'lucide-react';
import { fetchRealCryptoData, formatPrice, formatLargeNumber } from '@/lib/mockCryptoData';
import { useSession, signOut } from 'next-auth/react';
import { DEPOSIT_WALLET_OPTIONS, FUNDING_NETWORKS_BY_ASSET, SUPPORTED_FUNDING_ASSETS } from '@/lib/constants/funding';

interface Holding {
  cryptoSymbol: string;
  amount: number;
  averageBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface Trade {
  _id: string;
  type: 'buy' | 'sell';
  cryptoSymbol: string;
  amount: number;
  pricePerUnit: number;
  totalValue: number;
  transactionId: string;
  createdAt: string;
}

interface WalletData {
  portfolio: {
    accountBalance: number;
    totalPortfolioValue: number;
    totalInvested: number;
    totalReturns: number;
    holdings: Holding[];
  };
  trades: Trade[];
  stats: {
    totalHoldings: number;
    totalTrades: number;
  };
}

interface FundingRequestItem {
  id: string;
  requestId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  asset: string;
  network: string;
  platformWalletAddress?: string;
  senderWalletAddress?: string;
  proofImageName?: string;
  hasProofImage?: boolean;
  address?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: string;
  resolvedAt?: string | null;
}

type TabType = 'overview' | 'assets' | 'transactions' | 'swap';

const SWAP_COINS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'TRX', name: 'TRON' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'BCH', name: 'Bitcoin Cash' },
  { symbol: 'UNI', name: 'Uniswap' },
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'NEAR', name: 'NEAR Protocol' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'XLM', name: 'Stellar' },
  { symbol: 'ATOM', name: 'Cosmos' },
  { symbol: 'ICP', name: 'Internet Computer' },
  { symbol: 'FIL', name: 'Filecoin' },
  { symbol: 'APT', name: 'Aptos' },
  { symbol: 'ARB', name: 'Arbitrum' },
  { symbol: 'OP', name: 'Optimism' },
  { symbol: 'HBAR', name: 'Hedera' },
  { symbol: 'ALGO', name: 'Algorand' },
  { symbol: 'VET', name: 'VeChain' },
  { symbol: 'RNDR', name: 'Render' },
  { symbol: 'SUI', name: 'Sui' },
  { symbol: 'PEPE', name: 'Pepe' },
  { symbol: 'PAXG', name: 'Pax Gold (Gold)' },
  { symbol: 'USDT', name: 'Tether' },
];

export default function WalletPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [data, setData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [fundingRequests, setFundingRequests] = useState<FundingRequestItem[]>([]);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [fundingError, setFundingError] = useState('');
  const [fundingSuccess, setFundingSuccess] = useState('');
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [fundingType, setFundingType] = useState<'deposit' | 'withdraw'>('deposit');
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingSubmitting, setFundingSubmitting] = useState(false);
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [fundingAsset, setFundingAsset] = useState<string>('USDT');
  const [fundingNetwork, setFundingNetwork] = useState<string>('TRC20');
  const [fundingPlatformWalletId, setFundingPlatformWalletId] = useState<string>('');
  const [fundingSenderWalletAddress, setFundingSenderWalletAddress] = useState('');
  const [fundingProofImageData, setFundingProofImageData] = useState('');
  const [fundingProofImageName, setFundingProofImageName] = useState('');
  const [withdrawPassword, setWithdrawPassword] = useState('');

  const availableFundingNetworks = FUNDING_NETWORKS_BY_ASSET[fundingAsset] || [];
  const availableDepositWallets = DEPOSIT_WALLET_OPTIONS.filter(
    (item) => item.asset === fundingAsset && item.network === fundingNetwork
  );

  const resetFundingForm = () => {
    setFundingAmount('');
    setFundingSenderWalletAddress('');
    setFundingProofImageData('');
    setFundingProofImageName('');
    setWithdrawPassword('');
    setFundingError('');
    setFundingSuccess('');
  };

  // Swap state
  const [swapFrom, setSwapFrom] = useState('USDT');
  const [swapTo, setSwapTo] = useState('BTC');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapPreview, setSwapPreview] = useState<{ rate: number; receiveAmount: number; fee: number; feeRate: number } | null>(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState('');
  const [swapSuccess, setSwapSuccess] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Calculate trading analytics
  const calculateAnalytics = (trades: Trade[]) => {
    const buyTrades = trades.filter(t => t.type === 'buy');
    const sellTrades = trades.filter(t => t.type === 'sell');
    
    const totalBuyValue = buyTrades.reduce((sum, t) => sum + t.totalValue, 0);
    const totalSellValue = sellTrades.reduce((sum, t) => sum + t.totalValue, 0);
    const totalTradingValue = totalBuyValue + totalSellValue;
    
    const avgTradeValue = trades.length > 0 ? totalTradingValue / trades.length : 0;
    const winRate = trades.length > 0 ? (sellTrades.length / trades.length) * 100 : 0;
    
    const cryptoPerformance = new Map<string, { gainLoss: number; count: number }>();
    trades.forEach(trade => {
      const key = trade.cryptoSymbol;
      const current = cryptoPerformance.get(key) || { gainLoss: 0, count: 0 };
      cryptoPerformance.set(key, {
        gainLoss: current.gainLoss + (trade.type === 'buy' ? -trade.totalValue : trade.totalValue),
        count: current.count + 1,
      });
    });
    
    let bestCrypto = '';
    let bestGainLoss = -Infinity;
    let worstCrypto = '';
    let worstGainLoss = Infinity;
    
    cryptoPerformance.forEach((value, key) => {
      if (value.gainLoss > bestGainLoss) {
        bestGainLoss = value.gainLoss;
        bestCrypto = key;
      }
      if (value.gainLoss < worstGainLoss) {
        worstGainLoss = value.gainLoss;
        worstCrypto = key;
      }
    });
    
    return {
      totalBuyValue,
      totalSellValue,
      avgTradeValue,
      winRate,
      bestCrypto,
      bestGainLoss,
      worstCrypto,
      worstGainLoss,
      buyCount: buyTrades.length,
      sellCount: sellTrades.length,
    };
  };

  // Swap functions
  const fetchSwapPreview = async () => {
    if (!swapAmount || Number(swapAmount) <= 0 || swapFrom === swapTo) return;
    setPreviewLoading(true);
    setSwapError('');
    try {
      const params = new URLSearchParams({ from: swapFrom, to: swapTo, amount: swapAmount });
      const res = await fetch(`/api/wallet/swap?${params}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to get rate');
      setSwapPreview(d);
    } catch (err: any) {
      setSwapError(err.message);
      setSwapPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!swapAmount || Number(swapAmount) <= 0 || swapFrom === swapTo) return;
    setSwapLoading(true);
    setSwapError('');
    setSwapSuccess('');
    try {
      const res = await fetch('/api/wallet/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: swapFrom, to: swapTo, amount: Number(swapAmount) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Swap failed');
      setSwapSuccess(`Swapped ${d.amountSent} ${swapFrom} → ${d.amountReceived.toFixed(6)} ${swapTo} (fee: ${d.fee.toFixed(4)} ${swapFrom})`);
      setSwapAmount('');
      setSwapPreview(null);
      // Reload wallet data
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const dashboardData = await response.json();
        const realCryptos = await fetchRealCryptoData();
        const enrichedHoldings = dashboardData.portfolio.holdings.map((holding: Holding) => {
          const realCrypto = realCryptos.find((c: any) => c.symbol === holding.cryptoSymbol);
          return { ...holding, currentPrice: realCrypto?.currentPrice || holding.currentPrice, totalValue: holding.amount * (realCrypto?.currentPrice || holding.currentPrice) };
        });
        setData({ ...dashboardData, portfolio: { ...dashboardData.portfolio, holdings: enrichedHoldings } });
      }
      setTimeout(() => setSwapSuccess(''), 5000);
    } catch (err: any) {
      setSwapError(err.message);
    } finally {
      setSwapLoading(false);
    }
  };

  const flipSwap = () => {
    const temp = swapFrom;
    setSwapFrom(swapTo);
    setSwapTo(temp);
    setSwapPreview(null);
  };

  const loadWalletData = async () => {
    try {
      if (status !== 'authenticated') {
        return;
      }

      const response = await fetch('/api/dashboard', {
        method: 'GET',
      });

      if (response.status === 401) {
        await signOut({ redirect: false });
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load wallet');
      } else {
        const dashboardData = await response.json();

        const realCryptos = await fetchRealCryptoData();
        const enrichedHoldings = dashboardData.portfolio.holdings.map((holding: Holding) => {
          const realCrypto = realCryptos.find(c => c.symbol === holding.cryptoSymbol);
          return {
            ...holding,
            currentPrice: realCrypto?.currentPrice || holding.currentPrice,
            totalValue: holding.amount * (realCrypto?.currentPrice || holding.currentPrice),
          };
        });

        setData({
          ...dashboardData,
          portfolio: {
            ...dashboardData.portfolio,
            holdings: enrichedHoldings,
          },
        });
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      setError('Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFundingRequests = async () => {
    setFundingLoading(true);
    try {
      const res = await fetch('/api/wallet/funding');
      if (res.ok) {
        const d = await res.json();
        setFundingRequests(d.requests || []);
      }
    } catch {
      // silent
    }
    setFundingLoading(false);
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const d = await res.json();
        setWithdrawalAddress(d.user?.withdrawalAddress || '');
      }
    } catch {
      // silent
    }
  };

  const submitFundingRequest = async () => {
    setFundingError('');
    setFundingSuccess('');
    const parsedAmount = Number(fundingAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFundingError('Enter a valid amount');
      return;
    }
    if (!SUPPORTED_FUNDING_ASSETS.includes(fundingAsset as any)) {
      setFundingError('Choose a valid crypto type');
      return;
    }
    if (!fundingNetwork) {
      setFundingError('Choose a network');
      return;
    }
    if (fundingType === 'deposit') {
      if (!fundingPlatformWalletId) {
        setFundingError('Choose a platform wallet address');
        return;
      }
      if (!fundingProofImageData) {
        setFundingError('Upload proof image for deposit');
        return;
      }
    }
    if (fundingType === 'withdraw' && !withdrawalAddress) {
      setFundingError('Set a withdrawal address before withdrawing');
      return;
    }
    if (fundingType === 'withdraw' && !withdrawPassword) {
      setFundingError('Enter your password to submit withdrawal');
      return;
    }
    setFundingSubmitting(true);
    try {
      const res = await fetch('/api/wallet/funding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: fundingType,
          amount: parsedAmount,
          asset: fundingAsset,
          network: fundingNetwork,
          platformWalletId: fundingPlatformWalletId,
          senderWalletAddress: fundingSenderWalletAddress,
          proofImageData: fundingProofImageData,
          proofImageName: fundingProofImageName,
          withdrawPassword,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to submit request');
      setFundingSuccess('Request submitted. Processing may take a few minutes.');
      resetFundingForm();
      setShowFundingModal(false);
      loadFundingRequests();
      loadWalletData();
    } catch (err: any) {
      setFundingError(err.message || 'Failed to submit request');
    } finally {
      setFundingSubmitting(false);
    }
  };

  const handleFundingProofFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFundingError('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFundingError('Image must be 5MB or less');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFundingProofImageData(reader.result as string);
      setFundingProofImageName(file.name);
      setFundingError('');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    loadWalletData();
    loadFundingRequests();
    loadProfile();
  }, [router, status]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'deposit' || action === 'withdraw') {
      resetFundingForm();
      setFundingType(action);
      if (action === 'deposit') {
        setFundingAsset('USDT');
        setFundingNetwork('TRC20');
      } else {
        setFundingAsset('USDT');
        setFundingNetwork('TRC20');
      }
      setShowFundingModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (availableFundingNetworks.length === 0) return;
    if (!availableFundingNetworks.includes(fundingNetwork)) {
      setFundingNetwork(availableFundingNetworks[0]);
    }
  }, [fundingAsset, fundingNetwork, availableFundingNetworks]);

  useEffect(() => {
    if (fundingType !== 'deposit') return;
    if (availableDepositWallets.length === 0) {
      setFundingPlatformWalletId('');
      return;
    }
    const exists = availableDepositWallets.some(item => item.id === fundingPlatformWalletId);
    if (!exists) {
      setFundingPlatformWalletId(availableDepositWallets[0].id);
    }
  }, [fundingType, availableDepositWallets, fundingPlatformWalletId]);

  if (isLoading) {
    return (
      <div className="bg-background p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Loader className="animate-spin text-accent mx-auto" size={40} />
            <p className="text-gray-400">Loading your wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-accent hover:text-accent/80 mb-6 transition"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <div className="glass-card p-6 border border-red-500/30 bg-red-500/10">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Error</h2>
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const analytics = calculateAnalytics(data.trades);
  const totalPortfolioValue = data.portfolio.totalPortfolioValue;
  const totalInvested = data.portfolio.totalInvested;
  const totalReturns = data.portfolio.totalReturns;
  const isPositive = totalReturns >= 0;

  // Tab styles
  const tabClass = (tab: TabType) => `
    px-3 sm:px-4 py-2.5 font-semibold text-sm sm:text-base transition-all border-b-2 whitespace-nowrap shrink-0
    ${activeTab === tab 
      ? 'border-accent text-accent' 
      : 'border-transparent text-gray-400 hover:text-white'
    }
  `;

  return (
    <div className="bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Wallet</h1>
            <p className="text-gray-400">Manage your crypto assets and view trading history</p>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            {showBalance ? (
              <Eye size={24} className="text-accent" />
            ) : (
              <EyeOff size={24} className="text-gray-400" />
            )}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Account Balance */}
          <div className="glass-card p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">Available Balance</p>
            <p className="text-3xl font-bold text-white">
              {showBalance ? formatPrice(data.portfolio.accountBalance) : '••••••'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  resetFundingForm();
                  setFundingType('deposit');
                  setFundingAsset('USDT');
                  setFundingNetwork('TRC20');
                  setShowFundingModal(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-white text-xs font-semibold transition-colors"
              >
                Deposit
              </button>
              <button
                onClick={() => {
                  resetFundingForm();
                  setFundingType('withdraw');
                  setFundingAsset('USDT');
                  setFundingNetwork('TRC20');
                  setShowFundingModal(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors border border-white/10"
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Portfolio Value */}
          <div className="glass-card p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">Total Portfolio Value</p>
            <p className="text-3xl font-bold text-white">
              {showBalance ? formatPrice(totalPortfolioValue) : '••••••'}
            </p>
            <p className="text-xs text-gray-400 mt-2">{data.stats.totalHoldings} assets</p>
          </div>

          {/* Total Returns */}
          <div className="glass-card p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">Total Returns</p>
            <div className="flex items-end gap-2">
              <p className={`text-3xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {showBalance ? formatPrice(totalReturns) : '••••••'}
              </p>
              {isPositive ? (
                <TrendingUp size={20} className="text-green-400 mb-1" />
              ) : (
                <TrendingDown size={20} className="text-red-400 mb-1" />
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-white/10 flex gap-2 sm:gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={tabClass('overview')}
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={18} />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={tabClass('assets')}
          >
            <div className="flex items-center gap-2">
              <ArrowUpRight size={18} />
              Assets
            </div>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={tabClass('transactions')}
          >
            <div className="flex items-center gap-2">
              <ArrowDownLeft size={18} />
              Transactions
            </div>
          </button>
          <button
            onClick={() => setActiveTab('swap')}
            className={tabClass('swap')}
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={18} />
              Swap
            </div>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Trading Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Total Trades</p>
                <p className="text-2xl font-bold text-white">{data.stats.totalTrades}</p>
              </div>
              <div className="glass-card p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Win Rate</p>
                <p className="text-2xl font-bold text-white">{analytics.winRate.toFixed(1)}%</p>
              </div>
              <div className="glass-card p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Best Performer</p>
                <p className="text-2xl font-bold text-green-400">{analytics.bestCrypto || 'N/A'}</p>
              </div>
              <div className="glass-card p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Avg Trade Value</p>
                <p className="text-2xl font-bold text-white">{formatPrice(analytics.avgTradeValue)}</p>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="glass-card border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Asset</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Amount</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Avg Price</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Current Price</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Total Value</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.portfolio.holdings.map((holding, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-4 font-semibold text-white">{holding.cryptoSymbol}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{holding.amount.toFixed(6)}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{formatPrice(holding.averageBuyPrice)}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{formatPrice(holding.currentPrice)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-white">{formatPrice(holding.totalValue)}</td>
                        <td className={`px-6 py-4 text-right font-semibold ${holding.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {holding.gainLoss >= 0 ? '+' : ''}{formatPrice(holding.gainLoss)} ({holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-6">
            {/* Assets Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-6 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Total Assets Value</p>
                <p className="text-3xl font-bold text-white">{formatPrice(data.portfolio.holdings.reduce((sum, h) => sum + h.totalValue, 0))}</p>
                <p className="text-xs text-gray-400 mt-2">{data.stats.totalHoldings} assets</p>
              </div>
              <div className="glass-card p-6 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Available Balance</p>
                <p className="text-3xl font-bold text-white">{formatPrice(data.portfolio.accountBalance)}</p>
                <p className="text-xs text-gray-400 mt-2">Ready to trade</p>
              </div>
            </div>

            {/* Assets Table */}
            <div className="glass-card border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Symbol</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Quantity</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Price</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Value</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Change 24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.portfolio.holdings.map((holding, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-4 font-semibold text-white">{holding.cryptoSymbol}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{holding.amount.toFixed(6)}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{formatPrice(holding.currentPrice)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-white">{formatPrice(holding.totalValue)}</td>
                        <td className={`px-6 py-4 text-right font-semibold ${holding.gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Funding Requests */}
            <div className="glass-card border border-white/10">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Funding Requests</h3>
                <button
                  onClick={loadFundingRequests}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={14} className="text-gray-400" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {fundingLoading ? (
                  <p className="text-xs text-gray-500">Loading requests...</p>
                ) : fundingRequests.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No funding requests yet</p>
                ) : (
                  fundingRequests.map(req => (
                    <div key={req.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {req.type.toUpperCase()} {req.amount.toLocaleString()} {req.asset}
                          </p>
                          <p className="text-[10px] text-gray-400">#{req.requestId} · {req.network}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          req.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                        <span>{new Date(req.createdAt).toLocaleString()}</span>
                        {req.type === 'deposit' && req.platformWalletAddress && <span>To: {req.platformWalletAddress}</span>}
                        {req.type === 'withdraw' && req.address && <span>To: {req.address}</span>}
                        {req.hasProofImage && <span>Proof attached</span>}
                        {req.reason && <span>Reason: {req.reason}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Transactions Table */}
            <div className="glass-card border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Asset</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Amount</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Price</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Total</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trades.slice(0, 20).map((trade) => (
                      <tr key={trade._id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {trade.type === 'buy' ? (
                              <ArrowDownLeft className="w-4 h-4 text-green-400" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-red-400" />
                            )}
                            <span className="capitalize font-semibold">{trade.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">{trade.cryptoSymbol}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{trade.amount.toFixed(6)}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{formatPrice(trade.pricePerUnit)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-white">{formatPrice(trade.totalValue)}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{new Date(trade.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Swap Tab */}
        {activeTab === 'swap' && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="glass-card border border-white/10 p-5 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ArrowLeftRight size={16} className="text-accent" /> Convert Crypto
              </h3>
              <p className="text-[11px] text-gray-400">Instantly swap between supported coins at live market rates. 0.5% conversion fee applies.</p>

              {swapError && <div className="p-2.5 rounded-lg bg-danger/20 text-danger text-xs">{swapError}</div>}
              {swapSuccess && <div className="p-2.5 rounded-lg bg-success/20 text-success text-xs">{swapSuccess}</div>}

              {/* From */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400">From</label>
                <div className="flex gap-2">
                  <select
                    value={swapFrom}
                    onChange={e => { setSwapFrom(e.target.value); setSwapPreview(null); }}
                    className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  >
                    {SWAP_COINS.filter(c => c.symbol !== swapTo).map(c => (
                      <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={swapAmount}
                    onChange={e => { setSwapAmount(e.target.value); setSwapPreview(null); }}
                    placeholder="Amount"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                {data && swapFrom === 'USDT' && (
                  <p className="text-[10px] text-gray-500">Available: {data.portfolio.accountBalance.toLocaleString()} USDT</p>
                )}
                {data && swapFrom !== 'USDT' && (() => {
                  const h = data.portfolio.holdings.find(h => h.cryptoSymbol === swapFrom);
                  return h ? <p className="text-[10px] text-gray-500">Available: {h.amount.toFixed(6)} {swapFrom}</p> : <p className="text-[10px] text-gray-500">No {swapFrom} holdings</p>;
                })()}
              </div>

              {/* Flip Button */}
              <div className="flex justify-center">
                <button onClick={flipSwap} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <ArrowLeftRight size={16} className="text-accent rotate-90" />
                </button>
              </div>

              {/* To */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400">To</label>
                <select
                  value={swapTo}
                  onChange={e => { setSwapTo(e.target.value); setSwapPreview(null); }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                >
                  {SWAP_COINS.filter(c => c.symbol !== swapFrom).map(c => (
                    <option key={c.symbol} value={c.symbol}>{c.symbol} - {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              <button
                onClick={fetchSwapPreview}
                disabled={!swapAmount || Number(swapAmount) <= 0 || previewLoading}
                className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {previewLoading ? 'Loading rate...' : 'Preview Rate'}
              </button>

              {swapPreview && (
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rate</span>
                    <span className="font-mono">1 {swapFrom} = {swapPreview.rate.toFixed(6)} {swapTo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">You receive</span>
                    <span className="font-mono font-semibold text-accent">{swapPreview.receiveAmount.toFixed(6)} {swapTo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fee ({(swapPreview.feeRate * 100).toFixed(1)}%)</span>
                    <span className="font-mono text-gray-300">{swapPreview.fee.toFixed(4)} {swapFrom}</span>
                  </div>
                </div>
              )}

              {/* Execute */}
              <button
                onClick={executeSwap}
                disabled={!swapAmount || Number(swapAmount) <= 0 || swapLoading}
                className="w-full py-3 rounded-lg bg-accent hover:bg-accent/80 text-black font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {swapLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
                {swapLoading ? 'Swapping...' : `Swap ${swapFrom} → ${swapTo}`}
              </button>
            </div>
          </div>
        )}

        {showFundingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0b0b0b] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  {fundingType === 'deposit' ? 'Deposit Request' : 'Withdraw Request'}
                </h3>
                <button
                  onClick={() => setShowFundingModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {fundingError && <div className="p-2 rounded bg-danger/20 text-danger text-xs">{fundingError}</div>}
              {fundingSuccess && <div className="p-2 rounded bg-success/20 text-success text-xs">{fundingSuccess}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400">Crypto Type</label>
                  <select
                    value={fundingAsset}
                    onChange={e => setFundingAsset(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  >
                    {SUPPORTED_FUNDING_ASSETS.map(asset => (
                      <option key={asset} value={asset}>{asset}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400">Network</label>
                  <select
                    value={fundingNetwork}
                    onChange={e => setFundingNetwork(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  >
                    {availableFundingNetworks.map(network => (
                      <option key={network} value={network}>{network}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400">Amount ({fundingAsset})</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fundingAmount}
                  onChange={e => setFundingAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  placeholder="Enter amount"
                />
              </div>

              {fundingType === 'deposit' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400">Platform Wallet Address</label>
                    <select
                      value={fundingPlatformWalletId}
                      onChange={e => setFundingPlatformWalletId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    >
                      {availableDepositWallets.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.label} · {option.address}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400">Your Sending Wallet Address (Optional)</label>
                    <input
                      type="text"
                      value={fundingSenderWalletAddress}
                      onChange={e => setFundingSenderWalletAddress(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      placeholder="Sender wallet address"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400">Upload Proof (Screenshot/Image)</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFundingProofFile}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded file:bg-accent/20 file:text-accent"
                    />
                    {fundingProofImageName && (
                      <p className="text-[10px] text-gray-500">Selected: {fundingProofImageName}</p>
                    )}
                    {fundingProofImageData && (
                      <img
                        src={fundingProofImageData}
                        alt="Proof preview"
                        className="w-28 h-20 rounded border border-white/10 object-cover"
                      />
                    )}
                  </div>
                </>
              )}

              {fundingType === 'withdraw' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400">Withdrawal Address</label>
                    <div className="text-[11px] text-gray-300 break-all bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                      {withdrawalAddress || 'Not set'}
                    </div>
                    {!withdrawalAddress && (
                      <button
                        onClick={() => router.push('/account')}
                        className="text-[11px] text-accent hover:underline"
                      >
                        Set withdrawal address in profile
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400">Account Password</label>
                    <input
                      type="password"
                      value={withdrawPassword}
                      onChange={e => setWithdrawPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={submitFundingRequest}
                  disabled={fundingSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent/80 text-white text-xs font-semibold disabled:opacity-40"
                >
                  {fundingSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  onClick={() => { resetFundingForm(); setShowFundingModal(false); }}
                  className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
