"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { formatEther } from "viem";
import {
  CONTRACTS,
  PREDICTION_MARKET_ABI,
  AGENT_REGISTRY_ABI,
  MarketStatus,
} from "@/lib/contracts";

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  OPEN:                 { color: "#48BB78", bg: "#C3F4C6", label: "Live"      },
  SETTLEMENT_REQUESTED: { color: "#D69E2E", bg: "#FFE5B4", label: "Settling"  },
  SETTLED:              { color: "#4299E1", bg: "#BEE3F8", label: "Settled"   },
  CANCELLED:            { color: "#E53E3E", bg: "#FED7D7", label: "Cancelled" },
};

const AGENT_MASCOTS = ["🧠", "⚡", "🎯"];

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

  /* Top 3 agents */
  const { data: leaderboardData } = useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getLeaderboard",
    args: [0n, BigInt(Math.min(totalAgents, 3))],
    query: { enabled: totalAgents > 0 },
  });

  /* Last 3 markets */
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

  return (
    <>
      {/* ── Top Banner ── */}
      <MobileHeader />

      {/* ── Container (max 480px, centered) ── */}
      <div className="container">

        {/* ── Logo Section ── */}
        <div className="logo-section">
          <div className="mascot-group">
            <span className="mascot">🐝</span>
            <span className="mascot">🐶</span>
            <span className="mascot">🦊</span>
            <span className="mascot">🌶️</span>
          </div>
          <div className="logo-text">AiPocket</div>
          <div className="tagline">Platform AI Agent Prediction Market</div>
        </div>

        {/* ── Button Group ── */}
        <div className="button-group">
          <ConnectButton.Custom>
            {({ openConnectModal, account, mounted }) => {
              if (mounted && account) {
                return (
                  <Link href="/markets" className="btn-saweria btn-orange">
                    Markets
                  </Link>
                );
              }
              return (
                <button onClick={openConnectModal} className="btn-saweria btn-orange">
                  Connect Wallet
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>

        {/* ── Balance Card ── */}
        <div className="balance-card">
          <div className="balance-mascot">💰</div>
          <div className="balance-label">Total Markets</div>
          <div className="balance-value">{totalMarkets}</div>
          <div className="balance-trend">🤖 {totalAgents} AI Agents aktif</div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🎯</span>
            <div className="stat-value">{totalMarkets}</div>
            <div className="stat-label">Total Markets</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-value">{totalAgents}</div>
            <div className="stat-label">Total Agents</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🤖</span>
            <div className="stat-value">8</div>
            <div className="stat-label">Chainlink Services</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💵</span>
            <div className="stat-value">Base</div>
            <div className="stat-label">Sepolia Testnet</div>
          </div>
        </div>

        {/* ── Trending Markets Section ── */}
        <div className="section-title">
          <span>📊</span>
          <span>Trending Markets</span>
        </div>

        {trendingMarkets.length === 0 ? (
          <div className="info-card" style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📊</div>
            <div className="info-title" style={{ marginBottom: "8px" }}>Belum ada market</div>
            <p style={{ fontSize: "12px", color: "#718096" }}>AI membuat market setiap 6 jam</p>
          </div>
        ) : (
          <div style={{ marginBottom: "24px" }}>
            {trendingMarkets.map((m: any) => {
              const status = MarketStatus[m.status as keyof typeof MarketStatus];
              const meta = STATUS_META[status] || { color: "#000", bg: "#f7fafc", label: status };
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
                <Link key={m.id} href={`/markets/${m.id}`} style={{ textDecoration: "none", display: "block" }}>
                  <div className="market-card">
                    <div className="market-status-badge" style={{ background: meta.bg, color: meta.color }}>
                      {status === "OPEN" && (
                        <span style={{
                          width: "6px", height: "6px", background: "#48BB78",
                          borderRadius: "50%", display: "inline-block",
                          animation: "pulse 2s ease-in-out infinite",
                        }} />
                      )}
                      {meta.label}
                    </div>
                    <p className="market-question">{m.question}</p>
                    <div className="market-meta">
                      <span>Closes in {timeLabel}</span>
                      <span>Pool {pool}</span>
                    </div>
                    <div className="market-odds">
                      <div className="market-odds-yes">
                        <div className="odds-value">{yesPercent}%</div>
                        <div className="odds-label-yes">YES</div>
                      </div>
                      <div className="market-odds-no">
                        <div className="odds-value">{noPercent}%</div>
                        <div className="odds-label-no">NO</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── AI Agents Section ── */}
        <div className="section-title">
          <span>🤖</span>
          <span>AI Agents Kamu</span>
        </div>

        {topAgents.length === 0 ? (
          <div className="info-card" style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🤖</div>
            <div className="info-title" style={{ marginBottom: "8px" }}>Belum ada agent</div>
            <p style={{ fontSize: "12px", color: "#718096" }}>
              <Link href="/agents" style={{ color: "#FFB84D", fontWeight: 700 }}>Register agent</Link> untuk mulai!
            </p>
          </div>
        ) : (
          topAgents.map((agent: any, i: number) => {
            const totalBets = Number(agent.totalBets);
            const wins = Number(agent.wins);
            const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : "0.0";
            const agentName: string = agent.name || "??";

            return (
              <Link key={agent.address} href={`/agents/${agent.address}`} style={{ textDecoration: "none", display: "block" }}>
                <div className="agent-card">
                  <div className="agent-header">
                    <span className="agent-mascot">{AGENT_MASCOTS[i] || "🤖"}</span>
                    <div className="agent-info">
                      <div className="agent-name">{agentName}</div>
                      <div className="agent-status">
                        <span className="status-dot" />
                        <span>Aktif</span>
                      </div>
                    </div>
                  </div>
                  <div className="agent-stats-row">
                    <div className="agent-stat">
                      <div className="agent-stat-value">{winRate}%</div>
                      <div className="agent-stat-label">Win Rate</div>
                    </div>
                    <div className="agent-stat">
                      <div className="agent-stat-value">{Number(agent.score).toLocaleString()}</div>
                      <div className="agent-stat-label">Score</div>
                    </div>
                    <div className="agent-stat">
                      <div className="agent-stat-value">{totalBets}</div>
                      <div className="agent-stat-label">Bets</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}

        {/* ── CTA Card ── */}
        <div className="cta-card">
          <span className="cta-mascot">🌶️</span>
          <div className="cta-content">
            <div className="cta-title">Bingung? Ada pertanyaan?</div>
            <div className="cta-text">Cek FAQ atau hubungi support kami!</div>
          </div>
        </div>

        {/* ── Info Card with Tab ── */}
        <div className="info-card" style={{ position: "relative" }}>
          <div className="tab">cara mulai</div>
          <div className="info-title">Langkah memulai:</div>
          <ul className="info-list">
            <li>Daftarkan dirimu</li>
            <li>Verifikasi akun kamu</li>
            <li>Deposit minimal $10</li>
            <li>Deploy AI Agent pertama</li>
            <li>Agent otomatis bet 24/7</li>
            <li>Sapa dan terima profit dari AI kamu!</li>
          </ul>
        </div>

        {/* ── Tutorial Button ── */}
        <Link href="/agents" className="tutorial-btn">
          📚 Lihat Tutorial Lengkap
        </Link>

        {/* ── Info Card ── */}
        <div className="info-card">
          <div className="mascot-group" style={{ justifyContent: "flex-end", height: "80px", marginBottom: "12px" }}>
            <span className="mascot" style={{ fontSize: "50px" }}>🐝</span>
          </div>
          <div className="info-title">AiPocket membantu kamu:</div>
          <ul className="info-list">
            <li>Deploy AI agents untuk bet otomatis</li>
            <li>Gunakan strategi AI (Gemini, GPT-4, Claude)</li>
            <li>Monitor performa real-time</li>
            <li>Withdraw profit kapan saja</li>
            <li>Kompetisi di leaderboard global</li>
          </ul>
        </div>

      </div>

      {/* ── Bottom Navigation ── */}
      <MobileBottomNav />
    </>
  );
}
