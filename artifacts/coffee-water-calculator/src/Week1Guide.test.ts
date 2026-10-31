import { describe, expect, it } from 'vitest';
import { computeGH, computeIonTotals, computeKH, SALTS } from './waterData';
import { DAYS, equivalentSaltTarget } from './Week1Guide';

describe('Robert Asami published Week 1 recipes', () => {
  const officialCopy = [
    "Intended to be closest to getting you started with materials you may already have at home. It should NOT be considered an end point. This recipe is based off of Holy Water but with more common household minerals. If you go out of order and jump straight to the end, you've done this wrong and haven't learned anything.",
    'The second recipe from the introductory blog post. This recipe is intended to create contrast with the Day 1 recipe. It should NOT be considered an end point. It is intended for lighter washed coffees, but is flexible to work with most light roasts. There is a lot of calcium to dissolve, you will likely need to stir it up quite well overnight.',
    'This recipe starts to touch on blending minerals. Consider how you like this water vs. the day 2 recipe; this recipe gauges how you feel about magnesium.',
    "Compared to the Day 3 recipe, we've flipped the primary GH mineral and are leaning heavier towards calcium. At this point, consider which way you lean - preferring calcium or magnesium.",
    "Now we're playing with alternative minerals. For example, we used epsom salt as the Mg source; you could swap it for magnesium chloride flakes. Note that this requires different calculations, and this specific example introduces more chlorides (when used with CaCl2).",
    "We're adding more complexity, and starting to introduce minerals that don't quite fit the GH/KH paradigm so far.",
    "If you skipped the first 6 days and expect this to be the best recipe, that is not the goal of this sequence. Now we're going for a different effect.",
  ];
  const officialNextSteps = "After going through the above recipes, you may have some opinions such as: \"I liked epsom salt more than CaCl2\", \"I can/can't see myself regularly working with recipes using many mineral sources\", \"I had a clear favorite recipe for my beans + grinder.\" Some things to try from here: Take your favorite recipe and iterate on it. Raise or lower buffer (KH) - we mostly stuck to 15KH, but you could go as low as 5. Try varying mineral sources - you may find a certain brand/source of sea salt tastes different. Find a \"base\" recipe for different bean types - for example, if you like your naturals to express juicy and fruity, you may seek a base water for that style, compared to a bright and floral base water for washed coffees.";

  it('uses the official day headings, method labels, and source wording verbatim', () => {
    DAYS.forEach((day, index) => {
      expect(day.title).toBe(`Day ${index + 1} pourover recipe`);
      expect(day.subtitle).toBe('Pourover/Filter');
      expect(day.description).toBe(officialCopy[index]);
    });
    expect(DAYS[6].learningNote).toBe(officialNextSteps);
  });

  it('keeps Watermancer tasting prompts neutral and specific to the coffee in the cup', () => {
    expect(DAYS.map(day => day.prompt)).toEqual([
      'With this coffee and brew method, what stands out in the cup?',
      'Compared with Day 1, what differences do you notice in this cup, if any?',
      'Compared with Day 2, what differences do you notice in this cup, if any?',
      'Compared with Day 3, what differences do you notice in this cup, if any?',
      'If you try the optional swap, what differences do you notice compared with the original?',
      'What differences do you notice in this cup? Which would you want to check in a repeat brew?',
      'Across this sequence, which recipe suits this coffee and brew method best? What would you want to test with another coffee?',
    ]);
  });

  const publishedMasses = [
    { mgso4: 148, nahco3: 25 },
    { cacl2: 44, nahco3: 25 },
    { mgso4: 100, cacl2: 22, nahco3: 25 },
    { mgso4: 50, cacl2: 44, nahco3: 25 },
    { mgso4: 74, cacl2: 33, khco3: 30 },
    { mgcl2: 30, mgso4: 37, cacl2: 17, nahco3: 17, khco3: 10, nacl: 15 },
    { mgso4: 37, cacl2: 17, nahco3: 8, khco3: 10, nacl: 20 },
  ];

  publishedMasses.forEach((masses, index) => {
    it(`preserves the published physical salt masses for Day ${index + 1}`, () => {
      const day = DAYS[index];
      expect(Object.keys(day.targets).sort()).toEqual(Object.keys(masses).sort());
      for (const [id, mass] of Object.entries(masses)) {
        const salt = SALTS.find(item => item.id === id)!;
        const form = salt.hydrationForms[day.formIdx[id]];
        expect(day.targets[id] * form.molarMass / salt.anhydrousMass).toBeCloseTo(mass!, 3);
      }
    });
  });

  it('keeps Day 5 on the published potassium buffer and labels Day 6 contributions correctly', () => {
    expect(DAYS[4].targets.nahco3).toBeUndefined();
    expect(DAYS[4].displayTargets.khco3).toBe('15 KH');
    expect(DAYS[5].displayTargets.mgcl2).toBe('15 GH');
    expect(DAYS[5].displayTargets.nahco3).toBe('10 KH');
  });
});

describe('Robert Asami Day 5 mineral swap', () => {
  it('preserves the magnesium GH contribution when swapping Epsom for magnesium chloride', () => {
    const swappedTarget = equivalentSaltTarget('mgso4', 'mgcl2', 'magnesium', 36.153);
    const originalGh = computeGH(computeIonTotals({ mgso4: 36.153 }, {}, 1));
    const swappedGh = computeGH(computeIonTotals({ mgcl2: swappedTarget }, {}, 1));

    expect(swappedTarget).toBeGreaterThan(0);
    expect(swappedGh).toBeCloseTo(originalGh, 5);
  });

  it('preserves the bicarbonate KH contribution when swapping sodium for potassium bicarbonate', () => {
    const swappedTarget = equivalentSaltTarget('nahco3', 'khco3', 'bicarbonate', 25);
    const originalKh = computeKH(computeIonTotals({ nahco3: 25 }, {}, 1));
    const swappedKh = computeKH(computeIonTotals({ khco3: swappedTarget }, {}, 1));

    expect(swappedTarget).toBeGreaterThan(0);
    expect(swappedKh).toBeCloseTo(originalKh, 5);
  });
});