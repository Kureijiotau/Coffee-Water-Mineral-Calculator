---
name: Gemini water assistant constraints
description: Durable billing, latency, and model-selection constraints for the natural-language water planner
---

Use the project’s direct Gemini API-key route for the water planner rather than Replit-managed AI Integrations when the goal is to avoid Replit credit usage. Keep the planner one-shot, structured-output-only, and bounded by server-side request limits. The current newer-user Gemini accounts require the current Flash model family; older fixed model names may be unavailable.

**Why:** Replit-managed AI calls consume Replit credits, while this app already has a direct Gemini key route. The Gemini API may reject older Flash model names for newer accounts and return the currently accepted model in its error; extended thinking can also make a single request slow.

**How to apply:** Keep the model and output budget easy to update, use the supported current Flash model with a generous enough JSON output budget, omit unsupported thinking settings, call only on explicit submit, validate all ion/salt IDs and numeric ranges before applying chemistry, and return a clear timeout/quota error instead of retrying automatically.