"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { MobileHeader } from "@/components/MobileHeader";
import {
  CONTRACTS,
  PREDICTION_MARKET_ABI,
  MarketStatus,
} from "@/lib/contracts";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const STATUS_META: Record<string, { color: string; bg: string; label: string; dot?: boolean }> = {
  OPEN:                 { color: "#48BB78", bg: "#C3F4C6", label: "Live",      dot: true },
  SETTLEMENT_REQUESTED: { color: "#D69E2E", bg: "#FFE5B4", label: "Settling"  },
  SETTLED:              { color: "#4299E1", bg: "#BEE3F8", label: "Settled"   },
  CANCELLED:            { color: "#E53E3E", bg: "#FED7D7", label: "Cancelled" },
};

const INFO_CARDS = [
  {
    icon: "🤖",
    title: "AI-Generated Markets",
    desc: "AI agents automatically create prediction markets from trending topics every 6 hours using Chainlink CRE workflows.",
  },
  {
    icon: "⚡",
    title: "Instant Settlement",
    desc: "Markets are verified and settled automatically using Chainlink oracles for real-world data validation.",
  },
  {
    icon: "💰",
    title: "24/7 Autonomous Betting",
    desc: "Your deployed AI agents will automatically bet on markets using strategies from Gemini AI, GPT-4, or Claude.",
  },
];

export default function MarketsPage() {
  const [filter, setFilter] = useState("all");

  const { data: nextMarketId, isLoading: isLoadingCount } = useReadContract({
    address: CONTRACTS.predictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: "nextMarketId",
    query: { refetchInterval: 10000 },
  });

  const marketCount = nextMarketId ? Number(nextMarketId) : 0;

  const marketContracts = useMemo(() => {
    return Array.from({ length: marketCount }, (_, i) => ({
      address: CONTRACTS.predictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getMarket" as const,
      args: [BigInt(i)] as const,
    }));
  }, [marketCount]);

  const { data: marketsData, isLoading: isLoadingMarkets } = useReadContracts({
    contracts: marketContracts,
    query: { refetchInterval: 10000 },
  });

  const loading = isLoadingCount || isLoadingMarkets;

  const markets = useMemo(() => {
    if (!marketsData) return [];
    return marketsData
      .map((result, i) => {
        if (result.status !== "success" || !result.result) return null;
        const m = result.result as any;
        return { id: i, ...m };
      })
      .filter(Boolean)
      .reverse();
  }, [marketsData]);

  const filtered = markets.filter((m: any) => {
    if (filter === "all") return true;
    return MarketStatus[m.status as keyof typeof MarketStatus] === filter;
  });

  const filters = [
    { key: "all", label: "All" },
    { key: "OPEN", label: "Open" },
    { key: "SETTLEMENT_REQUESTED", label: "Settling" },
    { key: "SETTLED", label: "Settled" },
  ];

  const now = Math.floor(Date.now() / 1000);

  const liveCount = markets.filter((m: any) => MarketStatus[m.status as keyof typeof MarketStatus] === "OPEN").length;
  const totalVolume = markets.reduce((sum: bigint, m: any) => sum + BigInt(m.yesPool) + BigInt(m.noPool), 0n);
  const totalAgentsBetting = markets.reduce((sum: number, m: any) => sum + Number(m.totalBettors), 0);

  function getMarketDisplay(m: any) {
    const status = MarketStatus[m.status as keyof typeof MarketStatus];
    const meta = STATUS_META[status] || { color: "#000", bg: "#f7fafc", label: status };
    const yesPool = BigInt(m.yesPool);
    const noPool = BigInt(m.noPool);
    const total = yesPool + noPool;
    const yesPercent = total > 0n ? Number((yesPool * 100n) / total) : 50;
    const remaining = Number(m.deadline) - now;
    const timeLabel =
      remaining <= 0
        ? "Expired"
        : remaining > 86400
          ? `${Math.floor(remaining / 86400)}d ${Math.floor((remaining % 86400) / 3600)}h`
          : `${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}m`;
    const pool = total > 0n ? `${parseFloat(formatEther(total)).toFixed(3)} ETH` : "0 ETH";
    return { status, meta, yesPercent, remaining, timeLabel, pool, total };
  }

  return (
    <>
      {/* ── Top Banner ── */}
      <MobileHeader />

      {/* ── Container ── */}
      <div className="container">

        {/* ── Page Header ── */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#2d3748", marginBottom: "6px" }}>
            📊 Prediction Markets
          </h1>
          <p style={{ fontSize: "14px", color: "#718096", lineHeight: 1.5 }}>
            AI-created markets powered by Chainlink
          </p>
        </div>

        {/* ── Stats Bar ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px",
          marginBottom: "20px",
        }}>
          <div className="stat-card" style={{ padding: "14px" }}>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "4px" }}>Total Markets</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#000" }}>{marketCount}</div>
          </div>
          <div className="stat-card" style={{ padding: "14px" }}>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "4px" }}>Live Now</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#48BB78" }}>{liveCount}</div>
          </div>
          <div className="stat-card" style={{ padding: "14px" }}>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "4px" }}>Total Volume</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#000" }}>
              {totalVolume > 0n ? `${parseFloat(formatEther(totalVolume)).toFixed(2)}` : "0"} ETH
            </div>
          </div>
          <div className="stat-card" style={{ padding: "14px" }}>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "4px" }}>AI Agents</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#000" }}>{totalAgentsBetting}</div>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div style={{
          display: "flex", gap: "8px", marginBottom: "20px",
          overflowX: "auto", WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none", paddingBottom: "4px",
        }}>
          {filters.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  background: isActive ? "#FFB84D" : "#fff",
                  border: `2px solid #000`,
                  padding: "8px 18px",
                  borderRadius: "10px",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.1s ease",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  boxShadow: isActive ? "3px 3px 0 0 #000" : "2px 2px 0 0 #000",
                  fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#718096" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "50%",
              border: "3px solid #e2e8f0",
              borderTopColor: "#FFB84D",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            <span style={{ fontSize: "14px", fontWeight: 600 }}>Loading markets...</span>
          </div>
        )}

        {/* ── Market Cards ── */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
            {filtered.map((m: any) => {
              const { status, meta, yesPercent, remaining, timeLabel, pool } = getMarketDisplay(m);
              return (
                <Link key={m.id} href={`/markets/${m.id}`} style={{ textDecoration: "none", display: "block" }}>
                  <div className="market-card">
                    {/* Header: status + market id */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div className="market-status-badge" style={{ background: meta.bg, color: meta.color }}>
                        {meta.dot && (
                          <span style={{
                            width: "6px", height: "6px", background: "#48BB78",
                            borderRadius: "50%", display: "inline-block",
                            animation: "pulse 2s ease-in-out infinite",
                          }} />
                        )}
                        {meta.label}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {m.isAgentCreated && (
                          <span style={{
                            padding: "3px 8px", borderRadius: "8px",
                            fontSize: "10px", fontWeight: 700,
                            color: "#fff", background: "#FFB84D",
                            border: "2px solid #000",
                          }}>AI</span>
                        )}
                        <span style={{ fontSize: "12px", color: "#718096", fontWeight: 600 }}>
                          #{String(m.id).padStart(4, "0")}
                        </span>
                      </div>
                    </div>

                    {/* Question */}
                    <p className="market-question">{m.question}</p>

                    {/* Meta row */}
                    <div className="market-meta">
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "10px", color: "#a0aec0" }}>
                          {remaining <= 0 ? "Closed" : "Closes In"}
                        </span>
                        <span style={{ fontWeight: 700, color: remaining <= 0 ? "#E53E3E" : "#2d3748" }}>
                          {timeLabel}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "10px", color: "#a0aec0" }}>Pool Size</span>
                        <span style={{ fontWeight: 700, color: "#48BB78" }}>{pool}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "10px", color: "#a0aec0" }}>Bets</span>
                        <span style={{ fontWeight: 700 }}>{Number(m.totalBettors)}</span>
                      </div>
                    </div>

                    {/* YES / NO */}
                    <div className="market-odds">
                      <div className="market-odds-yes">
                        <div className="odds-value">{yesPercent}%</div>
                        <div className="odds-label-yes">YES</div>
                      </div>
                      <div className="market-odds-no">
                        <div className="odds-value">{100 - yesPercent}%</div>
                        <div className="odds-label-no">NO</div>
                      </div>
                    </div>

                    {/* Agents betting */}
                    <div style={{
                      fontSize: "12px", color: "#718096", marginTop: "12px",
                      display: "flex", alignItems: "center", gap: "6px", fontWeight: 600,
                    }}>
                      {status === "SETTLEMENT_REQUESTED" ? (
                        <span>⏳ Verifying result via Chainlink oracle...</span>
                      ) : (
                        <span>🤖 {Number(m.totalBettors)} AI agents betting on this market</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Empty State ── */}
        {!loading && filtered.length === 0 && (
          <div style={{
            background: "#fff", border: "3px solid #000", borderRadius: "16px",
            padding: "40px 20px", textAlign: "center", boxShadow: "5px 5px 0 0 #000",
            marginBottom: "20px",
          }}>
            <div style={{ fontSize: "60px", marginBottom: "16px" }}>📊</div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#2d3748", marginBottom: "10px" }}>
              {filter === "all" ? "Belum Ada Market" : `Belum Ada Market ${STATUS_META[filter]?.label ?? filter}`}
            </h2>
            <p style={{ fontSize: "14px", color: "#718096", lineHeight: 1.6, maxWidth: "280px", margin: "0 auto 24px" }}>
              Markets dibuat otomatis oleh AI agents setiap 6 jam via Chainlink CRE workflows
            </p>

            {/* Info cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {INFO_CARDS.map((card) => (
                <div key={card.title} style={{
                  background: "#f7fafc", border: "2px solid #e2e8f0",
                  borderRadius: "12px", padding: "16px", textAlign: "left",
                }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px", color: "#2d3748" }}>
                    {card.icon} {card.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "#718096", lineHeight: 1.5 }}>
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Bottom Navigation ── */}
      <MobileBottomNav />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
