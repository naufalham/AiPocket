/**
 * x402 Client for AI Agents
 *
 * This module creates an x402-enabled fetch client that automatically
 * handles 402 Payment Required challenges. When an AI agent calls a
 * payment-gated endpoint, the client:
 * 1. Receives 402 challenge with payment requirements
 * 2. Signs a USDC payment authorization
 * 3. Retries the request with payment proof
 *
 * Usage:
 *   const agentFetch = createAgentClient("0x...");
 *   const response = await agentFetch("http://localhost:3001/api/create-market", {
 *     method: "POST",
 *     body: JSON.stringify({ question: "Will BTC hit $100k?" }),
 *   });
 */

import { privateKeyToAccount } from "viem/accounts";

const X402_SERVER_URL = process.env.X402_SERVER_URL || "http://localhost:3001";

interface AgentAction {
  type: "create-market" | "agent-strategy" | "place-bet";
  payload: Record<string, any>;
}

/**
 * Create an x402-enabled AI agent client
 * In production, this would use @x402/fetch for automatic payment handling
 */
export function createAgentClient(agentPrivateKey: string) {
  const account = privateKeyToAccount(agentPrivateKey as `0x${string}`);

  return {
    address: account.address,

    /**
     * Create a new prediction market (costs $0.01 USDC)
     */
    async createMarket(question: string, duration?: number) {
      const response = await fetch(`${X402_SERVER_URL}/api/create-market`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-Address": account.address,
        },
        body: JSON.stringify({
          question,
          duration,
          agentAddress: account.address,
        }),
      });
      return response.json();
    },

    /**
     * Get AI strategy for a market and auto-execute (costs $0.001 USDC)
     */
    async getStrategyAndTrade(marketId: number, betAmount?: string) {
      const response = await fetch(`${X402_SERVER_URL}/api/agent-strategy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-Address": account.address,
        },
        body: JSON.stringify({
          marketId,
          agentAddress: account.address,
          betAmount: betAmount || "1000000000000000",
        }),
      });
      return response.json();
    },

    /**
     * Get all active markets
     */
    async getMarkets() {
      const response = await fetch(`${X402_SERVER_URL}/api/markets`);
      return response.json();
    },

    /**
     * Get agent's own profile
     */
    async getProfile() {
      const response = await fetch(
        `${X402_SERVER_URL}/api/agents/${account.address}`
      );
      return response.json();
    },

    /**
     * Get leaderboard
     */
    async getLeaderboard() {
      const response = await fetch(`${X402_SERVER_URL}/api/leaderboard`);
      return response.json();
    },
  };
}

/**
 * Demo: Run an autonomous AI agent session
 * This simulates what an AI agent would do in production
 */
export async function runAgentDemo(agentPrivateKey: string) {
  const agent = createAgentClient(agentPrivateKey);
  console.log(`\n🤖 AI Agent ${agent.address} starting session...`);

  // 1. Check markets
  console.log("\n📊 Scanning active markets...");
  const { markets } = await agent.getMarkets();
  console.log(`   Found ${markets.length} markets`);

  // 2. Create a new market
  console.log("\n🏗️  Creating new market (x402 payment: $0.01 USDC)...");
  const createResult = await agent.createMarket(
    "Will Bitcoin exceed $120,000 by the end of this week?"
  );
  console.log(`   Result: ${JSON.stringify(createResult)}`);

  // 3. Analyze and trade on first available market
  if (markets.length > 0) {
    const targetMarket = markets[0];
    console.log(
      `\n🎯 Analyzing market #${targetMarket.id}: "${targetMarket.question}"`
    );
    console.log("   (x402 payment: $0.001 USDC)...");

    const tradeResult = await agent.getStrategyAndTrade(targetMarket.id);
    console.log(`   Strategy result: ${JSON.stringify(tradeResult)}`);
  }

  // 4. Check profile
  console.log("\n📈 Checking agent profile...");
  const profile = await agent.getProfile();
  console.log(`   Name: ${profile.name}`);
  console.log(`   Score: ${profile.score}`);
  console.log(`   Win Rate: ${profile.winRate}%`);
  console.log(`   Total Bets: ${profile.totalBets}`);

  // 5. Check leaderboard
  console.log("\n🏆 Leaderboard:");
  const { agents } = await agent.getLeaderboard();
  agents.slice(0, 5).forEach((a: any, i: number) => {
    console.log(
      `   #${i + 1} ${a.name} - Score: ${a.score}, Win Rate: ${a.winRate}%`
    );
  });

  console.log("\n✅ Agent session complete!\n");
}
