"use client";

import { useState } from "react";
import Link from "next/link";
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
        background: "#FFB84D",
        border: "3px solid #000",
        borderRadius: "16px",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
        boxShadow: "5px 5px 0 0 #000",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <img src="/logo.jpeg" alt="AiPocket" style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }} />
          <span
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#2d3748",
              letterSpacing: "-0.5px",
            }}
          >
            AiPocket
          </span>
        </Link>
      </div>

      {/* Nav links - desktop */}
      <div className="hidden md:flex" style={{ alignItems: "center", gap: "4px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                color: isActive ? "#000" : "#4a5568",
                fontWeight: 700,
                textDecoration: "none",
                padding: "8px 16px",
                fontSize: "15px",
                transition: "all 0.2s",
                borderRadius: "10px",
                background: isActive ? "rgba(255,255,255,0.5)" : "transparent",
              }}
            >
              {item.label}
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
                    background: "#fff",
                    border: "2px solid #000",
                    borderRadius: "10px",
                    color: "#000",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 3px 0 0 #000",
                    transition: "all 0.1s ease",
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
                    background: "#FFB8C6",
                    border: "2px solid #000",
                    padding: "10px 20px",
                    borderRadius: "10px",
                    color: "#000",
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
                    background: "rgba(255,255,255,0.5)",
                    border: "2px solid #000",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    color: "#2d3748",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s",
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
                    background: "#fff",
                    border: "2px solid #000",
                    borderRadius: "10px",
                    color: "#000",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 3px 0 0 #000",
                    transition: "all 0.1s ease",
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
          style={{ color: "#2d3748", background: "rgba(255,255,255,0.4)", border: "2px solid #000" }}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden w-full"
          style={{ borderTop: "2px solid #000", paddingTop: "12px" }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 my-1 rounded-lg text-sm font-semibold transition-all"
                style={{
                  color: isActive ? "#000" : "#4a5568",
                  background: isActive ? "rgba(255,255,255,0.5)" : "transparent",
                  fontWeight: 700,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
