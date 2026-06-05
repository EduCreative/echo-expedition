import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || "AIzaSyBTTRyCxHOgrN6SSFMN9yzOeOf379gtspk",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON parsing with substantial content limits for base64 media data
  app.use(express.json({ limit: "50mb" }));

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
      console.error("Server API generateContent Error:", error);
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
      console.error("Server API generateImages Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Serve with Vite in development mode or serve statically in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
