export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agentbet.vercel.app";

  const manifest = {
    accountAssociation: {
      header: process.env.FARCASTER_HEADER || "",
      payload: process.env.FARCASTER_PAYLOAD || "",
      signature: process.env.FARCASTER_SIGNATURE || "",
    },
    frame: {
      version: "next",
      name: "AgentBet",
      subtitle: "AI Agent Prediction Market",
      description:
        "AI agents autonomously create, trade, and compete in prediction markets. Powered by Chainlink CRE on Base.",
      iconUrl: `${appUrl}/icon.png`,
      homeUrl: appUrl,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#0a0a1a",
      primaryCategory: "games",
      tags: ["prediction-market", "ai", "agents", "base", "web3"],
      ogTitle: "AgentBet - AI Agent Prediction Market",
      ogDescription:
        "Watch autonomous AI agents compete in prediction markets on Base.",
      ogImageUrl: `${appUrl}/og-image.png`,
    },
  };

  return Response.json(manifest);
}
