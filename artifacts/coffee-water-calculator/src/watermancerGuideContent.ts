export interface WatermancerGuideEntry {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly details: readonly string[];
  readonly blankWorkspace?: boolean;
}

export const WATERMANCER_GUIDE_STEPS: readonly WatermancerGuideEntry[] = [
  {
    id: 'why-profile',
    title: 'Why taste needs a full profile',
    summary: 'The same key targets can still produce different-tasting water.',
    details: [],
  },
  {
    id: 'supplies',
    title: 'Set up the supplies',
    summary: 'Keep each physical salt in its own labeled dropper bottle.',
    details: [
      'Gather the salts, separate droppers, and a scale suitable for small masses (0.001g is preferred).',
    ],
  },
  {
    id: 'calibrate',
    title: 'Calibrate each dropper',
    summary: 'Measure straight and round tips separately instead of assuming they release the same amount.',
    details: [
      'Count a known number of water drops from each tip style into a tared vessel, then weigh the water.',
      'Enter each result below and press Use. The saved calibration is shared by DIY Stock Builder and DIY Lotus Drops.',
    ],
  },
  {
    id: 'prepare-stocks',
    title: 'Prepare 1 mg per drop stocks',
    summary: 'For a fixed tip calibration, bottle size—not salt type—sets the salt mass.',
    details: [
      'Each drop contains 1.00 mg of its physical salt; the salt type changes which ions those drops contribute.',
    ],
  },
  {
    id: 'set-targets',
    title: 'Set up the Watermancer recipe',
    summary: 'With all your 1 mg/drop solutions ready, you can now make very precise water recipes using Watermancer.',
    details: [
      'Choose or create the desired final-ion profile and set the final batch volume to 1 L.',
      'Select the actual mineral-water source and amount for the recipe. Use Craft ions when adjusting a pair so the complete target set stays charge balanced.',
    ],
  },
  {
    id: 'read-dose-plan',
    title: 'Start with these ranges',
    summary: 'My light-roast starting points—not rules for every palate.',
    details: [],
  },
  {
    id: 'make-and-taste',
    title: 'Try a 1 L example',
    summary: 'Open a recipe to see its water, salt dose, and final ion profile.',
    details: [],
  },
];

export { WATERMANCER_GUIDE_RECIPES } from './watermancerGuideRecipes';

export const WATERMANCER_GUIDE_REFERENCES: readonly WatermancerGuideEntry[] = [
  {
    id: 'drop-calibration',
    title: 'Drop calibration',
    summary: 'Measure the dropper that will dispense each prepared stock.',
    details: [
      'Count and weigh a known number of water drops for each physical dropper, then enter both measurements in DIY Concentrate.',
      'A dropper’s actual drops per milliliter can differ from a nominal estimate. Use the prepared stock’s displayed mg per drop as the dose-conversion value.',
    ],
  },
  {
    id: 'mg-per-drop',
    title: 'What 1 mg per drop means',
    summary: 'The milligrams are physical salt mass, not a finished-water ion reading.',
    details: [
      'A stock that delivers 1.00 mg of a selected salt per drop maps a 7 mg salt dose to 7 drops.',
      'That does not mean one drop adds 1 mg of every ion in the salt or 1 ppm to the finished water. Use Watermancer’s final ion readings for the modeled water composition.',
    ],
  },
  {
    id: 'salt-hydration-form',
    title: 'Salt hydration form',
    summary: 'Match the powder weighed into the dropper to the form selected in Watermancer.',
    details: [
      'Hydrated and anhydrous forms have different formula masses, so the same physical salt mass contains different amounts of the target ion.',
      'Label the stock with its physical form and select that same form when calculating the Watermancer salt dose.',
    ],
  },
  {
    id: 'charge-balance',
    title: 'Target ions and charge balance',
    summary: 'Charge balance depends on molar amounts and ionic charge, not equal ppm values.',
    details: [
      'Watermancer targets describe final-water ion concentrations. Craft ions adjusts a target pair in the context of the other active targets.',
      'Do not infer that two ions balance just because their displayed ppm numbers match.',
    ],
  },
  {
    id: 'mineral-water-base',
    title: 'Mineral-water base',
    summary: 'The selected source water already contributes ions to the final mixture.',
    details: [
      'Choose the source and volume that will actually be used. Watermancer accounts for those source-water readings when it calculates the remaining salt doses.',
      'Targets describe the completed water, not only the contribution from added salts.',
    ],
  },
  {
    id: 'final-volume',
    title: 'Final volume',
    summary: 'Use the bottle’s verified 1 L line or brim as the final-volume mark.',
    details: [
      'Add the measured mineral-water base and salt drops first, then top up with 0-TDS water to the final 1 L mark.',
      'The remainder is the difference to final volume, so it does not need to be weighed.',
    ],
  },
  {
    id: 'dose-to-drop',
    title: 'Dose-to-drop conversion',
    summary: 'Convert the physical salt dose using the actual prepared stock output.',
    details: [
      'drops = required salt mass in mg ÷ actual salt mg per drop.',
      'The numbers are equal only when that prepared stock has been verified at 1.00 mg of the selected salt per drop.',
    ],
  },
  {
    id: 'taste-iteration',
    title: 'Taste iteration',
    summary: 'Treat a calculated recipe as a starting point for your own controlled comparisons.',
    details: [
      'Change one target or dose at a time, then compare the result and final ion readings.',
      'Taste is personal and depends on the coffee and preparation. The guide does not prescribe universal targets or promise a particular outcome.',
      'A conductivity-meter TDS reading is a separate measurement; it is not necessarily the sum of the app’s modeled ion readings.',
    ],
  },
];
