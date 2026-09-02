# Watermancer Dilutable Stock Builder

**Date:** 2026-09-01

## Summary

Add a Watermancer action beside **Find the best match** that builds the
lowest-strength workable mineral stock from the currently selected added
mineral waters and enabled salts. The stock is evaluated by its simulated
dilution result, not only by the stock's own ratio error.

The user can dilute the resulting stock with zero-ion water to return to the
active target profile. The builder must preserve zero-target protections and
must distinguish an exact dilutable stock from a mixture that merely has
similar ion relationships.

## User experience

- Add a **Build a dilutable stock** button beside **Find the best match**.
- The action snapshots the current target profile, final batch volume, added
  mineral waters, and enabled salt inventory.
- It searches from just above 1× upward and selects the lowest workable stock
  multiplier.
- Each added mineral-water entry may contribute at most **3 L** to a stock
  candidate. The cap applies per selected water entry, so several selected
  waters may produce a larger total stock.
- The result displays:
  - stock multiplier;
  - stock volume;
  - zero-ion-water dilution volume;
  - predicted diluted ion values;
  - final post-dilution deviation;
  - ratio quality and any zero-target violations.
- A failed search explains whether the limit was the water cap, the strength
  search ceiling, unavailable salts, or an unsatisfied ion constraint.

## Matching contract

For an original target vector `T`, a stock candidate `S`, and multiplier `k`,
the candidate is dilutable when:

`S / k ≈ T`

for every active ion. The solver must evaluate absolute post-dilution
deviation against the original target. Ratio quality is secondary diagnostic
information and cannot substitute for absolute target coverage.

Positive target ions must be met after dilution. Zero-target ions remain hard
protected; zero-ion dilution water cannot remove a nonzero stock amount.

The builder may use every selected water and enabled salt as allowed
inventory, but it must not force a nonzero dose for a salt whose coupled ions
make an exact diluted match impossible.

## Architecture

Create a focused stock-builder layer around the existing shared Watermancer
chemistry and route solver. It should:

1. Normalize the current Watermancer inputs into a captured snapshot.
2. Generate bounded stock-strength candidates above 1×.
3. Solve each candidate against scaled targets while respecting the 3 L
   per-water-entry cap and existing dose/hydration policies.
4. Simulate dilution of each candidate back to the original final volume.
5. Rank by post-dilution safety and absolute deviation, then by ratio error,
   multiplier, and deterministic existing tie-breakers.
6. Return a result containing the selected route, stock metadata, diluted ion
   readings, and a structured explanation.

The existing Target values and Ratios actions remain unchanged. The stock
builder is a separate action and does not rewrite the active target profile.

## Search and limits

- Begin above 1× so a successful result is actually a concentrate.
- Search progressively larger strengths, then refine around the first
  workable multiplier.
- Use a bounded default maximum strength to prevent an unbounded search.
- Enforce 3 L per added-water entry during candidate generation.
- Preserve the existing selected-water and enabled-salt boundaries.
- Reject or clearly label candidates with precipitation/physical-feasibility
  concerns that the current chemistry model can identify.

## State and application

The action uses the existing single-flight Watermancer action behavior and
captured-input freshness checks. A successful result applies its water volumes
and salt doses through the existing route-application path, while retaining
the stock multiplier and dilution details for the visible result card.

Changing targets, waters, salts, volumes, hydration forms, priorities, or
policies invalidates an in-flight or displayed stock result.

## Testing

Add focused tests covering:

- exact proportional stock and zero post-dilution deviation;
- non-proportional ion multipliers that cannot be fixed by dilution;
- lowest-workable multiplier selection;
- zero-target protection;
- per-water 3 L cap;
- multiple waters exceeding 3 L in aggregate while each remains capped;
- partial/no-result explanations;
- stale-input rejection;
- deterministic ranking and session-safe result application.

Run the full calculator test suite, typecheck, production build, workflow
restart, and live preview verification before declaring the feature complete.