# Weight-based concentrate preparation and dosing

## User-approved direction

Use a fully weight-based basis throughout concentrate workflows, not only revised preparation copy. Start with 20–30% of the calculated base-water amount, add the salts, shake/mix, then add the remaining water to the target. Explain that for plain water at room temperature, 1 mL is approximately 1 g. Do not extend that approximation to finished concentrate.

This design changes concentrate preparation and dosing, not the established final-water ion engine or the use of liters and mg/L to describe brewing water.

## Mass basis

- New stocks use total finished stock mass in grams, excluding the bottle.
- Physical salt mass includes the selected hydration form.
- For a stock of total mass M and physical salt masses s₁…sₙ, water mass is M − Σsᵢ.
- Stock strength as percent w/w is 100 × Σsᵢ / M. Single-salt tools also report that salt's mg per gram of stock.
- Reject nonfinite/nonpositive mass and water mass at or below zero. Do not clamp an impossible recipe into a usable-looking result.
- Bottle capacity in mL remains optional headroom context only; it is not the concentrate calculation denominator.

### Recipe concentrate semantics

Preserve ×N as N copies of the base salt recipe for one liter of finished brewing water. Preserve physical salt totals and hydration choices at the same ×N. Replace the stock-volume denominator with the explicitly chosen total stock mass.

For total stock mass M and strength N, the stock dose for B liters is M × B / N grams. For salt mass S mg in the stock, salt delivered by dose D grams is S × D / M mg. Existing final-water ion fractions remain unchanged.

Separate-salt, separated-group, and all-in-one stocks each use their own mass denominator. Changing one stock's mass must not silently change another stock. Preserve the separate-salt physical-mass editing behavior: fixing strength while editing salt mass scales that stock's target mass, not a bottle volume.

## Shared preparation sequence

Use one shared instruction model across current stock-preparation surfaces, recipe steps, printable/downloadable text, and guide explanations:

1. Tare the empty bottle or mixing vessel.
2. Add 20–30% of the **calculated water mass**, showing its range in grams when a plan is available.
3. Weigh and transfer the calculated salt(s), rinsing clinging crystals into the vessel with a portion of the remaining measured water.
4. Shake/mix to dissolve, respecting existing salt separation and mixing-order warnings.
5. Add the remaining water until total contents reach the calculated final stock mass. Do not tare again between the initial water and final total-weight reading.
6. Mix thoroughly and label the stock with salt/form, mass-based strength, and total stock mass.

Example: 100 g of 5% w/w stock uses 5 g salt and 95 g water. Start with 19–28.5 g water; after mixing in the salt, top up until the contents weigh 100 g.

Do not promise that every salt dissolves in the initial small portion. If needed, use more of the remaining calculated water while mixing. Do not add uncounted extra water. Keep appropriate headroom and existing compatibility, solubility, and precipitation warnings.

Explain plainly: “For plain water at room temperature, 1 mL ≈ 1 g, so you can weigh your water. This approximation does not apply to finished concentrate.”

## Drop calibration and dosing

- Use measured finished-stock mass divided by counted drops to obtain grams per drop.
- Salt mg/drop = salt mg per stock gram × measured stock grams/drop.
- Drops needed = dose mass / measured stock grams/drop.
- A water-only drop calibration is a labeled estimate for planning, not an exact measurement of finished stock drops. Do not silently carry a water density assumption into stock dosing.
- For a target such as 1 mg physical salt per drop, calculate the mass fraction from the chosen drop-mass calibration and clearly identify estimated versus measured output. Instruct users to verify with the actual finished stock before treating the target as exact.
- Keep shared tip/style calibration provenance explicit. Commercial Lotus reference recipes remain source references, not automatically redefined stock formulations.
- Preserve exact versus rounded-drop distinctions and recompute delivered salt/ion amounts for a rounded dose.

## Coverage

Audit and update:

- Standalone single-salt % w/w stock preparation and dose preview.
- DIY stock builder and Lotus-style homemade stock preparation.
- Recipe concentrates: separate salts, separated groups, all-in-one, preparation checklists, mass-edit controls, dose previews, and warnings.
- Brewer, Alchemist, and Watermancer concentrate handoffs and any remaining live concentrate controls.
- Watermancer Guide stock targets, examples, calibration explanations, mixing photos, headroom wording, and reference content.
- Recipe steps, exports, saved-plan restore, share/import payloads, and labels that describe preparation or stock dosing.

Do not reactivate removed Guide preparation panels or archived optional workspaces. Do not redesign unrelated source-water inputs or finished-water batch-volume controls.

## Persistence and existing stocks

- Add an explicit concentration/preparation basis and appropriate format version to persisted stock data and any affected portable payloads.
- New records use mass-based fields with unit-explicit names.
- Missing basis or historical volume fields identify legacy volume-based records. A numeric mL value must never be silently restored as the same number of grams of finished concentrate.
- Preserve old data and show a clear legacy-volume notice.
- Existing stocks may remain viewable as historical volume-based records. To use the new preparation/dosing workflow, explicitly rebuild a stock with a chosen target mass and recalculate the plan. No guessed stock density or automatic physical-stock conversion.
- Existing salt recipes and finished-water ion targets remain valid; they do not acquire a different meaning because a stock is rebuilt.
- Keep old drop calibrations labeled by their actual measurement basis; request actual-stock calibration where needed rather than inventing it.

## Safety and numerical boundaries

Preserve the established salt chemistry, hydration corrections, separated-stock compatibility rules, and precipitation warnings.

Do not pass stock grams into an existing mL-based checker as if the units were interchangeable. Solubility references stated per water volume may use the explicitly documented plain-water approximation against calculated water mass. Any stock-volume-dependent precipitation estimate must remain labeled as an estimate, not an exact density-independent result. Unsupported checks should be disclosed rather than silently skipped.

## Verification and acceptance

- A 100 g 5% stock produces 5 g salt, 95 g water, and a 19–28.5 g initial-water range.
- Salt mass plus water mass equals target mass across hydration forms and multi-salt stocks.
- Recipe doses deliver the original canonical recipe amounts at different stock masses, strengths, and final brewing-water volumes.
- Per-drop calculations use measured stock grams/drop and remain distinct from water-only estimates.
- Separate stocks remain independent; mass editing preserves the established strength constraint.
- Invalid or saturated plans retain useful explicit warnings.
- Legacy restores/imports never silently change mL into grams or mark a water-only calibration as measured stock calibration.
- Preparation text, guides, exports, and live controls use the same sequence and water-only approximation.
- Add focused unit and persistence tests first, then run the full unit suite, app typecheck/build, and browser checks for representative standalone, recipe, DIY, Guide, and legacy-restore flows.

## Implementation boundary

Implement shared mass-based stock and preparation helpers in focused modules instead of adding further duplicated arithmetic to App.tsx. Retain legacy readers separately from new mass-based writers. Keep normal finished-water calculations and source-water volume inputs unchanged.
