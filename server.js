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
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in 15 minutes." }
});
app.use("/api/generate", limiter);

app.post("/api/generate", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI is not configured. Add GEMINI_API_KEY to your environment variables." });
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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Gemini API Error");
    }

    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    // സൗജന്യ AI ഫോട്ടോ ഉണ്ടാക്കാനുള്ള കോഡ് (Pollinations AI)
    const imagePrompt = `${clean(product)}, professional commercial advertising product photography, cinematic lighting, ultra high quality, 4k`;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&nologo=true`;

    // എഴുത്തും ഫോട്ടോയും ഒരുമിച്ച് അയക്കുന്നു
    res.json({ 
      text: textOutput || "No text was returned. Please try again.",
      imageUrl: imageUrl 
    });

  } catch (err) {
    console.error("Generation error:", err?.message || err);
    res.status(500).json({ error: "Could not generate the advertisement. Check your Gemini API setup and try again." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(port, () => console.log(`AI Marketing Studio running at http://localhost:${port}`));