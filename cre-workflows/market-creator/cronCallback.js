"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCronTrigger = onCronTrigger;
var cre_sdk_1 = require("@chainlink/cre-sdk");
var viem_1 = require("viem");
var gemini_1 = require("./gemini");
var PREDICTION_MARKET_ABI = [
    {
        name: "onReport",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "report", type: "bytes" }],
        outputs: [],
    },
];
function onCronTrigger(runtime) {
    var cfg = runtime.config;
    runtime.log("[market-creator] Cron triggered - searching for market ideas...");
    if (!cfg.evms || cfg.evms.length === 0) {
        throw new Error("[market-creator] No EVM config found");
    }
    var evmConfig = cfg.evms[0];
    var httpClient = new cre_sdk_1.HTTPClient();
    // Step 1: Ask Gemini for a trending event to create a market about
    var idea = (0, gemini_1.askGeminiForMarketIdea)(runtime, httpClient, cfg.geminiModel);
    // Fallback for simulation or when Gemini API is unavailable
    if (!idea || !idea.question || idea.question.length < 10) {
        runtime.log("[market-creator] Gemini unavailable, using fallback market idea");
        idea = {
            question: "Will Bitcoin exceed $100,000 by end of this week?",
            duration: 604800,
            category: "crypto",
        };
    }
    var duration = idea.duration > 0 ? idea.duration : 86400; // default 24h
    runtime.log("[market-creator] Creating market: \"".concat(idea.question, "\""));
    runtime.log("[market-creator] Category: ".concat(idea.category, ", Duration: ").concat(duration, "s"));
    // Step 2: Encode market creation report payload
    // Action byte 0x00 + abi.encode(question, duration, settlementBuffer, isAgentCreated, agentAddress)
    var encodedParams = (0, viem_1.encodeAbiParameters)((0, viem_1.parseAbiParameters)("string, uint256, uint256, bool, address"), [
        idea.question,
        BigInt(duration),
        BigInt(43200), // 12h settlement buffer
        true, // isAgentCreated
        "0x0000000000000000000000000000000000000000", // system agent
    ]);
    // Prepend action byte 0x00
    var reportPayload = ("0x00" + encodedParams.slice(2));
    // Step 3: Encode the function call to PredictionMarket.onReport(bytes)
    var writeCallData = (0, viem_1.encodeFunctionData)({
        abi: PREDICTION_MARKET_ABI,
        functionName: "onReport",
        args: [reportPayload],
    });
    // Step 4: Get network and create EVM client
    var network = (0, cre_sdk_1.getNetwork)({
        chainFamily: "evm",
        chainSelectorName: evmConfig.chainSelectorName,
        isTestnet: true,
    });
    if (!network) {
        throw new Error("Network not found: ".concat(evmConfig.chainSelectorName));
    }
    var evmClient = new cre_sdk_1.EVMClient(network.chainSelector.selector);
    // Step 5: Generate signed report via consensus
    var report = runtime.report((0, cre_sdk_1.prepareReportRequest)(writeCallData)).result();
    runtime.log("[market-creator] Report signed via consensus");
    // Step 6: Write report to chain
    var resp = evmClient
        .writeReport(runtime, {
        receiver: evmConfig.marketAddress,
        report: report,
    })
        .result();
    var txStatus = resp.txStatus;
    if (txStatus !== cre_sdk_1.TxStatus.SUCCESS) {
        throw new Error("Failed to write report: ".concat(resp.errorMessage || txStatus));
    }
    var txHash = resp.txHash || new Uint8Array(32);
    runtime.log("[market-creator] Market created on-chain! TxHash: ".concat(txHash.toString()));
    runtime.log("[market-creator] Question: \"".concat(idea.question, "\""));
    return {
        question: idea.question,
        duration: duration,
        category: idea.category,
        txHash: txHash.toString(),
    };
}
