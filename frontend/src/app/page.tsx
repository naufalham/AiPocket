"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useReadContract, useReadContracts } from "wagmi";
import { MobileHeader } from "@/components/MobileHeader";
import { formatEther } from "viem";
import {
  CONTRACTS,
  PREDICTION_MARKET_ABI,
  AGENT_REGISTRY_ABI,
  MarketStatus,
} from "@/lib/contracts";
import { MobileBottomNav } from "@/components/MobileBottomNav";

/* ─── Desktop stat card ─── */
function StatCard({
  label,
  value,
  sub,
  color = "var(--electric-cyan)",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-2xl transition-all duration-300 hover:-translate-y-2"
      style={{
        background: "var(--card-bg)",
        border: "1px solid rgba(0, 245, 255, 0.2)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        padding: "28px 24px",
      }}
    >
      <p style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px" }}>
        {label}
      </p>
      <p style={{ color, fontFamily: "var(--font-rajdhani), sans-serif", fontSize: "48px", fontWeight: 700, lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "8px" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ─── Mobile quick-stat card ─── */
function MobileStatCard({ tag, value, label, color }: { tag: string; value: string; label: string; color: string }) {
  return (
    <div style={{
      background: "var(--midnight)",
      border: "1px solid rgba(0,245,255,0.2)",
      borderRadius: "16px",
      padding: "20px 16px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px",
        color: "var(--electric-cyan)", background: "rgba(0,245,255,0.1)",
        border: "1px solid rgba(0,245,255,0.3)", padding: "3px 8px",
        borderRadius: "4px", display: "inline-block", marginBottom: "12px",
        fontFamily: "var(--font-ibm-plex-mono)",
      }}>{tag}</div>
      <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "28px", fontWeight: 700, color, marginBottom: "4px" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
    </div>
  );
}

const STATUS_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  OPEN:                 { color: "var(--neon-green)",    bg: "rgba(0,255,136,0.15)",  border: "var(--neon-green)",    label: "Live"      },
  SETTLEMENT_REQUESTED: { color: "var(--amber)",         bg: "rgba(255,184,0,0.15)",  border: "var(--amber)",         label: "Settling"  },
  SETTLED:              { color: "var(--electric-cyan)", bg: "rgba(0,245,255,0.15)",  border: "var(--electric-cyan)", label: "Settled"   },
  CANCELLED:            { color: "var(--hot-pink)",      bg: "rgba(255,51,102,0.15)", border: "var(--hot-pink)",      label: "Cancelled" },
};

const RANK_MEDALS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = ["var(--golden)", "#C0C0C0", "#CD7F32"];

export default function Dashboard() {
  /* ── Data fetches ── */
  const { data: nextMarketId } = useReadContract({
    address: CONTRACTS.predictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: "nextMarketId",
    query: { refetchInterval: 10000 },
  });

  const { data: agentCountData } = useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "agentCount",
    query: { refetchInterval: 10000 },
  });

  const totalMarkets = nextMarketId ? Number(nextMarketId) : 0;
  const totalAgents  = agentCountData ? Number(agentCountData) : 0;

  /* Top 3 agents for leaderboard preview */
  const { data: leaderboardData } = useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getLeaderboard",
    args: [0n, BigInt(Math.min(totalAgents, 3))],
    query: { enabled: totalAgents > 0 },
  });

  /* Last 3 markets for trending section */
  const trendingContracts = useMemo(() => {
    const count = Math.min(3, totalMarkets);
    const start = Math.max(0, totalMarkets - 3);
    return Array.from({ length: count }, (_, i) => ({
      address: CONTRACTS.predictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getMarket" as const,
      args: [BigInt(start + i)] as const,
    }));
  }, [totalMarkets]);

  const { data: trendingData } = useReadContracts({
    contracts: trendingContracts,
    query: { enabled: trendingContracts.length > 0 },
  });

  /* ── Derived data ── */
  const topAgents = useMemo(() => {
    if (!leaderboardData) return [];
    const [addrs, data] = leaderboardData as [string[], any[]];
    return addrs
      .map((addr: string, i: number) => ({ address: addr, ...data[i] }))
      .sort((a: any, b: any) => Number(b.score) - Number(a.score))
      .slice(0, 3);
  }, [leaderboardData]);

  const trendingMarkets = useMemo(() => {
    if (!trendingData) return [];
    const start = Math.max(0, totalMarkets - 3);
    return trendingData
      .map((r, i) => r.status === "success" && r.result ? { id: start + i, ...(r.result as any) } : null)
      .filter(Boolean)
      .reverse() as any[];
  }, [trendingData, totalMarkets]);

  const now = Math.floor(Date.now() / 1000);

  /* ── Desktop data ── */
  const chainlinkServices = [
    { name: "CRE",          desc: "Core Orchestration"  },
    { name: "x402",         desc: "AI Agent Payments"   },
    { name: "Data Streams", desc: "Real-time Prices"    },
    { name: "Data Feeds",   desc: "Price Context"       },
    { name: "Functions",    desc: "Off-chain Compute"   },
    { name: "CCIP",         desc: "Cross-chain"         },
    { name: "VRF",          desc: "Random Rewards"      },
    { name: "Automation",   desc: "Auto-settle"         },
  ];

  const steps = [
    { num: "1", label: "AI Detects Events", desc: "CRE Cron + Gemini AI scans news every 6h",              color: "var(--electric-cyan)" },
    { num: "2", label: "Creates Markets",   desc: "Autonomous creation via CRE + x402 payment",            color: "var(--neon-green)"    },
    { num: "3", label: "Agents Trade",      desc: "AI analyzes + bets using Data Feeds for price context", color: "var(--amber)"         },
    { num: "4", label: "AI Settles",        desc: "Gemini verifies outcome, CRE writes on-chain",          color: "var(--neon-pink)"     },
  ];

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div>

      {/* ═══════════════════ MOBILE LAYOUT ═══════════════════ */}
      <div className="mobile-only" style={{ paddingBottom: "80px" }}>

        {/* ── Sticky Mobile Header ── */}
        <MobileHeader>
          {/* Stats row */}
          <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span className="animate-blink" style={{ width: "6px", height: "6px", background: "var(--neon-green)", borderRadius: "50%", display: "inline-block" }} />
              {totalMarkets} Live Markets
            </span>
            <span>{totalAgents} Agents</span>
          </div>
        </MobileHeader>

        {/* ── Main Scrollable Content ── */}
        <div style={{ padding: "20px" }}>

          {/* Welcome Card */}
          <div style={{
            background: "linear-gradient(135deg, rgba(0,245,255,0.15), rgba(255,0,255,0.15))",
            border: "2px solid rgba(0,245,255,0.3)", borderRadius: "20px",
            padding: "24px 20px", marginBottom: "20px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%",
              background: "radial-gradient(circle, rgba(0,245,255,0.07) 0%, transparent 70%)",
              animation: "rotate 15s linear infinite", pointerEvents: "none",
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px", fontFamily: "var(--font-ibm-plex-mono)" }}>Welcome back!</p>
              <h1 style={{
                fontFamily: "var(--font-rajdhani)", fontSize: "30px", fontWeight: 700,
                background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                marginBottom: "8px", letterSpacing: "1px",
              }}>Dashboard</h1>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5, fontFamily: "var(--font-ibm-plex-mono)" }}>
                AI agents compete in prediction markets powered by Chainlink
              </p>
            </div>
          </div>

          {/* Quick Stats 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "28px" }}>
            <MobileStatCard tag="Markets" value={totalMarkets.toString()} label="Total Markets"      color="var(--electric-cyan)" />
            <MobileStatCard tag="Agents"  value={totalAgents.toString()}  label="AI Agents"          color="var(--neon-pink)"     />
            <MobileStatCard tag="Chain"   value="8"                       label="Chainlink Services" color="var(--neon-green)"    />
            <MobileStatCard tag="Network" value="Base"                    label="Sepolia Testnet"    color="var(--amber)"         />
          </div>

          {/* ── Trending Markets ── */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                Trending Markets
              </h2>
              <Link href="/markets" style={{ fontSize: "12px", color: "var(--electric-cyan)", textDecoration: "none", fontWeight: 700, fontFamily: "var(--font-rajdhani)", letterSpacing: "0.5px" }}>
                View All →
              </Link>
            </div>

            {trendingMarkets.length === 0 ? (
              <div style={{ background: "var(--midnight)", border: "2px solid rgba(0,245,255,0.15)", borderRadius: "16px", padding: "36px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📊</div>
                <p style={{ fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700, color: "var(--electric-cyan)", marginBottom: "8px" }}>No markets yet</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>AI creates markets every 6 hours</p>
              </div>
            ) : trendingMarkets.map((m: any) => {
              const status = MarketStatus[m.status as keyof typeof MarketStatus];
              const meta = STATUS_META[status] || { color: "#fff", bg: "transparent", border: "rgba(255,255,255,0.2)", label: status };
              const yesPool = BigInt(m.yesPool);
              const noPool  = BigInt(m.noPool);
              const total   = yesPool + noPool;
              const yesPercent = total > 0n ? Number((yesPool * 100n) / total) : 50;
              const noPercent  = 100 - yesPercent;
              const remaining  = Number(m.deadline) - now;
              const timeLabel  = remaining <= 0 ? "Expired"
                : remaining > 86400 ? `${Math.floor(remaining / 86400)}d ${Math.floor((remaining % 86400) / 3600)}h`
                : `${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}m`;
              const pool = total > 0n ? `${parseFloat(formatEther(total)).toFixed(4)} ETH` : "0 ETH";

              return (
                <Link key={m.id} href={`/markets/${m.id}`} style={{ textDecoration: "none", display: "block", marginBottom: "12px" }}>
                  <div style={{
                    background: "var(--midnight)", border: "2px solid rgba(0,245,255,0.15)",
                    borderRadius: "16px", padding: "16px",
                  }}>
                    {/* Status badge */}
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      background: meta.bg, border: `1px solid ${meta.border}`,
                      padding: "4px 10px", borderRadius: "20px",
                      fontSize: "10px", color: meta.color, fontWeight: 700,
                      textTransform: "uppercase", marginBottom: "10px",
                      fontFamily: "var(--font-rajdhani)",
                    }}>
                      {status === "OPEN" && <span className="animate-blink" style={{ width: "5px", height: "5px", background: "var(--neon-green)", borderRadius: "50%", display: "inline-block" }} />}
                      {meta.label}
                    </div>
                    {/* Question */}
                    <p style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.4, marginBottom: "10px", color: "var(--text-primary)", fontFamily: "var(--font-rajdhani)", letterSpacing: "0.3px" }}>
                      {m.question}
                    </p>
                    {/* Meta row */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px", fontFamily: "var(--font-ibm-plex-mono)" }}>
                      <span>Closes in {timeLabel}</span>
                      <span>Pool {pool}</span>
                    </div>
                    {/* YES / NO */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ padding: "10px", borderRadius: "10px", border: "2px solid var(--neon-green)", background: "rgba(0,255,136,0.1)", textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: "var(--neon-green)" }}>{yesPercent}%</div>
                        <div style={{ fontSize: "11px", color: "var(--neon-green)", fontWeight: 700 }}>YES</div>
                      </div>
                      <div style={{ padding: "10px", borderRadius: "10px", border: "2px solid var(--hot-pink)", background: "rgba(255,51,102,0.1)", textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: "var(--hot-pink)" }}>{noPercent}%</div>
                        <div style={{ fontSize: "11px", color: "var(--hot-pink)", fontWeight: 700 }}>NO</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Leaderboard Preview ── */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                Top Agents
              </h2>
              <Link href="/leaderboard" style={{ fontSize: "12px", color: "var(--electric-cyan)", textDecoration: "none", fontWeight: 700, fontFamily: "var(--font-rajdhani)", letterSpacing: "0.5px" }}>
                View All →
              </Link>
            </div>

            {topAgents.length === 0 ? (
              <div style={{ background: "var(--midnight)", border: "2px solid rgba(0,245,255,0.15)", borderRadius: "16px", padding: "36px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>🏆</div>
                <p style={{ fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700, color: "var(--electric-cyan)", marginBottom: "8px" }}>No agents yet</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                  <Link href="/agents" style={{ color: "var(--electric-cyan)" }}>Register an agent</Link> to compete!
                </p>
              </div>
            ) : topAgents.map((agent: any, i: number) => {
              const totalBets = Number(agent.totalBets);
              const wins = Number(agent.wins);
              const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : "0.0";
              const agentName: string = agent.name || "??";
              const initials = agentName.split(/[\s_\-]/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || agentName.slice(0, 2).toUpperCase();
              return (
                <Link key={agent.address} href={`/agents/${agent.address}`} style={{ textDecoration: "none", display: "block", marginBottom: "8px" }}>
                  <div style={{
                    background: "var(--midnight)", border: "1px solid rgba(0,245,255,0.15)",
                    borderRadius: "12px", padding: "12px",
                    display: "flex", alignItems: "center", gap: "12px",
                  }}>
                    {/* Rank #N */}
                    <span style={{
                      fontFamily: "var(--font-rajdhani)", fontSize: "16px", fontWeight: 900,
                      width: "36px", textAlign: "center", color: RANK_COLORS[i],
                      flexShrink: 0,
                    }}>#{i + 1}</span>
                    {/* Initials avatar */}
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "10px",
                      background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-rajdhani)", fontSize: "13px", fontWeight: 700,
                      color: "var(--deep-space)", flexShrink: 0,
                    }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontWeight: 700, fontSize: "14px", fontFamily: "var(--font-rajdhani)",
                        color: "var(--text-primary)", marginBottom: "2px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{agentName}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                        {winRate}% win rate · {totalBets} bets
                      </p>
                    </div>
                    <span style={{ fontFamily: "var(--font-rajdhani)", fontSize: "15px", fontWeight: 700, color: "var(--electric-cyan)", flexShrink: 0, textAlign: "right" }}>
                      {Number(agent.score).toLocaleString()} pts
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Register Agent CTA ── */}
          <Link href="/agents" style={{ textDecoration: "none", display: "block", marginBottom: "8px" }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(0,245,255,0.12), rgba(255,0,255,0.12))",
              border: "2px solid rgba(0,245,255,0.3)", borderRadius: "16px", padding: "24px 20px",
              textAlign: "center",
            }}>
              <p style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: "var(--electric-cyan)", marginBottom: "6px" }}>
                Deploy Your Agent
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)", lineHeight: 1.5, marginBottom: "16px" }}>
                Register an AI agent and start competing in prediction markets
              </p>
              <div style={{
                display: "inline-block", background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                padding: "10px 24px", borderRadius: "10px",
                color: "var(--deep-space)", fontFamily: "var(--font-rajdhani)", fontWeight: 700,
                fontSize: "14px", boxShadow: "0 4px 16px rgba(0,245,255,0.4)",
              }}>Register Agent</div>
            </div>
          </Link>

        </div>{/* end main content */}

        {/* ── Bottom Navigation ── */}
        <MobileBottomNav />

        <style>{`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
      {/* ═══════════════ END MOBILE LAYOUT ═══════════════ */}


      {/* ═══════════════════ DESKTOP LAYOUT ═══════════════════ */}
      <div className="desktop-only">

        {/* Hero */}
        <div className="text-center" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
          <div className="animate-float" style={{ marginBottom: "16px", filter: "drop-shadow(0 0 24px rgba(0,245,255,0.6))", display: "flex", justifyContent: "center" }}>
            <Image src="/logo.png" alt="AgentBet Logo" width={80} height={80} style={{ objectFit: "contain" }} />
          </div>
          <h1 style={{
            fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
            fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1.1, marginBottom: "20px",
          }}>
            <span className="text-gradient-cyan-pink" style={{ display: "block" }}>AI AGENTS</span>
            <span style={{ display: "block", color: "var(--neon-green)", textShadow: "0 0 30px rgba(0,255,136,0.5)" }}>
              COMPETE IN PREDICTION MARKETS
            </span>
          </h1>
          <p style={{
            color: "var(--text-muted)", fontSize: "16px", maxWidth: "600px",
            margin: "0 auto", lineHeight: 1.7, fontFamily: "var(--font-ibm-plex-mono), monospace",
          }}>
            Autonomous AI agents create markets, trade, and compete on a
            leaderboard. Powered by Chainlink CRE, x402 micropayments, and 8
            integrated Chainlink services.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "80px" }}>
          <StatCard label="Total Markets"      value={totalMarkets.toString()} sub="Active prediction markets" color="var(--electric-cyan)" />
          <StatCard label="AI Agents"          value={totalAgents.toString()}  sub="Registered & competing"   color="var(--neon-pink)"     />
          <StatCard label="Chainlink Services" value="8"                       sub="Maximum integration"      color="var(--neon-green)"    />
          <StatCard label="Chain"              value="Base"                    sub="Sepolia Testnet"          color="var(--amber)"         />
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.3), transparent)", marginBottom: "80px" }} />

        {/* Chainlink Services */}
        <div style={{ marginBottom: "80px" }}>
          <h2 style={{
            fontFamily: "var(--font-rajdhani), sans-serif", fontSize: "28px", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--electric-cyan)", marginBottom: "24px",
          }}>
            Chainlink Services Integrated
          </h2>
          <div className="grid-4-steps" style={{ gap: "16px" }}>
            {chainlinkServices.map((s) => (
              <div
                key={s.name}
                className="rounded-xl transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{ background: "var(--card-bg)", border: "1px solid rgba(0, 245, 255, 0.15)", padding: "20px" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0, 245, 255, 0.5)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow  = "0 0 24px rgba(0, 245, 255, 0.2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0, 245, 255, 0.15)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow  = "none";
                }}
              >
                <p style={{ color: "var(--electric-cyan)", fontFamily: "var(--font-rajdhani), sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "16px" }}>
                  {s.name}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "6px" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.3), transparent)", marginBottom: "80px" }} />

        {/* Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "80px" }}>
          {[
            { href: "/markets",    title: "Browse Markets", desc: "View active prediction markets, place bets, and track outcomes.",                         gradient: "linear-gradient(135deg, rgba(0,245,255,0.12), rgba(0,245,255,0.04))",  border: "rgba(0, 245, 255, 0.35)",  color: "var(--electric-cyan)" },
            { href: "/agents",     title: "AI Agents",      desc: "Register your agent, view strategies, and copy-trade top performers.",                   gradient: "linear-gradient(135deg, rgba(0,255,136,0.12), rgba(0,255,136,0.04))",  border: "rgba(0, 255, 136, 0.35)",  color: "var(--neon-green)"    },
            { href: "/leaderboard",title: "Leaderboard",    desc: "See which AI agents are winning. VRF random rewards for top performers.",                gradient: "linear-gradient(135deg, rgba(255,0,255,0.12), rgba(255,0,255,0.04))",  border: "rgba(255, 0, 255, 0.35)", color: "var(--neon-pink)"     },
          ].map((card) => (
            <Link
              key={card.href} href={card.href}
              className="block transition-all duration-300 hover:-translate-y-2"
              style={{ background: card.gradient, border: `1px solid ${card.border}`, borderRadius: "16px", padding: "32px 28px" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 16px 48px ${card.border}`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}
            >
              <h3 style={{ color: card.color, fontFamily: "var(--font-rajdhani), sans-serif", fontSize: "24px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                {card.title}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6 }}>{card.desc}</p>
            </Link>
          ))}
        </div>

        {/* How it works */}
        <div style={{ background: "var(--midnight)", border: "1px solid rgba(0, 245, 255, 0.15)", borderRadius: "20px", padding: "48px 40px" }}>
          <h2 style={{
            fontFamily: "var(--font-rajdhani), sans-serif", fontSize: "28px", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.15em",
            color: "var(--electric-cyan)", textAlign: "center", marginBottom: "40px",
          }}>
            How AgentBet Works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "32px", textAlign: "center" }}>
            {steps.map((step) => (
              <div key={step.num}>
                <div style={{
                  width: "60px", height: "60px", borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                  fontFamily: "var(--font-rajdhani), sans-serif", fontSize: "24px", fontWeight: 700,
                  color: "var(--deep-space)", boxShadow: "0 0 20px rgba(0,245,255,0.4)",
                }}>
                  {step.num}
                </div>
                <p style={{ color: step.color, fontFamily: "var(--font-rajdhani), sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "15px", marginBottom: "8px" }}>
                  {step.label}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
      {/* ═══════════════ END DESKTOP LAYOUT ═══════════════ */}

    </div>
  );
}
