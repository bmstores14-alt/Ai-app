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
    const rawKey = process.env.GEMINI_API_KEY || "";
    const apiKey = rawKey.trim();

    if (!apiKey) {
      return res.status(503).json({ error: "API Key missing. Check Render Environment." });
    }

    const { business, product, offer, audience, language, tone, platforms, details } = req.body || {};
    if (![business, product, language].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "Please enter business name, product, and language." });
    }

    const clean = v => String(v || "").trim().slice(0, 500);

    // AI-യോട് പോസ്റ്ററിന് ആവശ്യമായ വിവരങ്ങൾ പ്രത്യേകം ചോദിക്കുന്നു
    const prompt = `
You are an expert Indian marketing designer and copywriter.
Create high-converting social media advertisement content in ${clean(language)}.
Business: ${clean(business)}
Product/Service: ${clean(product)}
Offer: ${clean(offer) || "Special Offer"}
Target Audience: ${clean(audience) || "General"}
Details: ${clean(details)}

Respond ONLY with a valid raw JSON object (no markdown, no backticks, no extra text) with these exact keys:
{
  "headline": "A short, catchy main headline in ${clean(language)} (max 8 words)",
  "offerBadge": "${clean(offer) || "പ്രത്യേക ഓഫർ!"}",
  "point1": "First short benefit in ${clean(language)} (with action)",
  "point2": "Second short benefit in ${clean(language)}",
  "point3": "Third short benefit in ${clean(language)}",
  "cta": "Call to action in ${clean(language)} (e.g. ഇപ്പോൾ തന്നെ ഓർഡർ ചെയ്യൂ!)",
  "caption": "Full social media caption with emojis and hashtags for Instagram/Facebook in ${clean(language)}"
}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Gemini Error");
    }

    let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    // JSON ക്ലീൻ ചെയ്യുന്നു
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    let posterData;
    try {
      posterData = JSON.parse(rawText);
    } catch {
      posterData = {
        headline: clean(product) + " - മികച്ച ഓഫറുകൾ!",
        offerBadge: clean(offer) || "പ്രത്യേക ഓഫർ!",
        point1: "മികച്ച ക്വാളിറ്റി ഉൽപ്പന്നങ്ങൾ",
        point2: "വേഗത്തിലുള്ള ഡെലിവറി",
        point3: "വിശ്വസനീയമായ സേവനം",
        cta: "ഇപ്പോൾ തന്നെ ബന്ധപ്പെടൂ!",
        caption: rawText
      };
    }

    // പ്രൊഡക്റ്റ് ഫോട്ടോ
    const safeProduct = encodeURIComponent(clean(product) + " commercial product packaging advertising photo 4k");
    const imageUrl = `https://image.pollinations.ai/prompt/${safeProduct}?width=700&height=500&nologo=true`;

    res.json({
      poster: posterData,
      imageUrl: imageUrl,
      business: clean(business)
    });

  } catch (err) {
    console.error("Generation error:", err?.message || err);
    res.status(500).json({ error: err?.message || "Could not generate poster. Try again." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(port, () => console.log(`AI Marketing Studio running at http://localhost:${port}`));