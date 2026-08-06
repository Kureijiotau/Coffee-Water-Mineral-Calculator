# Single-button Watermancer matching

## Goal

Make Watermancer feel like one dependable matching tool instead of a collection
of solver controls. The user supplies the chemistry inputs and presses
**Find the best match**. The application owns strategy selection, candidate
ranking, tolerance policy, and quality validation internally.

The search engine remains flexible and testable. Its implementation details do
not become part of the main product interface.

## User-facing behavior

Watermancer keeps these user controls:

- Target ion values
- Selected base waters and Added waters
- Visible water volumes
- Selected salts
- Salt hydration forms
- Fixed salt doses
- Batch volume and preparation inputs

Watermancer exposes one matching action:

> Find the best match

Remove these matching controls from the product UI:

- Matching strategy selector
- Salt objective selector
- Priority preset selector
- Strict/permissive deviation selector
- Manual matching overshoot controls
- Route-specific matching actions
- Internal route-count or sweep terminology

The underlying types, solver dimensions, and test helpers may remain available
for the search engine and developer/test coverage. Existing saved plans should
continue to deserialize safely; stale matching preferences are not shown as
user-facing controls.

## Search flow

When the user presses **Find the best match**:

1. Capture an immutable snapshot of the current Watermancer inputs.
2. Run the complete deterministic candidate search using internal defaults and
   all supported strategies.
3. Keep the editable Watermancer plan unchanged while the search runs.
4. Disable the action for the entire search and ignore repeat clicks.
5. Discard the result if the captured inputs no longer match the current plan.
6. Reject invalid candidates before presenting a usable preview.
7. Show the best valid result in a review preview.

The search must not partially apply water volumes, salt doses, hydration forms,
strategy values, or other plan fields.

## Match preview

The completed search presents a preview card rather than mutating the active
plan. The preview includes:

- Recommended base and Added-water volumes
- Recommended salt doses and hydration forms
- Final ion values compared with targets
- Remaining gaps and overshoots
- A concise, user-oriented explanation of why the result is useful
- A clear indication when the result is partial but valid

The preview does not expose internal terms such as “48-route sweep,”
“deviation mode,” or “salt objective.” If useful, it may describe the winning
approach in plain language, for example:

> This match prioritizes useful mineral coverage while keeping bicarbonate
> within its limit.

Preview actions:

- **Use this match** applies the captured winning plan atomically.
- **Keep current plan** closes the preview and leaves the active plan untouched.
- Closing or dismissing the preview has the same no-change behavior.

After **Use this match**, the active Watermancer controls and result cards
reflect the selected candidate.

## Internal search boundary

The internal search continues to evaluate the supported strategy, salt
objective, priority, and deviation dimensions. These are implementation
choices, not user decisions.

The search remains:

- Deterministic
- Quality-gated
- Single-flight
- Snapshot-based
- Safe against stale input application
- Validated before any mutation

The search may evolve independently of the UI. New strategies can be added to
the candidate set without adding another selector or changing the main
Watermancer interaction.

Candidate selection continues to prefer:

1. Lowest policy-adjusted deviation
2. Matched over partial
3. Strict over permissive
4. Stable built-in tie-break ordering

The current plan's strategy/objective/priority preferences no longer need to
influence the primary product flow. If they remain in the internal tie-break
model for compatibility, they must not be presented as required user input.

## Invalid and unavailable results

If no candidate passes the hard chemistry and policy validation:

- Do not show an actionable match preview.
- Leave the current plan untouched.
- Show a clear message explaining that no safe match was found.
- Keep the user’s target, waters, salts, and doses available for adjustment.

If the search is interrupted or its input snapshot becomes stale:

- Discard the result.
- Leave the active plan untouched.
- Clear any provisional preview state.
- Allow the user to start a fresh search.

## Data flow and state

The matching action owns three distinct states:

1. **Idle** — editable plan is active; no pending result.
2. **Searching** — snapshot is being evaluated; action is disabled; active plan
   remains unchanged.
3. **Reviewing** — a validated candidate is held separately as a preview;
   active plan remains unchanged until confirmation.

The preview candidate must be cloned or otherwise immutable from the active
plan. Editing the active inputs while the preview is open invalidates the
preview and requires a new search.

Applying the preview uses one atomic state transition. It must apply the full
candidate together, including:

- Water volumes
- Salt targets
- Hydration forms where applicable
- Strategy-independent result state
- Any winning Added-water adjustments

## Visual and copy direction

The main action should be the dominant Watermancer call to action. It should
communicate confidence and simplicity, not implementation complexity.

Use plain language:

- “Find the best match”
- “Searching your water and salt options…”
- “Review your recommended match”
- “Use this match”
- “Keep current plan”
- “No safe match found”

Remove labels and badges that advertise the number of internal candidates.

## Compatibility and cleanup

- Keep solver exports used by tests and developer tooling.
- Preserve the internal Added-water mineral-first quality rules.
- Preserve fixed-dose behavior and existing chemistry calculations.
- Remove UI-only state, event handlers, and JSX that exist solely to expose
  solver configuration or route-specific actions.
- Keep persisted plan parsing tolerant of older strategy and overshoot fields.
- Do not remove the internal candidate dimensions until their regression
  coverage has been replaced by equivalent engine-level tests.

## Testing

Add or update coverage for:

1. The main Watermancer UI exposes only the single matching action.
2. Internal strategy/objective/priority/deviation controls are not rendered.
3. A search captures an input snapshot and does not mutate the active plan.
4. Repeat clicks are ignored during the search.
5. A validated result appears in a separate preview state.
6. **Keep current plan** and preview dismissal leave the active plan unchanged.
7. **Use this match** applies the complete candidate atomically.
8. Input changes invalidate an open preview.
9. Invalid or interrupted searches leave the active plan unchanged.
10. The candidate search remains deterministic and retains existing chemistry
    regression coverage, including Added-water mineral-first limits.
11. No internal route-count or solver terminology appears in the primary UI.
