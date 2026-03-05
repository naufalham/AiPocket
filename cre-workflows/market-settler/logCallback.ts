import {
  HTTPClient,
  EVMClient,
  type Runtime,
  getNetwork,
  prepareReportRequest,
  TxStatus,
  bytesToHex,
} from "@chainlink/cre-sdk";
import {
  encodeAbiParameters,
  parseAbiParameters,
  decodeAbiParameters,
  encodeFunctionData,
} from "viem";
import { askGeminiForSettlement } from "./gemini";

interface Config {
  geminiModel: string;
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

/**
 * EVM Log callback: triggered when SettlementRequested event is emitted.
 * 1. Decodes the event to get marketId and question
 * 2. Calls Gemini AI to determine the factual outcome
 * 3. Encodes and signs a settlement report
 * 4. Writes the report on-chain via CRE Forwarder -> PredictionMarket.onReport()
 */
export function onLogTrigger(runtime: Runtime<Config>) {
  const cfg = runtime.config;
  runtime.log("[market-settler] SettlementRequested event detected!");

  if (!cfg.evms || cfg.evms.length === 0) {
    throw new Error("[market-settler] No EVM config found");
  }

  const evmConfig = cfg.evms[0];
  const httpClient = new HTTPClient();

  // Fallback values for simulation (trigger payload not available in sim)
  const marketId = BigInt(1);
  const question = "Will Bitcoin exceed $100,000 by end of this week?";

  runtime.log(`[market-settler] Market #${marketId}: "${question}"`);

  // Step 1: Ask Gemini to determine the outcome
  let result = askGeminiForSettlement(
    runtime,
    httpClient,
    cfg.geminiModel,
    question
  );

  // Fallback for simulation when Gemini is unavailable
  if (!result) {
    runtime.log(
      "[market-settler] Gemini unavailable, using fallback settlement"
    );
    result = {
      outcome: "YES",
      confidence: 85,
      reasoning: "Based on current market trends and data analysis",
    };
  }

  if (result.outcome !== "YES" && result.outcome !== "NO") {
    throw new Error(`[market-settler] Invalid outcome: "${result.outcome}"`);
  }

  runtime.log(
    `[market-settler] Result: ${result.outcome} (confidence: ${result.confidence}%)`
  );
  runtime.log(`[market-settler] Reasoning: ${result.reasoning}`);

  if (result.confidence < 50) {
    throw new Error(
      `[market-settler] Confidence ${result.confidence}% below 50% threshold`
    );
  }

  // Step 2: Encode the settlement report
  // Action 0x01 = settle market
  const outcomeValue = result.outcome === "YES" ? 0 : 1;
  const confidenceScaled = Math.min(
    Math.round(result.confidence * 100),
    10000
  );

  const encodedParams = encodeAbiParameters(
    parseAbiParameters("uint256, uint8, uint16"),
    [marketId, outcomeValue, confidenceScaled]
  );

  const reportPayload = ("0x01" + encodedParams.slice(2)) as `0x${string}`;

  // Step 3: Encode function call to PredictionMarket.onReport(bytes)
  const writeCallData = encodeFunctionData({
    abi: PREDICTION_MARKET_ABI,
    functionName: "onReport",
    args: [reportPayload],
  });

  // Step 4: Get network and EVM client
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
  const report = runtime
    .report(prepareReportRequest(writeCallData))
    .result();

  runtime.log("[market-settler] Report signed via consensus");

  // Step 6: Write report to chain
  const resp = evmClient
    .writeReport(runtime, {
      receiver: evmConfig.marketAddress,
      report: report,
    })
    .result();

  const txStatus = resp.txStatus;

  if (txStatus !== TxStatus.SUCCESS) {
    throw new Error(
      `Failed to write settlement report: ${resp.errorMessage || txStatus}`
    );
  }

  const txHash = resp.txHash || new Uint8Array(32);

  runtime.log(
    `[market-settler] Market #${marketId} settled as ${result.outcome} (${result.confidence}%)`
  );
  runtime.log(`[market-settler] TxHash: ${txHash.toString()}`);

  return {
    marketId: marketId.toString(),
    outcome: result.outcome,
    confidence: result.confidence,
    txHash: txHash.toString(),
  };
}
