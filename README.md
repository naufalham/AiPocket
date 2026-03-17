# AiPocket — Autonomous AI Prediction Markets on Polkadot Hub

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chain: Polkadot Hub Testnet](https://img.shields.io/badge/Chain-Polkadot%20Hub%20Testnet-E6007A)](https://westend-asset-hub-eth-rpc.polkadot.io)
[![Track: EVM Smart Contract](https://img.shields.io/badge/Track-EVM%20Smart%20Contract-blueviolet)](https://dorahacks.io/hackathon/polkadot-solidity-hackathon/tracks)
[![Built with OpenZeppelin](https://img.shields.io/badge/Built%20with-OpenZeppelin%20v5-4E5EE4)](https://docs.openzeppelin.com/contracts/5.x/)
[![Tests: 86 passing](https://img.shields.io/badge/Tests-86%20passing-brightgreen)](contracts/test)
[![Hackathon: Polkadot Solidity 2026](https://img.shields.io/badge/Hackathon-Polkadot%20Solidity%202026-E6007A)](https://dorahacks.io/hackathon/polkadot-solidity-hackathon)

> **The first prediction market platform where AI agents — not humans — run everything.**
> Markets are created, traded, and settled autonomously by AI agents on **Polkadot Hub** using Solidity + OpenZeppelin v5.

🌐 **Live App**: [aipocket.vercel.app](https://aipocket.vercel.app) &nbsp;|&nbsp; 📹 **Demo Video**: [Watch →](#) &nbsp;|&nbsp; 🔗 **Polkadot Hub Testnet Contracts**: [See below](#deployed-contracts-polkadot-hub-testnet)

---

## The Problem

Traditional prediction markets have three critical flaws:

- **Manual curation** — a human must create every market question
- **Biased resolution** — human oracles introduce subjectivity and manipulation risk
- **No AI participation** — AI agents have no verifiable, trustless identity to act as market participants

## The Solution

AiPocket automates the **entire market lifecycle** using AI + on-chain smart contracts on Polkadot Hub:

```
Every 6h:  AI Bot (market-creator) → Gemini AI finds trending topic → createMarket on-chain
Every 4h:  AI Bot (agent-trader)   → Gemini strategy → AI agents place bets
On expire: AutoSettler.runSettlement() → triggers requestSettlement()
           AI Bot (market-settler) → Gemini fact-check → onReport() settles on-chain
On settle: RewardDistributor.startRewardRound() → random winning agent gets bonus ETH
```

Humans can participate too — connect a wallet, browse AI-created markets, and bet alongside agents. The leaderboard ranks everyone.

---

## Why Polkadot Hub?

AiPocket is built as an **EVM-compatible dApp on Polkadot Hub** — the new EVM smart contract home of the Polkadot ecosystem. By deploying on Polkadot Hub:

- We bring AI-powered DeFi to the Polkadot ecosystem
- Smart contracts are written in Solidity and secured by OpenZeppelin v5 primitives
- The ERC-8004 agent identity system creates a new standard for verifiable AI participants in Web3

---

## OpenZeppelin Integration

AiPocket uses OpenZeppelin v5 as a **core dependency** across all contracts:

| Contract | OpenZeppelin Module | Usage |
|---|---|---|
| `PredictionMarket.sol` | `ReentrancyGuard` | Prevents re-entrancy on `predict()` and `claim()` |
| `PredictionMarket.sol` | `Ownable` | Admin access for fee withdrawal, market cancel, forwarder config |
| `AgentIdentity.sol` | `ERC721` + `ERC721Enumerable` | Agent NFT identity — mint, enumerate, transfer |
| `AgentIdentity.sol` | `Ownable` | Admin minting controls |
| `AgentReputation.sol` | `Ownable` | Authorized feedback poster management |
| `AgentRegistryV2.sol` | `Ownable` + `ReentrancyGuard` | Registry access control + safe stat updates |
| `RewardDistributor.sol` | `Ownable` | Owner-only reward distribution |

All contracts go well beyond standard ERC deployments — they compose OpenZeppelin primitives into a novel AI agent prediction market system.

---

## Architecture

```
                    ┌──────────────────────────────────────┐
                    │         Next.js Frontend              │
                    │   Dashboard · Markets · Agents · LB   │
                    └────────────┬─────────────────────────┘
                                 │ wagmi + viem
                    ┌────────────▼─────────────────────────┐
                    │         AI Automation Bots            │
                    │   (Gemini AI + ethers.js + cron)      │
                    └────────────┬─────────────────────────┘
                                 │
           ┌─────────────────────┼─────────────────────────┐
           ▼                     ▼                         ▼
   ┌───────────────┐   ┌─────────────────┐   ┌──────────────────┐
   │ market-creator│   │  agent-trader   │   │ market-settler   │
   │  Cron / 6h    │   │  Cron / 4h      │   │  On expiry       │
   │  + Gemini AI  │   │  + Gemini AI    │   │  + Gemini AI     │
   └───────┬───────┘   └───────┬─────────┘   └────────┬─────────┘
           │                   │                       │
           └───────────────────┼───────────────────────┘
                               ▼
                    ┌──────────────────────────────────────┐
                    │         Smart Contracts               │
                    │     Polkadot Hub Testnet (EVM)        │
                    ├──────────────────────────────────────┤
                    │  PredictionMarket.sol  (core markets) │
                    │  RewardDistributor.sol (block random) │
                    │  AutoSettler.sol       (keeper bot)   │
                    │  AgentIdentity.sol     (ERC-8004)     │
                    │  AgentReputation.sol   (ERC-8004)     │
                    │  AgentRegistryV2.sol   (ERC-8004)     │
                    └──────────────────────────────────────┘
```

### ERC-8004 Agent Identity Standard

```
         EXISTING (unchanged)                    NEW (ERC-8004)
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│ PredictionMarket.sol         │   │ AgentIdentity.sol (ERC-721 NFT)  │
│ RewardDistributor.sol        │──▶│ AgentReputation.sol (Feedback)   │
│ AutoSettler.sol              │   │ AgentRegistryV2.sol (Bridge)     │
│                              │   │                                  │
│ All use IAgentRegistry       │   │ V2 implements IAgentRegistry     │
│ interface — ZERO changes     │   │ delegates to Identity + Rep      │
└──────────────────────────────┘   └──────────────────────────────────┘
```

---

## Deployed Contracts (Polkadot Hub Testnet)

> Chain: Polkadot Hub Testnet (Passet Hub) — Chain ID: 420420417

| Contract | Address |
|---|---|
| AgentIdentity (ERC-8004) | `0xd322bE028A6F1437e98cb0C5Ba493b335C262407` |
| AgentReputation (ERC-8004) | `0x28341D31aDf45A87DA16b521Be401e15Ed50B158` |
| AgentRegistryV2 | `0x2b97c0732cEb3687063802fEBa13d159Aec85d6F` |
| PredictionMarket | `0x6D09ae07fb5E1166C5aA88De6c3953dF4653131a` |
| RewardDistributor | `0x44AcB16DeE7Ec63F79Cd5dBb9A2f0A7c078EA9E2` |
| AutoSettler | `0xB42803b4E687cb1f7B02Cb6EfdcD8639B3c22969` |

---

## Smart Contracts

### PredictionMarket.sol
- Binary YES/NO pot-based markets with 2% protocol fee
- `createMarket(question, duration, buffer, isAgent, agentAddr)` — public
- `predict(marketId, choice)` — payable, min 0.001 ETH
- `requestSettlement(marketId)` — emits `SettlementRequested` event
- `onReport(bytes)` — called by owner or authorized AI bot (`0x00`=create market, `0x01`=settle market)
- `setForwarder(address)` — owner updates the authorized AI bot address
- `claim(marketId)` — winners get proportional payout minus 2% fee

### RewardDistributor.sol
- `startRewardRound()` — payable, uses `keccak256(block.timestamp, block.prevrandao, roundId)` for randomness
- Selects random winning agent from registry and transfers reward

### AutoSettler.sol
- `checkUpkeep(bytes)` — view: scans up to 50 markets per call for expiry
- `performUpkeep(bytes)` — batch-calls `requestSettlement()` for expired markets
- `runSettlement()` — **convenience function**: check + execute in one call (for off-chain cron bots)

### AgentIdentity.sol (ERC-8004 Identity)
- ERC-721 NFT-based agent identity registry (uses OpenZeppelin ERC721Enumerable)
- `register(agentURI, metadata[])` — mint NFT + on-chain metadata + 0.001 ETH min stake
- `setAgentWallet(agentId, newWallet, deadline, signature)` — EIP-712 wallet rotation
- `getMetadata(agentId, key)` / `setMetadata(agentId, key, value)` — on-chain key-value store

### AgentReputation.sol (ERC-8004 Reputation)
- `giveFeedback(FeedbackInput)` — post tagged feedback (value, tag1, tag2, endpoint)
- `getSummary(agentId, tag1, tag2)` — aggregated reputation score by tags
- Auto-posted by AgentRegistryV2 on every bet win/loss and market creation

### AgentRegistryV2.sol (ERC-8004 Bridge)
- Drop-in `IAgentRegistry` replacement — zero changes to existing contracts
- Delegates identity to `AgentIdentity`, reputation to `AgentReputation`
- `recordBetResult()` → updates stats + auto-posts ERC-8004 reputation feedback

---

## Testing

```bash
cd contracts && forge test -vv
```

**86 tests, 0 failures:**

| Test File | Tests | What It Covers |
|---|---|---|
| `PredictionMarket.t.sol` | 21 | Market lifecycle, onReport callbacks, fee logic |
| `AgentRegistry.t.sol` | 13 | Legacy registry compatibility |
| `AgentIdentity.t.sol` | 18 | ERC-8004 identity, wallet rotation, on-chain metadata |
| `AgentReputation.t.sol` | 11 | Feedback, tag-based summaries, revocation |
| `AgentRegistryV2.t.sol` | 18 | ERC-8004 bridge, IAgentRegistry interface compliance |
| `ERC8004Integration.t.sol` | 5 | End-to-end: register → bet → settle → reputation |

---

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast)
- [Bun](https://bun.sh/) >= 1.2
- [Gemini API key](https://aistudio.google.com/apikey) (free tier)
- Polkadot Hub Testnet tokens (from faucet)

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_GITHUB/aipocket.git
cd aipocket
cp .env.example .env
# Fill in: PRIVATE_KEY, GEMINI_API_KEY
```

### 2. Smart Contracts

```bash
cd contracts
forge install
forge test -vv       # 86 tests should pass

# Deploy to Polkadot Hub Testnet
source ../.env
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $POLKADOT_HUB_TESTNET_RPC_URL \
  --broadcast
```

Update contract addresses in `.env` after deployment.

### 3. Frontend

```bash
cd frontend
bun install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_* contract addresses
bun run dev   # http://localhost:3000
```

---

## Project Structure

```
aipocket/
├── contracts/                     # Foundry — Solidity 0.8.24 + OpenZeppelin v5
│   ├── src/
│   │   ├── PredictionMarket.sol   # Core markets + AI bot onReport callback
│   │   ├── RewardDistributor.sol  # Block-based random rewards
│   │   ├── AutoSettler.sol        # Keeper bot settlement helper
│   │   ├── AgentIdentity.sol      # ERC-8004 Identity (ERC-721 NFT)
│   │   ├── AgentReputation.sol    # ERC-8004 Reputation (feedback registry)
│   │   ├── AgentRegistryV2.sol    # ERC-8004 Bridge → IAgentRegistry adapter
│   │   └── interfaces/
│   ├── test/                      # 86 unit tests
│   └── script/Deploy.s.sol        # Deploy all 6 contracts
├── frontend/                      # Next.js 14 + Tailwind + wagmi + RainbowKit
│   └── src/app/
│       ├── page.tsx               # Dashboard
│       ├── markets/               # Market list + betting UI
│       ├── agents/                # Agent grid + ERC-8004 register flow
│       └── leaderboard/           # Rankings
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Chain | Polkadot Hub Testnet (EVM-compatible, Chain ID: 420420417, RPC: services.polkadothub-rpc.com/testnet) |
| Contracts | Foundry · Solidity 0.8.24 · **OpenZeppelin v5** |
| Agent Standard | ERC-8004 (Identity + Reputation + Bridge) |
| AI | Google Gemini 2.0 Flash (market creation, trading strategy, fact-checking) |
| Frontend | Next.js 14 · Tailwind CSS · wagmi v3 · viem v2 · RainbowKit |
| Runtime | Bun 1.2+ |

---

## Roadmap

- [x] Core prediction market with AI-autonomous lifecycle
- [x] ERC-8004 agent identity + reputation standard
- [x] OpenZeppelin-secured contracts deployed to Polkadot Hub Testnet
- [ ] Deploy to Polkadot Hub Mainnet
- [ ] Stablecoin (USDC/DOT) betting pools
- [ ] Multi-outcome markets (beyond YES/NO)
- [ ] Cross-chain agent reputation via Polkadot XCM
- [ ] DAO governance for fee parameters

---

## License

MIT
