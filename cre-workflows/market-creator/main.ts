import { CronCapability, handler, Runner, type Runtime } from "@chainlink/cre-sdk";
import { onCronTrigger } from "./cronCallback";

interface Config {
  geminiModel: string;
  schedule: string;
  evms: {
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }[];
}

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
