# AgentBet - Team Collaboration Overview

## Hackathon: Chainlink Convergence (Feb 6 - Mar 1, 2026)

---

## Project Audit: ~85% Complete

| Component | Progress | Owner | Status |
|-----------|----------|-------|--------|
| Smart Contracts (Foundry) | 100% | Kamu (SC) | DEPLOYED! Core + ERC-8004 + VRF v2.5 + batch AutoSettler |
| ERC-8004 (Trustless Agents) | 100% | Kamu (SC) | Identity + Reputation + Bridge done |
| CRE Workflows (3 workflows) | 90% | Kamu (SC) | Error handling added, perlu simulate/deploy |
| x402 Server (Express) | 80% | Kamu (SC) | Middleware ACTIVE (conditional), ABIs V2 ready |
| Frontend (Next.js 14) | 75% | Teman 1 (FE) | Pages built + ERC-8004 register flow updated |
| Pitch Deck | 0% | Teman 2 (Pitch) | Belum mulai |
| Demo Video (3-5 min) | 0% | Tim | WAJIB untuk submit |
| Chainlink Integration | 75% | Kamu (SC) | VRF v2.5 proper, Automation batch, CRE ready |
| Testing | 95% | Kamu (SC) | 86 unit tests + DemoFlow.s.sol script |
| README & Docs | 95% | Kamu (SC) | Full Chainlink file links, ERC-8004, architecture |

**Overall: ~85% done — target 95%+ untuk submit**

---

## Target Prize Tracks (Bisa Submit ke Multiple!)

### 1. Prediction Markets — $32,000 (MAIN TARGET)
| Place | Prize |
|-------|-------|
| 1st | $16,000 |
| 2nd | $10,000 |
| 3rd | $6,000 |

**Why kita cocok:** Literally prediction market project. AI-powered settlement pakai Gemini + CRE. Event-driven market resolution via EVM Log Trigger. Ini track paling natural buat kita.

### 2. CRE & AI — $33,500 (SECONDARY TARGET)
| Place | Prize |
|-------|-------|
| 1st | $17,000 |
| 2nd | $10,500 |
| 3rd | $6,500 |

**Why kita cocok:** 3 CRE workflows dengan AI (Gemini) di setiap flow. Autonomous agents yang interact on-chain. x402 micropayments. Ini prize pool paling gede setelah DeFi.

### 3. Top 10 Projects — $15,000 (SAFETY NET)
- 10 runner-up projects masing-masing dapet $1,500
- Selama pakai CRE, kita eligible

### Total Potential: Bisa menang di 2 track + Top 10 = up to $49,500

---

## Submission Requirements (WAJIB SEMUA)

- [x] CRE Workflow (kita punya 3!)
- [x] Integrate blockchain + external API/LLM/AI agent
- [ ] **Successful simulation (CLI) atau live deploy di CRE network**
- [ ] **Video demo 3-5 menit (PUBLIC)**
- [x] Source code di GitHub (public)
- [x] **README yang link ke semua Chainlink-related files**
- [x] Bukan project hackathon lama

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentBet Platform                         │
├──────────┬──────────────┬───────────────┬───────────────────┤
│  Frontend │  x402 Server │ CRE Workflows │  Smart Contracts  │
│ (Next.js) │  (Express)   │ (TypeScript)  │    (Foundry)      │
├──────────┼──────────────┼───────────────┼───────────────────┤
│ Dashboard │ /create-mkt  │ market-creator│ PredictionMarket  │
│ Markets   │ /agent-strat │ agent-trader  │ AgentIdentity*    │
│ Agents    │ /markets     │ market-settler│ AgentReputation*  │
│ Leaderbd  │ /leaderboard │               │ AgentRegistryV2*  │
│           │              │               │ RewardDistributor │
│           │              │               │ AutoSettler       │
└──────────┴──────────────┴───────────────┴───────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │    8 Chainlink Services        │
              ├────────────────────────────────┤
              │ 1. CRE (Core Orchestration)    │
              │ 2. x402 (Micropayments)        │
              │ 3. Data Streams                │
              │ 4. Data Feeds (ETH/BTC/LINK)   │
              │ 5. Functions                   │
              │ 6. CCIP (Cross-chain)          │
              │ 7. VRF v2.5 (Randomness)       │
              │ 8. Automation (AutoSettler)     │
              └────────────────────────────────┘
```

---

## Autonomous Flow

```
Every 6 hours (Cron Trigger)
    │
    ▼
[Market Creator CRE] → Gemini finds trending topic → Create market on-chain
    │
    ▼
AI Agents pay $0.001 USDC (x402)
    │
    ▼
[Agent Trader CRE] → Read market + Data Feeds → Gemini strategy → Place bet
    │
    ▼
Market deadline passes
    │
    ▼
[AutoSettler] → Chainlink Automation triggers requestSettlement()
    │
    ▼
[Market Settler CRE] → EVM Log Trigger → Gemini verifies outcome → Settle on-chain
    │
    ▼
Winners claim rewards + VRF random bonus rewards
```

---

## Task Breakdown Per Role

### Kamu — Smart Contract & Backend

**Priority TINGGI (harus selesai):**
- [x] Deploy contracts ke Base Sepolia (live) — 6 contracts deployed!
- [ ] Simulate/deploy CRE workflows (minimal 1 berhasil jalan)
- [x] Aktivasi x402 payment middleware (conditional, auto-enable with X402_RECEIVER_ADDRESS)
- [x] Test full flow script: DemoFlow.s.sol (register → market → bet → verify)
- [x] Update README dengan link ke semua Chainlink files

**Priority SEDANG:**
- [x] Integrasi VRF v2.5 proper (configureVRF + startRewardRoundVRF + rawFulfillRandomWords)
- [x] Upgrade AutoSettler: batch settlement, gas-efficient scan, events
- [ ] Register AutoSettler di Chainlink Automation dashboard
- [x] Error handling di CRE workflows (3/3 workflows updated)
- [ ] Data Streams integration di agent-trader

**Nice to have:**
- [ ] CCIP cross-chain betting
- [ ] Chainlink Functions alternative settlement

### Teman 1 — Frontend

**Priority TINGGI:**
- [ ] Polish UI/UX semua pages (responsive, loading states, error handling)
- [x] Connect frontend ke deployed contracts (addresses hardcoded in contracts.ts)
- [ ] Real-time market updates (polling setiap 10s atau WebSocket)
- [ ] Betting flow yang smooth: connect wallet → select market → place bet → confirm
- [ ] Agent registration flow yang works end-to-end

**Priority SEDANG:**
- [ ] Odds visualization (pie chart atau bar chart YES vs NO)
- [ ] Transaction history per user
- [ ] Mobile responsive design
- [ ] Dark mode (Tailwind classes udah ada)

**Nice to have:**
- [ ] Animated transitions
- [ ] Toast notifications untuk tx status
- [ ] PWA support

### Teman 2 — Pitch Deck & Video

**Priority TINGGI:**
- [ ] Pitch deck slides (problem, solution, architecture, demo, Chainlink integration)
- [ ] Record demo video 3-5 menit (WAJIB buat submit!)
- [ ] Highlight 8 Chainlink services yang kita pakai
- [ ] Show live demo: market creation → AI agent betting → settlement

**Pitch Deck Structure:**
1. Problem: Manual prediction markets, no AI agents, centralized
2. Solution: AgentBet — autonomous AI agents compete in prediction markets
3. Architecture: 8 Chainlink services diagram
4. Demo: Live walkthrough
5. Chainlink Integration Deep-dive
6. Business Model: x402 micropayments
7. Future: CCIP cross-chain, Functions, mainnet

**Priority SEDANG:**
- [ ] Design branding/logo
- [ ] Social media presence
- [ ] One-pager document

---

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Smart Contracts | Solidity + Foundry | 0.8.24 |
| CRE Workflows | TypeScript + @chainlink/cre-sdk | v1.0.7 |
| AI | Google Gemini 2.0 Flash | via API |
| Payment | x402 + Express | USDC on Base Sepolia |
| Frontend | Next.js + React + Tailwind | 16.x + 19.x |
| Wallet | RainbowKit + wagmi + viem | v2 + v3 + v2 |
| Chain | Base Sepolia | Testnet |

---

## Key File Locations

### Smart Contracts
```
contracts/src/PredictionMarket.sol      # Core market logic (340 LOC)
contracts/src/AgentIdentity.sol         # ERC-8004 Identity, ERC-721 NFT (180 LOC) *NEW*
contracts/src/AgentReputation.sol       # ERC-8004 Reputation, feedback (190 LOC) *NEW*
contracts/src/AgentRegistryV2.sol       # ERC-8004 Bridge → IAgentRegistry (170 LOC) *NEW*
contracts/src/AgentRegistry.sol         # Legacy registry (kept for ref)
contracts/src/RewardDistributor.sol     # VRF rewards (89 LOC)
contracts/src/AutoSettler.sol           # Chainlink Automation (46 LOC)
contracts/test/PredictionMarket.t.sol   # 21 tests
contracts/test/AgentRegistry.t.sol      # 13 tests (legacy)
contracts/test/AgentIdentity.t.sol      # 18 tests *NEW*
contracts/test/AgentReputation.t.sol    # 11 tests *NEW*
contracts/test/AgentRegistryV2.t.sol    # 18 tests *NEW*
contracts/test/ERC8004Integration.t.sol # 5 tests (e2e) *NEW*
contracts/script/Deploy.s.sol           # Deployment script (6 contracts)
```

### CRE Workflows
```
cre-workflows/market-creator/   # Cron + HTTP → Gemini → Create Market
cre-workflows/agent-trader/     # HTTP → Data Feeds + Gemini → Trade
cre-workflows/market-settler/   # EVM Log → Gemini → Settle Market
```

### Backend
```
x402-server/src/server.ts       # Express API + x402 middleware
x402-server/src/x402Client.ts   # AI agent client utility
```

### Frontend
```
frontend/src/app/page.tsx              # Dashboard
frontend/src/app/markets/page.tsx      # Market list
frontend/src/app/markets/[id]/page.tsx # Market detail + betting
frontend/src/app/agents/page.tsx       # Agent grid
frontend/src/app/leaderboard/page.tsx  # Rankings
frontend/src/lib/contracts.ts          # ABIs + addresses
```

---

## Contract Addresses (Base Sepolia - DEPLOYED!)

```
AgentIdentity (ERC-8004):  0xA8bc3d9842FBAB05372FF262dFcd04628C64c7D3
AgentReputation (ERC-8004): 0xe8bB69D476Bcf66e8d039C24E447e2Cc6Dc38Cb4
AgentRegistryV2:            0x9e820a4a2451B88aD10c4a43E77748d0465CbAac
PredictionMarket:           0xB635CBEb6C1aB83adF72ff6bEc5f8423c7E2ced4
RewardDistributor:          0x2fBeE7C3960486004b7c53A248B0A43bA064F12c
AutoSettler:                0x2aD5C639874B9048c05b124D0A53E74Cd6Df7AF8
```

**Known Addresses:**
- CRE Forwarder: `0x82300bd7c3958625581cc2F77bC6464dcEcDF3e5`
- USDC (Base Sepolia): `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- LINK (Base Sepolia): `0xE4aB69C077896252FAFBD49EFD26B5D171A32410`

---

## Timeline (Deadline: March 1, 2026)

| Date | Milestone |
|------|-----------|
| Feb 15-18 | SC: Deploy contracts + test CRE workflows |
| Feb 15-18 | FE: Polish UI, connect to deployed contracts |
| Feb 19-22 | SC: Full flow test (create → bet → settle → claim) |
| Feb 19-22 | FE: Real-time updates + betting flow |
| Feb 23-25 | Pitch: Record demo video + finalize deck |
| Feb 26-28 | Bug fixes, final testing, README update |
| Mar 1 | SUBMIT! |

---

## Quick Start (Dev Setup)

```bash
# 1. Clone & setup
git clone <repo-url>
cd agentbet
cp .env.example .env

# 2. Smart Contracts
cd contracts
forge install
forge build
forge test

# 3. CRE Workflows
cd ../cre-workflows/market-creator
npm install

# 4. x402 Server
cd ../../x402-server
npm install
npm run dev

# 5. Frontend
cd ../frontend
npm install
npm run dev
```

---

## Winning Strategy

1. **Focus on CRE workflows yang jalan** — Judges mau lihat working demo, bukan feature list
2. **Video demo yang clean** — 3-5 menit, show full autonomous flow
3. **Highlight 8 Chainlink services** — Semakin banyak integrasi, semakin impressive
4. **Submit ke 2 tracks** — Prediction Markets + CRE & AI
5. **README yang rapih** — Link ke setiap Chainlink file, judges harus gampang navigate

---

*Last updated: Feb 15, 2026 (post VRF v2.5 + AutoSettler + x402 + CRE error handling)*
*Team: 3 orang — SC, FE, Pitch Deck*
*Tests: 86 passing (34 legacy + 52 ERC-8004)*
*Scripts: Deploy.s.sol (6 contracts) + DemoFlow.s.sol (full flow demo)*
