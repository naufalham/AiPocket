"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/agents", label: "Agents" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="navbar-card"
      style={{
        background: "rgba(26, 26, 46, 0.8)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(0, 245, 255, 0.2)",
        borderRadius: "16px",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "40px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      {/* Logo + live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <Image src="/logo.png" alt="AgentBet Logo" width={36} height={36} style={{ objectFit: "contain" }} />
          <span
            style={{
              fontFamily: "var(--font-rajdhani)",
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "3px",
              background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            AGENTBET
          </span>
        </Link>

        <div className="hidden md:flex" style={{ alignItems: "center", gap: "6px" }}>
          <span
            className="animate-blink"
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--neon-green)", display: "inline-block" }}
          />
          <span style={{ color: "var(--neon-green)", fontSize: "12px", fontFamily: "var(--font-rajdhani)", letterSpacing: "1px" }}>
            LIVE
          </span>
        </div>
      </div>

      {/* Nav links — desktop */}
      <div className="hidden md:flex" style={{ alignItems: "center", gap: "4px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontFamily: "var(--font-rajdhani)",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: 600,
                textDecoration: "none",
                padding: "8px 16px",
                letterSpacing: "1px",
                fontSize: "15px",
                transition: "color 0.3s",
                position: "relative",
                borderBottom: isActive ? "2px solid var(--electric-cyan)" : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "var(--electric-cyan)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)";
              }}
            >
              {item.label.toUpperCase()}
            </Link>
          );
        })}
      </div>

      {/* Right: wallet + hamburger */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain;

            if (!connected) {
              return (
                <button
                  onClick={openConnectModal}
                  className="nb-connect"
                  style={{
                    background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                    border: "none",
                    borderRadius: "8px",
                    color: "var(--deep-space)",
                    fontFamily: "var(--font-rajdhani)",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 0 20px rgba(0, 245, 255, 0.4)",
                    letterSpacing: "0.5px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 30px rgba(0, 245, 255, 0.6)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0, 245, 255, 0.4)";
                  }}
                >
                  Connect Wallet
                </button>
              );
            }

            if (chain.unsupported) {
              return (
                <button
                  onClick={openChainModal}
                  style={{
                    background: "rgba(255,51,102,0.15)",
                    border: "1.5px solid var(--hot-pink)",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    color: "var(--hot-pink)",
                    fontFamily: "var(--font-rajdhani)",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Wrong Network
                </button>
              );
            }

            return (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={openChainModal}
                  className="nb-chain"
                  style={{
                    background: "rgba(0,245,255,0.08)",
                    border: "1px solid rgba(0,245,255,0.25)",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-rajdhani)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,245,255,0.5)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--electric-cyan)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,245,255,0.25)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                  }}
                >
                  {chain.hasIcon && chain.iconUrl && (
                    <img src={chain.iconUrl} alt={chain.name} style={{ width: "16px", height: "16px", borderRadius: "50%" }} />
                  )}
                  {chain.name}
                </button>
                <button
                  onClick={openAccountModal}
                  className="nb-account"
                  style={{
                    background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                    border: "none",
                    borderRadius: "8px",
                    color: "var(--deep-space)",
                    fontFamily: "var(--font-rajdhani)",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 0 16px rgba(0, 245, 255, 0.35)",
                    transition: "all 0.3s ease",
                    letterSpacing: "0.5px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(0, 245, 255, 0.55)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(0, 245, 255, 0.35)";
                  }}
                >
                  {account.displayName}
                </button>
              </div>
            );
          }}
        </ConnectButton.Custom>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg"
          style={{ color: "var(--text-muted)", background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.15)" }}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden w-full"
          style={{ borderTop: "1px solid rgba(0,245,255,0.1)", paddingTop: "12px" }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 my-1 rounded-lg text-sm font-semibold tracking-wider transition-all"
                style={{
                  fontFamily: "var(--font-rajdhani)",
                  color: isActive ? "var(--electric-cyan)" : "var(--text-muted)",
                  background: isActive ? "rgba(0,245,255,0.08)" : "transparent",
                  letterSpacing: "0.1em",
                }}
              >
                {item.label.toUpperCase()}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
