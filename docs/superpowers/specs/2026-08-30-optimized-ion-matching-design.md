# Optimized Ion Matching Design

## Goal

Make the Watermancer Optimized option choose water volumes and salt doses by how
close the final result is for each targeted ion. Water and salts are both valid
contributors; Optimized must not prefer one source over the other unless the
user has explicitly selected a source policy.

The desired result is similar to the manually tuned example: every positive
ion target should remain as close as the chemistry allows instead of allowing a
small-target ion such as potassium to fall far below target while larger ppm
ions look close.

## Behavior

### Per-ion objective

For every ion with a positive target, calculate normalized error:

`abs(finalIon - targetIon) / targetIon`

An exact match has zero error. If an exact match is impossible, over-target and
under-target values with the same percentage distance are equally good. This
means a 0.3 ppm miss on a 1 ppm target and a 2.4 ppm miss on an 8 ppm target
have equal objective weight.

The objective must be evaluated across all positive target ions. It must not
sum raw ppm errors, apply an under-target penalty that is stronger than the
equivalent over-target penalty, or silently discard a large miss on a small
target.

### Source neutrality

When an ion is explicitly configured as `dont-care`, its water and salt
contributions are interchangeable for matching purposes. The solver should
select the combined water-plus-salt result with the lowest normalized
per-ion error. Source preference penalties must not be added for this mode.

Existing source policies (`water-only`, `water-then-salt`, and `salt-only`)
remain available and continue to constrain their respective ions when selected.
Plans that omit source preferences retain their existing compatibility behavior.

### Zero and unset targets

Only positive targets participate in percentage-error scoring. A zero or
missing target has no denominator and is treated as having no matching
objective. Existing hard-ceiling checks, overshoot reporting, diagnostics, and
visible “no target set” behavior remain unchanged.

## Architecture and data flow

The chemistry engine continues to calculate final ions from the selected water
volumes and salt doses. The change is limited to the scoring layer:

1. Water route generation produces candidate water volumes.
2. Salt auto-crafting receives the candidate water ion totals and generates
   feasible salt-dose candidates, including omitted salts and practical dose
   floors.
3. Candidate final ions are scored with the normalized per-ion objective for
   explicit `dont-care` ions.
4. Route selection compares the same objective across water-first,
   salt-first, closest-match, and other applicable candidates.
5. The result card and diagnostics continue to display raw ppm readings and
   percentage coverage; only candidate ranking changes.

The shared scoring helper should be the single source of truth for normalized
Optimized error so salt crafting, route ranking, and displayed total deviation
cannot disagree. Policy-aware scoring remains separate for explicit source and
overshoot controls.

## Constraints and edge cases

- Fixed salt doses remain user-owned and outside the optimizer. Their coupled
  ions are still included in the final score.
- A practical minimum salt dose competes against omitting that salt; it is not
  forced into the recipe when its coupled-ion error is worse.
- Existing allowed overshoot and soft-deficit settings remain effective for
  ions using explicit policy modes. Optimized treats equal positive-target
  over- and under-distance symmetrically.
- Zero-target co-ions continue to appear in diagnostics and overshoot reports,
  but they do not distort percentage scoring.
- Invalid, negative, or non-finite targets are normalized through the existing
  target handling and must not produce `NaN` or `Infinity` scores.
- Tie-breaking remains deterministic and may continue to prefer fewer active
  salts after objective scores are equal.

## Testing

Add or update regression coverage for:

1. An exact multi-ion match beats every non-exact candidate.
2. Equal percentage over- and under-target deviations receive equal scores.
3. A small potassium target is not sacrificed for a closer raw-ppm result on
   sodium, chloride, or sulfate.
4. Water-only and salt-only plans still honor their explicit source policy.
5. Water and salt contributions are jointly considered for `dont-care`.
6. Zero or unset targets do not cause percentage division errors and preserve
   existing zero-target diagnostic behavior.
7. Salt crafting, route ranking, and displayed total deviation use the same
   normalized objective.

The implementation is complete when the full calculator typecheck and test
suite pass and the live Watermancer preview loads without browser errors.