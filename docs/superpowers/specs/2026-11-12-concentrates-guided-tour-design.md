# Concentrates Guided Tour

## Goal

Help users understand the Concentrates tab with a guided, visual walkthrough. The tour dims the page, highlights one relevant section at a time, and explains it in plain language. Users can move forward or back, skip, finish, or replay the tour.

## User-approved scope

- The first walkthrough covers the Concentrates tab.
- The tour starts automatically the first time a user opens Concentrates.
- A Tour control remains available so users can replay it.
- The walkthrough is explanatory and navigational only. It does not write to fields, change recipes, or run or alter chemistry calculations.
- The walkthrough uses no AI.

## Current workspace branches

The Concentrates workspace has distinct content for:

1. **Recipe Concentrate** — available after a recipe is sent from Calculator.
2. **Stock Builder** — prepares one selected salt stock.
3. **DIY Lotus Drops** — prepares one selected dropper stock at a time.

The tour follows the branch already open. It does not switch a user between these modes or highlight hidden controls.

## Experience

- On the first visit to Concentrates, open the first step automatically.
- Dim the rest of the app and spotlight the current target section.
- Keep the target visible by scrolling it into view before placing the explanation card.
- Provide **Back**, **Next**, **Skip**, and **Finish** controls. The first step omits Back; the last step uses Finish instead of Next.
- Show progress, such as “2 of 5”.
- Keep a Tour button in the Concentrates header for replay.
- Remember that a user has skipped or finished the automatic tour in browser-local storage. Do not sync or store tour history on the server.
- If a recipe-concentrate tour starts without a recipe loaded, explain that a recipe must first be sent from Calculator and provide a navigation button to Calculator.
- If any other expected target is missing, close the overlay safely and leave the page usable.

## Walkthrough content

Content is concise and specific to the current branch:

- **Recipe Concentrate:** explain the loaded recipe, stock arrangement and size, dose/result, and preparation instructions.
- **Stock Builder:** explain choosing a mineral and form, setting stock and brew-batch size, selecting calibration and dose, and following the preparation card.
- **DIY Lotus Drops:** explain choosing a dropper and tip, calibration, setting the amount to prepare, reading the per-drop result, and following its preparation steps.

Each step highlights a meaningful section rather than requiring precise interaction with an individual field. The tour must not block the highlighted control from being understood or used.

## Accessibility and responsive behavior

- Implement the overlay as an accessible modal dialog with a clear title and description.
- Move focus into the tour when it opens and keep keyboard navigation usable. On manual replay, restore focus to the Tour control when it closes; after automatic opening, return focus to the Concentrates heading.
- Support keyboard activation for all controls; Escape acts like Skip.
- Keep the explanation card and controls visible on narrow screens, repositioning the card when needed.
- Respect reduced-motion preferences and avoid relying on color alone to identify the highlighted area.

## Boundaries

- Do not introduce an AI assistant, free-text chat, or API request.
- Do not change recipe or calibration state.
- Do not modify the calculator, Watermancer, or Mixer experiences.
- Do not change how concentrate values, doses, or chemistry are calculated.

## Verification

- Verify each of the three workspace branches displays only valid tour steps and targets.
- Verify first-visit auto-open, Skip persistence, Finish persistence, and manual replay.
- Verify the no-recipe state gives a clear path back to Calculator.
- Verify Next, Back, Skip, Finish, Escape, and focus restoration.
- Verify the target remains visible and the explanation does not cover key controls on desktop and mobile widths.
- Verify using the tour leaves all recipe values, stock settings, and calibration values unchanged.
