"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { formatEther, type Address } from "viem";
import { useReadContract } from "wagmi";
import { MobileHeader } from "@/components/MobileHeader";
import { CONTRACTS, AGENT_REGISTRY_ABI } from "@/lib/contracts";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export default function AgentProfilePage() {
  const params = useParams();
  const agentAddress = params.address as Address;

  const { data: agent, isLoading } = useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgent",
    args: [agentAddress],
  });

  const totalBets = agent ? Number(agent.totalBets) : 0;
  const wins = agent ? Number(agent.wins) : 0;
  const losses = agent ? Number(agent.losses) : 0;
  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : "0.0";
  const netProfit = agent ? BigInt(agent.totalProfit) - BigInt(agent.totalLoss) : 0n;
  const isProfitable = netProfit > 0n;

  const loadingSpinner = (
    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
      <div style={{
        width: "40px", height: "40px", borderRadius: "50%",
        border: "2px solid rgba(0,245,255,0.15)",
        borderTopColor: "var(--electric-cyan)",
        animation: "spin 0.8s linear infinite",
        margin: "0 auto 16px",
      }} />
      <span style={{ fontSize: "13px", fontFamily: "var(--font-ibm-plex-mono)" }}>Loading agent profile...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const statsData = agent ? [
    { label: "Score", value: String(Number(agent.score)), color: "var(--electric-cyan)" },
    { label: "Win Rate", value: `${winRate}%`, color: "var(--neon-green)" },
    { label: "Total Bets", value: String(totalBets), color: "var(--text-primary)" },
    {
      label: "Net P&L",
      value: `${isProfitable ? "+" : netProfit < 0n ? "-" : ""}${formatEther(netProfit > 0n ? netProfit : netProfit < 0n ? -netProfit : 0n)} ETH`,
      color: isProfitable ? "var(--neon-green)" : netProfit < 0n ? "var(--hot-pink)" : "var(--text-muted)",
    },
  ] : [];

  const perfData = agent ? [
    { label: "Wins", value: String(wins), color: "var(--neon-green)" },
    { label: "Losses", value: String(losses), color: "var(--hot-pink)" },
    { label: "Total Profit", value: `${formatEther(BigInt(agent.totalProfit))} ETH`, color: "var(--neon-green)" },
    { label: "Total Loss", value: `${formatEther(BigInt(agent.totalLoss))} ETH`, color: "var(--hot-pink)" },
    { label: "Staked Amount", value: `${formatEther(BigInt(agent.stakedAmount))} ETH`, color: "var(--electric-cyan)" },
    { label: "Markets Created", value: String(Number(agent.marketsCreated)), color: "var(--text-primary)" },
  ] : [];

  return (
    <div>

      {/* ═══════════════════ MOBILE LAYOUT ═══════════════════ */}
      <div className="mobile-only" style={{ paddingBottom: "80px" }}>

        {/* ── Sticky Mobile Navbar ── */}
        <MobileHeader />

        {/* ── Back Link ── */}
        <div style={{ padding: "16px 20px 0" }}>
          <Link
            href="/agents"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              color: "var(--text-muted)", textDecoration: "none", fontSize: "13px",
              fontFamily: "var(--font-ibm-plex-mono)",
            }}
          >
            ← Back to Agents
          </Link>
        </div>

        {/* ── Main Content ── */}
        <div style={{ padding: "16px 20px 20px" }}>

          {isLoading || !agent ? loadingSpinner : (
            <>
              {/* Agent Header Card */}
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
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "50px", height: "50px", borderRadius: "12px",
                        background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "24px", boxShadow: "0 4px 12px rgba(0,245,255,0.3)",
                        flexShrink: 0,
                      }}>🤖</div>
                      <div style={{ minWidth: 0 }}>
                        <h1 style={{
                          fontFamily: "var(--font-rajdhani)", fontSize: "22px", fontWeight: 700,
                          background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{agent.name || "Unnamed Agent"}</h1>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                          {agentAddress.slice(0, 10)}...{agentAddress.slice(-6)}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "4px 10px", borderRadius: "12px",
                      fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                      flexShrink: 0, fontFamily: "var(--font-rajdhani)",
                      background: agent.isActive ? "rgba(0,255,136,0.15)" : "rgba(255,51,102,0.15)",
                      border: `1px solid ${agent.isActive ? "var(--neon-green)" : "var(--hot-pink)"}`,
                      color: agent.isActive ? "var(--neon-green)" : "var(--hot-pink)",
                    }}>
                      <span className={agent.isActive ? "animate-blink" : ""} style={{
                        width: "5px", height: "5px", background: "currentColor",
                        borderRadius: "50%", display: "inline-block",
                      }} />
                      {agent.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {agent.strategy && (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)", lineHeight: 1.5 }}>
                      Strategy: {agent.strategy}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
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

              {/* Performance Details */}
              <div style={{
                background: "var(--midnight)",
                border: "1px solid rgba(0,245,255,0.15)",
                borderRadius: "16px", padding: "20px", marginBottom: "16px",
              }}>
                <h2 style={{
                  fontFamily: "var(--font-rajdhani)", fontSize: "14px", fontWeight: 700,
                  color: "var(--electric-cyan)", textTransform: "uppercase",
                  letterSpacing: "0.15em", marginBottom: "16px",
                }}>Performance Details</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {perfData.map((row) => (
                    <div key={row.label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(0,245,255,0.06)",
                    }}>
                      <span style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>{row.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: row.color, fontFamily: "var(--font-rajdhani)" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Win/Loss Bar */}
              {totalBets > 0 && (
                <div style={{
                  background: "var(--midnight)",
                  border: "1px solid rgba(0,245,255,0.15)",
                  borderRadius: "16px", padding: "20px",
                }}>
                  <h2 style={{
                    fontFamily: "var(--font-rajdhani)", fontSize: "14px", fontWeight: 700,
                    color: "var(--electric-cyan)", textTransform: "uppercase",
                    letterSpacing: "0.15em", marginBottom: "16px",
                  }}>Win / Loss Distribution</h2>
                  <div style={{
                    width: "100%", height: "10px", borderRadius: "999px",
                    background: "rgba(255,51,102,0.2)", overflow: "hidden", marginBottom: "12px",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: "999px",
                      width: `${parseFloat(winRate)}%`,
                      background: "linear-gradient(90deg, var(--neon-green), rgba(0,255,136,0.6))",
                      boxShadow: "0 0 10px rgba(0,255,136,0.5)",
                      transition: "width 0.7s",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--neon-green)", fontFamily: "var(--font-rajdhani)" }}>
                      {wins} Wins ({winRate}%)
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--hot-pink)", fontFamily: "var(--font-rajdhani)" }}>
                      {losses} Losses ({(100 - parseFloat(winRate)).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <MobileBottomNav />
      </div>
      {/* ═══════════════ END MOBILE LAYOUT ═══════════════ */}


      {/* ═══════════════════ DESKTOP LAYOUT ═══════════════════ */}
      <div className="desktop-only">

        {/* Back link */}
        <Link
          href="/agents"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            color: "var(--text-muted)", textDecoration: "none", fontSize: "14px",
            fontFamily: "var(--font-ibm-plex-mono)", marginBottom: "24px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--electric-cyan)"; (e.currentTarget as HTMLAnchorElement).style.gap = "12px"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLAnchorElement).style.gap = "8px"; }}
        >
          ← Back to Agents
        </Link>

        {isLoading || !agent ? loadingSpinner : (
          <>
            {/* Agent Header Card */}
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
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{
                      width: "72px", height: "72px", borderRadius: "16px",
                      background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "36px", boxShadow: "0 6px 20px rgba(0,245,255,0.3)",
                    }}>🤖</div>
                    <div>
                      <h1 style={{
                        fontFamily: "var(--font-rajdhani)", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700,
                        background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                        letterSpacing: "2px", textTransform: "uppercase", lineHeight: 1.1, marginBottom: "6px",
                      }}>{agent.name || "Unnamed Agent"}</h1>
                      <p style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                        {agentAddress}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "8px 16px", borderRadius: "20px",
                    fontSize: "12px", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "1px", fontFamily: "var(--font-rajdhani)",
                    background: agent.isActive ? "rgba(0,255,136,0.12)" : "rgba(255,51,102,0.12)",
                    border: `1px solid ${agent.isActive ? "var(--neon-green)" : "var(--hot-pink)"}`,
                    color: agent.isActive ? "var(--neon-green)" : "var(--hot-pink)",
                  }}>
                    <span style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: "currentColor", display: "inline-block",
                      animation: "pulse 2s ease-in-out infinite",
                    }} />
                    {agent.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {agent.strategy && (
                  <p style={{ fontSize: "15px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)", lineHeight: 1.6 }}>
                    Strategy: {agent.strategy}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Grid */}
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

            {/* Two-column layout for Performance + Win/Loss */}
            <div style={{ display: "grid", gridTemplateColumns: totalBets > 0 ? "1.2fr 0.8fr" : "1fr", gap: "24px" }}>

              {/* Performance Details */}
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
                }}>Performance Details</h2>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {perfData.map((row) => (
                    <div key={row.label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "14px 0",
                      borderBottom: "1px solid rgba(0,245,255,0.06)",
                    }}>
                      <span style={{ fontSize: "14px", color: "var(--text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>{row.label}</span>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: row.color, fontFamily: "var(--font-rajdhani)" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Win/Loss Bar */}
              {totalBets > 0 && (
                <div style={{
                  background: "var(--midnight)",
                  border: "2px solid rgba(0,245,255,0.15)",
                  borderRadius: "24px", padding: "36px",
                  position: "relative", overflow: "hidden",
                  display: "flex", flexDirection: "column",
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
                  }}>Win / Loss</h2>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "24px" }}>
                    {/* Visual circle */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        width: "120px", height: "120px", borderRadius: "50%",
                        background: `conic-gradient(var(--neon-green) 0% ${parseFloat(winRate)}%, var(--hot-pink) ${parseFloat(winRate)}% 100%)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto", boxShadow: "0 0 30px rgba(0,245,255,0.15)",
                      }}>
                        <div style={{
                          width: "90px", height: "90px", borderRadius: "50%",
                          background: "var(--midnight)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexDirection: "column",
                        }}>
                          <span style={{ fontFamily: "var(--font-rajdhani)", fontSize: "28px", fontWeight: 700, color: "var(--neon-green)", lineHeight: 1 }}>{winRate}%</span>
                          <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Win Rate</span>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div style={{ display: "flex", justifyContent: "space-around" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "24px", fontWeight: 700, color: "var(--neon-green)" }}>{wins}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Wins</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--font-rajdhani)", fontSize: "24px", fontWeight: 700, color: "var(--hot-pink)" }}>{losses}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Losses</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

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
