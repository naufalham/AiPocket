import { HTTPClient, type Runtime, ok, text } from "@chainlink/cre-sdk";

interface MarketIdea {
  question: string;
  duration: number;
  category: string;
}

export function askGeminiForMarketIdea(
  runtime: Runtime<any>,
  httpClient: HTTPClient,
  geminiModel: string
): MarketIdea | null {
  const apiKey = runtime.getSecret({ id: "GEMINI_API_KEY" }).result().value;

  const systemPrompt = `You are an AI that creates prediction market questions based on current trending events.

RULES:
1. The question MUST be answerable with YES or NO
2. The question must be about a real, verifiable event happening within 1-7 days
3. Choose from categories: crypto, sports, politics, tech, entertainment, finance
4. Duration is in seconds (86400 = 1 day, 604800 = 7 days)
5. Make questions specific with clear resolution criteria
6. Use search grounding to find current real events

Return ONLY valid JSON:
{"question": "Will X happen by Y date?", "duration": 86400, "category": "crypto"}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: "Search for today's top trending news and events. Generate ONE compelling prediction market question. The event should resolve within 1-7 days.",
          },
        ],
      },
    ],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.8,
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
    runtime.log(`[gemini] HTTP request failed with status: ${response.statusCode}`);
    return null;
  }

  try {
    const responseText = text(response);
    const parsed = JSON.parse(responseText);
    const generatedText = parsed.candidates[0].content.parts[0].text;
    const idea: MarketIdea = JSON.parse(generatedText);

    if (idea.question && idea.duration > 0) {
      return idea;
    }
    runtime.log("[gemini] Invalid market idea format: " + generatedText);
    return null;
  } catch (e: any) {
    runtime.log("[gemini] Failed to parse market idea: " + (e.message || e));
    return null;
  }
}
