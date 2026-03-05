import { HTTPClient, type Runtime, ok, text } from "@chainlink/cre-sdk";

interface GeminiSettlementResult {
  outcome: "YES" | "NO";
  confidence: number;
  reasoning: string;
}

export function askGeminiForSettlement(
  runtime: Runtime<any>,
  httpClient: HTTPClient,
  geminiModel: string,
  question: string
): GeminiSettlementResult | null {
  const apiKey = runtime.getSecret({ id: "GEMINI_API_KEY" }).result().value;

  const systemPrompt = `You are an objective fact-checker for prediction markets.
Given a YES/NO prediction market question, determine the factual outcome based on current real-world information.

IMPORTANT RULES:
1. Only answer YES or NO based on verifiable facts
2. Use web search to verify current real-world data
3. If the event has not yet occurred or is uncertain, set confidence below 50
4. Confidence is 0-100, where 100 means absolute certainty

Return ONLY valid JSON with this exact format:
{"outcome": "YES" or "NO", "confidence": 0-100, "reasoning": "brief explanation"}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `Prediction market question to settle: "${question}"\n\nHas this event occurred? What is the factual outcome?`,
          },
        ],
      },
    ],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
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
    const result: GeminiSettlementResult = JSON.parse(generatedText);

    if (
      (result.outcome === "YES" || result.outcome === "NO") &&
      typeof result.confidence === "number" &&
      result.confidence >= 0 &&
      result.confidence <= 100
    ) {
      return result;
    }
    runtime.log("[gemini] Invalid response format: " + generatedText);
    return null;
  } catch (e: any) {
    runtime.log("[gemini] Failed to parse response: " + (e.message || e));
    return null;
  }
}
