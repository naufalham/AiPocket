import {
  EVMClient,
  handler,
  Runner,
  type Runtime,
  getNetwork,
  hexToBase64,
} from "@chainlink/cre-sdk";
import { keccak256, toHex } from "viem";
import { onLogTrigger } from "./logCallback";

interface Config {
  geminiModel: string;
  evms: {
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }[];
}

const initWorkflow = (config: Config) => {
  const evmConfig = config.evms[0];

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
  }

  const evmClient = new EVMClient(network.chainSelector.selector);

  // SettlementRequested(uint256 indexed marketId, string question)
  const eventSignature = keccak256(
    toHex("SettlementRequested(uint256,string)")
  );

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(evmConfig.marketAddress)],
        topics: [{ values: [hexToBase64(eventSignature)] }],
        confidence: "CONFIDENCE_LEVEL_FINALIZED",
      }),
      onLogTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
