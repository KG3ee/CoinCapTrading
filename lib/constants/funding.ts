export type DepositWalletOption = {
  id: string;
  asset: string;
  network: string;
  label: string;
  address: string;
};

const DEFAULT_SUPPORTED_FUNDING_ASSETS = ['USDT', 'BTC', 'ETH'] as const;

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

export const SUPPORTED_FUNDING_ASSETS = Array.from(
  new Set(DEPOSIT_WALLET_OPTIONS.map((item) => item.asset))
);

export const FUNDING_NETWORKS_BY_ASSET: Record<string, string[]> = {
  USDT: ['TRC20', 'ERC20'],
  BTC: ['BTC'],
  ETH: ['ERC20'],
};

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKey(value: unknown) {
  return normalizeText(value).toUpperCase();
}

function toSafeId(value: unknown, fallback: string) {
  const raw = normalizeText(value) || fallback;
  return raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || fallback;
}

export function sanitizeDepositWalletOptions(rawOptions: unknown): DepositWalletOption[] {
  if (!Array.isArray(rawOptions)) return [];

  const usedIds = new Set<string>();
  const sanitized: DepositWalletOption[] = [];

  rawOptions.forEach((rawOption, index) => {
    if (!rawOption || typeof rawOption !== 'object') return;
    const option = rawOption as Record<string, unknown>;

    const asset = normalizeKey(option.asset);
    const network = normalizeKey(option.network);
    const address = normalizeText(option.address);
    if (!asset || !network || !address) return;

    const label = normalizeText(option.label) || `${asset} ${network} Wallet`;
    let id = toSafeId(option.id, `${asset}-${network}-${index + 1}`);
    if (!id) id = `${asset.toLowerCase()}-${network.toLowerCase()}-${index + 1}`;

    if (usedIds.has(id)) {
      let suffix = 2;
      while (usedIds.has(`${id}-${suffix}`)) suffix += 1;
      id = `${id}-${suffix}`;
    }
    usedIds.add(id);

    sanitized.push({ id, asset, network, label, address });
  });

  return sanitized;
}

export function getDefaultDepositWalletOptions() {
  return DEPOSIT_WALLET_OPTIONS.map((option) => ({ ...option }));
}

export function getEffectiveDepositWalletOptions(rawOptions?: unknown) {
  const customWallets = sanitizeDepositWalletOptions(rawOptions);
  return customWallets.length > 0 ? customWallets : getDefaultDepositWalletOptions();
}

export function getFundingMetaFromWalletOptions(walletOptions: DepositWalletOption[]) {
  const networksByAsset: Record<string, string[]> = {};
  walletOptions.forEach((wallet) => {
    if (!networksByAsset[wallet.asset]) {
      networksByAsset[wallet.asset] = [];
    }
    if (!networksByAsset[wallet.asset].includes(wallet.network)) {
      networksByAsset[wallet.asset].push(wallet.network);
    }
  });

  const assets = Object.keys(networksByAsset);
  if (assets.length === 0) {
    return {
      assets: [...DEFAULT_SUPPORTED_FUNDING_ASSETS],
      networksByAsset: { ...FUNDING_NETWORKS_BY_ASSET },
    };
  }

  return { assets, networksByAsset };
}

export function getWalletOptionById(walletId: string, walletOptions = DEPOSIT_WALLET_OPTIONS) {
  return walletOptions.find((item) => item.id === walletId) || null;
}
