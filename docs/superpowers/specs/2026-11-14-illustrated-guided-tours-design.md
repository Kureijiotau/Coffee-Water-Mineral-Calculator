# Illustrated Guided Tours Design

## Goal

Extend the illustrated Watermancer tour style to every other guided tour in the
app so that tutorial steps across workflows use a consistent, visual teaching
pattern.

## Scope

### Included

- Add a distinct instructional diagram to every existing Brewer and Alchemist
  tour step.
- Add a distinct instructional diagram to every Concentrates tour step:
  recipe concentrate, Stock Builder, DIY Lotus Drops, and the empty recipe
  prompt.
- Keep the current Watermancer tour and its illustrations unchanged.
- Reuse the existing dimmed-page overlay, live-section spotlight, dialog,
  progress, and navigation controls.
- Preserve each tour's current step order, wording, triggers, persistence, and
  branch selection.

### Not included

- Changes to chemistry, recipes, stock calculations, or calculator state.
- Changes to first-visit, replay, skip, finish, or keyboard behavior.
- A redesign of the tour controls, triggers, or spotlight presentation.
- New external artwork or image assets.

## User experience

Every step in Brewer, Alchemist, and Concentrates keeps its current title and
plain-language explanation, with a compact diagram that clarifies the live
section highlighted behind the guide card. Diagrams use the same dark console
palette, restrained cyan highlights, and simple UI-like shapes, arrows, and
icons already used by Watermancer.

The diagram is a teaching aid, not a live-data visualization. It must not
suggest that example values are the user's current recipe or settings. Keep
labels brief, avoid repeating full sentences from the adjacent explanation, and
use a small number of meaningful visual cues.

The existing responsive placement remains in charge of keeping both the
spotlight and dialog visible. On narrow screens the visual and explanation may
stack inside the current scrollable card. Do not change tour navigation or
allow the illustration to block interaction with the tour controls.

## Tour coverage

Create a specific visual for each of the 26 non-Watermancer stops:

- **Brewer — 4 steps:** batch volume; mineral recipe; salt summary; Recipe steps.
- **Alchemist — 6 steps:** batch volume; optional mineral-water base; recipe
  selection and editing; ion check; salt-only summary; Recipe steps.
- **Concentrates — 16 steps across branches:**
  - Recipe concentrate — 5 steps, including stock arrangement and preparation.
  - Stock Builder — 5 steps, including mineral/hydration selection, dropper
    calibration, stock setup, dose target, and preparation.
  - DIY Lotus Drops — 5 steps, including dropper selection, calibration, brew
    volume, per-drop comparison, and finished-stock preparation.
  - Empty recipe workspace — 1 step directing the user to start with a
    Calculator recipe.

Each illustration should explain the role of its highlighted section without
introducing new workflow instructions that contradict the existing copy.

## Architecture and data flow

- Keep existing tour-step lists as the source of truth for order, target IDs,
  titles, and explanatory copy.
- Generalize the current optional step-visual interface so calculator and
  Concentrates tours can select an illustration by stable step identity.
- Keep Watermancer's current diagram mapping and rendered output unchanged.
- Render static diagrams from tour-step metadata only. Do not read or write
  recipe, target, stock, calibration, or matching state.
- Use the existing shared tour dialog and `renderStepVisual` path rather than
  building separate dialog implementations for each workflow.

## Resilience and accessibility

- A missing or hidden spotlight target continues to follow the existing safe
  close behavior; the illustration must not cause a missing target to be
  treated as a successful tour completion.
- Diagrams are decorative when their content is repeated by the adjacent
  explanation. Ensure controls and explanatory text remain available to
  assistive technology.
- Preserve keyboard focus trapping, Escape-to-skip, focus restoration, visible
  focus indicators, and reduced-motion behavior.
- Keep illustrations readable at mobile widths and browser zoom without
  requiring horizontal scrolling.

## Verification

1. Unit-test that each of the 26 non-Watermancer steps has exactly one
   illustration key and that the current step order and target IDs are
   unchanged.
2. Verify all seven Watermancer illustration keys and existing Watermancer
   visuals remain unchanged.
3. Exercise every tour branch in browser tests, confirming Next/Back changes
   the illustration and spotlight together and that branch-specific targets
   remain visible.
4. Verify first-visit, replay, Skip, Finish, Escape, focus restoration,
   missing-target handling, and mobile layout continue to work.
5. Run calculator guided-tour tests, typecheck, build, and relevant browser
   tests; visually inspect representative steps at desktop and phone widths.

## Acceptance criteria

- All 26 non-Watermancer tour steps display a distinct, relevant visual.
- The Watermancer tour's seven visuals and behavior remain unchanged.
- Each visual corresponds to the real section spotlighted for that step and
  does not show live user data.
- All current tour controls, branching, persistence, accessibility, and
  calculator behavior remain intact.
