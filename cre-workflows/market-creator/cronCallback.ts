import {
  HTTPClient,
  EVMClient,
  type Runtime,
  getNetwork,
  prepareReportRequest,
  TxStatus,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters, encodeFunctionData } from "viem";
import { askGeminiForMarketIdea } from "./gemini";

interface Config {
  geminiModel: string;
  schedule: string;
  evms: {
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }[];
}

const PREDICTION_MARKET_ABI = [
  {
    name: "onReport",
    type: "function" as const,
    stateMutability: "nonpayable" as const,
    inputs: [{ name: "report", type: "bytes" as const }],
    outputs: [],
  },
] as const;

export function onCronTrigger(runtime: Runtime<Config>) {
  const cfg = runtime.config;
  runtime.log("[market-creator] Cron triggered - searching for market ideas...");

  if (!cfg.evms || cfg.evms.length === 0) {
    throw new Error("[market-creator] No EVM config found");
  }

  const evmConfig = cfg.evms[0];
  const httpClient = new HTTPClient();

  // Step 1: Ask Gemini for a trending event to create a market about
  let idea = askGeminiForMarketIdea(runtime, httpClient, cfg.geminiModel);

  // Fallback for simulation or when Gemini API is unavailable
  if (!idea || !idea.question || idea.question.length < 10) {
    runtime.log("[market-creator] Gemini unavailable, using fallback market idea");
    idea = {
      question: "Will Bitcoin exceed $100,000 by end of this week?",
      duration: 604800,
      category: "crypto",
    };
  }

  const duration = idea.duration > 0 ? idea.duration : 86400; // default 24h
  runtime.log(`[market-creator] Creating market: "${idea.question}"`);
  runtime.log(`[market-creator] Category: ${idea.category}, Duration: ${duration}s`);

  // Step 2: Encode market creation report payload
  // Action byte 0x00 + abi.encode(question, duration, settlementBuffer, isAgentCreated, agentAddress)
  const encodedParams = encodeAbiParameters(
    parseAbiParameters("string, uint256, uint256, bool, address"),
    [
      idea.question,
      BigInt(duration),
      BigInt(43200), // 12h settlement buffer
      true, // isAgentCreated
      "0x0000000000000000000000000000000000000000", // system agent
    ]
  );

  // Prepend action byte 0x00
  const reportPayload = ("0x00" + encodedParams.slice(2)) as `0x${string}`;

  // Step 3: Encode the function call to PredictionMarket.onReport(bytes)
  const writeCallData = encodeFunctionData({
    abi: PREDICTION_MARKET_ABI,
    functionName: "onReport",
    args: [reportPayload],
  });

  // Step 4: Get network and create EVM client
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
  }

  const evmClient = new EVMClient(network.chainSelector.selector);

  // Step 5: Generate signed report via consensus
  const report = runtime.report(prepareReportRequest(writeCallData)).result();

  runtime.log("[market-creator] Report signed via consensus");

  // Step 6: Write report to chain
  const resp = evmClient
    .writeReport(runtime, {
      receiver: evmConfig.marketAddress,
      report: report,
    })
    .result();

  const txStatus = resp.txStatus;

  if (txStatus !== TxStatus.SUCCESS) {
    throw new Error(`Failed to write report: ${resp.errorMessage || txStatus}`);
  }

  const txHash = resp.txHash || new Uint8Array(32);

  runtime.log(`[market-creator] Market created on-chain! TxHash: ${txHash.toString()}`);
  runtime.log(`[market-creator] Question: "${idea.question}"`);

  return {
    question: idea.question,
    duration: duration,
    category: idea.category,
    txHash: txHash.toString(),
  };
}
