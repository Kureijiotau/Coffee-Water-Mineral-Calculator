import { Router, type IRouter, type Request, type Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router: IRouter = Router();

const TARGET_IONS = [
  { id: "sodium", keywords: "sodium, natrium, na⁺, na+", label: "Na⁺" },
  { id: "potassium", keywords: "potassium, kalium, k⁺, k+", label: "K⁺" },
  { id: "magnesium", keywords: "magnesium, magnesio, mg²⁺, mg++", label: "Mg²⁺" },
  { id: "calcium", keywords: "calcium, calcio, ca²⁺, ca++", label: "Ca²⁺" },
  { id: "chloride", keywords: "chloride, chlorid, cloruro, cl⁻, cl-", label: "Cl⁻" },
  { id: "sulfate", keywords: "sulfate, sulphate, sulfato, so₄²⁻, so4", label: "SO₄²⁻" },
  { id: "bicarbonate", keywords: "bicarbonate, hydrogen carbonate, hco₃", label: "HCO₃⁻" },
  { id: "citrates", keywords: "citrate, citrates, citric, c₆h₅o₇³⁻", label: "Citrates" },
];

const SYSTEM_PROMPT = `You are a mineral water label analyzer. Extract mineral concentrations from the water label in the image.

Rules:
1. Return ONLY a JSON object with ion IDs as keys and their concentration in mg/L as numbers.
2. Only include ions that are clearly listed on the label.
3. If a value uses mg/100mL, convert to mg/L by multiplying by 10.
4. If a value uses mmol/L, convert to mg/L by multiplying by the ion's molar mass.
5. For values shown as "< X" (less than), return X as a negative number (e.g. "<0.05" → -0.05).
6. For ranges like "10-15", return the midpoint.
7. Skip ions not in this list: ${TARGET_IONS.map(i => i.id).join(", ")}.
8. If you cannot read the label clearly, return {"error": "Could not read the label clearly."}
9. If no mineral values are found, return {"error": "No mineral composition data found on this label."}

Valid ion IDs:
${TARGET_IONS.map(i => `  - ${i.id}: ${i.keywords}`).join("\n")}

Respond with ONLY the JSON object, no other text.`;

/**
 * Downscale a base64 JPEG to ~800px wide to reduce token usage.
 * Returns a base64 string without the data URL prefix.
 */
async function downscaleImage(b64: string): Promise<string> {
  // Use a simple approach: convert to a smaller JPEG via raw buffer manipulation
  // For production, we'd use sharp/jimp — here we just return the original
  // since the Gemini free tier handles small images fine.
  return b64;
}

/**
 * POST /api/scan-label
 * Accepts a base64-encoded image and returns extracted mineral values.
 */
router.post("/scan-label", async (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    return;
  }

  const { image } = req.body;
  if (!image || typeof image !== "string") {
    res.status(400).json({ error: "Missing 'image' field (base64 data URL or raw base64)" });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Accept either a full data URL or raw base64
    const rawData = image.startsWith("data:") ? image.split(",")[1] : image;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: rawData,
              },
            },
          ],
        },
      ],
    });

    const text = result.response.text().trim();

    // Try to parse the response as JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(422).json({ error: "Could not parse label data from the image", raw: text.slice(0, 500) });
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.error) {
      res.status(422).json({ error: parsed.error });
      return;
    }

    const cleaned: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === "number" && TARGET_IONS.find(i => i.id === key)) {
        cleaned[key] = val;
      }
    }

    res.json({ values: cleaned });
  } catch (err: any) {
    console.error("Gemini scan error:", err);

    const msg = err.message ?? "";
    if (msg.includes("API_KEY_INVALID")) {
      res.status(500).json({ error: "Gemini API key is invalid." });
    } else if (msg.includes("SAFETY")) {
      res.status(422).json({ error: "Image blocked by content safety filters. Try a different angle." });
    } else if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
      res.status(429).json({ error: "Rate limited — try again in a minute." });
    } else {
      res.status(500).json({ error: "Label scanning failed. Try again with a clearer photo." });
    }
  }
});

export default router;
