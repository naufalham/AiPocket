#!/usr/bin/env node
// Deploy AiPocket contracts to Polkadot Hub Testnet

import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../.env") });

const RPC_URL = process.env.POLKADOT_HUB_TESTNET_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const OUT_DIR = join(__dirname, "../out");

if (!RPC_URL || !PRIVATE_KEY) {
  console.error("ERROR: POLKADOT_HUB_TESTNET_RPC_URL and PRIVATE_KEY required");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

function loadArtifact(name) {
  const path = join(OUT_DIR, `${name}.sol`, `${name}.json`);
  const art = JSON.parse(readFileSync(path, "utf8"));
  return { bytecode: art.bytecode.object, abi: art.abi };
}

async function deploy(name, ...args) {
  const { bytecode, abi } = loadArtifact(name);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  process.stdout.write(`  Deploying ${name}...`);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(` ✓ ${addr}`);
  return { address: addr, contract };
}

async function callFn(contract, fn, ...args) {
  process.stdout.write(`  ${fn}()...`);
  const tx = await contract[fn](...args);
  await tx.wait();
  console.log(" ✓");
}

async function main() {
  const network = await provider.getNetwork();
  const balance = await provider.getBalance(wallet.address);

  console.log(`Network:  ${RPC_URL}`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH\n`);

  console.log("=== Step 1: AgentIdentity (ERC-8004 / ERC-721) ===");
  const { address: identityAddr, contract: identity } = await deploy("AgentIdentity");

  console.log("\n=== Step 2: AgentReputation (ERC-8004) ===");
  const { address: reputationAddr, contract: reputation } = await deploy("AgentReputation", identityAddr);

  console.log("\n=== Step 3: AgentRegistryV2 ===");
  const { address: registryAddr, contract: registry } = await deploy(
    "AgentRegistryV2", identityAddr, reputationAddr, wallet.address
  );

  console.log("\n=== Step 4: PredictionMarket ===");
  const { address: marketAddr, contract: market } = await deploy(
    "PredictionMarket", wallet.address, registryAddr
  );

  console.log("\n=== Step 5: Link contracts ===");
  await callFn(registry, "setPredictionMarket", marketAddr);
  await callFn(reputation, "setAuthorized", registryAddr, true);

  console.log("\n=== Step 6: RewardDistributor ===");
  const { address: rewardAddr } = await deploy("RewardDistributor", registryAddr);

  console.log("\n=== Step 7: AutoSettler ===");
  const { address: settlerAddr } = await deploy("AutoSettler", marketAddr);

  // Summary
  const addresses = {
    AGENT_IDENTITY_ADDRESS:     identityAddr,
    AGENT_REPUTATION_ADDRESS:   reputationAddr,
    AGENT_REGISTRY_ADDRESS:     registryAddr,
    PREDICTION_MARKET_ADDRESS:  marketAddr,
    REWARD_DISTRIBUTOR_ADDRESS: rewardAddr,
    AUTO_SETTLER_ADDRESS:       settlerAddr,
  };

  console.log("\n=== Deployment Summary (Polkadot Hub Testnet) ===");
  for (const [k, v] of Object.entries(addresses)) {
    console.log(`${k}=${v}`);
  }

  const envPath = join(__dirname, "../../.env.deployed");
  writeFileSync(envPath, Object.entries(addresses).map(([k,v]) => `${k}=${v}`).join("\n") + "\n");
  console.log(`\nAddresses saved to .env.deployed`);
}

main().catch(err => { console.error(err); process.exit(1); });
