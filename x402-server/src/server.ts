import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { paymentMiddleware } from "@x402/express";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  type Address,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

// Viem clients
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// Contract ABIs (minimal for reading)
const PREDICTION_MARKET_ABI = [
  {
    name: "getMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "question", type: "string" },
          { name: "createdAt", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "settlementDeadline", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "outcome", type: "uint8" },
          { name: "confidenceScore", type: "uint16" },
          { name: "yesPool", type: "uint256" },
          { name: "noPool", type: "uint256" },
          { name: "totalBettors", type: "uint256" },
          { name: "isAgentCreated", type: "bool" },
          { name: "creatorAgent", type: "address" },
        ],
      },
    ],
  },
  {
    name: "nextMarketId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPrediction",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "bettor", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "amount", type: "uint256" },
          { name: "choice", type: "uint8" },
          { name: "claimed", type: "bool" },
          { name: "isAgent", type: "bool" },
          { name: "agentAddress", type: "address" },
        ],
      },
    ],
  },
  {
    name: "getMarketBettors",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },
] as const;

// AgentRegistryV2 ABI — compatible with both legacy AgentRegistry and ERC-8004 V2
const AGENT_REGISTRY_ABI = [
  {
    name: "getAgent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "name", type: "string" },
          { name: "strategy", type: "string" },
          { name: "stakedAmount", type: "uint256" },
          { name: "totalBets", type: "uint256" },
          { name: "wins", type: "uint256" },
          { name: "losses", type: "uint256" },
          { name: "totalProfit", type: "uint256" },
          { name: "totalLoss", type: "uint256" },
          { name: "marketsCreated", type: "uint256" },
          { name: "registeredAt", type: "uint256" },
          { name: "isActive", type: "bool" },
          { name: "score", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getLeaderboard",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      { name: "addrs", type: "address[]" },
      {
        name: "data",
        type: "tuple[]",
        components: [
          { name: "owner", type: "address" },
          { name: "name", type: "string" },
          { name: "strategy", type: "string" },
          { name: "stakedAmount", type: "uint256" },
          { name: "totalBets", type: "uint256" },
          { name: "wins", type: "uint256" },
          { name: "losses", type: "uint256" },
          { name: "totalProfit", type: "uint256" },
          { name: "totalLoss", type: "uint256" },
          { name: "marketsCreated", type: "uint256" },
          { name: "registeredAt", type: "uint256" },
          { name: "isActive", type: "bool" },
          { name: "score", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "agentCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const MARKET_ADDRESS = process.env.PREDICTION_MARKET_ADDRESS as Address;
const REGISTRY_ADDRESS = process.env.AGENT_REGISTRY_ADDRESS as Address; // AgentRegistryV2 (ERC-8004 bridge)

// ============================================================
// x402 PAYMENT-GATED ENDPOINTS
// ============================================================
const X402_RECEIVER = process.env.X402_RECEIVER_ADDRESS;
const X402_FACILITATOR = process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

if (X402_RECEIVER) {
  app.use(
    paymentMiddleware(X402_FACILITATOR, {
      "POST /api/create-market": {
        price: "$0.01",
        network: "base-sepolia",
        config: {
          description: "Create a new prediction market via CRE workflow",
        },
      },
      "POST /api/agent-strategy": {
        price: "$0.001",
        network: "base-sepolia",
        config: {
          description: "AI trading strategy analysis + auto-execute",
        },
      },
    })
  );
  console.log("x402 payment middleware ACTIVE (receiver:", X402_RECEIVER, ")");
} else {
  console.log("x402 payment middleware DISABLED (set X402_RECEIVER_ADDRESS to enable)");
}
// ============================================================

/**
 * POST /api/create-market
 * x402-gated ($0.01 USDC) - Create a new prediction market
 * Body: { question: string, duration?: number, agentAddress?: string }
 */
app.post("/api/create-market", async (req, res) => {
  try {
    const { question, duration, agentAddress } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Forward to CRE market-creator HTTP workflow
    const creUrl = process.env.CRE_MARKET_CREATOR_URL;
    if (creUrl) {
      const response = await fetch(creUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, duration, agentAddress }),
      });
      const result = await response.json();
      return res.json({
        success: true,
        message: "Market creation triggered via CRE",
        result,
        x402_payment: "$0.01 USDC",
      });
    }

    return res.json({
      success: true,
      message: "Market creation request received (CRE endpoint not configured)",
      data: { question, duration, agentAddress },
      x402_payment: "$0.01 USDC",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent-strategy
 * x402-gated ($0.001 USDC) - Get AI trading strategy and auto-execute
 * Body: { marketId: number, agentAddress: string, betAmount?: string }
 */
app.post("/api/agent-strategy", async (req, res) => {
  try {
    const { marketId, agentAddress, betAmount } = req.body;

    if (marketId === undefined || !agentAddress) {
      return res.status(400).json({ error: "marketId and agentAddress required" });
    }

    // Forward to CRE agent-trader HTTP workflow
    const creUrl = process.env.CRE_AGENT_TRADER_URL;
    if (creUrl) {
      const response = await fetch(creUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId,
          agentAddress,
          betAmount: betAmount || "1000000000000000",
        }),
      });
      const result = await response.json();
      return res.json({
        success: true,
        message: "Strategy analysis triggered via CRE",
        result,
        x402_payment: "$0.001 USDC",
      });
    }

    return res.json({
      success: true,
      message: "Strategy request received (CRE endpoint not configured)",
      data: { marketId, agentAddress },
      x402_payment: "$0.001 USDC",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================
// FREE READ ENDPOINTS (no x402 payment needed)
// ============================================================

/**
 * GET /api/markets - List all markets
 */
app.get("/api/markets", async (_req, res) => {
  try {
    const nextId = await publicClient.readContract({
      address: MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "nextMarketId",
    });

    const markets = [];
    const total = Number(nextId);

    for (let i = 0; i < total; i++) {
      const market = await publicClient.readContract({
        address: MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "getMarket",
        args: [BigInt(i)],
      });
      markets.push({
        id: i,
        ...market,
        yesPool: market.yesPool.toString(),
        noPool: market.noPool.toString(),
        createdAt: Number(market.createdAt),
        deadline: Number(market.deadline),
        settlementDeadline: Number(market.settlementDeadline),
        totalBettors: Number(market.totalBettors),
        confidenceScore: Number(market.confidenceScore),
      });
    }

    return res.json({ markets, total });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/markets/:id - Get specific market
 */
app.get("/api/markets/:id", async (req, res) => {
  try {
    const marketId = BigInt(req.params.id);
    const market = await publicClient.readContract({
      address: MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getMarket",
      args: [marketId],
    });

    const bettors = await publicClient.readContract({
      address: MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getMarketBettors",
      args: [marketId],
    });

    return res.json({
      id: Number(marketId),
      ...market,
      yesPool: market.yesPool.toString(),
      noPool: market.noPool.toString(),
      createdAt: Number(market.createdAt),
      deadline: Number(market.deadline),
      totalBettors: Number(market.totalBettors),
      bettors,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/leaderboard - Agent leaderboard
 */
app.get("/api/leaderboard", async (_req, res) => {
  try {
    const count = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: AGENT_REGISTRY_ABI,
      functionName: "agentCount",
    });

    const [addrs, data] = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getLeaderboard",
      args: [BigInt(0), BigInt(100)],
    });

    const agents = addrs.map((addr: string, i: number) => ({
      address: addr,
      name: data[i].name,
      strategy: data[i].strategy,
      stakedAmount: data[i].stakedAmount.toString(),
      totalBets: Number(data[i].totalBets),
      wins: Number(data[i].wins),
      losses: Number(data[i].losses),
      totalProfit: data[i].totalProfit.toString(),
      totalLoss: data[i].totalLoss.toString(),
      marketsCreated: Number(data[i].marketsCreated),
      isActive: data[i].isActive,
      score: Number(data[i].score),
      winRate:
        Number(data[i].totalBets) > 0
          ? ((Number(data[i].wins) / Number(data[i].totalBets)) * 100).toFixed(1)
          : "0",
    }));

    // Sort by score descending
    agents.sort((a: any, b: any) => b.score - a.score);

    return res.json({ agents, total: Number(count) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/:address - Get specific agent profile
 */
app.get("/api/agents/:address", async (req, res) => {
  try {
    const agent = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgent",
      args: [req.params.address as Address],
    });

    return res.json({
      address: req.params.address,
      name: agent.name,
      strategy: agent.strategy,
      stakedAmount: agent.stakedAmount.toString(),
      totalBets: Number(agent.totalBets),
      wins: Number(agent.wins),
      losses: Number(agent.losses),
      totalProfit: agent.totalProfit.toString(),
      totalLoss: agent.totalLoss.toString(),
      marketsCreated: Number(agent.marketsCreated),
      registeredAt: Number(agent.registeredAt),
      isActive: agent.isActive,
      score: Number(agent.score),
      winRate:
        Number(agent.totalBets) > 0
          ? ((Number(agent.wins) / Number(agent.totalBets)) * 100).toFixed(1)
          : "0",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats - Platform stats
 */
app.get("/api/stats", async (_req, res) => {
  try {
    const nextMarketId = await publicClient.readContract({
      address: MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "nextMarketId",
    });

    const agentCount = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: AGENT_REGISTRY_ABI,
      functionName: "agentCount",
    });

    let totalVolume = BigInt(0);
    let activeMarkets = 0;
    let settledMarkets = 0;

    for (let i = 0; i < Number(nextMarketId); i++) {
      const market = await publicClient.readContract({
        address: MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "getMarket",
        args: [BigInt(i)],
      });
      totalVolume += market.yesPool + market.noPool;
      if (market.status === 0) activeMarkets++;
      if (market.status === 2) settledMarkets++;
    }

    return res.json({
      totalMarkets: Number(nextMarketId),
      activeMarkets,
      settledMarkets,
      totalAgents: Number(agentCount),
      totalVolume: totalVolume.toString(),
      totalVolumeEth: formatEther(totalVolume),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "AgentBet x402 Server",
    chain: "Base Sepolia",
    contracts: {
      predictionMarket: MARKET_ADDRESS,
      agentRegistry: REGISTRY_ADDRESS,
    },
  });
});

app.listen(PORT, () => {
  console.log(`\n🤖 AgentBet x402 Server running on port ${PORT}`);
  console.log(`   Chain: Base Sepolia (84532)`);
  console.log(`   PredictionMarket: ${MARKET_ADDRESS}`);
  console.log(`   AgentRegistry: ${REGISTRY_ADDRESS}`);
  console.log(`\n   Payment-gated endpoints:`);
  console.log(`   POST /api/create-market    ($0.01 USDC)`);
  console.log(`   POST /api/agent-strategy   ($0.001 USDC)`);
  console.log(`\n   Free endpoints:`);
  console.log(`   GET  /api/markets`);
  console.log(`   GET  /api/markets/:id`);
  console.log(`   GET  /api/leaderboard`);
  console.log(`   GET  /api/agents/:address`);
  console.log(`   GET  /api/stats`);
  console.log(`   GET  /api/health\n`);
});

export default app;
