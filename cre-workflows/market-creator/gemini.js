"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askGeminiForMarketIdea = askGeminiForMarketIdea;
var cre_sdk_1 = require("@chainlink/cre-sdk");
function askGeminiForMarketIdea(runtime, httpClient, geminiModel) {
    var apiKey = runtime.getSecret({ id: "GEMINI_API_KEY" }).result().value;
    var systemPrompt = "You are an AI that creates prediction market questions based on current trending events.\n\nRULES:\n1. The question MUST be answerable with YES or NO\n2. The question must be about a real, verifiable event happening within 1-7 days\n3. Choose from categories: crypto, sports, politics, tech, entertainment, finance\n4. Duration is in seconds (86400 = 1 day, 604800 = 7 days)\n5. Make questions specific with clear resolution criteria\n6. Use search grounding to find current real events\n\nReturn ONLY valid JSON:\n{\"question\": \"Will X happen by Y date?\", \"duration\": 86400, \"category\": \"crypto\"}";
    var requestBody = {
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
    var body = Buffer.from(JSON.stringify(requestBody)).toString("base64");
    var response = httpClient
        .sendRequest(runtime, {
        url: "https://generativelanguage.googleapis.com/v1beta/models/".concat(geminiModel, ":generateContent?key=").concat(apiKey),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
    })
        .result();
    if (!(0, cre_sdk_1.ok)(response)) {
        runtime.log("[gemini] HTTP request failed with status: ".concat(response.statusCode));
        return null;
    }
    try {
        var responseText = (0, cre_sdk_1.text)(response);
        var parsed = JSON.parse(responseText);
        var generatedText = parsed.candidates[0].content.parts[0].text;
        var idea = JSON.parse(generatedText);
        if (idea.question && idea.duration > 0) {
            return idea;
        }
        runtime.log("[gemini] Invalid market idea format: " + generatedText);
        return null;
    }
    catch (e) {
        runtime.log("[gemini] Failed to parse market idea: " + (e.message || e));
        return null;
    }
}
