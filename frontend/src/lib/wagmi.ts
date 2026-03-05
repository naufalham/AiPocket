import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "viem/chains";

export const config = getDefaultConfig({
  appName: "AgentBet",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || "demo-project-id",
  chains: [baseSepolia],
  ssr: true,
});
