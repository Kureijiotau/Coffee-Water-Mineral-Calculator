import { Router, type IRouter, type Request, type Response } from "express";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const router: IRouter = Router();

const SUPPORTED_ION_IDS = [
  "sodium",
  "potassium",
  "magnesium",
  "calcium",
  "chloride",
  "sulfate",
  "bicarbonate",
  "citrates",
] as const;

const SUPPORTED_SALT_IDS = [
  "mgso4",
  "mgcl2",
  "mgcit",
  "cacl2",
  "calact",
  "cacit",
  "nahco3",
  "nacl",
  "khco3",
  "kcl",
  "mggly",
] as const;

type AssistantWorkspace = "alchemist" | "watermancer";

type AssistantPayload = {
  workspace?: unknown;
  title?: unknown;
  summary?: unknown;
  ionTargets?: unknown;
  saltTargets?: unknown;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const requestBudget = new Map<string, RateLimitEntry>();
const REQUESTS_PER_HOUR = 20;
const HOUR_MS = 60 * 60 * 1000;
const MAX_PROMPT_LENGTH = 600;

const ION_TARGET_PROPERTIES = Object.fromEntries(
  SUPPORTED_ION_IDS.map(id => [id, { type: SchemaType.NUMBER }]),
);
const SALT_TARGET_PROPERTIES = Object.fromEntries(
  SUPPORTED_SALT_IDS.map(id => [id, { type: SchemaType.NUMBER }]),
);

const ASSISTANT_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  required: ["workspace", "title", "summary", "ionTargets", "saltTargets"],
  properties: {
    workspace: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["alchemist", "watermancer"],
    },
    title: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    ionTargets: {
      type: SchemaType.OBJECT,
      properties: ION_TARGET_PROPERTIES,
    },
    saltTargets: {
      type: SchemaType.OBJECT,
      properties: SALT_TARGET_PROPERTIES,
    },
  },
};

const SYSTEM_PROMPT = `You are the Watermancer global water-design assistant.
Interpret a user's natural-language coffee-water request and return one compact JSON object.

Choose the workspace:
- "watermancer" when the request is about the final water's mineral/ion profile, source water, hardness, alkalinity, clarity, body, or balance.
- "alchemist" when the request explicitly asks for a salt recipe, concentrate, dry-salt recipe, or a recipe-first workflow.

The application, not you, performs chemistry calculations. Use only the supported IDs below.

For ionTargets:
- Return final target concentrations in ppm (mg/L) for the finished water.
- Include only ions you can justify from the request.
- Use non-negative realistic coffee-water values. Leave unknown ions out.
- Supported ions: ${SUPPORTED_ION_IDS.join(", ")}.

For saltTargets:
- Return only when workspace is "alchemist".
- Values are target ppm of the salt's primary modeled ion, not grams and not a dose.
- Use only salts that help express the request; leave unknown salts out.
- Supported salts: ${SUPPORTED_SALT_IDS.join(", ")}.

Taste-language starting points:
- bright, clear, floral, tea-like: favor magnesium, keep calcium and bicarbonate restrained.
- sweet, round, syrupy, full-bodied: favor moderate calcium and a little bicarbonate.
- crisp, dry, structured: favor magnesium and restrained bicarbonate.
- soft, gentle, low-acid: use modest bicarbonate and avoid excessive sulfate.
- Use conservative targets rather than extreme values.

Keep title under 60 characters and summary under 240 characters.
Return JSON only. Never include markdown, dosage math, unsupported IDs, or chain-of-thought.`;

function getClientKey(req: Request): string {
  const forwarded = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.ip || "unknown";
}

function takeRequestBudget(key: string): boolean {
  const now = Date.now();
  const current = requestBudget.get(key);
  if (!current || current.resetAt <= now) {
    requestBudget.set(key, { count: 1, resetAt: now + HOUR_MS });
    return true;
  }
  if (current.count >= REQUESTS_PER_HOUR) return false;
  current.count += 1;
  return true;
}

function cleanNumericRecord(
  value: unknown,
  allowedIds: readonly string[],
  maxValue: number,
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = new Set(allowedIds);
  const cleaned: Record<string, number> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!allowed.has(id) || typeof raw !== "number" || !Number.isFinite(raw)) continue;
    if (raw < 0 || raw > maxValue) continue;
    cleaned[id] = Math.round(raw * 100) / 100;
  }
  return cleaned;
}

function parseAssistantResponse(text: string): AssistantPayload | null {
  try {
    return JSON.parse(text) as AssistantPayload;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]) as AssistantPayload;
    } catch {
      return null;
    }
  }
}

router.post("/water-assistant", async (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    return;
  }

  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) {
    res.status(400).json({ error: "Missing 'prompt' field." });
    return;
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    res.status(413).json({ error: `Prompt is too long. Keep it under ${MAX_PROMPT_LENGTH} characters.` });
    return;
  }

  if (!takeRequestBudget(getClientKey(req))) {
    res.status(429).json({ error: "Water assistant limit reached — try again later." });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: ASSISTANT_RESPONSE_SCHEMA,
        temperature: 0.25,
        maxOutputTokens: 600,
      } as never,
    });

    const result = await model.generateContent(prompt, { timeout: 30_000 });
    const parsed = parseAssistantResponse(result.response.text().trim());
    if (!parsed) {
      res.status(422).json({ error: "Gemini returned an unreadable water plan." });
      return;
    }

    const workspace: AssistantWorkspace =
      parsed.workspace === "alchemist" ? "alchemist" : "watermancer";
    const title = typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim().slice(0, 60)
      : workspace === "alchemist" ? "AI mineral recipe" : "AI water profile";
    const summary = typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 240)
      : "A conservative starting point generated from your description.";
    const ionTargets = cleanNumericRecord(parsed.ionTargets, SUPPORTED_ION_IDS, 250);
    const saltTargets = cleanNumericRecord(parsed.saltTargets, SUPPORTED_SALT_IDS, 250);

    if (Object.keys(ionTargets).length === 0 && Object.keys(saltTargets).length === 0) {
      res.status(422).json({ error: "Gemini could not identify a usable mineral direction." });
      return;
    }

    res.json({
      workspace,
      title,
      summary,
      ionTargets,
      saltTargets: workspace === "alchemist" ? saltTargets : {},
    });
  } catch (err: any) {
    console.error("Gemini water assistant error:", err);
    const msg = String(err?.message ?? "");
    if (msg.includes("API_KEY_INVALID")) {
      res.status(500).json({ error: "Gemini API key is invalid." });
    } else if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
      res.status(429).json({ error: "Gemini quota reached — try again later." });
    } else if (msg.includes("timed out") || msg.includes("timeout") || msg.includes("aborted")) {
      res.status(504).json({ error: "The water design request timed out. Try one concise sentence or try again in a moment." });
    } else if (msg.includes("SAFETY")) {
      res.status(422).json({ error: "This request was blocked by content safety filters." });
    } else {
      res.status(500).json({ error: "Water assistant failed. Try a shorter description." });
    }
  }
});

export default router;