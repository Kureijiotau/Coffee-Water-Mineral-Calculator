import { Router, type IRouter, type Request, type Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router: IRouter = Router();

const ION_IDS = [
  "calcium",
  "magnesium",
  "sodium",
  "potassium",
  "chloride",
  "sulfate",
  "bicarbonate",
  "carbonate",
  "citrates",
  "bicitrates",
  "biphosphates",
  "phosphates",
] as const;

const SALT_IDS = [
  "mgso4",
  "mgcl2",
  "mgcit",
  "cacl2",
  "caso4",
  "calact",
  "cacit",
  "nahco3",
  "nacl",
  "khco3",
  "kcl",
  "mggly",
  "mgmalate",
] as const;

const SYSTEM_PROMPT = `You read a Coffee Water Calculator recipe card exported by this app.

Return ONLY one JSON object with this shape:
{
  "name": string,
  "waters": [{ "name": string, "volumeMl": number|null, "ions": { "ionId": number } }],
  "salts": [{ "saltId": string, "targetPpm": number|null, "formLabel": string|null }],
  "finalIons": { "ionId": number },
  "confidence": { "overall": number, "uncertainFields": string[] },
  "warnings": string[]
}

Rules:
1. Extract the visible recipe name, every water step and volume, every salt row, and the FINAL MIX mineral analysis.
2. Salt targetPpm is the numeric salt target shown by the recipe card, not the displayed contribution total.
3. Use only these ion IDs: ${ION_IDS.join(", ")}.
4. Use only these salt IDs when a salt is recognizable: ${SALT_IDS.join(", ")}.
5. Use null when a value is not visible or cannot be read confidently. Never invent a value.
6. Preserve the card's units and convert water volumes to milliliters.
7. The finalIons object should contain only clearly readable mg/L values.
8. Put every uncertain field name and reason in uncertainFields or warnings.
9. If this is not a Coffee Water Calculator recipe card, return {"error":"unsupported"}.
`;

function extractJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

router.post("/scan-recipe-card", async (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    return;
  }

  const { image, mimeType } = req.body as { image?: unknown; mimeType?: unknown };
  if (typeof image !== "string" || !image.trim()) {
    res.status(400).json({ error: "Missing 'image' field." });
    return;
  }

  const rawData = image.startsWith("data:") ? image.split(",")[1] : image;
  const safeMimeType = typeof mimeType === "string" && /^image\/(png|jpeg|webp)$/.test(mimeType)
    ? mimeType
    : "image/png";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: SYSTEM_PROMPT },
          { inlineData: { mimeType: safeMimeType, data: rawData } },
        ],
      }],
    });
    const parsed = extractJson(result.response.text().trim());
    if (!parsed) {
      res.status(422).json({ error: "Could not read the recipe card response." });
      return;
    }
    if (parsed.error === "unsupported") {
      res.status(422).json({ error: "That image does not look like an exported recipe card." });
      return;
    }
    res.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("429") || message.includes("Too Many Requests") || message.includes("quota")) {
      res.status(429).json({ error: "Recipe-card reading is temporarily rate limited. Try again shortly." });
      return;
    }
    console.error("Gemini recipe-card scan error:", error);
    res.status(500).json({ error: "Recipe-card reading failed. Try a clearer exported card." });
  }
});

export default router;