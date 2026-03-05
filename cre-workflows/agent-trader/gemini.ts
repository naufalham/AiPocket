import { HTTPClient, type Runtime, ok, text } from "@chainlink/cre-sdk";

interface TradingStrategy {
  choice: "YES" | "NO";
  confidence: number;
  reasoning: string;
  suggestedBetSize: string;
}

export function askGeminiForStrategy(
  runtime: Runtime<any>,
  httpClient: HTTPClient,
  geminiModel: string,
  context: {
    question: string;
    yesPool: string;
    noPool: string;
    deadline: string;
    ethPrice?: string;
    btcPrice?: string;
    linkPrice?: string;
  }
): TradingStrategy | null {
  const apiKey = runtime.getSecret({ id: "GEMINI_API_KEY" }).result().value;

  const systemPrompt = `You are an expert AI trading agent for prediction markets.
Analyze the market and provide your trading recommendation.

ANALYSIS FRAMEWORK:
1. Evaluate the question and its likelihood based on current events
2. Consider the pool imbalance (odds implied by YES vs NO pools)
3. Factor in current crypto prices if relevant
4. Consider time remaining until deadline
5. Identify if the market is mispriced (edge opportunity)

RISK MANAGEMENT:
- Only recommend HIGH confidence bets (>60%)
- suggestedBetSize: "small" (0.001-0.005 ETH), "medium" (0.005-0.01 ETH), "large" (0.01-0.05 ETH)

Return ONLY valid JSON:
{"choice": "YES" or "NO", "confidence": 0-100, "reasoning": "analysis", "suggestedBetSize": "small|medium|large"}`;

  const userPrompt = `Market Analysis Request:
Question: "${context.question}"
YES Pool: ${context.yesPool} wei
NO Pool: ${context.noPool} wei
Deadline: ${context.deadline}
${context.ethPrice ? `ETH/USD Price: $${context.ethPrice}` : ""}
${context.btcPrice ? `BTC/USD Price: $${context.btcPrice}` : ""}
${context.linkPrice ? `LINK/USD Price: $${context.linkPrice}` : ""}

What is your trading recommendation?`;

  const requestBody = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
    tools: [{ googleSearch: {} }],
  };

  const body = Buffer.from(JSON.stringify(requestBody)).toString("base64");

  const response = httpClient
    .sendRequest(runtime, {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
    })
    .result();

  if (!ok(response)) {
    runtime.log(
      `[gemini] HTTP request failed with status: ${response.statusCode}`
    );
    return null;
  }

  try {
    const responseText = text(response);
    const parsed = JSON.parse(responseText);
    const generatedText = parsed.candidates[0].content.parts[0].text;
    const strategy: TradingStrategy = JSON.parse(generatedText);

    if (
      (strategy.choice === "YES" || strategy.choice === "NO") &&
      typeof strategy.confidence === "number"
    ) {
      return strategy;
    }
    runtime.log("[gemini] Invalid strategy format: " + generatedText);
    return null;
  } catch (e: any) {
    runtime.log("[gemini] Failed to parse strategy: " + (e.message || e));
    return null;
  }
}
