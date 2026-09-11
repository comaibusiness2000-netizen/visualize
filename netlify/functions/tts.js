const allowedVoices = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar"
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-kairum-client-token",
  "Cache-Control": "no-store"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function normalizeText(value, maxChars) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function safeVoice(value) {
  const voice = String(value || "").trim().toLowerCase();
  return allowedVoices.has(voice) ? voice : "marin";
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(500, { error: "OPENAI_API_KEY is not configured" });
  }

  const requiredToken = process.env.KAIRUM_TTS_TOKEN;
  if (requiredToken) {
    const providedToken = event.headers["x-kairum-client-token"] || event.headers["X-Kairum-Client-Token"];
    if (providedToken !== requiredToken) {
      return json(401, { error: "Unauthorized" });
    }
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return json(400, { error: "Invalid JSON body" });
  }

  const maxChars = Number(process.env.KAIRUM_TTS_MAX_CHARS || 2400);
  const text = normalizeText(payload.text, maxChars);
  if (!text) {
    return json(400, { error: "Missing text" });
  }

  const voice = safeVoice(payload.voice);
  const instructions = normalizeText(payload.instructions, 900);
  const model = process.env.KAIRUM_TTS_MODEL || "gpt-4o-mini-tts";

  const openaiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      instructions,
      response_format: "mp3",
      speed: 1
    })
  });

  if (!openaiResponse.ok) {
    const details = await openaiResponse.text().catch(() => "");
    return json(openaiResponse.status, {
      error: "OpenAI speech generation failed",
      details: details.slice(0, 500)
    });
  }

  const audioBuffer = Buffer.from(await openaiResponse.arrayBuffer());
  return json(200, {
    audioBase64: audioBuffer.toString("base64"),
    contentType: "audio/mpeg",
    voice,
    model
  });
};
