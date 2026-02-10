export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface Holding {
  cryptoSymbol: string;
  amount: number;
  averageBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface Portfolio {
  _id: string;
  userId: string;
  accountBalance: number;
  totalInvested: number;
  totalReturns: number;
  holdings: Holding[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Trade {
  _id: string;
  userId: string;
  type: 'buy' | 'sell';
  cryptoSymbol: string;
  amount: number;
  pricePerUnit: number;
  totalValue: number;
  status: 'completed' | 'pending' | 'cancelled';
  transactionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  _id: string;
  fullName: string;
  email: string;
  uid: string;
  referralCode: string;
  accountStatus: 'active' | 'inactive' | 'banned';
  isVerified: boolean;
  language: string;
  withdrawalAddress: string;
  profilePicture: string | null;
  isTwoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FundingRequest {
  _id: string;
  requestId: string;
  userId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  asset: string;
  method: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
}

export interface CoinCapAsset {
  id: string;
  rank: string;
  symbol: string;
  name: string;
  supply: string;
  maxSupply: string | null;
  marketCapUsd: string;
  volumeUsd24Hr: string;
  priceUsd: string;
  changePercent24Hr: string;
  vwap24Hr: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
