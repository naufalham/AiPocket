# AiPocket — Demo Video Script & Voiceover
### Target: 4 minutes 30 seconds | Polkadot Solidity Hackathon 2026

---

## Pre-Production Notes

**Recording Setup:**
- Screen recorder: OBS Studio or Loom (1920x1080)
- Browser: Chrome with MetaMask (Polkadot Hub Testnet configured)
- Terminal: open in split view for contract interaction
- Tabs pre-loaded: Frontend, Polkadot Hub Explorer, GitHub
- Network: Polkadot Hub Testnet (Chain ID: 420420417) selected in wallet

**Voice Tips:**
- Speak confidently but not rushed
- Pause 1 second between sections
- Emphasize keywords in **bold** below
- Energy level: excited but professional

---

## [0:00 - 0:25] HOOK — The Problem (25 seconds)

**Screen:** Black screen with text overlay "AiPocket" fading in, then cut to Polymarket / existing prediction market screenshot

**Voiceover:**

> "Prediction markets like Polymarket process billions of dollars — but they all share the same bottleneck: **humans run everything**. Humans create markets. Humans place trades. Humans resolve outcomes.
>
> The problem is simple: **humans are slow, biased, and they sleep**.
>
> What if the entire prediction market lifecycle — creation, trading, and settlement — could run **completely autonomously**, 24 hours a day, powered by AI?
>
> **AiPocket does exactly that.**"

**Action:**
- 0:00 → Show "AiPocket" title card (3 sec)
- 0:03 → Show Polymarket or traditional prediction market briefly
- 0:10 → Show "humans required" pain points as text overlay
- 0:18 → Transition to AiPocket frontend at aipocket.vercel.app

---

## [0:25 - 0:55] WHAT IS AIPOCKET (30 seconds)

**Screen:** AiPocket homepage at aipocket.vercel.app

**Voiceover:**

> "AiPocket is the **first fully autonomous AI prediction market** on Polkadot Hub — where AI agents run the entire lifecycle without human intervention.
>
> Three autonomous workflows. Six smart contracts. Eight Chainlink services. All running on **Polkadot Hub Testnet's EVM-compatible chain**.
>
> AI creates the markets. AI places the bets. AI settles the outcomes.
>
> And every AI agent has a **verified on-chain identity** via our custom **ERC-8004 standard** — an NFT-based reputation system that makes agents accountable and trustless.
>
> Let me show you the full cycle."

**Action:**
- 0:25 → Show AiPocket homepage — mascots, tagline "Platform AI Agent Prediction Market"
- 0:30 → Show stats: Total Markets counter, AI Agents aktif
- 0:38 → Scroll to trending markets section — show live market cards
- 0:45 → Scroll to Top AI Agents section
- 0:50 → Click "Explore Markets" button to transition to markets page

---

## [0:55 - 2:05] LIVE DEMO — AI Creates a Market Autonomously (70 seconds)

**Screen:** Markets page (/markets) then VS Code with market-creator CRE workflow

### Part A: Markets Created by AI [0:55 - 1:25]

**Voiceover:**

> "Every single market here was created by an AI agent — **zero human input**.
>
> Let me show you how. This is `market-creator` — our Chainlink CRE workflow running on a **6-hour cron schedule**.
>
> *(switch to VS Code — cronCallback.ts)*
>
> The workflow calls **Google Gemini 2.0 Flash** with a prompt: 'What is a relevant, time-bound prediction market question about current world events?'
>
> Gemini responds with a question, deadline, and category. The workflow encodes this as a payload — **action byte 0x00** for market creation — signs it through Chainlink consensus, and calls `PredictionMarket.onReport()` on-chain.
>
> The result? **A new market appears on-chain every 6 hours, with zero human involvement.**"

**Action:**
- 0:55 → Show markets page — highlight "AI-created" market cards with OPEN status
- 1:02 → Switch to VS Code: open `cre-workflows/market-creator/cronCallback.ts`
- 1:08 → Scroll to Gemini API call section — highlight the prompt
- 1:14 → Scroll to payload encoding — highlight `action byte 0x00`
- 1:18 → Show the `onReport()` call to PredictionMarket contract
- 1:22 → Switch back to frontend to show markets list

### Part B: AI Agent Trading Autonomously [1:25 - 2:05]

**Voiceover:**

> "Now watch what happens next. This is `agent-trader` — our second CRE workflow, running every **4 hours**.
>
> *(switch to VS Code — httpCallback.ts)*
>
> It reads all open markets from the blockchain, then fetches **real-time Chainlink Data Feeds** — ETH/USD, BTC/USD, and LINK/USD prices.
>
> It sends all of this context to Gemini: open markets, current prices, market deadlines. Gemini analyzes and responds: **'Bet YES on this market. Here's why.'**
>
> The workflow then calls `predict()` on-chain — the AI agent places a bet with **real ETH**.
>
> This is not a simulation. This is a **fully autonomous AI agent** analyzing markets with Chainlink data and placing on-chain bets, 24 hours a day.
>
> **Same platform. Same contracts. Zero human traders.**"

**Action:**
- 1:25 → Switch to VS Code: open `cre-workflows/agent-trader/httpCallback.ts`
- 1:32 → Highlight Chainlink Data Feed reads (ETH/USD, BTC/USD, LINK/USD)
- 1:38 → Highlight Gemini strategy call — show the context being sent
- 1:44 → Highlight `predict()` contract call
- 1:50 → Switch to VS Code: open `cre-workflows/agent-trader/gemini.ts`
- 1:55 → Show the structured prompt that generates betting strategy
- 2:00 → Switch back to frontend — navigate to a specific market detail page

---

## [2:05 - 2:40] MARKET TRADING & AI SETTLEMENT (35 seconds)

**Screen:** Market detail page (/markets/[id])

**Voiceover:**

> "On the market detail page, you can see the YES and NO pools, the live odds ratio, and time remaining — all reading directly from the blockchain.
>
> I'll place a manual YES bet — 0.005 ETH.
>
> *(click and confirm)*
>
> The pool updates instantly. YES percentage shifts.
>
> Now when the deadline passes, **Chainlink Automation** triggers the settlement process. The `AutoSettler` contract's `checkUpkeep()` scans the last 50 markets — finds expired ones — and calls `performUpkeep()` to request settlement.
>
> This emits a `SettlementRequested` event on-chain. Our third CRE workflow — `market-settler` — picks it up via **EVM Log Trigger**, sends the question to Gemini for fact-checking, and calls `onReport()` with the result and a **confidence score**.
>
> **Market settled. No disputes. No human judges. Just AI and Chainlink.**"

**Action:**
- 2:05 → Show market detail — YES/NO pools, odds, deadline countdown
- 2:10 → Place a YES bet (0.005 ETH), confirm in MetaMask wallet
- 2:18 → Show pool ratio update in real-time
- 2:22 → Switch to VS Code: open `cre-workflows/market-settler/logCallback.ts`
- 2:26 → Show EVM Log Trigger picking up SettlementRequested event
- 2:30 → Show Gemini fact-check call with confidence score
- 2:35 → Show `onReport()` call with action byte 0x01 (settlement)

---

## [2:40 - 3:15] TECHNICAL DEEP DIVE — ERC-8004 Agent Identity (35 seconds)

**Screen:** Agents page (/agents) then VS Code with AgentIdentity.sol

**Voiceover:**

> "The most unique part of AiPocket is our **ERC-8004 standard** — a new on-chain identity and reputation system for AI agents.
>
> *(switch to VS Code — AgentIdentity.sol)*
>
> Every agent gets an **ERC-721 NFT** that stores their identity. But unlike regular NFTs, ERC-8004 supports **wallet rotation via EIP-712 signatures** — the agent's identity persists even if the underlying wallet changes.
>
> *(switch to AgentReputation.sol)*
>
> Reputation is stored separately in `AgentReputation.sol` — a feedback registry where bets, wins, losses, and market creations are recorded as **immutable on-chain events**. Win rate, total profit, score — all verifiable, all tamper-proof.
>
> *(switch to Agents page — leaderboard)*
>
> The leaderboard is computed on-chain. The top agent earns the highest score based on win rate and net profit.
>
> This isn't a centralized database. **This is trustless agent identity on Polkadot Hub.**"

**Action:**
- 2:40 → Show Agents page — agent cards with mascots, win rates, scores
- 2:45 → Switch to VS Code: open `contracts/src/AgentIdentity.sol`
- 2:50 → Highlight ERC-721 inheritance + wallet rotation function
- 2:55 → Switch to `contracts/src/AgentReputation.sol`
- 3:00 → Highlight feedback recording — `postFeedback()` for wins/losses
- 3:05 → Switch to frontend Leaderboard page (/leaderboard)
- 3:10 → Show agent rankings with on-chain stats

---

## [3:15 - 3:40] x402 PAYMENT-GATED API + VRF REWARDS (25 seconds)

**Screen:** VS Code showing x402 server code, then RewardDistributor.sol

**Voiceover:**

> "Market creation and strategy analysis are **payment-gated via x402 micropayments**. Our Express server uses x402 middleware — AI agents pay **$0.01 USDC** to create a market and **$0.001 USDC** for a trading strategy. This creates sustainable economics and prevents spam.
>
> *(show server.ts x402 middleware)*
>
> And rewards aren't just proportional payouts. We use **Chainlink VRF v2.5** to randomly select winning agents from the pool — adding a fairness layer that no one can predict or manipulate.
>
> *(show RewardDistributor.sol — VRF call)*
>
> `startRewardRoundVRF()` requests randomness from Chainlink VRF. `rawFulfillRandomWords()` receives the result and distributes ETH rewards to the winning agent. **Provably fair. On-chain. Trustless.**"

**Action:**
- 3:15 → Show `x402-server/src/server.ts` — highlight paymentMiddleware
- 3:22 → Show the pricing: `$0.01` and `$0.001` USDC
- 3:27 → Switch to `contracts/src/RewardDistributor.sol`
- 3:30 → Highlight `startRewardRoundVRF()` and VRF Coordinator call
- 3:35 → Highlight `rawFulfillRandomWords()` — random agent selection + ETH transfer

---

## [3:40 - 4:05] DEPLOYED CONTRACTS & TESTS (25 seconds)

**Screen:** Polkadot Hub Explorer showing deployed contracts, then terminal with forge test

**Voiceover:**

> "Everything is **deployed and live** on Polkadot Hub Testnet. Six smart contracts — PredictionMarket, AgentIdentity, AgentReputation, AgentRegistryV2, RewardDistributor, and AutoSettler.
>
> *(show PredictionMarket on explorer)*
>
> 86 test cases — all passing. Solidity 0.8.24 with OpenZeppelin v5. ReentrancyGuard on all payout functions. Access control on every privileged operation.
>
> *(switch to terminal — run forge test)*
>
> Let me run them live — `forge test`. 86 tests. Zero failures.
>
> *(switch to GitHub)*
>
> Fully open source. Complete repo: smart contracts, three CRE workflow directories, x402 server, and Next.js frontend."

**Action:**
- 3:40 → Open Polkadot Hub Testnet explorer for PredictionMarket: `0x6D09ae07fb5E1166C5aA88De6c3953dF4653131a`
- 3:45 → Show contract code tab / verified contract
- 3:50 → Switch to terminal: run `forge test` — show 86 tests passing
- 3:57 → Open GitHub repo page
- 4:02 → Scroll through repo structure: contracts/, cre-workflows/, x402-server/, frontend/

---

## [4:05 - 4:30] CLOSING — Why AiPocket Wins (25 seconds)

**Screen:** Split — AiPocket frontend on left, architecture diagram on right

**Voiceover:**

> "AiPocket isn't another prediction market clone. It's the **first fully autonomous prediction market ecosystem** where AI runs everything — end to end.
>
> **Three CRE workflows** — market creation, trading, and settlement — all running autonomously on Chainlink's execution layer.
> **ERC-8004** — a new on-chain identity standard for AI agents, built from scratch.
> **Eight Chainlink services** — CRE, x402, Data Feeds, VRF, Automation, and more — deeply integrated, not bolted on.
> **86 passing tests** — battle-tested contracts deployed on Polkadot Hub.
>
> We didn't just build a dapp. We built **the infrastructure for autonomous AI agents to compete on-chain**.
>
> **AiPocket. The first fully autonomous AI prediction market.**"

**Action:**
- 4:05 → Show AiPocket homepage (dashboard, trending markets, top agents)
- 4:10 → Quick montage: cycle through key screens (markets list, market detail, agents page, leaderboard)
- 4:20 → Show final card:

```
┌─────────────────────────────────────────────┐
│                                             │
│             A i P o c k e t                │
│                                             │
│   The First Fully Autonomous AI             │
│   Prediction Market                         │
│                                             │
│   Polkadot Solidity Hackathon 2026          │
│                                             │
│   aipocket.vercel.app                       │
│                                             │
└─────────────────────────────────────────────┘
```

- 4:28 → Fade to black

---

## Post-Production Checklist

### Before Recording:
- [ ] MetaMask set to Polkadot Hub Testnet (Chain ID: 420420417) with some testnet ETH
- [ ] All browser tabs pre-loaded (frontend, Explorer, GitHub)
- [ ] VS Code open with key files ready
- [ ] Terminal ready with `forge test` command
- [ ] Screen resolution: 1920x1080
- [ ] Close all notifications (Do Not Disturb mode)
- [ ] Test microphone levels

### Screen Tabs (Pre-load in order):
1. `https://aipocket.vercel.app` (homepage / dashboard)
2. `https://aipocket.vercel.app/markets` (markets list)
3. `https://aipocket.vercel.app/markets/[id]` (market detail — pick one with a pool)
4. `https://aipocket.vercel.app/agents` (agents page)
5. `https://aipocket.vercel.app/leaderboard` (leaderboard)
6. Polkadot Hub Testnet Explorer → PredictionMarket `0x6D09ae07fb5E1166C5aA88De6c3953dF4653131a`
7. GitHub repo page
8. VS Code with `cre-workflows/market-creator/cronCallback.ts` open
9. VS Code with `cre-workflows/agent-trader/httpCallback.ts` open
10. VS Code with `cre-workflows/market-settler/logCallback.ts` open
11. VS Code with `contracts/src/AgentIdentity.sol` open
12. VS Code with `x402-server/src/server.ts` open

### Video Editing:
- [ ] Add text overlays for key stats (86 tests, 6 contracts, 8 services, etc.)
- [ ] Add subtle background music (lo-fi or tech ambient, low volume)
- [ ] Add transition effects between sections (simple fade/slide)
- [ ] Add "Polkadot Solidity Hackathon 2026" watermark in corner
- [ ] Verify total length is under 5 minutes
- [ ] Export at 1080p minimum

### Title Card Template:
```
┌─────────────────────────────────────────────┐
│                                             │
│             A i P o c k e t                │
│                                             │
│   The First Fully Autonomous AI             │
│   Prediction Market on Polkadot Hub         │
│                                             │
│   Polkadot Solidity Hackathon 2026          │
│   Prediction Markets Track                  │
│                                             │
│   aipocket.vercel.app                       │
│                                             │
└─────────────────────────────────────────────┘
```

### End Card Template:
```
┌─────────────────────────────────────────────┐
│                                             │
│             A i P o c k e t                │
│                                             │
│   3 CRE Workflows · 8 Chainlink Services   │
│   6 Contracts · 86 Tests · ERC-8004        │
│                                             │
│   aipocket.vercel.app                       │
│   github.com/[your-repo]/aipocket           │
│                                             │
│   "First Autonomous AI Prediction Market"   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Deployed Contract Addresses (Polkadot Hub Testnet)

| Contract | Address |
|---|---|
| PredictionMarket | `0x6D09ae07fb5E1166C5aA88De6c3953dF4653131a` |
| AgentIdentity (ERC-8004) | `0xd322bE028A6F1437e98cb0C5Ba493b335C262407` |
| AgentReputation (ERC-8004) | `0x28341D31aDf45A87DA16b521Be401e15Ed50B158` |
| AgentRegistryV2 | `0x2b97c0732cEb3687063802fEBa13d159Aec85d6F` |
| RewardDistributor | `0x44AcB16DeE7Ec63F79Cd5dBb9A2f0A7c078EA9E2` |
| AutoSettler | `0xB42803b4E687cb1f7B02Cb6EfdcD8639B3c22969` |
| CRE Forwarder | `0x82300bd7c3958625581cc2F77bC6464dcEcDF3e5` |

---

## Voiceover Full Script (Copy-Paste for Teleprompter)

> Prediction markets like Polymarket process billions of dollars — but they all share the same bottleneck: humans run everything. Humans create markets. Humans place trades. Humans resolve outcomes.
>
> The problem is simple: humans are slow, biased, and they sleep.
>
> What if the entire prediction market lifecycle — creation, trading, and settlement — could run completely autonomously, 24 hours a day, powered by AI?
>
> AiPocket does exactly that.
>
> AiPocket is the first fully autonomous AI prediction market on Polkadot Hub — where AI agents run the entire lifecycle without human intervention.
>
> Three autonomous workflows. Six smart contracts. Eight Chainlink services. All running on Polkadot Hub Testnet's EVM-compatible chain.
>
> AI creates the markets. AI places the bets. AI settles the outcomes. And every AI agent has a verified on-chain identity via our custom ERC-8004 standard — an NFT-based reputation system that makes agents accountable and trustless.
>
> Let me show you the full cycle.
>
> Every single market here was created by an AI agent — zero human input.
>
> Let me show you how. This is market-creator — our Chainlink CRE workflow running on a 6-hour cron schedule.
>
> The workflow calls Google Gemini 2.0 Flash with a prompt: 'What is a relevant, time-bound prediction market question about current world events?' Gemini responds with a question, deadline, and category. The workflow encodes this as a payload — action byte 0x00 for market creation — signs it through Chainlink consensus, and calls PredictionMarket.onReport on-chain.
>
> The result? A new market appears on-chain every 6 hours, with zero human involvement.
>
> Now watch what happens next. This is agent-trader — our second CRE workflow, running every 4 hours.
>
> It reads all open markets from the blockchain, then fetches real-time Chainlink Data Feeds — ETH/USD, BTC/USD, and LINK/USD prices. It sends all of this context to Gemini: open markets, current prices, market deadlines. Gemini analyzes and responds: 'Bet YES on this market. Here's why.'
>
> The workflow then calls predict on-chain — the AI agent places a bet with real ETH.
>
> This is not a simulation. This is a fully autonomous AI agent analyzing markets with Chainlink data and placing on-chain bets, 24 hours a day. Same platform. Same contracts. Zero human traders.
>
> On the market detail page, you can see the YES and NO pools, the live odds ratio, and time remaining — all reading directly from the blockchain.
>
> I'll place a manual YES bet. The pool updates instantly. YES percentage shifts.
>
> Now when the deadline passes, Chainlink Automation triggers the settlement process. The AutoSettler contract's checkUpkeep scans the last 50 markets — finds expired ones — and calls performUpkeep to request settlement.
>
> This emits a SettlementRequested event on-chain. Our third CRE workflow — market-settler — picks it up via EVM Log Trigger, sends the question to Gemini for fact-checking, and calls onReport with the result and a confidence score.
>
> Market settled. No disputes. No human judges. Just AI and Chainlink.
>
> The most unique part of AiPocket is our ERC-8004 standard — a new on-chain identity and reputation system for AI agents.
>
> Every agent gets an ERC-721 NFT that stores their identity. But unlike regular NFTs, ERC-8004 supports wallet rotation via EIP-712 signatures — the agent's identity persists even if the underlying wallet changes.
>
> Reputation is stored separately in AgentReputation.sol — a feedback registry where bets, wins, losses, and market creations are recorded as immutable on-chain events. Win rate, total profit, score — all verifiable, all tamper-proof.
>
> The leaderboard is computed on-chain. This isn't a centralized database. This is trustless agent identity on Polkadot Hub.
>
> Market creation and strategy analysis are payment-gated via x402 micropayments. Our Express server uses x402 middleware — AI agents pay one cent USDC to create a market and one-tenth of a cent for a trading strategy. This creates sustainable economics and prevents spam.
>
> And rewards aren't just proportional payouts. We use Chainlink VRF v2.5 to randomly select winning agents from the pool — adding a fairness layer that no one can predict or manipulate. Provably fair. On-chain. Trustless.
>
> Everything is deployed and live on Polkadot Hub Testnet. Six smart contracts. 86 test cases, all passing. Solidity 0.8.24 with OpenZeppelin v5. ReentrancyGuard on all payout functions.
>
> Let me run the tests live — forge test. 86 tests. Zero failures.
>
> AiPocket isn't another prediction market clone. It's the first fully autonomous prediction market ecosystem where AI runs everything — end to end.
>
> Three CRE workflows — market creation, trading, and settlement — all running autonomously on Chainlink's execution layer. ERC-8004 — a new on-chain identity standard for AI agents, built from scratch. Eight Chainlink services — deeply integrated, not bolted on. 86 passing tests — battle-tested contracts deployed on Polkadot Hub.
>
> We didn't just build a dapp. We built the infrastructure for autonomous AI agents to compete on-chain.
>
> AiPocket. The first fully autonomous AI prediction market.

---

*Total voiceover word count: ~700 words*
*At 160 words/minute speaking pace = ~4 minutes 22 seconds*
*With screen actions and pauses = ~4 minutes 30 seconds*

---

## Rangkuman Script Voice Over (Baca Langsung Saat Recording)

**[0:00]** Hi, ini AiPocket — platform prediction market pertama di Polkadot Hub di mana AI agent menjalankan segalanya secara otonom. Masalahnya simpel: platform seperti Polymarket butuh manusia untuk bikin market, pasang taruhan, dan settle hasil. Manusia lambat, bisa bias, dan butuh tidur. Bagaimana kalau semua itu bisa jalan sendiri, 24 jam sehari, ditenagai AI? AiPocket melakukan persis itu.

**[0:25]** Ini dashboard AiPocket. Semua market yang kamu lihat di sini dibuat 100% oleh AI — tidak ada human yang terlibat. Tiga CRE workflow, enam smart contract, delapan Chainlink service, semua jalan di Polkadot Hub Testnet. AI yang bikin market. AI yang bet. AI yang settle. Dan setiap AI agent punya identitas on-chain via standar ERC-8004 buatan kami sendiri — NFT-based reputation system yang bikin agent akuntabel dan trustless.

**[0:55]** Mari lihat market-creator — CRE workflow pertama kami, jalan setiap 6 jam via cron trigger. Workflow ini panggil Google Gemini 2.0 Flash dengan prompt: "Buat pertanyaan prediction market yang relevan dengan kejadian dunia saat ini." Gemini jawab dengan pertanyaan, deadline, dan kategori. Workflow encode payload ini — action byte 0x00 untuk pembuatan market — sign lewat Chainlink consensus, lalu panggil `PredictionMarket.onReport()` on-chain. Hasilnya: market baru muncul di blockchain setiap 6 jam, tanpa satu pun human yang terlibat.

**[1:25]** Sekarang lihat yang terjadi berikutnya. Ini agent-trader — CRE workflow kedua, jalan setiap 4 jam. Dia baca semua open market dari blockchain, fetch real-time Chainlink Data Feeds — harga ETH/USD, BTC/USD, LINK/USD. Semua konteks ini dikirim ke Gemini: "Market mana yang harus di-bet, YES atau NO, dan kenapa?" Gemini jawab dengan strategi. Workflow panggil `predict()` on-chain — AI agent pasang taruhan pakai ETH sungguhan. Ini bukan simulasi. Ini AI agent yang benar-benar menganalisis market dengan data Chainlink dan bet on-chain, 24 jam sehari.

**[2:05]** Di halaman detail market, kamu bisa lihat pool YES dan NO, odds ratio, dan sisa waktu — semua baca langsung dari blockchain. Saya akan pasang manual YES bet — 0.005 ETH. Pool langsung update. Ketika deadline habis, Chainlink Automation trigger proses settlement. `AutoSettler` scan 50 market terakhir, temukan yang expired, request settlement — emit event `SettlementRequested` on-chain. CRE workflow ketiga kami — market-settler — pick up event ini via EVM Log Trigger, kirim pertanyaan ke Gemini untuk fact-check, lalu panggil `onReport()` dengan hasil dan confidence score. Market settled. Tanpa dispute. Tanpa human judge.

**[2:40]** Bagian paling unik AiPocket: standar ERC-8004 — sistem identitas dan reputasi on-chain untuk AI agent. Setiap agent dapat ERC-721 NFT yang simpan identitasnya. Tapi beda dari NFT biasa — ERC-8004 support wallet rotation via EIP-712 signature. Identitas agent tetap ada meski wallet-nya ganti. Reputasi disimpan di `AgentReputation.sol` — registry feedback di mana setiap bet, menang, kalah, dan pembuatan market dicatat sebagai event on-chain yang tidak bisa diubah. Win rate, total profit, score — semua verifiable, semua tamper-proof. Ini bukan database terpusat. Ini trustless agent identity di Polkadot Hub.

**[3:15]** Pembuatan market juga dijaga via x402 micropayments. Express server kami pakai x402 middleware — AI agent bayar $0.01 USDC untuk buat market dan $0.001 untuk strategi trading. Ini ciptakan ekonomi yang sustainable dan cegah spam. Dan reward bukan hanya payout proporsional — kami pakai Chainlink VRF v2.5 untuk pilih agent pemenang secara random dari pool. `startRewardRoundVRF()` minta randomness dari Chainlink VRF. `rawFulfillRandomWords()` distribusi ETH reward ke agent pemenang. Provably fair. On-chain. Trustless.

**[3:40]** Semuanya deployed dan live di Polkadot Hub Testnet. Enam smart contract — PredictionMarket, AgentIdentity, AgentReputation, AgentRegistryV2, RewardDistributor, AutoSettler. Mari jalankan test — `forge test` — 86 test, zero failure. Solidity 0.8.24, OpenZeppelin v5, ReentrancyGuard di semua payout function. Semua open source di GitHub — smart contracts, tiga CRE workflow, x402 server, dan Next.js frontend.

**[4:05]** AiPocket bukan prediction market clone biasa. Ini infrastruktur baru untuk ekosistem prediction market yang benar-benar otonom. Tiga CRE workflow — market creation, trading, dan settlement — semua jalan otonom di Chainlink execution layer. ERC-8004 — standar identitas on-chain baru untuk AI agent, dibangun dari nol. Delapan Chainlink service — terintegrasi dalam, bukan sekadar checkbox. 86 passing test — contract yang sudah battle-tested di Polkadot Hub. Kami tidak hanya bikin dapp. Kami bangun infrastruktur untuk AI agent bersaing on-chain. AiPocket. Platform prediction market AI pertama yang benar-benar otonom.

**[4:30]** — END —

---

## Key Numbers to Memorize

| Metric | Value |
|---|---|
| CRE Workflows | 3 (market-creator, agent-trader, market-settler) |
| Chainlink Services | 8 (CRE, x402, Data Feeds, Data Streams, Functions, CCIP, VRF v2.5, Automation) |
| Smart Contracts | 6 deployed on Polkadot Hub Testnet |
| Unit Tests | 86 passing, 0 failures |
| Market Creation Cron | Every 6 hours |
| Agent Trading Cron | Every 4 hours |
| Settlement Trigger | EVM Log (SettlementRequested event) |
| Min Bet | 0.001 ETH |
| Protocol Fee | 2% |
| x402 Market Creation | $0.01 USDC |
| x402 Strategy | $0.001 USDC |
| ERC Standard | ERC-8004 (custom — Agent Identity + Reputation) |
| Chain | Polkadot Hub Testnet (Chain ID: 420420417) |
| Live App | aipocket.vercel.app |

---

## Voiceover Summary — English Version (Read Directly During Recording)

**[0:00]** Hi, this is AiPocket — the first fully autonomous AI prediction market on Polkadot Hub. The problem is simple: platforms like Polymarket require humans for everything — creating markets, placing bets, and settling outcomes. Humans are slow, biased, and they sleep. What if the entire prediction market lifecycle could run on its own, 24 hours a day, powered by AI? AiPocket does exactly that.

**[0:25]** This is the AiPocket dashboard. Every market you see here was created entirely by AI — no human involvement whatsoever. Three autonomous CRE workflows. Six smart contracts. Eight Chainlink services. All running on Polkadot Hub Testnet's EVM-compatible chain. AI creates the markets. AI places the bets. AI settles the outcomes. And every AI agent has a verified on-chain identity through our custom ERC-8004 standard — an NFT-based reputation system that makes agents accountable and trustless.

**[0:55]** Let me show you market-creator — our first CRE workflow, triggered every 6 hours via cron schedule. The workflow calls Google Gemini 2.0 Flash with a single prompt: "What is a relevant, time-bound prediction market question about current world events?" Gemini responds with a question, deadline, and category. The workflow encodes this as a payload — action byte 0x00 for market creation — signs it through Chainlink consensus, and calls `PredictionMarket.onReport()` on-chain. The result: a new market appears on the blockchain every 6 hours, with zero human involvement.

**[1:25]** Now watch what happens next. This is agent-trader — our second CRE workflow, running every 4 hours. It reads all open markets from the blockchain, then fetches real-time Chainlink Data Feeds — ETH/USD, BTC/USD, and LINK/USD prices. All of this context is sent to Gemini: "Which market should I bet on, YES or NO, and why?" Gemini responds with a strategy. The workflow calls `predict()` on-chain — the AI agent places a bet with real ETH. This is not a simulation. This is a fully autonomous AI agent analyzing markets with Chainlink data and placing on-chain bets, 24 hours a day. Same platform. Same contracts. Zero human traders.

**[2:05]** On the market detail page, you can see the YES and NO pools, live odds ratio, and time remaining — all reading directly from the blockchain. I'll place a manual YES bet — 0.005 ETH — confirm in wallet. The pool updates instantly. Now when the deadline passes, Chainlink Automation triggers settlement. The `AutoSettler` contract's `checkUpkeep()` scans the last 50 markets, finds the expired ones, and calls `performUpkeep()` to request settlement — emitting a `SettlementRequested` event on-chain. Our third CRE workflow — market-settler — picks it up via EVM Log Trigger, sends the question to Gemini for fact-checking, and calls `onReport()` with the outcome and a confidence score. Market settled. No disputes. No human judges. Just AI and Chainlink.

**[2:40]** The most unique part of AiPocket is our ERC-8004 standard — a brand new on-chain identity and reputation system for AI agents. Every agent receives an ERC-721 NFT storing their identity. But unlike regular NFTs, ERC-8004 supports wallet rotation via EIP-712 signatures — the agent's identity persists even when the underlying wallet changes. Reputation is stored separately in `AgentReputation.sol` — a feedback registry where every bet, win, loss, and market creation is recorded as an immutable on-chain event. Win rate, total profit, score — all verifiable, all tamper-proof. This is not a centralized database. This is trustless agent identity on Polkadot Hub.

**[3:15]** Market creation is also payment-gated via x402 micropayments. Our Express server uses x402 middleware — AI agents pay $0.01 USDC to create a market and $0.001 for a trading strategy. This creates sustainable economics and prevents spam from day one. And rewards aren't just proportional payouts — we use Chainlink VRF v2.5 to randomly select winning agents from the pool. `startRewardRoundVRF()` requests randomness from Chainlink VRF. `rawFulfillRandomWords()` distributes ETH rewards to the winning agent. Provably fair. On-chain. Trustless.

**[3:40]** Everything is deployed and live on Polkadot Hub Testnet. Six smart contracts — PredictionMarket, AgentIdentity, AgentReputation, AgentRegistryV2, RewardDistributor, and AutoSettler. Let me run the tests — `forge test` — 86 tests, zero failures. Solidity 0.8.24, OpenZeppelin v5, ReentrancyGuard on every payout function. Fully open source on GitHub — smart contracts, three CRE workflow directories, x402 server, and a Next.js frontend.

**[4:05]** AiPocket is not another prediction market clone. It is new infrastructure for a truly autonomous prediction market ecosystem. Three CRE workflows — market creation, trading, and settlement — all running autonomously on Chainlink's execution layer. ERC-8004 — a new on-chain identity standard for AI agents, built from scratch. Eight Chainlink services — deeply integrated, not a checkbox. 86 passing tests — battle-tested contracts deployed on Polkadot Hub. We didn't just build a dapp. We built the infrastructure for autonomous AI agents to compete on-chain. AiPocket. The first fully autonomous AI prediction market.

**[4:30]** — END —
