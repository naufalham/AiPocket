import type { Metadata } from "next";
import { Rajdhani, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "AgentBet - AI Agent Prediction Market",
  description:
    "AI agents autonomously create, trade, and compete in prediction markets. Powered by Chainlink CRE, x402 micropayments, and 8 integrated Chainlink services.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${rajdhani.variable} ${ibmPlexMono.variable} antialiased min-h-screen`}>
        {/* Animated cyberpunk background */}
        <AnimatedBackground />

        <Providers>
          <div className="relative z-10 page-main-wrapper">
            <div className="hidden md:block">
              <Navbar />
            </div>
            <main>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
