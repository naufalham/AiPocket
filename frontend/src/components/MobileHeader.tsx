"use client";

import Link from "next/link";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface MobileHeaderProps {
  /** Extra content rendered below the logo/button row (e.g. stats row on Dashboard) */
  children?: React.ReactNode;
}

export function MobileHeader({ children }: MobileHeaderProps) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(26,26,46,0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,245,255,0.2)",
        padding: "16px 20px",
      }}
    >
      {/* Logo + Connect button row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: children ? "10px" : 0 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <Image src="/logo.png" alt="AgentBet Logo" width={32} height={32} style={{ objectFit: "contain" }} />
          <span
            style={{
              fontFamily: "var(--font-rajdhani)",
              fontSize: "24px",
              fontWeight: 700,
              background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "1px",
            }}
          >
            AGENTBET
          </span>
        </Link>

        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain;
            if (!connected) return (
              <button
                onClick={openConnectModal}
                style={{
                  background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  color: "var(--deep-space)",
                  fontFamily: "var(--font-rajdhani)",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(0,245,255,0.5)",
                  whiteSpace: "nowrap",
                }}
              >
                Connect Wallet
              </button>
            );
            return (
              <button
                onClick={openAccountModal}
                style={{
                  background: "linear-gradient(135deg, var(--electric-cyan), var(--neon-pink))",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  color: "var(--deep-space)",
                  fontFamily: "var(--font-rajdhani)",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(0,245,255,0.5)",
                  whiteSpace: "nowrap",
                }}
              >
                {account.displayName}
              </button>
            );
          }}
        </ConnectButton.Custom>
      </div>

      {/* Optional extra content (e.g. stats row) */}
      {children}
    </nav>
  );
}
