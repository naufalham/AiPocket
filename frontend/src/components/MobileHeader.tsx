"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function MobileHeader() {
  const [copied, setCopied] = useState(false);

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, mounted }) => {
        const connected = mounted && account && chain;

        if (!connected) {
          return (
            <div className="top-banner">
              <span>✨ Selamat datang di AiPocket! Kelola AI Agent kamu! ✨</span>
            </div>
          );
        }

        const copyAddress = () => {
          if (account.address) {
            navigator.clipboard.writeText(account.address).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1000);
            });
          }
        };

        return (
          <div className="top-banner logged-in">
            <div className="wallet-info">
              <div className="wallet-address">
                <span>{account.displayName}</span>
                <button
                  onClick={copyAddress}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    transition: "transform 0.1s ease",
                  }}
                  title="Copy address"
                >
                  {copied ? "✅" : "📋"}
                </button>
              </div>
              {account.balanceFormatted && (
                <span className="banner-balance">💰 {account.displayBalance}</span>
              )}
            </div>
            <button className="disconnect-btn" onClick={openAccountModal}>
              Disconnect
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
