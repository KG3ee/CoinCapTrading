export type DepositWalletOption = {
  id: string;
  asset: string;
  network: string;
  label: string;
  address: string;
};

export const SUPPORTED_FUNDING_ASSETS = ['USDT', 'BTC', 'ETH'] as const;

export const DEPOSIT_WALLET_OPTIONS: DepositWalletOption[] = [
  {
    id: 'usdt-trc20-main',
    asset: 'USDT',
    network: 'TRC20',
    label: 'Main USDT TRC20 Wallet',
    address: process.env.DEPOSIT_USDT_TRC20_ADDRESS || 'TRC20_WALLET_ADDRESS_NOT_SET',
  },
  {
    id: 'usdt-erc20-main',
    asset: 'USDT',
    network: 'ERC20',
    label: 'Main USDT ERC20 Wallet',
    address: process.env.DEPOSIT_USDT_ERC20_ADDRESS || 'ERC20_WALLET_ADDRESS_NOT_SET',
  },
  {
    id: 'btc-main',
    asset: 'BTC',
    network: 'BTC',
    label: 'Main BTC Wallet',
    address: process.env.DEPOSIT_BTC_ADDRESS || 'BTC_WALLET_ADDRESS_NOT_SET',
  },
  {
    id: 'eth-main',
    asset: 'ETH',
    network: 'ERC20',
    label: 'Main ETH Wallet',
    address: process.env.DEPOSIT_ETH_ADDRESS || 'ETH_WALLET_ADDRESS_NOT_SET',
  },
];

export const FUNDING_NETWORKS_BY_ASSET: Record<string, string[]> = {
  USDT: ['TRC20', 'ERC20'],
  BTC: ['BTC'],
  ETH: ['ERC20'],
};

export function getWalletOptionById(walletId: string) {
  return DEPOSIT_WALLET_OPTIONS.find((item) => item.id === walletId) || null;
}
