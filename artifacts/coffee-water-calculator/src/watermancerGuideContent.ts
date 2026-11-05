import type { GuideSaltProductId } from './watermancerGuideSaltProducts';

export type WatermancerGuideInlineSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'emphasis'; readonly text: string }
  | { readonly kind: 'product'; readonly productId: GuideSaltProductId };

export type WatermancerGuideDetail =
  | string
  | { readonly segments: readonly WatermancerGuideInlineSegment[] };

export interface WatermancerGuideEntry {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly details: readonly WatermancerGuideDetail[];
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
      {
        segments: [
          { kind: 'text', text: 'When a salt has multiple forms, prefer the ' },
          { kind: 'emphasis', text: 'most hydrated common food-grade form' },
          {
            kind: 'text',
            text: ' over anhydrous; it is usually easier to dissolve, weigh, and handle. Check the label, then choose that same form in Watermancer.',
          },
        ],
      },
      {
        segments: [
          {
            kind: 'text',
            text: 'For flavor, some people prefer natural or mineral-derived salts to very pure salts because trace minerals can add subtle notes. ',
          },
          { kind: 'emphasis', text: 'This is optional and taste is personal.' },
          { kind: 'text', text: ' Examples include ' },
          { kind: 'product', productId: 'zechstein' },
          { kind: 'text', text: ' or ' },
          { kind: 'product', productId: 'nigari' },
          { kind: 'text', text: ', and natural sodium chloride such as ' },
          { kind: 'product', productId: 'saltverk' },
          { kind: 'text', text: ' or ' },
          { kind: 'product', productId: 'vera-salt' },
          { kind: 'text', text: '. Choose an ' },
          { kind: 'emphasis', text: 'unscented, additive-free product' },
          { kind: 'text', text: ' and match its labeled composition and hydration form. Use common sense—unscented and additive-free doesn’t automatically mean suitable for drinking water.' },
        ],
      },
      'For other common recipe salts, look for food-grade magnesium sulfate heptahydrate, calcium chloride dihydrate sold for cheesemaking or pickling, and food-grade potassium chloride or potassium bicarbonate.',
      {
        segments: [
          { kind: 'emphasis', text: 'Food grade is enough' },
          {
            kind: 'text',
            text: '; you do not need laboratory-grade or expensive specialty salts. Ordinary baking soda, including ',
          },
          { kind: 'product', productId: 'arm-and-hammer' },
          { kind: 'text', text: ', is perfectly fine.' },
        ],
      },
    ],
  },
  {
    id: 'calibrate',
    title: 'Calibrate each dropper',
    summary: 'Measure straight and round tips separately, holding the dropper vertically while dispensing.',
    details: [
      'Count a known number of water drops from each tip style into a tared vessel while holding the dropper vertically, then weigh the water.',
      'Tilting a pipette to 45° increases the surface area the drop clings to and can change drop weight by up to 15–20%. The photos show tip shapes only, not the dispensing angle.',
      'Enter each result below and press Use. This water-only calibration supplies a planning estimate shared by DIY Stock Builder and DIY Lotus Drops; verify dosing with actual finished-stock drops.',
    ],
  },
  {
    id: 'prepare-stocks',
    title: 'Prepare 1 mg per drop stocks',
    summary: 'Choose the target finished-stock weight in grams. Water-drop calibration gives a planning estimate; verify each finished stock.',
    details: [
      'Aim for approximately 1 mg of physical salt per drop, then verify the actual prepared stock by weighing counted drops. Different salts can change finished-stock drop mass.',
      'Place the bottle on the scale and tare it once. Add the calculated salt amount, then use a splash of the measured water to rinse any clinging crystals from the parchment into the bottle. Add water until salt and water reach the target total stock weight. Leave headspace, cap, and shake/mix until dissolved.',
      'For plain water at room temperature, 1 mL ≈ 1 g. This is a water-only measuring convenience; calculate the finished concentrate by mass.',
    ],
  },
  {
    id: 'set-targets',
    title: 'Set up the Watermancer recipe',
    summary: 'With your finished stocks verified, use their measured mg per drop to prepare the Watermancer recipe.',
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
    title: 'Build, match, and save a water recipe',
    summary: 'Choose a recipe, set ion targets and batch volume, add mineral waters and salts, run a match, then review and save the finished recipe card.',
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
      'Count and weigh a known number of actual finished-stock drops for each physical dropper, holding it vertically, then enter both measurements in DIY Concentrate.',
      'Grams per stock drop = measured finished-stock weight ÷ counted drops. Water-drop calibration is only a planning estimate; use the verified stock’s displayed mg per drop as the dose-conversion value.',
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
