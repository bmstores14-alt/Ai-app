import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: "30kb" }));
app.use(express.static(__dirname));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in 15 minutes." }
});
app.use("/api/generate", limiter);

app.post("/api/generate", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI is not configured. Add GEMINI_API_KEY to environment variables." });
    }

    const { business, product, offer, audience, language, tone, platforms, details } = req.body || {};
    if (![business, product, language].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "Please enter your business name, product/service and language." });
    }

    const allowed = ["Facebook", "Instagram", "YouTube", "WhatsApp"];
    const selected = Array.isArray(platforms) ? platforms.filter(p => allowed.includes(p)) : [];
    if (!selected.length) return res.status(400).json({ error: "Choose at least one platform." });

    const clean = v => String(v || "").trim().slice(0, 500);
    const prompt = `
You are an expert Indian social-media advertising copywriter. Create truthful, appealing, ready-to-use marketing copy.
Write in: ${clean(language)}.
Business: ${clean(business)}
Product/service: ${clean(product)}
Offer/price: ${clean(offer) || "Not provided"}
Target audience: ${clean(audience) || "General customers"}
Tone: ${clean(tone) || "Friendly and persuasive"}
Extra details: ${clean(details)}
Platforms requested: ${selected.join(", ")}

For EACH selected platform, produce a clearly separated section:
- Facebook: 3 headline options, primary ad text, short description, one clear CTA.
- Instagram: caption, first-line hook, 8-12 relevant hashtags, optional Reel caption.
- YouTube: 3 title options, description, 3 thumbnail text ideas, tags.
- WhatsApp: short personal message and a short Status version.
Only include sections for selected platforms.
Use natural local-market language and suitable emojis sparingly.
Do not invent discounts, guarantees, product features, stock levels, testimonials, contact details or claims.
`;

    // തിരക്ക് കുറവുള്ള മോഡലുകൾ ഫ്രീയായി മാറിമാറി ഉപയോഗിക്കാനുള്ള സംവിധാനം
    const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
    let textOutput = "";
    let lastError = null;

    for (const model of models) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          textOutput = data.candidates[0].content.parts[0].text;
          break; // ഉത്തരം കിട്ടിയാൽ ലൂപ്പ് നിർത്തുന്നു
        } else if (data.error) {
          lastError = data.error.message;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!textOutput) {
      throw new Error(lastError || "Google AI is currently busy. Please try again in a few seconds.");
    }

    // വേഗത്തിൽ ലോഡ് ആകുന്ന AI ഫോട്ടോ ലിങ്ക്
    const safeProduct = encodeURIComponent(clean(product) + " professional advertisement commercial product photography 4k");
    const imageUrl = `https://image.pollinations.ai/prompt/${safeProduct}?width=800&height=600&nologo=true&seed=${Date.now()}`;

    res.json({
      text: textOutput,
      imageUrl: imageUrl
    });

  } catch (err) {
    console.error("Generation error:", err?.message || err);
    res.status(500).json({ error: err?.message || "Could not generate advertisement. Please try again." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(port, () => console.log(`AI Marketing Studio running at http://localhost:${port}`));