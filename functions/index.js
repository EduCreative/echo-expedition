const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(express.json({ limit: "50mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || "AIzaSyBTTRyCxHOgrN6SSFMN9yzOeOf379gtspk",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build-firebase-functions',
    }
  }
});

// API Endpoint to check health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", provider: "firebase-functions" });
});

// Endpoint: Proxy generateContent queries safely
app.post("/api/gemini/generateContent", async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    const response = await ai.models.generateContent({
      model: model || "gemini-3.5-flash",
      contents,
      config,
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Firebase Functions generateContent Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Endpoint: Proxy generateImages queries safely
app.post("/api/gemini/generateImages", async (req, res) => {
  try {
    const { model, prompt, config } = req.body;
    const response = await ai.models.generateImages({
      model: model || "imagen-4.0-generate-001",
      prompt,
      config,
    });
    res.json(response);
  } catch (error) {
    console.error("Firebase Functions generateImages Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Fallback logic for unmatched /api routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

exports.api = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 60, memory: "512MiB" }, app);
