import "dotenv/config";
import express from "express";
import cors from "cors";
import { Readable } from "node:stream";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 3001;

// ─── Resolve AI endpoints based on provider ──────────────────────────────────
function getChatUrl() {
  if (process.env.CUSTOM_CHAT_URL) return process.env.CUSTOM_CHAT_URL;
  if (process.env.AI_PROVIDER === "ollama")
    return "http://localhost:11434/v1/chat/completions";
  return "https://api.openai.com/v1/chat/completions";
}

function getAudioUrl() {
  if (process.env.CUSTOM_AUDIO_URL) return process.env.CUSTOM_AUDIO_URL;
  return "https://api.openai.com/v1/audio/transcriptions";
}

function getApiKey() {
  return process.env.AI_API_KEY || "";
}

function getGroqApiKey() {
  return process.env.GROQ_API_KEY || process.env.GROK_API_KEY || "";
}

function isGroqModel(model) {
  return [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "deepseek-r1-distill-llama-70b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "qwen-qwq-32b",
  ].includes(model);
}

function getModel() {
  return process.env.AI_MODEL || "gpt-4o";
}

function getAudioModel() {
  return process.env.AUDIO_MODEL || "whisper-1";
}

// ─── Licensing endpoints (PAYMENT_ENDPOINT) ───────────────────────────────────

app.post("/activate", (req, res) => {
  console.log("[activate] license_key:", req.body?.license_key);
  res.json({
    activated: true,
    error: null,
    license_key: req.body?.license_key || "local-license",
    instance: {
      id: req.body?.instance_name || "local-instance",
      name: req.body?.instance_name || "local-instance",
      created_at: new Date().toISOString(),
    },
    is_dev_license: true,
  });
});

app.post("/deactivate", (req, res) => {
  console.log("[deactivate]");
  res.json({
    activated: false,
    error: null,
    license_key: null,
    instance: null,
    is_dev_license: false,
  });
});

app.post("/validate", (req, res) => {
  console.log("[validate]");
  res.json({
    is_active: true,
    last_validated_at: new Date().toISOString(),
    is_dev_license: true,
  });
});

app.post("/checkout", (req, res) => {
  res.json({ success: true, checkout_url: null, error: null });
});

// ─── App API endpoints (APP_ENDPOINT) ────────────────────────────────────────

// Returns AI provider config — this is the key endpoint
app.get("/api/response", (req, res) => {
  const provider = process.env.AI_PROVIDER || "openai";
  const licenseKey = req.headers["license_key"] || "local-license";
  const instanceId = req.headers["instance"] || "local-instance";

  const requestedModel = req.headers["model"] || getModel();
  const useGroq = isGroqModel(requestedModel);

  res.json({
    url: useGroq ? "https://api.groq.com/openai/v1/chat/completions" : getChatUrl(),
    user_token: useGroq ? getGroqApiKey() : getApiKey(),
    model: requestedModel,
    body: "{}",
    customer_id: null,
    customer_email: null,
    customer_name: "Local User",
    license_key: licenseKey,
    instance_id: instanceId,
    user_audio: process.env.CUSTOM_AUDIO_URL
      ? {
          url: getAudioUrl(),
          fallback_url: null,
          model: getAudioModel(),
          fallback_model: null,
          user_token: getApiKey(),
          fallback_user_token: null,
          headers: null,
        }
      : null,
    errors: [],
  });
});

// Returns available models
app.post("/api/models", (req, res) => {
  res.json({
    models: [
      {
        provider: "ollama",
        name: "Phi-4 Reasoning (Best for interviews)",
        id: "phi4-reasoning:14b",
        model: "phi4-reasoning:14b",
        description: "Step-by-step reasoning, complexity analysis — best for coding interviews",
        modality: "text",
        isAvailable: true,
      },
      {
        provider: "ollama",
        name: "Qwen2.5 Coder 14B",
        id: "qwen2.5-coder:14b",
        model: "qwen2.5-coder:14b",
        description: "Top-ranked coding model — clean solutions in any language",
        modality: "text",
        isAvailable: true,
      },
      {
        provider: "ollama",
        name: "Qwen2.5 Coder 1.5B (Fast)",
        id: "qwen2.5-coder:1.5b",
        model: "qwen2.5-coder:1.5b",
        description: "Instant responses — quick syntax lookups and snippets",
        modality: "text",
        isAvailable: true,
      },
      {
        provider: "ollama",
        name: "Qwen2.5 VL 7B (Fast Vision + Code)",
        id: "qwen2.5vl:7b",
        model: "qwen2.5vl:7b",
        description: "Fast vision + coding — read code screenshots, diagrams, whiteboard problems",
        modality: "vision",
        isAvailable: true,
      },
      {
        provider: "ollama",
        name: "Llama 3.2 Vision 11B",
        id: "llama3.2-vision:11b",
        model: "llama3.2-vision:11b",
        description: "High quality vision — detailed image analysis",
        modality: "vision",
        isAvailable: true,
      },
      {
        provider: "ollama-3b",
        name: "Qwen2.5 Coder 3B (Fast)",
        id: "qwen2.5-coder:3b",
        model: "qwen2.5-coder:3b",
        description: "Fast and accurate — great balance for Python and SQL",
        modality: "text",
        isAvailable: true,
      },
      {
        provider: "ollama-deepseek",
        name: "DeepSeek Coder 1.3B (Fastest)",
        id: "deepseek-coder:1.3b",
        model: "deepseek-coder:1.3b",
        description: "Smallest and fastest — instant code completions",
        modality: "text",
        isAvailable: true,
      },
      {
        provider: "groq-instant",
        name: "Groq Llama 3.1 8B (Cloud Fast)",
        id: "llama-3.1-8b-instant",
        model: "llama-3.1-8b-instant",
        description: "~500 tok/s — fastest cloud model for Python, SQL, interviews",
        modality: "text",
        isAvailable: !!getGroqApiKey(),
      },
      {
        provider: "groq-large",
        name: "Groq Llama 3.3 70B (Cloud Best)",
        id: "llama-3.3-70b-versatile",
        model: "llama-3.3-70b-versatile",
        description: "Best quality cloud — complex algorithms and system design",
        modality: "text",
        isAvailable: !!getGroqApiKey(),
      },
      {
        provider: "groq-reasoning",
        name: "Groq DeepSeek R1 70B (Cloud Reasoning)",
        id: "deepseek-r1-distill-llama-70b",
        model: "deepseek-r1-distill-llama-70b",
        description: "Step-by-step reasoning — hard LeetCode and system design",
        modality: "text",
        isAvailable: !!getGroqApiKey(),
      },
      {
        provider: "groq-vision",
        name: "Groq Llama 4 Scout Vision (Cloud Vision)",
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        description: "Fast cloud vision — read whiteboard problems instantly",
        modality: "vision",
        isAvailable: !!getGroqApiKey(),
      },
    ],
  });
});

// Returns prompts list
app.post("/api/prompts", (req, res) => {
  res.json({
    prompts: [],
    total: 0,
    last_updated: null,
  });
});

// Generates a system prompt from user description
app.post("/api/prompt", (req, res) => {
  const userPrompt = req.body?.user_prompt || "";
  res.json({
    prompt_name: "Custom System Prompt",
    system_prompt: userPrompt
      ? `You are a helpful AI assistant. ${userPrompt}`
      : "You are a helpful AI assistant.",
  });
});

// Activity tracking — just log and acknowledge
app.post("/api/activity", (req, res) => {
  res.json({ success: true });
});

app.get("/api/activity", (req, res) => {
  res.json({ activities: [], total: 0 });
});

// Error reporting — just log and acknowledge
app.post("/api/error", (req, res) => {
  console.warn("[api/error]", req.body?.error_message);
  res.json({ success: true });
});

// ─── Groq proxy (injects API key server-side, no key needed in UI) ────────────

app.post("/groq/v1/chat/completions", async (req, res) => {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getGroqApiKey()}`,
      },
      body: JSON.stringify(req.body),
    });
    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/groq/v1/audio/transcriptions", (req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    try {
      const body = Buffer.concat(chunks);
      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getGroqApiKey()}`,
          "Content-Type": req.headers["content-type"],
        },
        body,
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    provider: process.env.AI_PROVIDER,
    model: getModel(),
    chat_url: getChatUrl(),
  });
});

app.listen(PORT, () => {
  console.log(`\nPluely local server running on http://localhost:${PORT}`);
  console.log(`  Provider : ${process.env.AI_PROVIDER || "openai"}`);
  console.log(`  Model    : ${getModel()}`);
  console.log(`  Chat URL : ${getChatUrl()}`);
  console.log(`\nHealth check: http://localhost:${PORT}/health\n`);
});
