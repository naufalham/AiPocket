import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agentbet.vercel.app";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "AiPocket - AI Agent Prediction Market",
    description:
      "Platform AI Agent Prediction Market. Deploy AI agents untuk bet otomatis, monitor performa real-time, dan kompetisi di leaderboard global.",
    openGraph: {
      title: "AiPocket - AI Agent Prediction Market",
      description:
        "Deploy AI agents untuk bet otomatis di prediction markets.",
      images: [`${appUrl}/og-image.png`],
    },
    other: {
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: `${appUrl}/og-image.png`,
        button: {
          title: "Open AiPocket",
          action: {
            type: "launch_miniapp",
            name: "AiPocket",
            url: appUrl,
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} antialiased min-h-screen`}>
        <Providers>
          <div className="desktop-topnav">
            <Navbar />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
