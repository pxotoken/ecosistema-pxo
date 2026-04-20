import { create } from 'zustand';
import {
  polygon,
  polygonAmoy,
} from 'thirdweb/chains';

type EnvironmentChains = "PROD" | "DEV";

interface Token {
  address: string;
  name: string;
  symbol: string;
  icon: string;
}

interface WalletState {
  environment: EnvironmentChains;
  currentChains: any[];
  tokens: Record<number, Token[]>;
  setEnvironment: (env: EnvironmentChains) => void;
  setAdminMode: (isAdmin: boolean) => void;
}

const tokens = {
  [polygonAmoy.id]: [
    {
      address: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
      name: "USDC Testnet",
      symbol: "USDC",
      icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    },
    {
      address: "0xeda62cd0d29e077b98e0b61d905c4af906d8946c",
      name: "PXO Token",
      symbol: "PXO",
      icon: "https://bscscan.com/token/images/pxotoken_32.png",
    },
    {
      address: "0x0000000000000000000000000000000000000000",
      name: "Polygon",
      symbol: "POL",
      icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    },
  ],
  [polygon.id]: [
    {
      address: "0xd6f9c21A585E2D77b62Ec8C65ab9beC70e2b77d7",
      name: "PXO Token",
      symbol: "PXO",
      icon: "https://bscscan.com/token/images/pxotoken_32.png",
    },
    {
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      name: "Tether USD",
      symbol: "USDT",
      icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
    },
    {
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      name: "USD Coin",
      symbol: "USDC",
      icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    },
    {
      address: "0x0000000000000000000000000000000000000000",
      name: "Polygon",
      symbol: "MATIC",
      icon: "https://cryptologos.cc/logos/polygon-matic-logo.png",
    },
  ],
 /*  [bsc.id]: [
    {
      address: "0xb8fe0E72F69cF8F89a243277B189B489b6453b1B",
      name: "PXO Token (PXO)",
      symbol: "PXO",
      icon: "https://bscscan.com/token/images/pxotoken_32.png",
    },
    {
      address: "0x0000000000000000000000000000000000000000",
      name: "BNB",
      symbol: "BNB",
      icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    },
  ] */
};

const FORCE_POLYGON_MAINNET = import.meta.env.VITE_FORCE_POLYGON_MAINNET === 'true';
const ENABLE_ADMIN_TESTNET = import.meta.env.VITE_ENABLE_ADMIN_TESTNET === 'true';

const getChains = (isAdmin = false) => {
  if (FORCE_POLYGON_MAINNET && !(isAdmin && ENABLE_ADMIN_TESTNET)) {
    return [polygon];
  }
  return [polygon, polygonAmoy];
};

const useWalletStore = create<WalletState>((set: any) => ({
  environment: (import.meta.env.VITE_CHAINS_ENVIRONMENT || "PROD") as EnvironmentChains,
  currentChains: getChains(),
  tokens,
  setEnvironment: (env: EnvironmentChains) =>
    set(() => ({
      environment: env,
      tokens,
    })),
  setAdminMode: (isAdmin: boolean) =>
    set(() => ({
      currentChains: getChains(isAdmin),
    })),
}));

export default useWalletStore; 