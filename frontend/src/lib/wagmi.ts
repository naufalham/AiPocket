import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub Testnet",
  nativeCurrency: { name: "Westend", symbol: "WND", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://services.polkadothub-rpc.com/testnet"] },
  },
  blockExplorers: {
    default: {
      name: "Polkadot Hub Explorer",
      url: "https://blockscout-westend-asset-hub.parity-testnet.parity.io",
    },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: "AiPocket",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || "demo-project-id",
  chains: [polkadotHubTestnet],
  ssr: true,
});
