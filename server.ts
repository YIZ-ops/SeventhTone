import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow web and Capacitor WebView clients to call backend APIs.
  app.use((req, res, next) => {
    const origin = req.headers.origin || "*";
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Backend relay for article detail.
  app.get("/api/article/:id", async (req, res) => {
    const contId = req.params.id;
    const parseDetail = (payload: any) => payload?.pageProps?.detailData;
    let buildId = "hb8D50A9NRCU31JdhQhE1";

    const fetchByBuildId = async (id: string) => {
      const dataUrl = `https://www.sixthtone.com/_next/data/${id}/news/${contId}.json?contId=${contId}`;
      const response = await axios.get(dataUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json,text/plain,*/*",
        },
        timeout: 10000,
        maxRedirects: 5,
      });
      return parseDetail(response.data);
    };

    try {
      let detailData = await fetchByBuildId(buildId);
      if (!detailData) {
        const articleUrl = `https://www.sixthtone.com/news/${contId}`;
        const htmlResponse = await axios.get(articleUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          timeout: 10000,
          maxRedirects: 5,
        });
        const html = String(htmlResponse.data || "");
        const match = html.match(/"buildId":"([^"]+)"/);
        const latestBuildId = match?.[1];

        if (latestBuildId && latestBuildId !== buildId) {
          buildId = latestBuildId;
          detailData = await fetchByBuildId(buildId);
        }
      }

      if (!detailData) {
        res.status(404).json({ error: "Article data not found in page props" });
        return;
      }

      res.json(detailData);
    } catch (error: any) {
      console.error(`Error fetching article ${contId}:`, error.message);
      res.status(error.response?.status || 500).json({ 
        error: "Failed to fetch article",
        message: error.message 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
