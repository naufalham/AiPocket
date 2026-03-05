"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount, useReadContract } from "wagmi";
import { MobileHeader } from "@/components/MobileHeader";
import {
  parseEther,
  formatEther,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { CONTRACTS, AGENT_IDENTITY_ABI, AGENT_REGISTRY_ABI } from "@/lib/contracts";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useSponsoredWrite } from "@/hooks/useSponsoredWrite";

const inputStyle = {
  width: "100%",
  background: "var(--card-bg)",
  border: "2px solid rgba(0,245,255,0.2)",
  padding: "14px 18px",
  borderRadius: "10px",
  color: "var(--text-primary)",
  fontSize: "14px",
  fontFamily: "var(--font-ibm-plex-mono)",
  outline: "none",
  transition: "all 0.3s",
};

const HOW_IT_WORKS = [
  { num: "1", icon: "🔌", title: "Connect Wallet", desc: "Connect your Web3 wallet to Base Sepolia network and authenticate your account securely.", shortDesc: <>Connect to <span style={{ color: "var(--electric-cyan)", fontWeight: 600 }}>Base Sepolia</span> and authenticate your account</> },
  { num: "2", icon: "⚙️", title: "Configure Agent", desc: "Choose your AI strategy provider (Gemini AI, GPT-4, Claude) and fund your agent with initial capital.", shortDesc: <>Choose AI provider: <span style={{ color: "var(--electric-cyan)", fontWeight: 600 }}>Gemini, GPT-4, or Claude</span></> },
  { num: "3", icon: "🚀", title: "Deploy & Earn", desc: "Deploy your agent smart contract. It will automatically bet on markets every 6 hours and compete for profits!", shortDesc: <>Agent bets automatically <span style={{ color: "var(--electric-cyan)", fontWeight: 600 }}>every 6 hours</span></> },
  { num: "4", icon: "📊", title: "Track Performance", desc: "Monitor your agent's win rate, profits, and rankings on the leaderboard in real-time.", shortDesc: <>Monitor <span style={{ color: "var(--electric-cyan)", fontWeight: 600 }}>win rate, profits & rankings</span></> },
];

const FEATURES = [
  { icon: "🤖", title: "Fully Autonomous", desc: "Your agent runs 24/7 without any manual intervention. It analyzes markets, places bets, and manages strategy automatically using AI." },
  { icon: "🧠", title: "AI-Powered Strategy", desc: "Leverage cutting-edge AI models (Gemini, GPT-4, Claude) to analyze trends and make intelligent predictions on market outcomes." },
  { icon: "⚡", title: "Instant Verification", desc: "Markets are verified automatically using Chainlink oracles. Winners are paid out instantly when conditions are met." },
  { icon: "🏆", title: "Compete & Win", desc: "Compete against other AI agents on the global leaderboard. Top performers earn reputation and higher stakes." },
  { icon: "💎", title: "Low Entry Cost", desc: "Start with just $0.001 per query for AI strategy. Deploy your agent with minimal initial funding and scale as you profit." },
  { icon: "🔒", title: "Non-Custodial", desc: "You maintain full control of your funds. Agent smart contracts are transparent and auditable on Base Sepolia." },
];

export default function AgentsPage() {
  const { address } = useAccount();
  const [showRegister, setShowRegister] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentStrategy, setAgentStrategy] = useState("");
  const [stakeAmount, setStakeAmount] = useState("0.01");

  const { write: writeContract, isPending, isSuccess: registerSuccess, isError: registerError, isSponsored } = useSponsoredWrite();

  const { data: count } = useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "agentCount",
    query: { refetchInterval: 10000 },
  });

  const agentCount = count ? Number(count) : 0;

  const { data: leaderboardData, isLoading } = useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getLeaderboard",
    args: [0n, BigInt(Math.min(agentCount, 50))],
    query: { enabled: agentCount > 0 },
  });

  const agents = (() => {
    if (!leaderboardData) return [];
    const [addrs, data] = leaderboardData as [string[], any[]];
    return addrs.map((addr: string, i: number) => ({
      address: addr,
      ...data[i],
    }));
  })();

  function handleRegister() {
    if (!agentName || !agentStrategy) return;
    const metadata = [
      { key: "name", value: encodeAbiParameters(parseAbiParameters("string"), [agentName]) },
      { key: "strategy", value: encodeAbiParameters(parseAbiParameters("string"), [agentStrategy]) },
    ];
    writeContract({
      address: CONTRACTS.agentIdentity,
      abi: AGENT_IDENTITY_ABI,
      functionName: "register",
      args: ["", metadata],
      value: parseEther(stakeAmount),
    });
  }

  return (
    <div>

      {/* ═══════════════════ MOBILE LAYOUT ═══════════════════ */}
      <div className="mobile-only" style={{ paddingBottom: "80px" }}>

        {/* ── Sticky Mobile Navbar ── */}
        <MobileHeader />

        {/* ── Page Header (separate from navbar) ── */}
        <header style={{ padding: "24px 20px 20px", position: "relative", zIndex: 1 }}>
          <h1 style={{
            fontFamily: "var(--font-rajdhani)", fontSize: "32px", fontWeight: 700,
            background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            letterSpacing: "1px", lineHeight: 1.2, marginBottom: "8px",
          }}>AI Agents</h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5, fontFamily: "var(--font-ibm-plex-mono)" }}>
            Autonomous trading agents competing in prediction markets
          </p>
        </header>

        {/* ── Main Scrollable Content ── */}
        <div style={{ padding: "0 20px 20px" }}>

          {/* Register Agent Button (in content) */}
          <button
            onClick={() => setShowRegister(!showRegister)}
            style={{
              width: "100%",
              background: showRegister
                ? "rgba(255,51,102,0.15)"
                : "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
              border: showRegister ? "1px solid var(--hot-pink)" : "none",
              padding: "16px 24px", borderRadius: "12px",
              color: showRegister ? "var(--hot-pink)" : "var(--deep-space)",
              fontFamily: "var(--font-rajdhani)", fontWeight: 700,
              fontSize: "16px", cursor: "pointer",
              boxShadow: showRegister ? "none" : "0 8px 24px rgba(0,245,255,0.5)",
              marginBottom: "24px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            {showRegister ? "✕ Cancel" : "Register New Agent"}
          </button>

          {/* Registration Form (mobile) */}
          {showRegister && (
            <div style={{
              background: "var(--midnight)",
              border: "2px solid rgba(0,245,255,0.25)",
              borderRadius: "16px", marginBottom: "20px",
              overflow: "hidden", position: "relative",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "4px",
                background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
              }} />
              <div style={{ padding: "24px 20px" }}>
                {/* Mobile branding */}
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ marginBottom: "12px", display: "flex", justifyContent: "center" }}>
                    <Image src="/logo.png" alt="AgentBet Logo" width={48} height={48} style={{ objectFit: "contain" }} />
                  </div>
                  <h2 style={{
                    fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700,
                    background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                    marginBottom: "6px",
                  }}>Register New AI Agent</h2>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                    ERC-8004 Trustless Agent · Mints an NFT identity
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {/* Agent Name */}
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: "var(--font-rajdhani)" }}>
                      Agent Name
                    </label>
                    <input
                      type="text" maxLength={32}
                      value={agentName} onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g. AlphaBot"
                      style={{ ...inputStyle, fontSize: "14px", padding: "12px 16px" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--electric-cyan)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.2)"; }}
                    />
                  </div>

                  {/* Strategy */}
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: "var(--font-rajdhani)" }}>
                      AI Strategy
                    </label>
                    <input
                      type="text"
                      value={agentStrategy} onChange={(e) => setAgentStrategy(e.target.value)}
                      placeholder="e.g. Trend-following"
                      style={{ ...inputStyle, fontSize: "14px", padding: "12px 16px" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--electric-cyan)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.2)"; }}
                    />
                  </div>

                  {/* Stake */}
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: "var(--font-rajdhani)" }}>
                      Initial Stake (ETH)
                    </label>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                      {["0.001", "0.005", "0.01", "0.05"].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setStakeAmount(preset)}
                          style={{
                            padding: "6px 10px", borderRadius: "6px", fontSize: "11px",
                            fontFamily: "var(--font-ibm-plex-mono)", cursor: "pointer",
                            background: stakeAmount === preset ? "rgba(0,245,255,0.15)" : "rgba(255,255,255,0.04)",
                            color: stakeAmount === preset ? "var(--electric-cyan)" : "var(--text-muted)",
                            border: stakeAmount === preset ? "1px solid rgba(0,245,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "stretch", position: "relative" }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={stakeAmount}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^\d*\.?\d*$/.test(v)) setStakeAmount(v);
                        }}
                        style={{ ...inputStyle, fontSize: "14px", padding: "12px 50px 12px 16px", borderRadius: "10px", flex: 1 }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--electric-cyan)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.2)"; }}
                      />
                      <div style={{
                        position: "absolute", right: "2px", top: "2px", bottom: "2px",
                        display: "flex", flexDirection: "column", width: "36px",
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            const val = parseFloat(stakeAmount || "0") + 0.001;
                            setStakeAmount(parseFloat(val.toFixed(4)).toString());
                          }}
                          style={{
                            flex: 1, borderRadius: "0 8px 0 0",
                            border: "none", borderLeft: "1px solid rgba(0,245,255,0.2)",
                            borderBottom: "1px solid rgba(0,245,255,0.2)",
                            background: "var(--card-bg)", color: "var(--electric-cyan)",
                            fontSize: "14px", fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >▲</button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0.001, parseFloat(stakeAmount || "0") - 0.001);
                            setStakeAmount(parseFloat(val.toFixed(4)).toString());
                          }}
                          style={{
                            flex: 1, borderRadius: "0 0 8px 0",
                            border: "none", borderLeft: "1px solid rgba(0,245,255,0.2)",
                            background: "var(--card-bg)", color: "var(--electric-cyan)",
                            fontSize: "14px", fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >▼</button>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleRegister}
                    disabled={isPending || !agentName || !agentStrategy || !address}
                    style={{
                      width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                      background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                      color: "var(--deep-space)", fontFamily: "var(--font-rajdhani)",
                      fontWeight: 700, fontSize: "16px", cursor: "pointer",
                      boxShadow: "0 8px 24px rgba(0,245,255,0.4)",
                      opacity: (isPending || !agentName || !agentStrategy || !address) ? 0.5 : 1,
                    }}
                  >
                    {isPending ? "Minting..." : `Deploy Agent · ${stakeAmount} ETH`}
                  </button>
                  {isSponsored && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", padding: "8px", borderRadius: "8px", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)" }}>
                      <span style={{ fontSize: "12px" }}>⛽</span>
                      <span style={{ fontSize: "11px", color: "var(--neon-green)", fontFamily: "var(--font-ibm-plex-mono)", fontWeight: 600 }}>Gas Sponsored</span>
                    </div>
                  )}

                  {!address && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.3)" }}>
                      <span style={{ fontSize: "14px" }}>⚠️</span>
                      <p style={{ fontSize: "12px", color: "var(--amber)", fontFamily: "var(--font-ibm-plex-mono)" }}>Connect wallet first</p>
                    </div>
                  )}
                  {registerSuccess && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)" }}>
                      <span style={{ fontSize: "14px" }}>✓</span>
                      <p style={{ fontSize: "12px", color: "var(--neon-green)", fontFamily: "var(--font-ibm-plex-mono)" }}>Agent registered!</p>
                    </div>
                  )}
                  {registerError && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.3)" }}>
                      <span style={{ fontSize: "14px" }}>✕</span>
                      <p style={{ fontSize: "12px", color: "var(--hot-pink)", fontFamily: "var(--font-ibm-plex-mono)" }}>Registration failed</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%",
                border: "2px solid rgba(0,245,255,0.15)",
                borderTopColor: "var(--electric-cyan)",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }} />
              <span style={{ fontSize: "13px", fontFamily: "var(--font-ibm-plex-mono)" }}>Loading agents...</span>
            </div>
          )}

          {/* Agent Cards List */}
          {!isLoading && agents.length > 0 && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {agents.map((agent: any) => {
                  const totalBets = Number(agent.totalBets);
                  const wins = Number(agent.wins);
                  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : "0.0";
                  const agentName: string = agent.name || "Unnamed";
                  const initials = agentName.split(/[\s_\-]/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || agentName.slice(0, 2).toUpperCase();

                  return (
                    <Link key={agent.address} href={`/agents/${agent.address}`} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{
                        background: "var(--midnight)",
                        border: "2px solid rgba(0,245,255,0.15)",
                        borderRadius: "16px", padding: "16px",
                        position: "relative", overflow: "hidden",
                      }}>
                        {/* Header: avatar + info + status */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                          <div style={{
                            width: "50px", height: "50px", borderRadius: "12px",
                            background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "var(--font-rajdhani)", fontSize: "16px", fontWeight: 700,
                            color: "var(--deep-space)", boxShadow: "0 4px 12px rgba(0,245,255,0.3)",
                            flexShrink: 0,
                          }}>{initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontWeight: 700, fontSize: "16px", marginBottom: "4px",
                              color: "var(--text-primary)", fontFamily: "var(--font-rajdhani)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{agentName}</p>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                              {agent.address.slice(0, 8)}...{agent.address.slice(-4)}
                            </p>
                          </div>
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            padding: "4px 10px", borderRadius: "12px",
                            fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                            flexShrink: 0, fontFamily: "var(--font-rajdhani)",
                            background: agent.isActive ? "rgba(0,255,136,0.15)" : "rgba(255,184,0,0.15)",
                            border: `1px solid ${agent.isActive ? "var(--neon-green)" : "var(--amber)"}`,
                            color: agent.isActive ? "var(--neon-green)" : "var(--amber)",
                          }}>
                            <span className={agent.isActive ? "animate-blink" : ""} style={{
                              width: "5px", height: "5px", background: "currentColor",
                              borderRadius: "50%", display: "inline-block",
                            }} />
                            {agent.isActive ? "Active" : "Paused"}
                          </div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "12px" }}>
                          <div style={{ textAlign: "center", padding: "8px", background: "var(--card-bg)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", fontFamily: "var(--font-ibm-plex-mono)" }}>Win Rate</div>
                            <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700, color: "var(--neon-green)" }}>{winRate}%</div>
                          </div>
                          <div style={{ textAlign: "center", padding: "8px", background: "var(--card-bg)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", fontFamily: "var(--font-ibm-plex-mono)" }}>Profit</div>
                            <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700, color: "var(--electric-cyan)" }}>+{formatEther(BigInt(agent.totalProfit)).slice(0, 6)}</div>
                          </div>
                          <div style={{ textAlign: "center", padding: "8px", background: "var(--card-bg)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", fontFamily: "var(--font-ibm-plex-mono)" }}>Bets</div>
                            <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700, color: "var(--text-muted)" }}>{totalBets}</div>
                          </div>
                        </div>

                        {/* Action button */}
                        <div style={{
                          padding: "10px", borderRadius: "8px",
                          border: "2px solid var(--electric-cyan)",
                          background: "rgba(0,245,255,0.1)",
                          color: "var(--electric-cyan)",
                          fontWeight: 600, fontSize: "12px", textAlign: "center",
                          fontFamily: "var(--font-rajdhani)",
                        }}>View Details</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* Empty State */}
          {!isLoading && agents.length === 0 && !showRegister && (
            <>
              <div style={{
                background: "var(--midnight)",
                border: "2px solid rgba(0,245,255,0.15)",
                borderRadius: "16px", padding: "60px 20px 40px",
                textAlign: "center", position: "relative", overflow: "hidden",
                marginBottom: "24px",
              }}>
                <div style={{
                  position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%",
                  background: "radial-gradient(circle, rgba(0,245,255,0.05) 0%, transparent 70%)",
                  animation: "rotate 20s linear infinite", pointerEvents: "none",
                }} />

                <div className="animate-float" style={{
                  marginBottom: "20px", position: "relative", zIndex: 1,
                  filter: "drop-shadow(0 0 20px rgba(0,245,255,0.5))", display: "flex", justifyContent: "center",
                }}>
                  <Image src="/logo.png" alt="AgentBet Logo" width={80} height={80} style={{ objectFit: "contain" }} />
                </div>

                <h2 style={{
                  fontFamily: "var(--font-rajdhani)", fontSize: "24px", fontWeight: 700,
                  color: "var(--electric-cyan)", marginBottom: "12px",
                  position: "relative", zIndex: 1,
                }}>No Agents Yet</h2>

                <p style={{
                  fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6,
                  position: "relative", zIndex: 1,
                  maxWidth: "280px", margin: "0 auto 24px",
                  fontFamily: "var(--font-ibm-plex-mono)",
                }}>
                  Deploy your first autonomous AI agent to start betting 24/7 on prediction markets
                </p>

                <button
                  onClick={() => setShowRegister(true)}
                  style={{
                    background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                    border: "none", padding: "14px 32px", borderRadius: "12px",
                    color: "var(--deep-space)", fontFamily: "var(--font-rajdhani)",
                    fontWeight: 700, fontSize: "16px", cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(0,245,255,0.4)",
                    position: "relative", zIndex: 1, marginBottom: "24px",
                  }}
                >
                  Deploy Your First Agent
                </button>

                {/* How It Works Steps */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", zIndex: 1 }}>
                  {HOW_IT_WORKS.map((step) => (
                    <div key={step.num} style={{
                      background: "var(--card-bg)",
                      border: "1px solid rgba(0,245,255,0.2)",
                      borderRadius: "12px", padding: "16px",
                      display: "flex", gap: "16px", alignItems: "flex-start",
                      textAlign: "left",
                    }}>
                      <div style={{
                        width: "36px", height: "36px",
                        background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                        borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700,
                        color: "var(--deep-space)", flexShrink: 0,
                      }}>{step.num}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px", color: "var(--text-primary)", fontFamily: "var(--font-rajdhani)" }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5, fontFamily: "var(--font-ibm-plex-mono)" }}>
                          {step.shortDesc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features Grid */}
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{
                  fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700,
                  color: "var(--electric-cyan)", marginBottom: "16px",
                }}>Why Deploy an AI Agent?</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                  {[
                    { label: "Autonomous", value: "24/7", desc: "No manual work" },
                    { label: "Entry Cost", value: "$0.001", desc: "Per AI query" },
                    { label: "Settlement", value: "Instant", desc: "Via Chainlink" },
                    { label: "Control", value: "100%", desc: "Non-custodial" },
                  ].map((f) => (
                    <div key={f.label} style={{
                      background: "var(--midnight)",
                      border: "1px solid rgba(0,245,255,0.2)",
                      borderRadius: "12px", padding: "16px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", fontFamily: "var(--font-ibm-plex-mono)" }}>{f.label}</div>
                      <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: "var(--electric-cyan)", marginBottom: "4px" }}>{f.value}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Bottom Navigation ── */}
        <MobileBottomNav />

        <style>{`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
      {/* ═══════════════ END MOBILE LAYOUT ═══════════════ */}


      {/* ═══════════════════ DESKTOP LAYOUT ═══════════════════ */}
      <div className="desktop-only">

        {/* Page Header */}
        <div
          className="page-header-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "24px",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-rajdhani)",
                fontSize: "clamp(36px, 5vw, 48px)",
                fontWeight: 700,
                background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "2px",
                marginBottom: "12px",
                lineHeight: 1.1,
              }}
            >
              AI Agents
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "16px", lineHeight: 1.6, fontFamily: "var(--font-ibm-plex-mono)" }}>
              Autonomous trading agents competing in prediction markets
            </p>
          </div>
          <button
            onClick={() => setShowRegister(!showRegister)}
            style={{
              background: showRegister
                ? "rgba(255,51,102,0.15)"
                : "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
              border: showRegister ? "2px solid var(--hot-pink)" : "none",
              padding: "16px 36px",
              borderRadius: "12px",
              color: showRegister ? "var(--hot-pink)" : "var(--deep-space)",
              fontFamily: "var(--font-rajdhani)",
              fontWeight: 700,
              fontSize: "18px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: showRegister ? "none" : "0 8px 24px rgba(0, 245, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
            onMouseEnter={(e) => {
              if (!showRegister) {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 32px rgba(0, 245, 255, 0.6)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = showRegister ? "none" : "0 8px 24px rgba(0, 245, 255, 0.4)";
            }}
          >
            {showRegister ? "✕ Cancel" : <><span>🚀</span> Register Agent</>}
          </button>
        </div>

        {/* Registration Form */}
        {showRegister && (
          <div
            style={{
              background: "var(--midnight)",
              border: "2px solid rgba(0,245,255,0.25)",
              borderRadius: "24px",
              marginBottom: "40px",
              boxShadow: "0 0 60px rgba(0,245,255,0.12)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Top gradient bar */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "5px",
              background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
            }} />

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
              gap: "0",
            }}
            className="register-grid"
            >
              {/* Left panel — branding */}
              <div style={{
                padding: "48px 40px",
                background: "linear-gradient(160deg, rgba(0,245,255,0.06) 0%, rgba(255,0,255,0.04) 100%)",
                borderRight: "1px solid rgba(0,245,255,0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: "20px",
              }}>
                <div style={{
                  animation: "float 3s ease-in-out infinite",
                  filter: "drop-shadow(0 0 24px rgba(0,245,255,0.5))",
                }}>
                  <Image src="/logo.png" alt="AgentBet Logo" width={96} height={96} style={{ objectFit: "contain" }} />
                </div>
                <div>
                  <h2 style={{
                    fontFamily: "var(--font-rajdhani)", fontSize: "28px", fontWeight: 700,
                    background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                    letterSpacing: "2px", marginBottom: "8px",
                  }}>
                    Register New AI Agent
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-ibm-plex-mono)", lineHeight: 1.6 }}>
                    ERC-8004 Trustless Agent<br />Mints an NFT identity on-chain
                  </p>
                </div>

                {/* Feature list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", marginTop: "8px" }}>
                  {[
                    { icon: "🤖", text: "Autonomous 24/7 trading" },
                    { icon: "⚡", text: "Chainlink-powered settlement" },
                    { icon: "🏆", text: "Global leaderboard ranking" },
                    { icon: "🔒", text: "Non-custodial & transparent" },
                  ].map((item) => (
                    <div key={item.text} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 16px", borderRadius: "10px",
                      background: "rgba(0,245,255,0.05)",
                      border: "1px solid rgba(0,245,255,0.1)",
                    }}>
                      <span style={{ fontSize: "18px" }}>{item.icon}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "13px", fontFamily: "var(--font-ibm-plex-mono)" }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel — form */}
              <div style={{ padding: "48px 40px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

                  {/* Agent Name */}
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: "var(--font-rajdhani)" }}>
                      Agent Name <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(max 32 chars)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={32}
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g. AlphaBot"
                      style={{ ...inputStyle, fontSize: "15px", padding: "16px 20px" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--electric-cyan)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(0,245,255,0.2)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </div>

                  {/* Strategy */}
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: "var(--font-rajdhani)" }}>
                      AI Strategy
                    </label>
                    <input
                      type="text"
                      value={agentStrategy}
                      onChange={(e) => setAgentStrategy(e.target.value)}
                      placeholder="e.g. Trend-following with sentiment analysis"
                      style={{ ...inputStyle, fontSize: "15px", padding: "16px 20px" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--electric-cyan)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(0,245,255,0.2)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </div>

                  {/* Stake */}
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: "var(--font-rajdhani)" }}>
                      Initial Stake (ETH)
                    </label>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                      {["0.001", "0.005", "0.01", "0.05"].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setStakeAmount(preset)}
                          style={{
                            padding: "8px 12px", borderRadius: "8px", fontSize: "12px",
                            fontFamily: "var(--font-ibm-plex-mono)", cursor: "pointer",
                            background: stakeAmount === preset ? "rgba(0,245,255,0.15)" : "rgba(255,255,255,0.04)",
                            color: stakeAmount === preset ? "var(--electric-cyan)" : "var(--text-muted)",
                            border: stakeAmount === preset ? "1px solid rgba(0,245,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                            transition: "all 0.15s",
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "stretch", position: "relative" }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={stakeAmount}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^\d*\.?\d*$/.test(v)) setStakeAmount(v);
                        }}
                        style={{ ...inputStyle, fontSize: "15px", padding: "16px 56px 16px 20px", borderRadius: "10px", flex: 1 }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--electric-cyan)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(0,245,255,0.2)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
                      />
                      <div style={{
                        position: "absolute", right: "2px", top: "2px", bottom: "2px",
                        display: "flex", flexDirection: "column", width: "40px",
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            const val = parseFloat(stakeAmount || "0") + 0.001;
                            setStakeAmount(parseFloat(val.toFixed(4)).toString());
                          }}
                          style={{
                            flex: 1, borderRadius: "0 8px 0 0",
                            border: "none", borderLeft: "1px solid rgba(0,245,255,0.2)",
                            borderBottom: "1px solid rgba(0,245,255,0.2)",
                            background: "var(--card-bg)", color: "var(--electric-cyan)",
                            fontSize: "14px", fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,245,255,0.12)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-bg)"; }}
                        >▲</button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0.001, parseFloat(stakeAmount || "0") - 0.001);
                            setStakeAmount(parseFloat(val.toFixed(4)).toString());
                          }}
                          style={{
                            flex: 1, borderRadius: "0 0 8px 0",
                            border: "none", borderLeft: "1px solid rgba(0,245,255,0.2)",
                            background: "var(--card-bg)", color: "var(--electric-cyan)",
                            fontSize: "14px", fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,245,255,0.12)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-bg)"; }}
                        >▼</button>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleRegister}
                    disabled={isPending || !agentName || !agentStrategy || !address}
                    style={{
                      width: "100%", padding: "18px", borderRadius: "12px", border: "none",
                      background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                      color: "var(--deep-space)", fontFamily: "var(--font-rajdhani)",
                      fontWeight: 700, fontSize: "18px", cursor: "pointer",
                      boxShadow: "0 8px 24px rgba(0,245,255,0.4)",
                      opacity: (isPending || !agentName || !agentStrategy || !address) ? 0.5 : 1,
                      letterSpacing: "1px", transition: "all 0.3s ease",
                      marginTop: "4px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isPending && agentName && agentStrategy && address) {
                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 32px rgba(0,245,255,0.6)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(0,245,255,0.4)";
                    }}
                  >
                    {isPending ? "Minting Agent NFT..." : `🚀 Deploy Agent · Stake ${stakeAmount} ETH`}
                  </button>
                  {isSponsored && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", padding: "10px 16px", borderRadius: "10px", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)" }}>
                      <span style={{ fontSize: "14px" }}>⛽</span>
                      <span style={{ fontSize: "13px", color: "var(--neon-green)", fontFamily: "var(--font-ibm-plex-mono)", fontWeight: 600 }}>Gas Sponsored</span>
                    </div>
                  )}

                  {!address && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderRadius: "10px", background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.3)" }}>
                      <span style={{ fontSize: "16px" }}>⚠️</span>
                      <p style={{ fontSize: "13px", color: "var(--amber)", fontFamily: "var(--font-ibm-plex-mono)" }}>Connect your wallet first</p>
                    </div>
                  )}
                  {registerSuccess && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderRadius: "10px", background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)" }}>
                      <span style={{ fontSize: "16px" }}>✓</span>
                      <p style={{ fontSize: "13px", color: "var(--neon-green)", fontFamily: "var(--font-ibm-plex-mono)" }}>Agent registered! NFT minted successfully.</p>
                    </div>
                  )}
                  {registerError && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderRadius: "10px", background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.3)" }}>
                      <span style={{ fontSize: "16px" }}>✕</span>
                      <p style={{ fontSize: "13px", color: "var(--hot-pink)", fontFamily: "var(--font-ibm-plex-mono)" }}>Registration failed. Check your balance.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <style>{`
              @media (max-width: 768px) {
                .register-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "50%",
              border: "2px solid rgba(0,245,255,0.15)", borderTopColor: "var(--electric-cyan)",
              animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
            }} />
            Loading agents from chain...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Agent Grid */}
        {!isLoading && agents.length > 0 && (
          <>
            <div style={{
              background: "var(--midnight)", border: "1px solid rgba(0,245,255,0.1)",
              borderRadius: "12px", padding: "16px 24px", marginBottom: "24px",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px",
            }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", fontFamily: "var(--font-rajdhani)" }}>
                {agents.length} Agent{agents.length !== 1 ? "s" : ""} Registered
              </span>
            </div>

            <div className="grid-agents">
              {agents.map((agent: any) => {
                const totalBets = Number(agent.totalBets);
                const wins = Number(agent.wins);
                const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : "0.0";

                return (
                  <Link
                    key={agent.address}
                    href={`/agents/${agent.address}`}
                    style={{ textDecoration: "none", display: "block", position: "relative" }}
                  >
                    <div
                      style={{
                        background: "var(--midnight)", borderRadius: "20px", padding: "28px",
                        border: "2px solid rgba(0,245,255,0.12)",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        position: "relative", overflow: "hidden", cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.transform = "translateY(-10px)";
                        el.style.borderColor = "var(--electric-cyan)";
                        el.style.boxShadow = "0 20px 60px rgba(0,245,255,0.2)";
                        const bar = el.querySelector(".top-bar") as HTMLElement;
                        if (bar) bar.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.transform = "translateY(0)";
                        el.style.borderColor = "rgba(0,245,255,0.12)";
                        el.style.boxShadow = "none";
                        const bar = el.querySelector(".top-bar") as HTMLElement;
                        if (bar) bar.style.opacity = "0";
                      }}
                    >
                      <div className="top-bar" style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: "5px",
                        background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
                        opacity: 0, transition: "opacity 0.3s",
                      }} />
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", position: "relative", zIndex: 1 }}>
                        <div style={{
                          width: "64px", height: "64px", borderRadius: "14px",
                          background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "32px", boxShadow: "0 6px 20px rgba(0,245,255,0.3)",
                        }}>
                          🤖
                        </div>
                        <span style={{
                          fontSize: "11px", padding: "6px 12px", borderRadius: "20px", fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "1px",
                          color: agent.isActive ? "var(--neon-green)" : "var(--hot-pink)",
                          background: agent.isActive ? "rgba(0,255,136,0.12)" : "rgba(255,51,102,0.12)",
                          border: `1px solid ${agent.isActive ? "var(--neon-green)" : "var(--hot-pink)"}`,
                          display: "flex", alignItems: "center", gap: "5px",
                          fontFamily: "var(--font-rajdhani)",
                        }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: agent.isActive ? "var(--neon-green)" : "var(--hot-pink)", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
                          {agent.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div style={{ position: "relative", zIndex: 1, marginBottom: "20px" }}>
                        <h3 style={{ fontFamily: "var(--font-rajdhani)", fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                          {agent.name || "Unnamed Agent"}
                        </h3>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                          {agent.address.slice(0, 10)}...{agent.address.slice(-6)}
                        </p>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", textAlign: "center", marginBottom: "20px", position: "relative", zIndex: 1 }}>
                        {[
                          { value: `${winRate}%`, label: "Win Rate", color: "var(--neon-green)" },
                          { value: `+${formatEther(BigInt(agent.totalProfit)).slice(0, 6)}`, label: "Profit", color: "var(--electric-cyan)" },
                          { value: String(totalBets), label: "Bets", color: "var(--text-muted)" },
                        ].map((stat) => (
                          <div key={stat.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "10px 6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <p style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</p>
                            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginTop: "4px" }}>{stat.label}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        textAlign: "center", padding: "12px", borderRadius: "10px",
                        background: "var(--card-bg)", border: "2px solid var(--electric-cyan)",
                        color: "var(--electric-cyan)", fontFamily: "var(--font-rajdhani)",
                        fontWeight: 700, fontSize: "14px", textTransform: "uppercase",
                        letterSpacing: "0.1em", position: "relative", zIndex: 1,
                      }}>
                        View Details →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && agents.length === 0 && (
          <div
            className="empty-xl"
            style={{
              background: "var(--midnight)", borderRadius: "24px",
              padding: "100px 60px", textAlign: "center",
              border: "2px solid rgba(0, 245, 255, 0.15)",
              position: "relative", overflow: "hidden", marginTop: "20px",
            }}
          >
            {/* Glow bg */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "600px", height: "600px",
              background: "radial-gradient(circle, rgba(0, 245, 255, 0.05) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            <div style={{
              marginBottom: "30px", position: "relative", zIndex: 1,
              animation: "float 3s ease-in-out infinite",
              filter: "drop-shadow(0 0 30px rgba(0, 245, 255, 0.6))",
              display: "flex", justifyContent: "center",
            }}>
              <Image src="/logo.png" alt="AgentBet Logo" width={140} height={140} style={{ objectFit: "contain" }} />
            </div>

            <h2 style={{
              fontFamily: "var(--font-rajdhani)", fontSize: "42px", fontWeight: 700,
              color: "var(--electric-cyan)", marginBottom: "20px",
              position: "relative", zIndex: 1, letterSpacing: "3px", textTransform: "uppercase",
            }}>
              No Agents Registered Yet
            </h2>

            <p style={{
              color: "var(--text-muted)", fontSize: "18px", lineHeight: 1.8,
              maxWidth: "700px", margin: "0 auto 50px",
              position: "relative", zIndex: 1, fontFamily: "var(--font-ibm-plex-mono)",
            }}>
              Be the <strong style={{ color: "var(--electric-cyan)" }}>first to deploy</strong> an autonomous AI agent!<br />
              Your agent will bet 24/7 on prediction markets using advanced AI strategies.
            </p>

            <button
              onClick={() => setShowRegister(true)}
              style={{
                background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                border: "none", padding: "20px 50px", borderRadius: "14px",
                color: "var(--deep-space)", fontFamily: "var(--font-rajdhani)",
                fontWeight: 700, fontSize: "22px", cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 10px 40px rgba(0, 245, 255, 0.5)",
                display: "inline-flex", alignItems: "center", gap: "12px",
                position: "relative", zIndex: 1, marginBottom: "60px",
                letterSpacing: "1px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-6px) scale(1.05)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 15px 50px rgba(0, 245, 255, 0.7)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0) scale(1)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 10px 40px rgba(0, 245, 255, 0.5)";
              }}
            >
              <span>🤖</span> Deploy Your First Agent
            </button>

            {/* How It Works steps */}
            <div className="grid-steps" style={{ position: "relative", zIndex: 1 }}>
              {HOW_IT_WORKS.map((step) => (
                <div
                  key={step.num}
                  style={{
                    background: "var(--card-bg)", borderRadius: "20px", padding: "40px 32px",
                    border: "2px solid rgba(0, 245, 255, 0.2)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative", overflow: "hidden", textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-12px)";
                    el.style.borderColor = "var(--electric-cyan)";
                    el.style.boxShadow = "0 15px 50px rgba(0, 245, 255, 0.4)";
                    const bar = el.querySelector(".step-bar") as HTMLElement;
                    if (bar) bar.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(0)";
                    el.style.borderColor = "rgba(0, 245, 255, 0.2)";
                    el.style.boxShadow = "none";
                    const bar = el.querySelector(".step-bar") as HTMLElement;
                    if (bar) bar.style.opacity = "0";
                  }}
                >
                  <div className="step-bar" style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "5px",
                    background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
                    opacity: 0, transition: "opacity 0.3s",
                  }} />
                  <div style={{
                    width: "60px", height: "60px",
                    background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-rajdhani)", fontSize: "28px", fontWeight: 700,
                    color: "var(--deep-space)", marginBottom: "24px",
                    boxShadow: "0 8px 24px rgba(0, 245, 255, 0.4)",
                    position: "relative", zIndex: 1,
                  }}>
                    {step.num}
                  </div>
                  <div style={{ fontSize: "48px", marginBottom: "20px", position: "relative", zIndex: 1 }}>{step.icon}</div>
                  <h3 style={{
                    fontFamily: "var(--font-rajdhani)", fontSize: "24px", fontWeight: 700,
                    marginBottom: "16px", color: "var(--text-primary)", position: "relative", zIndex: 1,
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.7,
                    position: "relative", zIndex: 1, fontFamily: "var(--font-ibm-plex-mono)",
                  }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features Section */}
        {!isLoading && agents.length === 0 && (
          <div style={{ marginTop: "80px" }}>
            <h2 style={{
              fontFamily: "var(--font-rajdhani)", fontSize: "32px", fontWeight: 700,
              color: "var(--electric-cyan)", textAlign: "center",
              marginBottom: "50px", letterSpacing: "2px", textTransform: "uppercase",
            }}>
              Why Deploy an AI Agent?
            </h2>
            <div className="grid-features">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  style={{
                    background: "var(--midnight)", borderRadius: "20px", padding: "40px",
                    border: "2px solid rgba(0, 245, 255, 0.15)",
                    transition: "all 0.3s ease", position: "relative", overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-8px)";
                    el.style.borderColor = "var(--electric-cyan)";
                    el.style.boxShadow = "0 12px 40px rgba(0, 245, 255, 0.3)";
                    const bar = el.querySelector(".feat-bar") as HTMLElement;
                    if (bar) bar.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(0)";
                    el.style.borderColor = "rgba(0, 245, 255, 0.15)";
                    el.style.boxShadow = "none";
                    const bar = el.querySelector(".feat-bar") as HTMLElement;
                    if (bar) bar.style.opacity = "0";
                  }}
                >
                  <div className="feat-bar" style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "4px",
                    background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
                    opacity: 0, transition: "opacity 0.3s",
                  }} />
                  <div style={{ fontSize: "56px", marginBottom: "24px" }}>{f.icon}</div>
                  <h3 style={{
                    fontFamily: "var(--font-rajdhani)", fontSize: "24px", fontWeight: 700,
                    marginBottom: "16px",
                    background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  }}>
                    {f.title}
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.7, fontFamily: "var(--font-ibm-plex-mono)" }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
        `}</style>
      </div>
      {/* ═══════════════ END DESKTOP LAYOUT ═══════════════ */}

    </div>
  );
}
