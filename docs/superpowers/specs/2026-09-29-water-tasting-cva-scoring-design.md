# Water Tasting CVA-Informed Scoring Redesign

## Goal

Keep the existing **Water target** picker and **The cup** details section
unchanged. Replace the scoring and tasting-description UI that follows them
with a structured, slider-based form informed by the Specialty Coffee
Association's current Coffee Value Assessment (CVA) forms used in Q Grader
training.

The form records a person's sensory observations about a brewed cup and its
water. It is not an official Q assessment and must not be presented as a Q
score.

## Reference model

The current SCA CVA sensory forms distinguish two types of assessment:

1. **Descriptive assessment** records perceived attributes and their intensity.
   The current form uses 0–15 scales for fragrance, aroma, flavor, aftertaste,
   acidity, sweetness, and mouthfeel. It also uses descriptor choices and
   note spaces; this redesign uses descriptor choices but does not add a new
   free-text field.
2. **Affective assessment** records an impression of quality on a 1–9 scale for
   fragrance/aroma, flavor/aftertaste, acidity, mouthfeel, and overall. Its
   anchors run from extremely low through neither high nor low to extremely
   high.

Use the two-part structure and those dimensions and ranges. Do not copy the
paper form's visual layout.

Reference: [SCA Coffee Value Assessment and forms](https://sca.coffee/value-assessment),
including the linked English CVA forms.

## Form structure

### Keep unchanged

- **Water target:** keep the existing Alchemist and Watermancer picker,
  selection behavior, and exact-source readings.
- **The cup:** keep the existing optional coffee name, roast, origin, and brew
  method fields.
- Keep the current save, edit, delete, history, and partial-note workflows.

### Replace the current scoring sections

Remove the current five 0–10 button ratings and `/50` total, the separate
−5-to-+5 cup-shape sliders, and their current history summaries. Replace them
with the following sections:

#### 3. Descriptive assessment

Provide an optional native range slider from 0 to 15 for each attribute:

- Fragrance intensity
- Aroma intensity
- Flavor intensity
- Aftertaste intensity
- Acidity intensity
- Sweetness intensity
- Mouthfeel intensity

Group the existing sensory descriptor choices with this assessment, rather than
presenting descriptors as a separate scoring system. Keep descriptors optional
and non-numeric; selecting them does not change any score. Reorganize them into
concise groups modeled on the CVA form's fragrance/aroma, flavor, main-taste,
and mouthfeel language, adapted for this app's water-tasting context. Do not add
a new free-text field in this redesign.

#### 4. Affective assessment

Provide an optional native range slider from 1 to 9 for each attribute:

- Fragrance / aroma
- Flavor / aftertaste
- Acidity
- Mouthfeel
- Overall

Show the scale anchors: 1 = Extremely low, 5 = Neither high nor low, and 9 =
Extremely high. Include the appropriate intermediate SCA anchor labels as
supporting scale context.

## Slider feedback and visual behavior

- Every slider displays its selected number and an attribute-specific phrase
  that updates whenever the value changes. Provide a cue for every selectable
  value, not just the minimum and maximum. For mouthfeel intensity, the language
  can progress from faint or tea-like through fuller weight to coating or
  syrupy; it must describe intensity, not imply that higher is better.
- Keep the slider's minimum, midpoint where applicable, and maximum visible.
- Use distinct color semantics:
  - Descriptive intensity uses a neutral single-hue progression. More intensity
    is not inherently better or worse.
  - Affective quality uses a low-to-neutral-to-high progression.
- Color must supplement, not replace, the visible number and phrase. Native
  keyboard operation, clear labels, focus indication, and an accessible value
  description are required. Screen-reader announcements should update without
  repeatedly reading the whole form.
- Keep partial entries valid. A user may save with any subset of descriptive
  and affective values.

## Score presentation

- Do not combine the 0–15 intensity fields and 1–9 quality fields into a new
  homemade total.
- The explicit Overall affective slider is the high-level impression.
- Do not call any result an “official Q score.” The app is adapting the CVA
  structure for personal water-and-coffee observations.
- Do not add physical assessment, extrinsic assessment, or cup-defect scoring;
  those are outside this tasting workflow.

## Saved-note compatibility

Existing notes use 0–10 ratings, optional cup-shape values, and descriptor IDs.
Keep those records readable and editable without silently converting their
values into the new CVA-informed scales.

Use a backward-compatible, versioned scoring representation so legacy and new
notes can coexist. Opening a legacy note keeps its original scoring controls
and values; edits to that note remain in the legacy format. New notes use the
CVA-informed format. Do not automatically map one scale to the other or add an
implicit conversion. Saving either format validates its own scale ranges. Do
not reset or discard local tasting storage during the redesign.

History cards keep their existing date, water identity, coffee identity, and
edit/delete actions. New-format cards show the Overall affective score when it
exists plus a compact breakdown of the descriptive and affective scores;
they do not show a combined total. Legacy cards retain their original rating
and cup-shape presentation, and editing them does not convert them to the new
format.

## Acceptance criteria

- The Water target picker and The cup details remain functionally unchanged.
- The current scoring UI after those sections is replaced by Descriptive and
  Affective assessments with the exact fields and ranges listed above.
- Every numeric field is a keyboard-accessible range slider with a live,
  attribute-specific cue for every selectable value.
- Descriptive and affective colors communicate different meanings and do not
  make intensity appear to be a quality score.
- Descriptor choices remain optional, grouped with Descriptive assessment, and
  never affect a numeric value.
- Partial new-format notes save and reopen correctly.
- Existing notes load, display, and edit without score-range corruption or data
  loss.
- Tests cover scale bounds, cue coverage, save/load validation, legacy
  compatibility, and unchanged water-source identity.

## Out of scope

- Changing either preserved section, including the water-profile catalog.
- Producing an official SCA/Q score or reproducing the paper form's layout.
- Adding water selection by free text, a new water catalog, or non-sensory
  physical/extrinsic scoring.