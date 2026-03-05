import {
  CronCapability,
  handler,
  Runner,
  type Runtime,
} from "@chainlink/cre-sdk";
import { onCronTrigger } from "./httpCallback";

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

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
