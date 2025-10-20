var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/transcript-to-journey.js
var transcript_to_journey_exports = {};
__export(transcript_to_journey_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(transcript_to_journey_exports);
async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  try {
    const { transcript, prompt } = JSON.parse(event.body || "{}");
    if (!transcript || transcript.trim() === "") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Transcript is required" })
      };
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." })
      };
    }
    console.log("Calling OpenAI API...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a user journey mapping expert. You extract user journeys from transcripts and return valid JSON only. Never include markdown code blocks or explanations."
          },
          {
            role: "user",
            content: `${prompt}

Transcript:
${transcript}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4e3,
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: "OpenAI API error",
          details: errorData
        })
      };
    }
    const data = await response.json();
    const content = data.choices[0].message.content;
    let journeyData;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/```\n?/g, "");
      }
      journeyData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to parse AI response",
          rawResponse: content
        })
      };
    }
    if (!journeyData.nodes || !Array.isArray(journeyData.nodes) || journeyData.nodes.length === 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Invalid journey structure: missing or empty nodes",
          data: journeyData
        })
      };
    }
    if (!journeyData.edges || !Array.isArray(journeyData.edges)) {
      journeyData.edges = [];
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        journey: journeyData,
        usage: data.usage
      })
    };
  } catch (error) {
    console.error("Transcript to journey error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      })
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=transcript-to-journey.js.map
