"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useReadContract, useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import Link from "next/link";
import { MobileHeader } from "@/components/MobileHeader";
import { CONTRACTS, PREDICTION_MARKET_ABI, MarketStatus, OutcomeLabel } from "@/lib/contracts";
import { useSponsoredWrite } from "@/hooks/useSponsoredWrite";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const PRESET_AMOUNTS = ["0.001", "0.005", "0.01", "0.05"];

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  OPEN:                 { color: "#48BB78", bg: "#C3F4C6", label: "Open"      },
  SETTLEMENT_REQUESTED: { color: "#D69E2E", bg: "#FFE5B4", label: "Settling"  },
  SETTLED:              { color: "#4299E1", bg: "#BEE3F8", label: "Settled"   },
  CANCELLED:            { color: "#E53E3E", bg: "#FED7D7", label: "Cancelled" },
};

export default function MarketDetailPage() {
  const params = useParams();
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

  if (!market) {
    return (
      <>
        <MobileHeader />
        <div className="container" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            border: "3px solid #e2e8f0", borderTopColor: "#FFB84D",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#718096" }}>Loading market...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        <MobileBottomNav />
      </>
    );
  }

  const status = MarketStatus[market.status as keyof typeof MarketStatus];
  const meta = STATUS_META[status] || { color: "#000", bg: "#f7fafc", label: status };
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

  const infoData = [
    { label: "Bettors", value: String(Number(market.totalBettors)) },
    { label: "Platform Fee", value: "2%" },
    { label: "Deadline", value: new Date(Number(market.deadline) * 1000).toLocaleString() },
    { label: "Created", value: new Date(Number(market.createdAt) * 1000).toLocaleString() },
    { label: "YES Pool", value: `${formatEther(yesPool)} ETH`, color: "#48BB78" },
    { label: "NO Pool", value: `${formatEther(noPool)} ETH`, color: "#E53E3E" },
    { label: "Creator", value: `${market.creator.slice(0, 10)}...${market.creator.slice(-6)}` },
  ];

  return (
    <>
      <MobileHeader />

      <div className="container">

        {/* ── Back Link ── */}
        <div style={{ marginBottom: "16px" }}>
          <Link href="/markets" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            color: "#718096", textDecoration: "none", fontSize: "13px", fontWeight: 600,
          }}>
            ← Back to Markets
          </Link>
        </div>

        {/* ── Market Header ── */}
        <div className="agent-card" style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <div className="market-status-badge" style={{ background: meta.bg, color: meta.color, marginBottom: 0 }}>
                {status === "OPEN" && (
                  <span style={{
                    width: "6px", height: "6px", background: "#48BB78",
                    borderRadius: "50%", display: "inline-block",
                    animation: "pulse 2s ease-in-out infinite",
                  }} />
                )}
                {meta.label}
              </div>
              {market.isAgentCreated && (
                <span style={{
                  padding: "3px 8px", borderRadius: "8px",
                  fontSize: "10px", fontWeight: 700,
                  color: "#fff", background: "#FFB84D", border: "2px solid #000",
                }}>AI</span>
              )}
            </div>
            <span style={{ fontSize: "12px", color: "#718096", fontWeight: 600 }}>
              #{String(params.id).padStart(4, "0")}
            </span>
          </div>

          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#2d3748", lineHeight: 1.3, marginBottom: "8px" }}>
            {market.question}
          </h1>
          <p style={{
            fontSize: "12px", fontWeight: 600,
            color: remainingSecs <= 0 ? "#E53E3E" : "#D69E2E",
          }}>
            ⏱ {deadlineLabel}
          </p>
        </div>

        {/* ── Stats Grid ── */}
        <div className="stats-grid" style={{ marginBottom: "16px" }}>
          <div className="stat-card" style={{ padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "4px" }}>YES</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#48BB78" }}>{yesPercent}%</div>
          </div>
          <div className="stat-card" style={{ padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "4px" }}>NO</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#E53E3E" }}>{100 - yesPercent}%</div>
          </div>
          <div className="stat-card" style={{ padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "4px" }}>Total Pool</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#000" }}>{parseFloat(formatEther(totalPool)).toFixed(4)}</div>
            <div style={{ fontSize: "10px", color: "#718096" }}>ETH</div>
          </div>
          <div className="stat-card" style={{ padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "4px" }}>Time Left</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: remainingSecs <= 0 ? "#E53E3E" : "#D69E2E" }}>
              {deadlineLabel.replace(" left", "")}
            </div>
          </div>
        </div>

        {/* ── Odds Bar ── */}
        <div className="agent-card" style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#2d3748", marginBottom: "12px" }}>📊 Market Odds</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#48BB78" }}>{yesPercent}% <span style={{ fontSize: "12px", color: "#718096", fontWeight: 600 }}>YES</span></span>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#E53E3E" }}>{100 - yesPercent}% <span style={{ fontSize: "12px", color: "#718096", fontWeight: 600 }}>NO</span></span>
          </div>
          <div style={{ width: "100%", height: "12px", borderRadius: "999px", background: "#FFB8C6", overflow: "hidden", border: "2px solid #000" }}>
            <div style={{
              height: "100%", borderRadius: "999px",
              width: `${yesPercent}%`,
              background: "#48BB78",
              transition: "width 0.7s",
            }} />
          </div>
        </div>

        {/* ── Bet Form ── */}
        {status === "OPEN" && !isExpired && !hasBet && (
          <div className="agent-card" style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#2d3748", marginBottom: "16px" }}>🎯 Place Your Prediction</div>

            {/* Preset amounts */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "8px" }}>Quick select</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setBetAmount(preset)}
                    style={{
                      fontSize: "12px", fontWeight: 700,
                      padding: "8px 14px", borderRadius: "10px", cursor: "pointer",
                      background: betAmount === preset ? "#FFE5B4" : "#fff",
                      color: "#000", border: "2px solid #000",
                      boxShadow: betAmount === preset ? "3px 3px 0 0 #000" : "2px 2px 0 0 #000",
                      transition: "all 0.1s",
                    }}
                  >
                    {preset} ETH
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "8px" }}>Custom amount (ETH)</div>
              <input
                type="text"
                inputMode="decimal"
                value={betAmount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d*$/.test(v)) setBetAmount(v);
                }}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "12px",
                  background: "#fff", color: "#2d3748",
                  border: "2px solid #000", outline: "none",
                  fontSize: "14px", fontWeight: 700,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* YES / NO buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                onClick={() => handleBet(0)}
                disabled={isBetting || !address}
                style={{
                  padding: "14px", borderRadius: "12px", fontWeight: 700,
                  background: "#C3F4C6", border: "2px solid #000",
                  color: "#000", fontSize: "15px", cursor: "pointer",
                  boxShadow: "0 3px 0 0 #000", transition: "all 0.1s",
                  opacity: isBetting || !address ? 0.4 : 1,
                }}
              >
                {isBetting ? "Confirming..." : "✓ Bet YES"}
              </button>
              <button
                onClick={() => handleBet(1)}
                disabled={isBetting || !address}
                style={{
                  padding: "14px", borderRadius: "12px", fontWeight: 700,
                  background: "#FFB8C6", border: "2px solid #000",
                  color: "#000", fontSize: "15px", cursor: "pointer",
                  boxShadow: "0 3px 0 0 #000", transition: "all 0.1s",
                  opacity: isBetting || !address ? 0.4 : 1,
                }}
              >
                {isBetting ? "Confirming..." : "✗ Bet NO"}
              </button>
            </div>

            {isSponsored && (
              <div style={{
                marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "8px 16px", borderRadius: "10px",
                background: "#C3F4C6", border: "2px solid #000",
              }}>
                <span style={{ fontSize: "12px" }}>⛽</span>
                <span style={{ fontSize: "11px", fontWeight: 700 }}>Gas Sponsored</span>
              </div>
            )}
            {!address && (
              <p style={{ fontSize: "12px", marginTop: "12px", textAlign: "center", color: "#D69E2E", fontWeight: 600 }}>
                Connect your wallet to place a prediction
              </p>
            )}
            {betSuccess && (
              <div style={{
                marginTop: "16px", padding: "12px 16px", borderRadius: "10px", fontSize: "13px", textAlign: "center", fontWeight: 700,
                background: "#C3F4C6", border: "2px solid #000", color: "#2d3748",
              }}>
                ✅ Prediction placed successfully!
              </div>
            )}
            {betError && (
              <div style={{
                marginTop: "16px", padding: "12px 16px", borderRadius: "10px", fontSize: "13px", textAlign: "center", fontWeight: 700,
                background: "#FED7D7", border: "2px solid #000", color: "#2d3748",
              }}>
                ❌ Transaction failed. Please try again.
              </div>
            )}
          </div>
        )}

        {/* ── Your Prediction ── */}
        {hasBet && prediction && (
          <div className="agent-card" style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#2d3748", marginBottom: "16px" }}>🎯 Your Prediction</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{
                padding: "10px 20px", borderRadius: "10px",
                background: prediction.choice === 0 ? "#C3F4C6" : "#FFB8C6",
                border: "2px solid #000",
              }}>
                <span style={{ fontSize: "18px", fontWeight: 800, color: "#000" }}>
                  {OutcomeLabel[prediction.choice as keyof typeof OutcomeLabel]}
                </span>
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 800, color: "#2d3748" }}>
                  {formatEther(prediction.amount)} ETH
                </p>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                  {prediction.isAgent && (
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#fff", background: "#FFB84D", padding: "2px 8px", borderRadius: "6px", border: "1px solid #000" }}>Agent</span>
                  )}
                  {prediction.claimed && (
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#48BB78" }}>✓ Claimed</span>
                  )}
                </div>
              </div>
              {canClaim && (
                <button
                  onClick={handleClaim}
                  disabled={isClaiming}
                  style={{
                    marginLeft: "auto", padding: "10px 20px", borderRadius: "10px",
                    fontWeight: 700, background: "#FFB84D", border: "2px solid #000",
                    color: "#000", fontSize: "14px", cursor: "pointer",
                    boxShadow: "0 3px 0 0 #000", transition: "all 0.1s",
                    opacity: isClaiming ? 0.5 : 1,
                  }}
                >
                  {isClaiming ? "Claiming..." : "💰 Claim Winnings"}
                </button>
              )}
            </div>
            {claimSuccess && (
              <div style={{
                marginTop: "16px", padding: "12px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
                background: "#C3F4C6", border: "2px solid #000", color: "#2d3748", textAlign: "center",
              }}>
                ✅ Winnings claimed successfully!
              </div>
            )}
          </div>
        )}

        {/* ── Settlement Request ── */}
        {status === "OPEN" && isExpired && (
          <div className="agent-card" style={{ marginBottom: "16px", background: "#FFE5B4" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#2d3748", marginBottom: "8px" }}>⏳ Market Expired</div>
            <p style={{ fontSize: "12px", color: "#4a5568", marginBottom: "16px", lineHeight: 1.6 }}>
              Request AI-powered settlement via Chainlink CRE + Gemini.
            </p>
            <button
              onClick={handleRequestSettlement}
              disabled={isSettling}
              style={{
                padding: "12px 24px", borderRadius: "10px",
                fontWeight: 700, background: "#FFB84D", border: "2px solid #000",
                color: "#000", fontSize: "14px", cursor: "pointer",
                boxShadow: "0 3px 0 0 #000", transition: "all 0.1s",
                opacity: isSettling ? 0.5 : 1,
              }}
            >
              {isSettling ? "Requesting..." : "⚡ Request AI Settlement"}
            </button>
          </div>
        )}

        {/* ── Settlement Result ── */}
        {status === "SETTLED" && (
          <div className="agent-card" style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#2d3748", marginBottom: "16px" }}>✅ Market Settled</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{
                borderRadius: "12px", padding: "16px", textAlign: "center",
                background: market.outcome === 0 ? "#C3F4C6" : "#FFB8C6",
                border: "2px solid #000",
              }}>
                <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "6px" }}>Outcome</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#000" }}>
                  {OutcomeLabel[market.outcome as keyof typeof OutcomeLabel]}
                </div>
              </div>
              <div style={{
                borderRadius: "12px", padding: "16px", textAlign: "center",
                background: "#FFE5B4", border: "2px solid #000",
              }}>
                <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600, marginBottom: "6px" }}>AI Confidence</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#000" }}>
                  {(Number(market.confidenceScore) / 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Market Info ── */}
        <div className="info-card">
          <div className="info-title">📋 Market Info</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {infoData.map((row) => (
              <div key={row.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid #e2e8f0",
              }}>
                <span style={{ fontSize: "13px", color: "#718096", fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: row.color || "#2d3748" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <MobileBottomNav />
    </>
  );
}
