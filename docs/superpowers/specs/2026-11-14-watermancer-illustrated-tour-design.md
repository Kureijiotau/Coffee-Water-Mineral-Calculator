# Illustrated Watermancer Tour Design

## Goal

Make the existing Watermancer tour easier to follow by giving each of its seven
steps a concise, illustrated explanation. The tour should feel like a clear,
game-style walkthrough inspired by the supplied Fate/Grand Order references,
while preserving the app's dark instrument-console visual identity.

The tutorial explains how to use Watermancer. It does not perform calculations,
change recipe data, or alter the matching workflow.

## Scope

### Included

- Apply the illustrated treatment to all seven Watermancer tour steps.
- Keep the current live-page dimming and spotlight on the step's real Watermancer
  section.
- Pair each explanation with a small diagram that visually maps to that section.
- Retain the existing first-visit behavior and replay shortcut for Watermancer.
- Keep Back, Next, Skip, Finish, and visible step progress.
- Make the guide usable on narrow screens and with a keyboard.

### Not included

- Changes to Brewer, Alchemist, Concentrates, or their tours.
- Changes to salt selection, ion targets, matching, recipes, or calculation code.
- A new assistant, interactive recipe editor, or a standalone tutorial page.
- External illustrations, product artwork, or new image assets.

## User experience

The tour continues to dim the page and spotlight the live section being
explained. A framed guide card sits near the highlighted area without covering
it when the viewport permits. Each card contains:

1. A short title and plain-language explanation.
2. A compact, step-specific diagram made from UI-like shapes, arrows, and
   relevant icons.
3. Back/Next controls, a Skip action, and progress such as “3 of 7”.

Use a small number of strong visual cues: a colored frame around the relevant
control, directional arrows, and brief labels. Avoid decorative backgrounds or
repeating the same explanatory sentence in both the diagram and the copy.
Animations are brief and nonessential; reduced-motion preferences disable them.

On desktop, place the guide card beside the spotlight, choosing the side with
available space. If the target or card would be clipped, scroll the target into
view and clamp the card within the viewport. On narrow screens, keep the
spotlight visible above a compact, scrollable guide card; the card must not make
the page unusable or hide the current focus area.

The card does not invite users to manipulate the underlying controls during the
tour. They can move through the explanations or skip the tour, then use the
Watermancer normally.

## Seven illustrated stops

The stops use the existing target IDs, titles, and descriptions in
`calculatorGuidedTour.ts`. Copy should remain concise and should preserve the
current meaning.

| Step | Live section | Explanation | Diagram concept |
| --- | --- | --- | --- |
| 1 of 7 | Ion targets | Choose a saved profile or enter ion goals. If starting from an existing mix, add waters and salts first, then save the resulting targets as a new profile. | Two labeled paths—“Targets first” and “Mix first”—join at the ion target table. Show the saved-profile/direct-entry controls and the save-profile endpoint. |
| 2 of 7 | Finished volume | Set the amount of finished water. This batch size is used when calculating water and salt amounts. | A batch-size control feeds a simple “water + salts → finished batch” flow. |
| 3 of 7 | Source waters | Optionally add bottled or mineral water; its modeled ions contribute toward the final targets. | A source-water card flows into the final mixture, with a small ion contribution cue. |
| 4 of 7 | Salts and doses | Select which salts may be used. A manually edited dose stays fixed while matching adjusts the other selected salts. | A few salt rows distinguish selected, fixed-dose, and adjustable rows with a compact legend. |
| 5 of 7 | Precision Auto-match | Run Find the best match to apply an available water-and-salt plan for the selected targets. | Target, selected waters/salts, and a matching arrow lead to a “plan applied” result. |
| 6 of 7 | Final mixture | Compare modeled final ion readings and the summary with the selected target profile. | A concise target-versus-final comparison with aligned ion bars and a clear difference cue. |
| 7 of 7 | Recipe steps | Review the water and salt amounts for the current plan and the preparation instructions. | A numbered preparation card connects measured water and salt amounts to the finished recipe. |

The diagrams are instructional examples, not live data visualizations. They must
not imply that sample values are the user's current targets or results. Prefer
neutral labels and illustrative values only where a visual needs them; label
examples clearly.

## Architecture and data flow

- Keep the existing `WATERMANCER_STEPS` list as the source of truth for tour
  order, target IDs, and explanatory copy.
- Add a Watermancer-only illustration mapping keyed by stable step identity
  (prefer the existing target IDs) so each step resolves to exactly one diagram.
- Extend the shared tour presentation with an optional illustrated variant or
  optional step-visual renderer. Enable it only when `calculatorTourMode` is
  `watermancer`; other tours retain their current appearance.
- Keep spotlight measurement, scrolling, progress, navigation, and completion
  in the existing guided-tour flow. The illustration layer receives the
  current step and does not read or write calculator state.
- Preserve the existing Watermancer local-storage key and trigger behavior.
  Finishing or skipping marks the tour as seen; replay starts at step one.

## Resilience and accessibility

- If a step's target is missing or hidden, close the tour safely using the
  existing missing-target behavior. Do not mark an incomplete tour as seen;
  allow the user to replay it later.
- Continue to restore keyboard focus to the tour trigger after closing.
- Keep the dialog labeled and described for assistive technology, trap Tab
  focus inside it, support Escape to skip, and show visible focus indicators.
- Give meaningful labels to Back, Next, Skip, and Finish; announce the current
  title and step progress when navigating.
- Treat diagrams as decorative when their information is also in the adjacent
  explanation, or provide a concise accessible description if they convey
  additional meaning.
- Respect reduced-motion preferences and avoid relying on color alone to
  distinguish states.

## Verification

1. Unit-test the Watermancer tour's seven-step order and verify each step has
   exactly one illustration mapping.
2. Confirm Brewer and Alchemist still use the existing tour presentation and
   retain their current step definitions.
3. Exercise first-visit, replay, Back/Next, Skip, Finish, Escape, focus restore,
   and missing-target behavior.
4. Visually inspect all seven steps at desktop and mobile widths. Confirm each
   live target remains identifiable, the guide card is not clipped, and the
   diagrams use the same dark console palette without adding clutter.
5. Run the calculator package's typecheck and relevant guided-tour tests.

## Acceptance criteria

- Each of the seven Watermancer stops shows a distinct visual explanation that
  corresponds to its actual highlighted section.
- Step one accurately shows both target-first and mix-first routes, including
  saving ion targets from an existing water-and-salt mix.
- The existing spotlight and sequential navigation remain usable throughout.
- No chemistry, matching, recipe, or user data changes result from opening or
  navigating the tour.
- Other tours remain visually and behaviorally unchanged.
