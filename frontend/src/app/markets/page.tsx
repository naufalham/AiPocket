"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatEther } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { MobileHeader } from "@/components/MobileHeader";
import {
  CONTRACTS,
  PREDICTION_MARKET_ABI,
  MarketStatus,
} from "@/lib/contracts";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const STATUS_META: Record<string, { color: string; bg: string; border: string; label: string; dot?: string }> = {
  OPEN:                 { color: "var(--neon-green)",     bg: "rgba(0,255,136,0.15)",   border: "var(--neon-green)",     label: "Live",     dot: "var(--neon-green)" },
  SETTLEMENT_REQUESTED: { color: "var(--amber)",          bg: "rgba(255,184,0,0.15)",   border: "var(--amber)",          label: "Settling"  },
  SETTLED:              { color: "var(--electric-cyan)",  bg: "rgba(0,245,255,0.15)",   border: "var(--electric-cyan)",  label: "Settled"   },
  CANCELLED:            { color: "var(--hot-pink)",       bg: "rgba(255,51,102,0.15)",  border: "var(--hot-pink)",       label: "Cancelled" },
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

  // Compute stats
  const liveCount = markets.filter((m: any) => MarketStatus[m.status as keyof typeof MarketStatus] === "OPEN").length;
  const totalVolume = markets.reduce((sum: bigint, m: any) => sum + BigInt(m.yesPool) + BigInt(m.noPool), 0n);
  const totalAgentsBetting = markets.reduce((sum: number, m: any) => sum + Number(m.totalBettors), 0);

  // Helper to compute market display data
  function getMarketDisplay(m: any) {
    const status = MarketStatus[m.status as keyof typeof MarketStatus];
    const meta = STATUS_META[status] || { color: "#fff", bg: "transparent", border: "rgba(255,255,255,0.2)", label: status };
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
          }}>Prediction Markets</h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5, fontFamily: "var(--font-ibm-plex-mono)" }}>
            AI-created markets powered by Chainlink
          </p>
        </header>

        {/* ── Main Scrollable Content ── */}
        <div style={{ padding: "0 20px 20px" }}>

          {/* Stats Bar */}
          <div style={{
            display: "flex", gap: "12px", marginBottom: "20px",
            overflowX: "auto", WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none", msOverflowStyle: "none",
          }} className="hide-scrollbar">
            <div style={{
              background: "var(--midnight)", border: "1px solid rgba(0,245,255,0.2)",
              borderRadius: "12px", padding: "12px 16px",
              display: "flex", flexDirection: "column", gap: "4px",
              minWidth: "120px", flexShrink: 0,
            }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--font-ibm-plex-mono)" }}>Total Markets</div>
              <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: "var(--electric-cyan)" }}>{marketCount}</div>
            </div>
            <div style={{
              background: "var(--midnight)", border: "1px solid rgba(0,245,255,0.2)",
              borderRadius: "12px", padding: "12px 16px",
              display: "flex", flexDirection: "column", gap: "4px",
              minWidth: "120px", flexShrink: 0,
            }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--font-ibm-plex-mono)" }}>Live Now</div>
              <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: "var(--neon-green)" }}>{liveCount}</div>
            </div>
            <div style={{
              background: "var(--midnight)", border: "1px solid rgba(0,245,255,0.2)",
              borderRadius: "12px", padding: "12px 16px",
              display: "flex", flexDirection: "column", gap: "4px",
              minWidth: "120px", flexShrink: 0,
            }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--font-ibm-plex-mono)" }}>Total Volume</div>
              <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: "var(--electric-cyan)" }}>
                {totalVolume > 0n ? `${parseFloat(formatEther(totalVolume)).toFixed(2)} ETH` : "0 ETH"}
              </div>
            </div>
            <div style={{
              background: "var(--midnight)", border: "1px solid rgba(0,245,255,0.2)",
              borderRadius: "12px", padding: "12px 16px",
              display: "flex", flexDirection: "column", gap: "4px",
              minWidth: "120px", flexShrink: 0,
            }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--font-ibm-plex-mono)" }}>AI Agents</div>
              <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700, color: "var(--neon-green)" }}>{totalAgentsBetting}</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{
            display: "flex", gap: "8px", marginBottom: "20px",
            overflowX: "auto", WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none", paddingBottom: "4px",
          }} className="hide-scrollbar">
            {filters.map((f) => {
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    background: isActive ? "var(--electric-cyan)" : "var(--card-bg)",
                    border: `2px solid ${isActive ? "var(--electric-cyan)" : "rgba(0,245,255,0.2)"}`,
                    padding: "10px 20px",
                    borderRadius: "10px",
                    color: isActive ? "var(--deep-space)" : "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    fontFamily: "var(--font-rajdhani)",
                    boxShadow: isActive ? "0 0 15px rgba(0,245,255,0.4)" : "none",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%",
                border: "2px solid rgba(0,245,255,0.15)",
                borderTopColor: "var(--electric-cyan)",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }} />
              <span style={{ fontSize: "13px", fontFamily: "var(--font-ibm-plex-mono)" }}>Loading markets...</span>
            </div>
          )}

          {/* Market Cards List */}
          {!loading && filtered.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filtered.map((m: any) => {
                const { status, meta, yesPercent, remaining, timeLabel, pool, total } = getMarketDisplay(m);
                return (
                  <Link key={m.id} href={`/markets/${m.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{
                      background: "var(--midnight)",
                      border: "2px solid rgba(0,245,255,0.15)",
                      borderRadius: "16px", padding: "16px",
                      position: "relative", overflow: "hidden",
                    }}>
                      {/* Top gradient bar on touch */}
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: "4px",
                        background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
                        opacity: 0, transition: "opacity 0.3s",
                      }} />

                      {/* Header: status + market id */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          background: meta.bg, border: `1px solid ${meta.border}`,
                          padding: "4px 10px", borderRadius: "12px",
                          fontSize: "10px", color: meta.color, fontWeight: 700,
                          textTransform: "uppercase", fontFamily: "var(--font-rajdhani)",
                        }}>
                          {meta.dot && (
                            <span className="animate-blink" style={{
                              width: "5px", height: "5px", background: "currentColor",
                              borderRadius: "50%", display: "inline-block",
                            }} />
                          )}
                          {meta.label}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {m.isAgentCreated && (
                            <span style={{
                              padding: "3px 8px", borderRadius: "10px",
                              fontSize: "9px", fontWeight: 700,
                              color: "var(--neon-pink)", background: "rgba(255,0,255,0.15)",
                              border: "1px solid rgba(255,0,255,0.4)",
                              fontFamily: "var(--font-rajdhani)",
                            }}>AI</span>
                          )}
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                            #{String(m.id).padStart(4, "0")}
                          </span>
                        </div>
                      </div>

                      {/* Question */}
                      <p style={{
                        fontSize: "15px", fontWeight: 700, lineHeight: 1.4,
                        marginBottom: "12px", color: "var(--text-primary)",
                        fontFamily: "var(--font-rajdhani)",
                      }}>
                        {m.question}
                      </p>

                      {/* Meta row */}
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        fontSize: "11px", color: "var(--text-muted)",
                        marginBottom: "16px", gap: "12px",
                        fontFamily: "var(--font-ibm-plex-mono)",
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.7 }}>
                            {remaining <= 0 ? "Closed" : "Closes In"}
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: remaining <= 0 ? "var(--hot-pink)" : "var(--text-muted)" }}>
                            {timeLabel}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.7 }}>Pool Size</span>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--neon-green)" }}>{pool}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.7 }}>Bets</span>
                          <span style={{ fontSize: "12px", fontWeight: 600 }}>{Number(m.totalBettors)}</span>
                        </div>
                      </div>

                      {/* YES / NO buttons */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                        <div style={{
                          padding: "14px 12px", borderRadius: "10px",
                          border: "2px solid var(--neon-green)",
                          background: "rgba(0,255,136,0.1)",
                          color: "var(--neon-green)", textAlign: "center",
                        }}>
                          <span style={{ display: "block", fontFamily: "var(--font-rajdhani)", fontSize: "22px", fontWeight: 700, marginBottom: "2px" }}>
                            {yesPercent}%
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: 700 }}>YES</span>
                        </div>
                        <div style={{
                          padding: "14px 12px", borderRadius: "10px",
                          border: "2px solid var(--hot-pink)",
                          background: "rgba(255,51,102,0.1)",
                          color: "var(--hot-pink)", textAlign: "center",
                        }}>
                          <span style={{ display: "block", fontFamily: "var(--font-rajdhani)", fontSize: "22px", fontWeight: 700, marginBottom: "2px" }}>
                            {100 - yesPercent}%
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: 700 }}>NO</span>
                        </div>
                      </div>

                      {/* Agents betting */}
                      <div style={{
                        fontSize: "11px", color: "var(--text-muted)",
                        display: "flex", alignItems: "center", gap: "6px",
                        fontFamily: "var(--font-ibm-plex-mono)",
                      }}>
                        {status === "SETTLEMENT_REQUESTED" ? (
                          <span>Verifying result via Chainlink oracle...</span>
                        ) : (
                          <>
                            <span style={{ fontWeight: 600, color: "var(--electric-cyan)" }}>
                              {Number(m.totalBettors)} AI agents
                            </span>
                            betting on this market
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && filtered.length === 0 && (
            <div style={{
              background: "var(--midnight)",
              border: "2px solid rgba(0,245,255,0.15)",
              borderRadius: "16px", padding: "60px 20px",
              textAlign: "center", position: "relative", overflow: "hidden",
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
              }}>
                {filter === "all" ? "No Markets Yet" : `No ${STATUS_META[filter]?.label ?? filter} Markets`}
              </h2>

              <p style={{
                fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6,
                position: "relative", zIndex: 1,
                maxWidth: "280px", margin: "0 auto 24px",
                fontFamily: "var(--font-ibm-plex-mono)",
              }}>
                Markets are created autonomously by AI agents every 6 hours via Chainlink CRE workflows
              </p>

              <div style={{
                display: "flex", flexDirection: "column", gap: "12px",
                marginTop: "24px", position: "relative", zIndex: 1,
              }}>
                {INFO_CARDS.map((card) => (
                  <div key={card.title} style={{
                    background: "var(--card-bg)",
                    border: "1px solid rgba(0,245,255,0.2)",
                    borderRadius: "12px", padding: "16px", textAlign: "left",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px", color: "var(--electric-cyan)", fontFamily: "var(--font-rajdhani)" }}>
                      {card.icon} {card.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5, fontFamily: "var(--font-ibm-plex-mono)" }}>
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
        <div style={{ marginBottom: "40px" }}>
          <div className="page-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "16px" }}>
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
                lineHeight: 1.1,
              }}
            >
              Prediction Markets
            </h1>
            <div
              style={{
                background: "var(--card-bg)",
                padding: "8px 20px",
                borderRadius: "20px",
                border: "1px solid rgba(0, 245, 255, 0.2)",
                fontSize: "14px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "var(--font-ibm-plex-mono)",
              }}
            >
              <span
                style={{
                  color: "var(--electric-cyan)",
                  fontWeight: 700,
                  fontFamily: "var(--font-rajdhani)",
                  fontSize: "18px",
                }}
              >
                {marketCount}
              </span>
              markets
            </div>
          </div>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "16px",
              lineHeight: 1.6,
              fontFamily: "var(--font-ibm-plex-mono)",
            }}
          >
            AI-created and human markets powered by Chainlink CRE
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs-row" style={{ display: "flex", gap: "12px", marginBottom: "40px", flexWrap: "wrap" }}>
          {filters.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  background: isActive ? "var(--electric-cyan)" : "var(--card-bg)",
                  border: `2px solid ${isActive ? "var(--electric-cyan)" : "rgba(0, 245, 255, 0.2)"}`,
                  padding: "12px 28px",
                  borderRadius: "12px",
                  color: isActive ? "var(--deep-space)" : "var(--text-muted)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  fontFamily: "var(--font-rajdhani)",
                  fontSize: "16px",
                  boxShadow: isActive ? "0 0 20px rgba(0, 245, 255, 0.4)" : "none",
                  letterSpacing: "0.5px",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--electric-cyan)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--electric-cyan)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0, 245, 255, 0.2)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                  }
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "2px solid rgba(0,245,255,0.15)",
                borderTopColor: "var(--electric-cyan)",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            Loading markets from chain...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Markets Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid-markets">
            {filtered.map((m: any) => {
              const { status, meta, yesPercent, remaining, timeLabel, total } = getMarketDisplay(m);

              return (
                <Link
                  key={m.id}
                  href={`/markets/${m.id}`}
                  style={{ textDecoration: "none", display: "block", position: "relative" }}
                >
                  <div
                    className="market-card-ref"
                    style={{
                      background: "var(--midnight)",
                      borderRadius: "20px",
                      padding: "28px",
                      border: "2px solid rgba(0, 245, 255, 0.15)",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "translateY(-10px)";
                      el.style.borderColor = "var(--electric-cyan)";
                      el.style.boxShadow = "0 20px 60px rgba(0, 245, 255, 0.3)";
                      const bar = el.querySelector(".top-bar") as HTMLElement;
                      if (bar) bar.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "translateY(0)";
                      el.style.borderColor = "rgba(0, 245, 255, 0.15)";
                      el.style.boxShadow = "none";
                      const bar = el.querySelector(".top-bar") as HTMLElement;
                      if (bar) bar.style.opacity = "0";
                    }}
                  >
                    {/* Gradient top bar */}
                    <div
                      className="top-bar"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "5px",
                        background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
                        opacity: 0,
                        transition: "opacity 0.3s",
                      }}
                    />

                    {/* Status */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", position: "relative", zIndex: 1 }}>
                      <div
                        style={{
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                          fontFamily: "var(--font-rajdhani)",
                        }}
                      >
                        {meta.dot && (
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: meta.dot,
                              animation: "pulse 2s ease-in-out infinite",
                              display: "inline-block",
                            }}
                          />
                        )}
                        {meta.label}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {m.isAgentCreated && (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "var(--neon-pink)",
                              background: "rgba(255,0,255,0.15)",
                              border: "1px solid rgba(255,0,255,0.4)",
                              fontFamily: "var(--font-rajdhani)",
                            }}
                          >
                            AI
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-ibm-plex-mono)",
                          }}
                        >
                          #{m.id}
                        </span>
                      </div>
                    </div>

                    {/* Question */}
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        marginBottom: "20px",
                        lineHeight: 1.4,
                        position: "relative",
                        zIndex: 1,
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-rajdhani)",
                      }}
                    >
                      {m.question}
                    </h3>

                    {/* Meta row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "20px",
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        position: "relative",
                        zIndex: 1,
                        fontFamily: "var(--font-ibm-plex-mono)",
                      }}
                    >
                      <span style={{ color: remaining <= 0 ? "var(--hot-pink)" : "var(--amber)" }}>
                        ⏱ {remaining <= 0 ? "Expired" : `Closes in ${timeLabel}`}
                      </span>
                      <span style={{ color: "var(--neon-green)" }}>
                        💰 {parseFloat(formatEther(total)).toFixed(3)} ETH
                      </span>
                    </div>

                    {/* Betting options */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                        marginBottom: "16px",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <div
                        style={{
                          padding: "16px",
                          borderRadius: "10px",
                          border: "2px solid var(--neon-green)",
                          background: "rgba(0, 255, 136, 0.1)",
                          color: "var(--neon-green)",
                          textAlign: "center",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "var(--neon-green)";
                          (e.currentTarget as HTMLDivElement).style.color = "var(--deep-space)";
                          (e.currentTarget as HTMLDivElement).style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(0, 255, 136, 0.1)";
                          (e.currentTarget as HTMLDivElement).style.color = "var(--neon-green)";
                          (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontFamily: "var(--font-rajdhani)",
                            fontSize: "22px",
                            fontWeight: 700,
                            marginBottom: "4px",
                          }}
                        >
                          {yesPercent}%
                        </span>
                        <span style={{ fontSize: "12px", opacity: 0.8, fontFamily: "var(--font-ibm-plex-mono)" }}>YES</span>
                      </div>
                      <div
                        style={{
                          padding: "16px",
                          borderRadius: "10px",
                          border: "2px solid var(--hot-pink)",
                          background: "rgba(255, 51, 102, 0.1)",
                          color: "var(--hot-pink)",
                          textAlign: "center",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "var(--hot-pink)";
                          (e.currentTarget as HTMLDivElement).style.color = "#fff";
                          (e.currentTarget as HTMLDivElement).style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 51, 102, 0.1)";
                          (e.currentTarget as HTMLDivElement).style.color = "var(--hot-pink)";
                          (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontFamily: "var(--font-rajdhani)",
                            fontSize: "22px",
                            fontWeight: 700,
                            marginBottom: "4px",
                          }}
                        >
                          {100 - yesPercent}%
                        </span>
                        <span style={{ fontSize: "12px", opacity: 0.8, fontFamily: "var(--font-ibm-plex-mono)" }}>NO</span>
                      </div>
                    </div>

                    {/* Bettors count */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        position: "relative",
                        zIndex: 1,
                        fontFamily: "var(--font-ibm-plex-mono)",
                      }}
                    >
                      🤖 {Number(m.totalBettors)} AI Agents betting
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div
            className="empty-xl"
            style={{
              background: "var(--midnight)",
              borderRadius: "24px",
              padding: "100px 60px",
              textAlign: "center",
              border: "2px solid rgba(0, 245, 255, 0.15)",
              position: "relative",
              overflow: "hidden",
              marginTop: "20px",
            }}
          >
            {/* Rotating radial glow */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "600px",
                height: "600px",
                background: "radial-gradient(circle, rgba(0, 245, 255, 0.05) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                marginBottom: "24px",
                position: "relative",
                zIndex: 1,
                animation: "float 3s ease-in-out infinite",
                filter: "drop-shadow(0 0 20px rgba(0, 245, 255, 0.5))",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Image src="/logo.png" alt="AgentBet Logo" width={120} height={120} style={{ objectFit: "contain" }} />
            </div>

            <h2
              style={{
                fontFamily: "var(--font-rajdhani)",
                fontSize: "36px",
                fontWeight: 700,
                color: "var(--electric-cyan)",
                marginBottom: "16px",
                position: "relative",
                zIndex: 1,
                letterSpacing: "2px",
              }}
            >
              {filter === "all" ? "No Markets Yet" : `No ${STATUS_META[filter]?.label ?? filter} Markets`}
            </h2>

            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "16px",
                lineHeight: 1.8,
                maxWidth: "700px",
                margin: "0 auto 40px",
                position: "relative",
                zIndex: 1,
                fontFamily: "var(--font-ibm-plex-mono)",
              }}
            >
              Markets are created{" "}
              <strong style={{ color: "var(--electric-cyan)" }}>autonomously by AI agents</strong>{" "}
              via CRE workflows every 6 hours,
              <br />
              or by users via x402 payments. Your AI agents will start betting as soon as markets are live!
            </p>

            {/* Info cards inside empty state */}
            <div className="grid-info-cards" style={{ position: "relative", zIndex: 1 }}>
              {INFO_CARDS.map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: "var(--card-bg)",
                    borderRadius: "16px",
                    padding: "32px",
                    border: "1px solid rgba(0, 245, 255, 0.2)",
                    transition: "all 0.3s ease",
                    position: "relative",
                    overflow: "hidden",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-8px)";
                    el.style.borderColor = "var(--electric-cyan)";
                    el.style.boxShadow = "0 12px 40px rgba(0, 245, 255, 0.3)";
                    const bar = el.querySelector(".info-bar") as HTMLElement;
                    if (bar) bar.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(0)";
                    el.style.borderColor = "rgba(0, 245, 255, 0.2)";
                    el.style.boxShadow = "none";
                    const bar = el.querySelector(".info-bar") as HTMLElement;
                    if (bar) bar.style.opacity = "0";
                  }}
                >
                  <div
                    className="info-bar"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "4px",
                      background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
                      opacity: 0,
                      transition: "opacity 0.3s",
                    }}
                  />
                  <div style={{ fontSize: "48px", marginBottom: "20px" }}>{card.icon}</div>
                  <h3
                    style={{
                      fontFamily: "var(--font-rajdhani)",
                      fontSize: "22px",
                      fontWeight: 700,
                      marginBottom: "12px",
                      color: "var(--text-primary)",
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      fontFamily: "var(--font-ibm-plex-mono)",
                    }}
                  >
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
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
