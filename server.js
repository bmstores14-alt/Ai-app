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
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in 15 minutes." }
});
app.use("/api/generate", limiter);

app.post("/api/generate", async (req, res) => {
  try {
    const rawKey = process.env.GROQ_API_KEY || "";
    const apiKey = rawKey.trim();

    if (!apiKey) {
      return res.status(503).json({ error: "Groq API Key is missing. Add GROQ_API_KEY to Render Environment." });
    }

    const { business, product, offer, audience, language, tone, platforms, details } = req.body || {};
    if (![business, product, language].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "Please enter business name, product, and language." });
    }

    const clean = v => String(v || "").trim().slice(0, 500);

    const prompt = `
You are an expert Indian social media marketing designer and advertising copywriter.
Create a high-converting, attractive advertisement in ${clean(language)}.
Business: ${clean(business)}
Product/Service: ${clean(product)}
Offer: ${clean(offer) || "Special Offer"}
Target Audience: ${clean(audience) || "General"}
Details: ${clean(details)}

Respond ONLY with a valid raw JSON object with these exact keys:
{
  "headline": "Short, catchy headline in ${clean(language)} (max 8 words)",
  "offerBadge": "${clean(offer) || "പ്രത്യേക ഓഫർ!"}",
  "point1": "First short benefit in ${clean(language)}",
  "point2": "Second short benefit in ${clean(language)}",
  "point3": "Third short benefit in ${clean(language)}",
  "cta": "Call to action in ${clean(language)} (e.g. ഇപ്പോൾ തന്നെ ഓർഡർ ചെയ്യൂ!)",
  "caption": "Full social media caption with emojis and hashtags in ${clean(language)}"
}
`;

    // ഫ്രീ പ്ലാനിൽ സപ്പോർട്ട് ചെയ്യുന്ന മോഡലുകൾ മാറിമാറി ശ്രമിക്കുന്നു
    const models = ["llama-3.1-8b-instant", "openai/gpt-oss-20b", "gemma2-9b-it"];
    let content = "";
    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
          content = data.choices[0].message.content;
          break; // ഉത്തരം കിട്ടിയാൽ നിർത്തുന്നു
        } else if (data.error) {
          lastError = data.error.message;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!content) {
      throw new Error(lastError || "Could not get response from Groq.");
    }

    let posterData;
    try {
      posterData = JSON.parse(content);
    } catch {
      posterData = {
        headline: clean(product) + " - മികച്ച ഓഫറുകൾ!",
        offerBadge: clean(offer) || "പ്രത്യേക ഓഫർ!",
        point1: "മികച്ച ഗുണമേന്മയുള്ള ഉൽപ്പന്നങ്ങൾ",
        point2: "വേഗത്തിലുള്ള ഡെലിവറി",
        point3: "വിശ്വസനീയമായ സേവനം",
        cta: "ഇപ്പോൾ തന്നെ ബന്ധപ്പെടൂ!",
        caption: content
      };
    }

    // സൗജന്യ AI ഫോട്ടോ ലിങ്ക്
    const safeProduct = encodeURIComponent(clean(product) + " commercial product packaging advertising photo 4k");
    const imageUrl = `https://image.pollinations.ai/prompt/${safeProduct}?width=700&height=500&nologo=true&seed=${Date.now()}`;

    res.json({
      poster: posterData,
      imageUrl: imageUrl,
      business: clean(business)
    });

  } catch (err) {
    console.error("Generation error:", err?.message || err);
    res.status(500).json({ error: err?.message || "Could not generate advertisement. Please try again." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(port, () => console.log(`AI Marketing Studio running at http://localhost:${port}`));
