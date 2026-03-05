import {
  HTTPClient,
  EVMClient,
  type Runtime,
  getNetwork,
  encodeCallMsg,
  LAST_FINALIZED_BLOCK_NUMBER,
  bytesToHex,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult } from "viem";
import { askGeminiForStrategy } from "./gemini";

interface Config {
  geminiModel: string;
  schedule: string;
  evms: {
    marketAddress: string;
    registryAddress: string;
    chainSelectorName: string;
    gasLimit: string;
    dataFeeds: {
      ETH_USD: string;
      BTC_USD: string;
      LINK_USD: string;
    };
  }[];
}

const LATEST_ROUND_DATA_ABI = [
  {
    name: "latestRoundData",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" as const },
      { name: "answer", type: "int256" as const },
      { name: "startedAt", type: "uint256" as const },
      { name: "updatedAt", type: "uint256" as const },
      { name: "answeredInRound", type: "uint80" as const },
    ],
  },
] as const;

const GET_MARKET_ABI = [
  {
    name: "getMarket",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "_marketId", type: "uint256" as const }],
    outputs: [
      {
        name: "",
        type: "tuple" as const,
        components: [
          { name: "creator", type: "address" as const },
          { name: "question", type: "string" as const },
          { name: "createdAt", type: "uint256" as const },
          { name: "deadline", type: "uint256" as const },
          { name: "settlementDeadline", type: "uint256" as const },
          { name: "status", type: "uint8" as const },
          { name: "outcome", type: "uint8" as const },
          { name: "confidenceScore", type: "uint16" as const },
          { name: "yesPool", type: "uint256" as const },
          { name: "noPool", type: "uint256" as const },
          { name: "totalBettors", type: "uint256" as const },
          { name: "isAgentCreated", type: "bool" as const },
          { name: "creatorAgent", type: "address" as const },
        ],
      },
    ],
  },
] as const;

/**
 * Cron Callback: AI Agent Trading Strategy
 *
 * Periodically scans open markets and generates trading strategies:
 * 1. Read market state from PredictionMarket contract
 * 2. Fetch current crypto prices from Chainlink Data Feeds
 * 3. Ask Gemini for trading strategy with full context
 * 4. Output trade recommendation
 */
export function onCronTrigger(runtime: Runtime<Config>) {
  const cfg = runtime.config;
  runtime.log("[agent-trader] Strategy analysis triggered");

  if (!cfg.evms || cfg.evms.length === 0) {
    throw new Error("[agent-trader] No EVM config found");
  }

  const evmConfig = cfg.evms[0];
  const httpClient = new HTTPClient();

  // Get network and EVM client
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
  }

  const evmClient = new EVMClient(network.chainSelector.selector);

  // Step 1: Read market state for market #0
  const marketId = BigInt(0);
  let marketQuestion = "Will Bitcoin exceed $100,000 by end of this week?";
  let yesPool = "0";
  let noPool = "0";
  let deadline = "0";

  try {
    const callData = encodeFunctionData({
      abi: GET_MARKET_ABI,
      functionName: "getMarket",
      args: [marketId],
    });

    const result = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({
          from: "0x0000000000000000000000000000000000000000",
          to: evmConfig.marketAddress,
          data: callData,
        }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result();

    const decoded = decodeFunctionResult({
      abi: GET_MARKET_ABI,
      functionName: "getMarket",
      data: bytesToHex(result.data),
    });

    marketQuestion = decoded.question || marketQuestion;
    yesPool = decoded.yesPool.toString();
    noPool = decoded.noPool.toString();
    deadline = decoded.deadline.toString();

    runtime.log(`[agent-trader] Market #${marketId}: "${marketQuestion}"`);
  } catch (e: any) {
    runtime.log(
      `[agent-trader] Warning: Could not read market state: ${e.message || e}`
    );
    runtime.log("[agent-trader] Using fallback market data for simulation");
  }

  // Step 2: Read Chainlink Data Feeds for price context
  let ethPrice = "unknown";
  let btcPrice = "unknown";
  let linkPrice = "unknown";

  try {
    ethPrice = readPriceFeed(runtime, evmClient, evmConfig.dataFeeds.ETH_USD);
  } catch {
    runtime.log("[agent-trader] Warning: ETH/USD price feed unavailable");
  }

  try {
    btcPrice = readPriceFeed(runtime, evmClient, evmConfig.dataFeeds.BTC_USD);
  } catch {
    runtime.log("[agent-trader] Warning: BTC/USD price feed unavailable");
  }

  try {
    linkPrice = readPriceFeed(runtime, evmClient, evmConfig.dataFeeds.LINK_USD);
  } catch {
    runtime.log("[agent-trader] Warning: LINK/USD price feed unavailable");
  }

  runtime.log(
    `[agent-trader] Price context: ETH=$${ethPrice}, BTC=$${btcPrice}, LINK=$${linkPrice}`
  );

  // Step 3: Ask Gemini for strategy
  let strategy = askGeminiForStrategy(
    runtime,
    httpClient,
    cfg.geminiModel,
    {
      question: marketQuestion,
      yesPool,
      noPool,
      deadline,
      ethPrice,
      btcPrice,
      linkPrice,
    }
  );

  // Fallback for simulation when Gemini is unavailable
  if (!strategy) {
    runtime.log("[agent-trader] Gemini unavailable, using fallback strategy");
    strategy = {
      choice: "YES",
      confidence: 75,
      reasoning:
        "Based on current market trends and price analysis, the YES outcome appears more likely",
      suggestedBetSize: "small",
    };
  }

  runtime.log(
    `[agent-trader] Strategy: ${strategy.choice} (confidence: ${strategy.confidence}%)`
  );
  runtime.log(`[agent-trader] Reasoning: ${strategy.reasoning}`);
  runtime.log(
    `[agent-trader] Suggested bet size: ${strategy.suggestedBetSize}`
  );

  // Step 4: Output trade recommendation
  const betAmounts: Record<string, string> = {
    small: "1000000000000000", // 0.001 ETH
    medium: "5000000000000000", // 0.005 ETH
    large: "10000000000000000", // 0.01 ETH
  };
  const betAmount =
    betAmounts[strategy.suggestedBetSize] || betAmounts.small;

  runtime.log("[agent-trader] === TRADE RECOMMENDATION ===");
  runtime.log(`  Market: #${marketId}`);
  runtime.log(`  Choice: ${strategy.choice}`);
  runtime.log(`  Amount: ${betAmount} wei`);
  runtime.log(`  Confidence: ${strategy.confidence}%`);

  return {
    marketId: marketId.toString(),
    choice: strategy.choice,
    confidence: strategy.confidence,
    betAmount,
    reasoning: strategy.reasoning,
    prices: { ethPrice, btcPrice, linkPrice },
  };
}

/**
 * Read price from a Chainlink Data Feed (latestRoundData)
 */
function readPriceFeed(
  runtime: Runtime<Config>,
  evmClient: EVMClient,
  feedAddress: string
): string {
  const callData = encodeFunctionData({
    abi: LATEST_ROUND_DATA_ABI,
    functionName: "latestRoundData",
  });

  const result = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: "0x0000000000000000000000000000000000000000",
        to: feedAddress,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  const decoded = decodeFunctionResult({
    abi: LATEST_ROUND_DATA_ABI,
    functionName: "latestRoundData",
    data: bytesToHex(result.data),
  });

  // answer has 8 decimals
  const price = Number(decoded[1]) / 1e8;
  return price.toFixed(2);
}
