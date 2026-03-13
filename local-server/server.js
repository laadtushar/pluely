import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

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

  res.json({
    url: getChatUrl(),
    user_token: getApiKey(),
    model: req.headers["model"] || getModel(),
    body: "{}",
    customer_id: null,
    customer_email: null,
    customer_name: "Local User",
    license_key: licenseKey,
    instance_id: instanceId,
    user_audio:
      provider === "ollama"
        ? null
        : {
            url: getAudioUrl(),
            fallback_url: null,
            model: getAudioModel(),
            fallback_model: null,
            user_token: getApiKey(),
            fallback_user_token: null,
            headers: null,
          },
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
