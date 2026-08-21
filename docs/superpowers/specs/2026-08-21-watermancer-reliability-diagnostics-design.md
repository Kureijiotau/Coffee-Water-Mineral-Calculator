# Watermancer Reliability Diagnostics

## Goal

Make Watermancer partial and blocked matches understandable and actionable without changing the chemistry solver's ranking, the plan persistence format, or automatic plan mutation behavior.

When a target cannot be fully satisfied, the result must show:

1. the exact ion conflicts;
2. the policy room that was available;
3. conservative ways the user could improve the match.

## Scope

### In scope

- Extend `WatermancerMatchDiagnostics` with structured per-ion conflict data.
- Generate deterministic, solver-aligned recommendations from the winning route and its plan.
- Render conflicts before recommendations in the existing Watermancer result card.
- Cover impossible targets, zero-target counter-ion ceilings, fixed doses, source preferences, controlled overshoot, and optional salts with regression tests.

### Out of scope

- Changing candidate ranking or chemistry formulas.
- Automatically changing a target, dose, water volume, salt inventory, or overshoot policy.
- Changing the `WatermancerPlan` persistence or share/import format.
- Adding a new route chooser or redesigning the Watermancer workspace.
- Replacing the existing explanation text; the new sections supplement it.

## Existing context

The current route diagnostics already calculate:

- total target deviation;
- explicit policy allowance;
- remaining policy violation;
- fixed and optional salt usage;
- omitted optional salts;
- honored ion source preferences;
- the stable solver score.

The current result card displays a compact “Why this match wins” explanation and aggregate metrics. The new work should extend this contract rather than derive chemistry explanations independently in React.

## Design

### 1. Structured ion conflicts

Add a `WatermancerIonConflict` value to the diagnostics contract with:

- `id`: the ion identifier;
- `actual`: final modeled ion value;
- `target`: requested ion value;
- `delta`: actual minus target;
- `allowedDelta`: policy room in the direction of the deviation;
- `outsidePolicyPpm`: remaining magnitude outside policy;
- `direction`: `deficit` or `excess`;
- `severity`: a stable severity bucket based on outside-policy magnitude;
- `source`: `water`, `salts`, or `mixed`, based on modeled contributions.

Only ions with meaningful outside-policy deviation should be listed as conflicts. Zero-target ions must be included when they have positive modeled contribution and no policy room.

The conflict list must be generated alongside the existing route diagnostics from the same route, plan, water contributions, salt contributions, and deviation values. The UI must not recompute conflict semantics.

### 2. Conservative recommendations

Add a structured recommendation value to the diagnostics contract with:

- a stable recommendation kind;
- the related ion IDs;
- short display label;
- concise rationale.

Recommendations must be advisory only and deterministic. The initial recommendation kinds are:

- add or choose a source containing more of a deficient ion;
- allow a controlled overshoot for a deficient ion when policy currently forbids it;
- enable an available selected salt that can supply a deficient ion;
- reduce or remove a source contributing an excess ion;
- relax a restrictive source preference when it is the reason a deficit remains.

Recommendations should be limited to the highest-impact conflicts so the result remains readable. They must not suggest changing a salt that is fixed unless the copy explicitly identifies that the fixed dose is constraining the match.

If no safe recommendation can be generated, show the conflict without inventing a remedy.

### 3. Result-card hierarchy

Keep the existing summary and “Why this match wins” section. When conflicts exist, add two sections beneath it:

**What is still conflicting**

- one compact row per important conflict;
- ion name and formula;
- actual versus target;
- deficit/excess direction;
- amount outside policy.

**Ways to improve it**

- show the deterministic recommendations;
- include the affected ion in each item;
- make clear that recommendations are possible adjustments, not applied changes.

When there are no conflicts, do not show an empty warning section. Retain the successful-match explanation and aggregate metrics.

Use the existing dark instrument-panel visual language, accessible text contrast, semantic list markup, and responsive layout. No new visual exploration is needed because this is an extension of an existing result surface.

### 4. Data flow and boundaries

1. A route is executed or recalculated using the existing chemistry helpers.
2. Route diagnostics calculate aggregate metrics and per-ion conflicts.
3. Recommendation generation consumes those diagnostics plus route context.
4. `WatermancerSolverResult` exposes the diagnostics through `primaryPlan`.
5. React renders the structured values and never calculates chemistry or policy semantics itself.

The `WatermancerPlan` type and its signature remain unchanged.

### 5. Error and edge handling

- Missing ion values are treated as zero using the existing route conventions.
- Negative targets are normalized to zero before conflict classification.
- A zero target with positive actual contribution is an excess conflict.
- Policy allowance is applied only in the permitted direction and only when the relevant policy is enabled.
- Fixed salt doses are reported as constraints, not silently treated as optional.
- A route with no actionable recommendation still renders its exact conflict data.
- Existing fallback routes and solver fallback behavior remain unchanged.

## Testing

Add focused pure tests for:

- exact target with no conflicts;
- impossible deficit with a clear deficit record;
- zero-target counter-ion excess;
- overshoot allowance removing a conflict;
- fixed salt contribution being identified as a constraint;
- water-only, salt-only, and water-then-salt source preferences;
- optional salts producing an enable-salt recommendation;
- excess contribution producing a reduce-source recommendation;
- deterministic ordering and recommendation limits.

Extend route-level tests to confirm:

- primary route diagnostics and rendered explanation use the same route;
- partial and blocked statuses expose conflicts;
- matched routes do not expose empty conflict UI data;
- existing route ranking and solver scores remain unchanged.

Run the full calculator test suite, typecheck, production build, and workflow verification.

## Acceptance criteria

- A user can identify every meaningful ion conflict without inspecting raw tables.
- Each displayed conflict shows actual, target, direction, and outside-policy amount.
- Recommendations are conservative, deterministic, and tied to the active plan constraints.
- No recommendation mutates state automatically.
- Existing solver winners, route scores, plan signatures, and chemistry calculations remain unchanged.
- All existing tests pass, and the new edge-case fixtures pass.