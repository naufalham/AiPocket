"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useReadContract, useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import Link from "next/link";
import { MobileHeader } from "@/components/MobileHeader";
import { CONTRACTS, PREDICTION_MARKET_ABI, MarketStatus, OutcomeLabel } from "@/lib/contracts";
import { useSponsoredWrite } from "@/hooks/useSponsoredWrite";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const PRESET_AMOUNTS = ["0.001", "0.005", "0.01", "0.05"];

const STATUS_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  OPEN: { color: "var(--neon-green)", bg: "rgba(0,255,136,0.12)", border: "rgba(0,255,136,0.4)", label: "Open" },
  SETTLEMENT_REQUESTED: { color: "var(--amber)", bg: "rgba(255,184,0,0.12)", border: "rgba(255,184,0,0.4)", label: "Settling" },
  SETTLED: { color: "var(--electric-cyan)", bg: "rgba(0,245,255,0.12)", border: "rgba(0,245,255,0.4)", label: "Settled" },
  CANCELLED: { color: "var(--hot-pink)", bg: "rgba(255,51,102,0.12)", border: "rgba(255,51,102,0.4)", label: "Cancelled" },
};

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const marketId = BigInt(params.id as string);
  const { address } = useAccount();
  const [betAmount, setBetAmount] = useState("0.01");

  const { data: market } = useReadContract({
    address: CONTRACTS.predictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getMarket",
    args: [marketId],
    query: { refetchInterval: 5000 },
  });

  const { data: prediction } = useReadContract({
    address: CONTRACTS.predictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: "getPrediction",
    args: address ? [marketId, address] : undefined,
    query: { refetchInterval: 5000 },
  });

  const { write: placeBet, isPending: isBetting, isSuccess: betSuccess, isError: betError, isSponsored } = useSponsoredWrite();
  const { write: claimWinnings, isPending: isClaiming, isSuccess: claimSuccess } = useSponsoredWrite();
  const { write: requestSettle, isPending: isSettling } = useSponsoredWrite();

  const loadingSpinner = (
    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
      <div style={{
        width: "40px", height: "40px", borderRadius: "50%",
        border: "2px solid rgba(0,245,255,0.15)",
        borderTopColor: "var(--electric-cyan)",
        animation: "spin 0.8s linear infinite",
        margin: "0 auto 16px",
      }} />
      <span style={{ fontSize: "13px", fontFamily: "var(--font-ibm-plex-mono)" }}>Loading market...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!market) {
    return loadingSpinner;
  }

  const status = MarketStatus[market.status as keyof typeof MarketStatus];
  const meta = STATUS_META[status] || { color: "#fff", bg: "transparent", border: "rgba(255,255,255,0.2)", label: status };
  const yesPool = market.yesPool;
  const noPool = market.noPool;
  const totalPool = yesPool + noPool;
  const yesPercent = totalPool > 0n ? Number((yesPool * 100n) / totalPool) : 50;
  const now = Math.floor(Date.now() / 1000);
  const isExpired = now >= Number(market.deadline);
  const hasBet = prediction && prediction.amount > 0n;
  const canClaim = hasBet && market.status === 2 && prediction.choice === market.outcome && !prediction.claimed;

  const remainingSecs = Number(market.deadline) - now;
  const deadlineLabel = remainingSecs > 0
    ? remainingSecs > 86400
      ? `${Math.floor(remainingSecs / 86400)}d ${Math.floor((remainingSecs % 86400) / 3600)}h left`
      : `${Math.floor(remainingSecs / 3600)}h ${Math.floor((remainingSecs % 3600) / 60)}m left`
    : "Expired";

  function handleBet(choice: number) {
    placeBet({
      address: CONTRACTS.predictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: "predict",
      args: [marketId, choice],
      value: parseEther(betAmount),
    });
  }

  function handleClaim() {
    claimWinnings({
      address: CONTRACTS.predictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: "claim",
      args: [marketId],
    });
  }

  function handleRequestSettlement() {
    requestSettle({
      address: CONTRACTS.predictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: "requestSettlement",
      args: [marketId],
    });
  }

  // ── Stat cards data ──
  const statsData = [
    { label: "YES", value: `${yesPercent}%`, color: "var(--neon-green)" },
    { label: "NO", value: `${100 - yesPercent}%`, color: "var(--hot-pink)" },
    { label: "Total Pool", value: `${parseFloat(formatEther(totalPool)).toFixed(4)} ETH`, color: "var(--electric-cyan)" },
    { label: "Time Left", value: deadlineLabel, color: remainingSecs <= 0 ? "var(--hot-pink)" : "var(--amber)" },
  ];

  const infoData = [
    { label: "Bettors", value: String(Number(market.totalBettors)), color: "var(--text-primary)" },
    { label: "Platform Fee", value: "2%", color: "var(--text-primary)" },
    { label: "Deadline", value: new Date(Number(market.deadline) * 1000).toLocaleString(), color: "var(--text-primary)" },
    { label: "Created", value: new Date(Number(market.createdAt) * 1000).toLocaleString(), color: "var(--text-primary)" },
    { label: "YES Pool", value: `${formatEther(yesPool)} ETH`, color: "var(--neon-green)" },
    { label: "NO Pool", value: `${formatEther(noPool)} ETH`, color: "var(--hot-pink)" },
  ];

  // ── Bet Form (shared) ──
  function renderBetForm() {
    if (status !== "OPEN" || isExpired || hasBet) return null;
    return (
      <>
        <h2 style={{
          fontFamily: "var(--font-rajdhani)", fontSize: "14px", fontWeight: 700,
          color: "var(--electric-cyan)", textTransform: "uppercase",
          letterSpacing: "0.15em", marginBottom: "16px",
        }}>Place Your Prediction</h2>

        {/* Preset amounts */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", fontFamily: "var(--font-ibm-plex-mono)" }}>
            Quick select
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                onClick={() => setBetAmount(preset)}
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px", fontWeight: 700,
                  padding: "8px 14px", borderRadius: "10px", cursor: "pointer",
                  background: betAmount === preset ? "rgba(0,245,255,0.15)" : "rgba(255,255,255,0.04)",
                  color: betAmount === preset ? "var(--electric-cyan)" : "var(--text-muted)",
                  border: betAmount === preset ? "1px solid rgba(0,245,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  transition: "all 0.15s",
                }}
              >
                {preset} ETH
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", fontFamily: "var(--font-ibm-plex-mono)" }}>
            Custom amount (ETH)
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="decimal"
              value={betAmount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d*\.?\d*$/.test(v)) setBetAmount(v);
              }}
              style={{
                width: "100%", padding: "12px 50px 12px 16px", borderRadius: "12px",
                background: "var(--card-bg)", color: "#fff",
                border: "1.5px solid rgba(0,245,255,0.2)", outline: "none",
                fontFamily: "var(--font-ibm-plex-mono)", fontSize: "14px",
                transition: "all 0.2s", boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--electric-cyan)";
                e.currentTarget.style.boxShadow = "0 0 12px rgba(0,245,255,0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,245,255,0.2)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <div style={{
              position: "absolute", right: "2px", top: "2px", bottom: "2px",
              display: "flex", flexDirection: "column", width: "36px",
            }}>
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(betAmount || "0") + 0.001;
                  setBetAmount(parseFloat(val.toFixed(4)).toString());
                }}
                style={{
                  flex: 1, borderRadius: "0 10px 0 0",
                  border: "none", borderLeft: "1px solid rgba(0,245,255,0.2)",
                  borderBottom: "1px solid rgba(0,245,255,0.2)",
                  background: "var(--card-bg)", color: "var(--electric-cyan)",
                  fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,245,255,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-bg)"; }}
              >▲</button>
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(0.001, parseFloat(betAmount || "0") - 0.001);
                  setBetAmount(parseFloat(val.toFixed(4)).toString());
                }}
                style={{
                  flex: 1, borderRadius: "0 0 10px 0",
                  border: "none", borderLeft: "1px solid rgba(0,245,255,0.2)",
                  background: "var(--card-bg)", color: "var(--electric-cyan)",
                  fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,245,255,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-bg)"; }}
              >▼</button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <button
            onClick={() => handleBet(0)}
            disabled={isBetting || !address}
            style={{
              padding: "14px", borderRadius: "12px", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em",
              background: "rgba(0,255,136,0.12)", border: "1.5px solid var(--neon-green)",
              color: "var(--neon-green)", fontFamily: "var(--font-rajdhani)",
              fontSize: "15px", cursor: "pointer", transition: "all 0.2s",
              opacity: isBetting || !address ? 0.4 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isBetting && address) {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--neon-green)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--deep-space)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,255,136,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,136,0.12)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--neon-green)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            {isBetting ? "Confirming..." : "✓ Bet YES"}
          </button>
          <button
            onClick={() => handleBet(1)}
            disabled={isBetting || !address}
            style={{
              padding: "14px", borderRadius: "12px", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em",
              background: "rgba(255,51,102,0.12)", border: "1.5px solid var(--hot-pink)",
              color: "var(--hot-pink)", fontFamily: "var(--font-rajdhani)",
              fontSize: "15px", cursor: "pointer", transition: "all 0.2s",
              opacity: isBetting || !address ? 0.4 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isBetting && address) {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--hot-pink)";
                (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(255,51,102,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,51,102,0.12)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--hot-pink)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            {isBetting ? "Confirming..." : "✗ Bet NO"}
          </button>
        </div>

        {isSponsored && (
          <div style={{
            marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            padding: "8px 16px", borderRadius: "12px",
            background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)",
          }}>
            <span style={{ fontSize: "12px" }}>⛽</span>
            <span style={{ fontSize: "11px", color: "var(--neon-green)", fontFamily: "var(--font-ibm-plex-mono)", fontWeight: 600 }}>Gas Sponsored</span>
          </div>
        )}
        {!address && (
          <p style={{ fontSize: "12px", marginTop: "12px", textAlign: "center", color: "var(--amber)" }}>
            Connect your wallet to place a prediction
          </p>
        )}
        {betSuccess && (
          <div style={{
            marginTop: "16px", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", textAlign: "center", fontWeight: 600,
            background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)", color: "var(--neon-green)",
          }}>
            Prediction placed successfully!
          </div>
        )}
        {betError && (
          <div style={{
            marginTop: "16px", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", textAlign: "center",
            background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.3)", color: "var(--hot-pink)",
          }}>
            Transaction failed. Please try again.
          </div>
        )}
      </>
    );
  }

  return (
    <div>

      {/* ═══════════════════ MOBILE LAYOUT ═══════════════════ */}
      <div className="mobile-only" style={{ paddingBottom: "80px" }}>

        {/* ── Sticky Mobile Navbar ── */}
        <MobileHeader />

        {/* ── Back Link ── */}
        <div style={{ padding: "16px 20px 0" }}>
          <Link
            href="/markets"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              color: "var(--text-muted)", textDecoration: "none", fontSize: "13px",
              fontFamily: "var(--font-ibm-plex-mono)",
            }}
          >
            ← Back to Markets
          </Link>
        </div>

        {/* ── Main Content ── */}
        <div style={{ padding: "16px 20px 20px" }}>

          {/* Market Header Card */}
          <div style={{
            background: "var(--midnight)",
            border: "2px solid rgba(0,245,255,0.2)",
            borderRadius: "16px", marginBottom: "16px",
            overflow: "hidden", position: "relative",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "4px",
              background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
            }} />
            <div style={{ padding: "24px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "4px 10px", borderRadius: "12px",
                    fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                    fontFamily: "var(--font-rajdhani)",
                    background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color,
                  }}>
                    {status === "OPEN" && (
                      <span className="animate-blink" style={{
                        width: "5px", height: "5px", background: "currentColor",
                        borderRadius: "50%", display: "inline-block",
                      }} />
                    )}
                    {meta.label}
                  </span>
                  {market.isAgentCreated && (
                    <span style={{
                      padding: "3px 8px", borderRadius: "10px",
                      fontSize: "9px", fontWeight: 700,
                      color: "var(--neon-pink)", background: "rgba(255,0,255,0.15)",
                      border: "1px solid rgba(255,0,255,0.4)",
                      fontFamily: "var(--font-rajdhani)",
                    }}>AI</span>
                  )}
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                  #{String(params.id).padStart(4, "0")}
                </span>
              </div>
              <h1 style={{
                fontFamily: "var(--font-rajdhani)", fontSize: "20px", fontWeight: 700,
                background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                lineHeight: 1.3, marginBottom: "8px",
              }}>{market.question}</h1>
              <p style={{ fontSize: "11px", color: remainingSecs <= 0 ? "var(--hot-pink)" : "var(--amber)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                {deadlineLabel}
              </p>
            </div>
          </div>

          {/* Stats Grid - 2x2 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "16px" }}>
            {statsData.map((stat) => (
              <div key={stat.label} style={{
                background: "var(--midnight)", borderRadius: "12px", padding: "16px",
                border: "1px solid rgba(0,245,255,0.12)", textAlign: "center",
              }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px", fontFamily: "var(--font-ibm-plex-mono)" }}>{stat.label}</div>
                <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "22px", fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Odds Bar */}
          <div style={{
            background: "var(--midnight)", border: "1px solid rgba(0,245,255,0.15)",
            borderRadius: "16px", padding: "20px", marginBottom: "16px",
          }}>
            <h2 style={{
              fontFamily: "var(--font-rajdhani)", fontSize: "14px", fontWeight: 700,
              color: "var(--electric-cyan)", textTransform: "uppercase",
              letterSpacing: "0.15em", marginBottom: "16px",
            }}>Market Odds</h2>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontFamily: "var(--font-rajdhani)", fontSize: "28px", fontWeight: 700, color: "var(--neon-green)" }}>{yesPercent}% <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>YES</span></span>
              <span style={{ fontFamily: "var(--font-rajdhani)", fontSize: "28px", fontWeight: 700, color: "var(--hot-pink)" }}>{100 - yesPercent}% <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>NO</span></span>
            </div>
            <div style={{ width: "100%", height: "10px", borderRadius: "999px", background: "rgba(255,51,102,0.2)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "999px",
                width: `${yesPercent}%`,
                background: "linear-gradient(90deg, var(--neon-green), rgba(0,255,136,0.6))",
                boxShadow: "0 0 10px rgba(0,255,136,0.5)",
                transition: "width 0.7s",
              }} />
            </div>
          </div>

          {/* Bet Form */}
          {status === "OPEN" && !isExpired && !hasBet && (
            <div style={{
              background: "var(--midnight)", border: "2px solid rgba(0,245,255,0.2)",
              borderRadius: "16px", padding: "20px", marginBottom: "16px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "4px",
                background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
                opacity: 0.6,
              }} />
              {renderBetForm()}
            </div>
          )}

          {/* Your Prediction */}
          {hasBet && prediction && (
            <div style={{
              background: "var(--midnight)", border: "2px solid rgba(0,245,255,0.2)",
              borderRadius: "16px", padding: "20px", marginBottom: "16px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "4px",
                background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
                opacity: 0.6,
              }} />
              <h2 style={{
                fontFamily: "var(--font-rajdhani)", fontSize: "14px", fontWeight: 700,
                color: "var(--electric-cyan)", textTransform: "uppercase",
                letterSpacing: "0.15em", marginBottom: "16px",
              }}>Your Prediction</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div style={{
                  padding: "10px 20px", borderRadius: "12px",
                  background: prediction.choice === 0 ? "rgba(0,255,136,0.1)" : "rgba(255,51,102,0.1)",
                  border: `1px solid ${prediction.choice === 0 ? "rgba(0,255,136,0.4)" : "rgba(255,51,102,0.4)"}`,
                }}>
                  <span style={{
                    fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700,
                    color: prediction.choice === 0 ? "var(--neon-green)" : "var(--hot-pink)",
                  }}>
                    {OutcomeLabel[prediction.choice as keyof typeof OutcomeLabel]}
                  </span>
                </div>
                <div>
                  <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {formatEther(prediction.amount)} ETH
                  </p>
                  {prediction.isAgent && (
                    <span style={{ fontSize: "11px", color: "var(--neon-pink)", background: "rgba(255,0,255,0.1)", padding: "2px 8px", borderRadius: "8px" }}>Agent</span>
                  )}
                  {prediction.claimed && (
                    <span style={{ fontSize: "11px", color: "var(--neon-green)", marginLeft: "6px" }}>✓ Claimed</span>
                  )}
                </div>
                {canClaim && (
                  <button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    style={{
                      marginLeft: "auto", padding: "10px 20px", borderRadius: "12px",
                      fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                      background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                      color: "var(--deep-space)", fontFamily: "var(--font-rajdhani)",
                      fontSize: "14px", cursor: "pointer", border: "none",
                      boxShadow: "0 0 24px rgba(0,245,255,0.35)",
                      opacity: isClaiming ? 0.5 : 1,
                    }}
                  >
                    {isClaiming ? "Claiming..." : "Claim Winnings"}
                  </button>
                )}
              </div>
              {claimSuccess && (
                <div style={{
                  marginTop: "16px", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", fontWeight: 600,
                  background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)", color: "var(--neon-green)",
                }}>
                  Winnings claimed successfully!
                </div>
              )}
            </div>
          )}

          {/* Settlement Request */}
          {status === "OPEN" && isExpired && (
            <div style={{
              background: "var(--midnight)", border: "2px solid rgba(255,184,0,0.2)",
              borderRadius: "16px", padding: "20px", marginBottom: "16px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "4px",
                background: "linear-gradient(90deg, var(--amber), var(--hot-pink))",
                opacity: 0.6,
              }} />
              <h2 style={{
                fontFamily: "var(--font-rajdhani)", fontSize: "14px", fontWeight: 700,
                color: "var(--amber)", textTransform: "uppercase",
                letterSpacing: "0.15em", marginBottom: "8px",
              }}>Market Expired</h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.6, fontFamily: "var(--font-ibm-plex-mono)" }}>
                Request AI-powered settlement via Chainlink CRE + Gemini.
              </p>
              <button
                onClick={handleRequestSettlement}
                disabled={isSettling}
                style={{
                  padding: "12px 24px", borderRadius: "12px",
                  fontWeight: 700, textTransform: "uppercase",
                  background: "rgba(255,184,0,0.12)", border: "1.5px solid var(--amber)",
                  color: "var(--amber)", fontFamily: "var(--font-rajdhani)",
                  fontSize: "14px", cursor: "pointer", transition: "all 0.2s",
                  opacity: isSettling ? 0.5 : 1,
                }}
              >
                {isSettling ? "Requesting..." : "⚡ Request AI Settlement"}
              </button>
            </div>
          )}

          {/* Settlement Result */}
          {status === "SETTLED" && (
            <div style={{
              background: "var(--midnight)", border: "2px solid rgba(0,245,255,0.2)",
              borderRadius: "16px", padding: "20px", marginBottom: "16px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "4px",
                background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
              }} />
              <h2 style={{
                fontFamily: "var(--font-rajdhani)", fontSize: "14px", fontWeight: 700,
                color: "var(--electric-cyan)", textTransform: "uppercase",
                letterSpacing: "0.15em", marginBottom: "16px",
              }}>Market Settled</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{
                  borderRadius: "12px", padding: "16px", textAlign: "center",
                  background: market.outcome === 0 ? "rgba(0,255,136,0.08)" : "rgba(255,51,102,0.08)",
                  border: `1px solid ${market.outcome === 0 ? "rgba(0,255,136,0.3)" : "rgba(255,51,102,0.3)"}`,
                }}>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Outcome</div>
                  <div style={{
                    fontFamily: "var(--font-rajdhani)", fontSize: "24px", fontWeight: 700,
                    color: market.outcome === 0 ? "var(--neon-green)" : "var(--hot-pink)",
                  }}>
                    {OutcomeLabel[market.outcome as keyof typeof OutcomeLabel]}
                  </div>
                </div>
                <div style={{
                  borderRadius: "12px", padding: "16px", textAlign: "center",
                  background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.2)",
                }}>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>AI Confidence</div>
                  <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "24px", fontWeight: 700, color: "var(--electric-cyan)" }}>
                    {(Number(market.confidenceScore) / 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Market Info */}
          <div style={{
            background: "var(--midnight)", border: "1px solid rgba(0,245,255,0.15)",
            borderRadius: "16px", padding: "20px",
          }}>
            <h2 style={{
              fontFamily: "var(--font-rajdhani)", fontSize: "14px", fontWeight: 700,
              color: "var(--electric-cyan)", textTransform: "uppercase",
              letterSpacing: "0.15em", marginBottom: "16px",
            }}>Market Info</h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                ...infoData,
                { label: "Creator", value: `${market.creator.slice(0, 10)}...${market.creator.slice(-6)}`, color: "var(--text-primary)" },
              ].map((row) => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid rgba(0,245,255,0.06)",
                }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>{row.label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: row.color, fontFamily: "var(--font-rajdhani)" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <MobileBottomNav />
      </div>
      {/* ═══════════════ END MOBILE LAYOUT ═══════════════ */}


      {/* ═══════════════════ DESKTOP LAYOUT ═══════════════════ */}
      <div className="desktop-only">

        {/* Back link */}
        <Link
          href="/markets"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            color: "var(--text-muted)", textDecoration: "none", fontSize: "14px",
            fontFamily: "var(--font-ibm-plex-mono)", marginBottom: "24px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--electric-cyan)"; (e.currentTarget as HTMLAnchorElement).style.gap = "12px"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLAnchorElement).style.gap = "8px"; }}
        >
          ← Back to Markets
        </Link>

        {/* Market Header Card */}
        <div style={{
          background: "var(--midnight)",
          border: "2px solid rgba(0,245,255,0.2)",
          borderRadius: "24px", marginBottom: "24px",
          overflow: "hidden", position: "relative",
          boxShadow: "0 0 40px rgba(0,245,255,0.08)",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "5px",
            background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
          }} />
          <div style={{ padding: "40px 48px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "6px 14px", borderRadius: "20px",
                  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "1px", fontFamily: "var(--font-rajdhani)",
                  background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color,
                }}>
                  {status === "OPEN" && (
                    <span style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: "currentColor", display: "inline-block",
                      animation: "pulse 2s ease-in-out infinite",
                    }} />
                  )}
                  {meta.label}
                </span>
                {market.isAgentCreated && (
                  <span style={{
                    padding: "4px 10px", borderRadius: "20px",
                    fontSize: "11px", fontWeight: 700,
                    color: "var(--neon-pink)", background: "rgba(255,0,255,0.15)",
                    border: "1px solid rgba(255,0,255,0.4)",
                    fontFamily: "var(--font-rajdhani)",
                  }}>AI Created</span>
                )}
                <span style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                  Market #{params.id}
                </span>
              </div>
              <span style={{
                fontSize: "14px", fontWeight: 700,
                color: remainingSecs <= 0 ? "var(--hot-pink)" : "var(--amber)",
                fontFamily: "var(--font-ibm-plex-mono)",
              }}>
                {deadlineLabel}
              </span>
            </div>
            <h1 style={{
              fontFamily: "var(--font-rajdhani)", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700,
              background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              letterSpacing: "2px", lineHeight: 1.2,
            }}>{market.question}</h1>
          </div>
        </div>

        {/* Stats Grid - 4 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "24px" }}>
          {statsData.map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "var(--midnight)", borderRadius: "20px", padding: "28px",
                border: "2px solid rgba(0,245,255,0.12)", textAlign: "center",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative", overflow: "hidden", cursor: "default",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(-8px)";
                el.style.borderColor = "var(--electric-cyan)";
                el.style.boxShadow = "0 12px 40px rgba(0,245,255,0.2)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(0)";
                el.style.borderColor = "rgba(0,245,255,0.12)";
                el.style.boxShadow = "none";
              }}
            >
              <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px", fontFamily: "var(--font-ibm-plex-mono)" }}>{stat.label}</p>
              <p style={{ fontFamily: "var(--font-rajdhani)", fontSize: "32px", fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout: Odds + Bet/Prediction */}
        <div style={{ display: "grid", gridTemplateColumns: (status === "OPEN" && !isExpired && !hasBet) || hasBet ? "1.2fr 0.8fr" : "1fr", gap: "24px", marginBottom: "24px" }}>

          {/* Market Odds */}
          <div style={{
            background: "var(--midnight)",
            border: "2px solid rgba(0,245,255,0.15)",
            borderRadius: "24px", padding: "36px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "4px",
              background: "linear-gradient(90deg, var(--neon-green), var(--hot-pink))",
              opacity: 0.6,
            }} />
            <h2 style={{
              fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700,
              color: "var(--electric-cyan)", textTransform: "uppercase",
              letterSpacing: "0.15em", marginBottom: "24px",
            }}>Market Odds</h2>

            {/* Visual donut */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{
                width: "160px", height: "160px", borderRadius: "50%",
                background: `conic-gradient(var(--neon-green) 0% ${yesPercent}%, var(--hot-pink) ${yesPercent}% 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto", boxShadow: "0 0 30px rgba(0,245,255,0.15)",
              }}>
                <div style={{
                  width: "120px", height: "120px", borderRadius: "50%",
                  background: "var(--midnight)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column",
                }}>
                  <span style={{ fontFamily: "var(--font-rajdhani)", fontSize: "32px", fontWeight: 700, color: "var(--electric-cyan)", lineHeight: 1 }}>
                    {parseFloat(formatEther(totalPool)).toFixed(3)}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>ETH Pool</span>
                </div>
              </div>
            </div>

            {/* Bar */}
            <div style={{ width: "100%", height: "12px", borderRadius: "999px", background: "rgba(255,51,102,0.2)", overflow: "hidden", marginBottom: "16px" }}>
              <div style={{
                height: "100%", borderRadius: "999px",
                width: `${yesPercent}%`,
                background: "linear-gradient(90deg, var(--neon-green), rgba(0,255,136,0.6))",
                boxShadow: "0 0 10px rgba(0,255,136,0.5)",
                transition: "width 0.7s",
              }} />
            </div>

            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontFamily: "var(--font-rajdhani)", fontSize: "24px", fontWeight: 700, color: "var(--neon-green)" }}>{yesPercent}%</span>
                <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "8px" }}>YES ({formatEther(yesPool)} ETH)</span>
              </div>
              <div>
                <span style={{ fontFamily: "var(--font-rajdhani)", fontSize: "24px", fontWeight: 700, color: "var(--hot-pink)" }}>{100 - yesPercent}%</span>
                <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "8px" }}>NO ({formatEther(noPool)} ETH)</span>
              </div>
            </div>
          </div>

          {/* Right column: Bet Form or Your Prediction */}
          {status === "OPEN" && !isExpired && !hasBet && (
            <div style={{
              background: "var(--midnight)",
              border: "2px solid rgba(0,245,255,0.15)",
              borderRadius: "24px", padding: "36px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "4px",
                background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
                opacity: 0.6,
              }} />
              {renderBetForm()}
            </div>
          )}

          {hasBet && prediction && (
            <div style={{
              background: "var(--midnight)",
              border: "2px solid rgba(0,245,255,0.15)",
              borderRadius: "24px", padding: "36px",
              position: "relative", overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "4px",
                background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
                opacity: 0.6,
              }} />
              <h2 style={{
                fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700,
                color: "var(--electric-cyan)", textTransform: "uppercase",
                letterSpacing: "0.15em", marginBottom: "24px",
              }}>Your Prediction</h2>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "20px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    display: "inline-block", padding: "16px 32px", borderRadius: "16px",
                    background: prediction.choice === 0 ? "rgba(0,255,136,0.1)" : "rgba(255,51,102,0.1)",
                    border: `2px solid ${prediction.choice === 0 ? "rgba(0,255,136,0.4)" : "rgba(255,51,102,0.4)"}`,
                    marginBottom: "12px",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-rajdhani)", fontSize: "28px", fontWeight: 700,
                      color: prediction.choice === 0 ? "var(--neon-green)" : "var(--hot-pink)",
                    }}>
                      {OutcomeLabel[prediction.choice as keyof typeof OutcomeLabel]}
                    </span>
                  </div>
                  <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                    {formatEther(prediction.amount)} ETH
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                    {prediction.isAgent && (
                      <span style={{ fontSize: "11px", color: "var(--neon-pink)", background: "rgba(255,0,255,0.1)", padding: "3px 10px", borderRadius: "10px", border: "1px solid rgba(255,0,255,0.3)" }}>Agent</span>
                    )}
                    {prediction.claimed && (
                      <span style={{ fontSize: "11px", color: "var(--neon-green)", background: "rgba(0,255,136,0.1)", padding: "3px 10px", borderRadius: "10px" }}>✓ Claimed</span>
                    )}
                  </div>
                </div>

                {canClaim && (
                  <button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    style={{
                      padding: "14px 28px", borderRadius: "14px",
                      fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                      background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                      color: "var(--deep-space)", fontFamily: "var(--font-rajdhani)",
                      fontSize: "16px", cursor: "pointer", border: "none",
                      boxShadow: "0 0 24px rgba(0,245,255,0.35)",
                      transition: "all 0.3s",
                      opacity: isClaiming ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-4px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 30px rgba(0,245,255,0.5)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(0,245,255,0.35)";
                    }}
                  >
                    {isClaiming ? "Claiming..." : "Claim Winnings"}
                  </button>
                )}
              </div>

              {claimSuccess && (
                <div style={{
                  marginTop: "16px", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", fontWeight: 600,
                  background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)", color: "var(--neon-green)",
                }}>
                  Winnings claimed successfully!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settlement Request */}
        {status === "OPEN" && isExpired && (
          <div style={{
            background: "var(--midnight)",
            border: "2px solid rgba(255,184,0,0.2)",
            borderRadius: "24px", padding: "36px", marginBottom: "24px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "4px",
              background: "linear-gradient(90deg, var(--amber), var(--hot-pink))",
              opacity: 0.6,
            }} />
            <h2 style={{
              fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700,
              color: "var(--amber)", textTransform: "uppercase",
              letterSpacing: "0.15em", marginBottom: "12px",
            }}>Market Expired — Ready for Settlement</h2>
            <p style={{ fontSize: "15px", color: "var(--text-muted)", marginBottom: "24px", lineHeight: 1.6, fontFamily: "var(--font-ibm-plex-mono)" }}>
              This market has passed its deadline. Request AI-powered settlement via Chainlink CRE + Gemini.
            </p>
            <button
              onClick={handleRequestSettlement}
              disabled={isSettling}
              style={{
                padding: "14px 32px", borderRadius: "14px",
                fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                background: "rgba(255,184,0,0.12)", border: "2px solid var(--amber)",
                color: "var(--amber)", fontFamily: "var(--font-rajdhani)",
                fontSize: "16px", cursor: "pointer", transition: "all 0.3s",
                opacity: isSettling ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--amber)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--deep-space)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(255,184,0,0.4)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,184,0,0.12)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--amber)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {isSettling ? "Requesting..." : "⚡ Request AI Settlement"}
            </button>
          </div>
        )}

        {/* Settlement Result */}
        {status === "SETTLED" && (
          <div style={{
            background: "var(--midnight)",
            border: "2px solid rgba(0,245,255,0.2)",
            borderRadius: "24px", padding: "36px", marginBottom: "24px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "5px",
              background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
            }} />
            <h2 style={{
              fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700,
              color: "var(--electric-cyan)", textTransform: "uppercase",
              letterSpacing: "0.15em", marginBottom: "24px",
            }}>Market Settled</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div
                style={{
                  borderRadius: "20px", padding: "28px", textAlign: "center",
                  background: market.outcome === 0 ? "rgba(0,255,136,0.08)" : "rgba(255,51,102,0.08)",
                  border: `2px solid ${market.outcome === 0 ? "rgba(0,255,136,0.3)" : "rgba(255,51,102,0.3)"}`,
                  transition: "all 0.3s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(-4px)";
                  el.style.boxShadow = `0 8px 24px ${market.outcome === 0 ? "rgba(0,255,136,0.2)" : "rgba(255,51,102,0.2)"}`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "none";
                }}
              >
                <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px" }}>Outcome</p>
                <p style={{
                  fontFamily: "var(--font-rajdhani)", fontSize: "32px", fontWeight: 700,
                  color: market.outcome === 0 ? "var(--neon-green)" : "var(--hot-pink)", lineHeight: 1,
                }}>
                  {OutcomeLabel[market.outcome as keyof typeof OutcomeLabel]}
                </p>
              </div>
              <div
                style={{
                  borderRadius: "20px", padding: "28px", textAlign: "center",
                  background: "rgba(0,245,255,0.06)", border: "2px solid rgba(0,245,255,0.2)",
                  transition: "all 0.3s", cursor: "default",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(-4px)";
                  el.style.boxShadow = "0 8px 24px rgba(0,245,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "none";
                }}
              >
                <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px" }}>AI Confidence</p>
                <p style={{ fontFamily: "var(--font-rajdhani)", fontSize: "32px", fontWeight: 700, color: "var(--electric-cyan)", lineHeight: 1 }}>
                  {(Number(market.confidenceScore) / 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Market Info */}
        <div style={{
          background: "var(--midnight)",
          border: "2px solid rgba(0,245,255,0.15)",
          borderRadius: "24px", padding: "36px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "4px",
            background: "linear-gradient(90deg, var(--electric-cyan), var(--neon-pink))",
            opacity: 0.6,
          }} />
          <h2 style={{
            fontFamily: "var(--font-rajdhani)", fontSize: "18px", fontWeight: 700,
            color: "var(--electric-cyan)", textTransform: "uppercase",
            letterSpacing: "0.15em", marginBottom: "24px",
          }}>Market Info</h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              ...infoData,
              { label: "Creator", value: market.creator, color: "var(--text-primary)" },
            ].map((row) => (
              <div key={row.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 0", borderBottom: "1px solid rgba(0,245,255,0.06)",
              }}>
                <span style={{ fontSize: "14px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>{row.label}</span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: row.color, fontFamily: "var(--font-rajdhani)" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <style>{`
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
