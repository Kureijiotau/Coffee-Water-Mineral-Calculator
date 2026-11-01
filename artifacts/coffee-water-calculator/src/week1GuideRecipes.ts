import {
  SALTS,
  type SaltRecipe,
} from './waterData';

export type Week1Recipe = {
  id: string;
  targets: Record<string, number>;
  formIdx: Record<string, number>;
};

export type Week1Day = {
  day: number;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  prompt: string;
  note: string;
  learningNote: string;
  targets: Record<string, number>;
  formIdx: Record<string, number>;
  displayTargets: Record<string, string>;
};

const massTargets = (
  masses: Record<string, number>,
  forms: Record<string, number>,
): Record<string, number> => Object.fromEntries(
  Object.entries(masses).map(([saltId, massMg]) => {
    const salt = SALTS.find(item => item.id === saltId);
    const formIdx = forms[saltId] ?? salt?.defaultFormIdx ?? 0;
    const form = salt?.hydrationForms[formIdx] ?? salt?.hydrationForms[0];
    return [saltId, salt && form ? (massMg * salt.anhydrousMass) / form.molarMass : 0];
  }),
);

export function equivalentSaltTarget(
  sourceSaltId: string,
  destinationSaltId: string,
  ionId: string,
  sourceTarget: number,
): number {
  const sourceSalt = SALTS.find(salt => salt.id === sourceSaltId);
  const destinationSalt = SALTS.find(salt => salt.id === destinationSaltId);
  const sourceFraction = sourceSalt?.ions.find(ion => ion.ionId === ionId)?.fraction ?? 0;
  const destinationFraction = destinationSalt?.ions.find(ion => ion.ionId === ionId)?.fraction ?? 0;
  if (!Number.isFinite(sourceTarget) || sourceTarget <= 0 || sourceFraction <= 0 || destinationFraction <= 0) {
    return 0;
  }
  return Number(((sourceTarget * sourceFraction) / destinationFraction).toFixed(6));
}

const DAY5_ORIGINAL_TARGETS = massTargets(
  { mgso4: 74, cacl2: 33, khco3: 30 },
  { mgso4: 1, cacl2: 0, khco3: 0 },
);

const DAY5_MGCL2_TARGET = equivalentSaltTarget(
  'mgso4',
  'mgcl2',
  'magnesium',
  DAY5_ORIGINAL_TARGETS.mgso4,
);
const DAY5_NAHCO3_TARGET = equivalentSaltTarget(
  'khco3',
  'nahco3',
  'bicarbonate',
  DAY5_ORIGINAL_TARGETS.khco3,
);

export const DAYS: Week1Day[] = [
  {
    day: 1,
    label: 'DAY 1',
    title: 'Day 1 pourover recipe',
    subtitle: 'Pourover/Filter',
    description: "Intended to be closest to getting you started with materials you may already have at home. It should NOT be considered an end point. This recipe is based off of Holy Water but with more common household minerals. If you go out of order and jump straight to the end, you've done this wrong and haven't learned anything.",
    prompt: 'For this baseline with magnesium sulfate and bicarbonate, what do you notice in the cup?',
    note: 'The published masses are for 1 L. The dose shown here is scaled to the selected batch volume and salt hydration form.',
    learningNote: 'The calculator displays GH and KH as ppm CaCO₃; salt amounts remain physical mass.',
    formIdx: { mgso4: 1, nahco3: 0 },
    targets: massTargets({ mgso4: 148, nahco3: 25 }, { mgso4: 1, nahco3: 0 }),
    displayTargets: { mgso4: '60 GH', nahco3: '15 KH' },
  },
  {
    day: 2,
    label: 'DAY 2',
    title: 'Day 2 pourover recipe',
    subtitle: 'Pourover/Filter',
    description: 'The second recipe from the introductory blog post. This recipe is intended to create contrast with the Day 1 recipe. It should NOT be considered an end point. It is intended for lighter washed coffees, but is flexible to work with most light roasts. There is a lot of calcium to dissolve, you will likely need to stir it up quite well overnight.',
    prompt: 'Compared with Day 1, what changes do you notice with calcium chloride replacing magnesium sulfate and GH dropping from 60 to 40?',
    note: 'This recipe lists 40 GH, compared with Day 1’s 60 GH; both recipes list 15 KH.',
    learningNote: 'The listed calcium chloride mass is modeled using the anhydrous salt form.',
    formIdx: { cacl2: 0, nahco3: 0 },
    targets: massTargets({ cacl2: 44, nahco3: 25 }, { cacl2: 0, nahco3: 0 }),
    displayTargets: { cacl2: '40 GH', nahco3: '15 KH' },
  },
  {
    day: 3,
    label: 'DAY 3',
    title: 'Day 3 pourover recipe',
    subtitle: 'Pourover/Filter',
    description: 'This recipe starts to touch on blending minerals. Consider how you like this water vs. the day 2 recipe; this recipe gauges how you feel about magnesium.',
    prompt: 'Compared with Day 2, what changes do you notice as magnesium sulfate is added, calcium chloride decreases, and GH rises from 40 to 60?',
    note: 'The source lists 40 GH from Epsom salt and 20 GH from calcium chloride, for 60 GH total.',
    learningNote: 'Compared with Day 2, this recipe changes the GH level as well as the hardness sources.',
    formIdx: { mgso4: 1, cacl2: 0, nahco3: 0 },
    targets: massTargets({ mgso4: 100, cacl2: 22, nahco3: 25 }, { mgso4: 1, cacl2: 0, nahco3: 0 }),
    displayTargets: { mgso4: '40 GH', cacl2: '20 GH', nahco3: '15 KH' },
  },
  {
    day: 4,
    label: 'DAY 4',
    title: 'Day 4 pourover recipe',
    subtitle: 'Pourover/Filter',
    description: "Compared to the Day 3 recipe, we've flipped the primary GH mineral and are leaning heavier towards calcium. At this point, consider which way you lean - preferring calcium or magnesium.",
    prompt: 'Compared with Day 3, what changes do you notice as GH shifts from magnesium sulfate toward calcium chloride?',
    note: 'The listed hardness contributions are 20 GH from Epsom salt and 40 GH from calcium chloride.',
    learningNote: 'The calculator preserves the source salt masses and scales them to the selected batch volume.',
    formIdx: { mgso4: 1, cacl2: 0, nahco3: 0 },
    targets: massTargets({ mgso4: 50, cacl2: 44, nahco3: 25 }, { mgso4: 1, cacl2: 0, nahco3: 0 }),
    displayTargets: { mgso4: '20 GH', cacl2: '40 GH', nahco3: '15 KH' },
  },
  {
    day: 5,
    label: 'DAY 5',
    title: 'Day 5 pourover recipe',
    subtitle: 'Pourover/Filter',
    description: "Now we're playing with alternative minerals. For example, we used epsom salt as the Mg source; you could swap it for magnesium chloride flakes. Note that this requires different calculations, and this specific example introduces more chlorides (when used with CaCl2).",
    prompt: 'If you try the MgCl₂ swap for MgSO₄, what changes do you notice in this cup?',
    note: 'The published Day 5 recipe uses potassium bicarbonate. The sodium-bicarbonate option is a Watermancer addition.',
    learningNote: 'Watermancer calculates equivalent GH or KH for optional salt swaps. These controls are app additions, not extra recipes from the source.',
    formIdx: { mgso4: 1, cacl2: 0, khco3: 0 },
    targets: DAY5_ORIGINAL_TARGETS,
    displayTargets: { mgso4: '30 GH', cacl2: '30 GH', khco3: '15 KH' },
  },
  {
    day: 6,
    label: 'DAY 6',
    title: 'Day 6 pourover recipe',
    subtitle: 'Pourover/Filter',
    description: "We're adding more complexity, and starting to introduce minerals that don't quite fit the GH/KH paradigm so far.",
    prompt: 'Compared with Day 5, what changes do you notice after adding MgCl₂ and NaCl, lowering GH, and splitting KH between NaHCO₃ and KHCO₃?',
    note: 'The source lists the six mineral contributions separately, including 15 ppm sodium chloride.',
    learningNote: 'The source notes that these are very small doses; the app shows the calculated quantities for the selected batch.',
    formIdx: { mgcl2: 1, mgso4: 1, cacl2: 0, nahco3: 0, khco3: 0, nacl: 0 },
    targets: massTargets({ mgcl2: 30, mgso4: 37, cacl2: 17, nahco3: 17, khco3: 10, nacl: 15 }, { mgcl2: 1, mgso4: 1, cacl2: 0, nahco3: 0, khco3: 0, nacl: 0 }),
    displayTargets: { mgcl2: '15 GH', mgso4: '15 GH', cacl2: '15 GH', nahco3: '10 KH', khco3: '5 KH', nacl: '15 mg/L NaCl' },
  },
  {
    day: 7,
    label: 'DAY 7',
    title: 'Day 7 pourover recipe',
    subtitle: 'Pourover/Filter',
    description: "If you skipped the first 6 days and expect this to be the best recipe, that is not the goal of this sequence. Now we're going for a different effect.",
    prompt: 'Compared with Day 6, what changes do you notice as GH/KH fall to 30/10, MgCl₂ is removed, and NaCl rises from 15 to 20 ppm?',
    note: 'The published Day 7 recipe is 30 GH / 10 KH, with 20 ppm sodium chloride.',
    learningNote: "After going through the above recipes, you may have some opinions such as: \"I liked epsom salt more than CaCl2\", \"I can/can't see myself regularly working with recipes using many mineral sources\", \"I had a clear favorite recipe for my beans + grinder.\" Some things to try from here: Take your favorite recipe and iterate on it. Raise or lower buffer (KH) - we mostly stuck to 15KH, but you could go as low as 5. Try varying mineral sources - you may find a certain brand/source of sea salt tastes different. Find a \"base\" recipe for different bean types - for example, if you like your naturals to express juicy and fruity, you may seek a base water for that style, compared to a bright and floral base water for washed coffees.",
    formIdx: { mgso4: 1, cacl2: 0, nahco3: 0, khco3: 0, nacl: 0 },
    targets: massTargets({ mgso4: 37, cacl2: 17, nahco3: 8, khco3: 10, nacl: 20 }, { mgso4: 1, cacl2: 0, nahco3: 0, khco3: 0, nacl: 0 }),
    displayTargets: { mgso4: '15 GH', cacl2: '15 GH', nahco3: '5 KH', khco3: '5 KH', nacl: '20 mg/L NaCl' },
  },
];

export const ROBERT_ASAMI_WEEK1_SALT_RECIPES: SaltRecipe[] = DAYS.map(day => ({
  id: `robert-asami-week1-day-${day.day}`,
  name: day.title,
  salts: Object.fromEntries(
    Object.entries(day.targets)
      .filter(([, target]) => target > 0)
      .map(([saltId, target]) => [
        saltId,
        {
          target: String(target),
          formIdx: day.formIdx[saltId] ?? SALTS.find(salt => salt.id === saltId)?.defaultFormIdx ?? 0,
        },
      ]),
  ),
  source: 'Robert Asami · Week 1',
  method: day.subtitle,
  notes: day.description,
  conversion: 'exact',
}));
