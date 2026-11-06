import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    providers: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY)
    }
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { provider, model, message, history = [], language = "auto" } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Please enter a message." });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-16).filter(x =>
          x && ["user", "assistant"].includes(x.role) &&
          typeof x.content === "string"
        )
      : [];

    if (provider === "openai") {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ error: "OpenAI API key is not configured. Add OPENAI_API_KEY to your .env file." });
      }

      const input = [
        ...safeHistory.map(item => ({
          role: item.role,
          content: [{ type: "input_text", text: item.content }]
        })),
        { role: "user", content: [{ type: "input_text", text: message }] }
      ];

      const allowedOpenAIModels = ["gpt-6-astra", "gpt-6.1-sol", "gpt-6.1-terra", "gpt-6-luna"];
      const selectedModel = allowedOpenAIModels.includes(model) ? model : (process.env.OPENAI_MODEL || "gpt-6.1-terra");
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: selectedModel,
          instructions: `You are Nova AI, a helpful, clear, friendly assistant. ${language !== "auto" ? `Reply in the language represented by ${language}.` : "Reply in the language used by the user."} Keep answers natural and useful.`,
          input
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data?.error?.message || "OpenAI request failed." });
      }

      const answer = data.output_text || (data.output || [])
        .flatMap(item => item.content || [])
        .filter(part => part.type === "output_text")
        .map(part => part.text)
        .join("\n");

      return res.json({ answer: answer || "I couldn't generate a response. Please try again." });
    }

    if (provider === "gemini") {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "Gemini API key is not configured. Add GEMINI_API_KEY to your .env file." });
      }

      const contents = [
        ...safeHistory.map(item => ({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: item.content }]
        })),
        { role: "user", parts: [{ text: message }] }
      ];

      const allowedGeminiModels = ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-3.7-flash", "gemini-2.5-pro"];
      const selectedModel = allowedGeminiModels.includes(model) ? model : (process.env.GEMINI_MODEL || "gemini-3.8-flash");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: `You are Nova AI, a helpful, clear, friendly assistant. ${language !== "auto" ? `Reply in the language represented by ${language}.` : "Reply in the language used by the user."} Keep answers natural and useful.` }]
            },
            contents
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({
          error: data?.error?.message || "Gemini request failed."
        });
      }

      const answer = (data.candidates?.[0]?.content?.parts || [])
        .map(part => part.text || "")
        .join("\n");

      return res.json({ answer: answer || "I couldn't generate a response. Please try again." });
    }

    return res.status(400).json({ error: "Choose either ChatGPT or Gemini." });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({ error: "Something went wrong. Please check the server and try again." });
  }
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(PORT, () => console.log(`Nova AI server running on http://localhost:${PORT}`));
