import { describe, expect, it } from 'vitest';
import { computeGH, computeIonTotals, computeKH, SALTS } from './waterData';
import { buildSaltUnitsExplainerModel, type SaltUnitsRecipeInput } from './saltUnitsExplainerModel';

function recipeWithSalts(
  entries: Array<{ saltId: string; targetPpm?: number; formIdx?: number }>,
): SaltUnitsRecipeInput {
  return {
    name: 'Test recipe',
    salts: entries.map(entry => ({
      saltId: entry.saltId,
      targetPpm: entry.targetPpm ?? 40,
      formIdx: entry.formIdx ?? 0,
    })),
  };
}

describe('buildSaltUnitsExplainerModel', () => {
  it('balances hexahydrate ions and crystal water against the physical amount weighed', () => {
    const model = buildSaltUnitsExplainerModel(recipeWithSalts([
      { saltId: 'mgcl2', targetPpm: 40, formIdx: 1 },
    ]));
    const row = model.rows[0];
    const ionMass = row.ions.reduce((sum, ion) => sum + ion.mgPerL, 0);

    expect(row.form.label).toBe('Hexahydrate');
    expect(ionMass + row.crystalWaterMgPerL).toBeCloseTo(row.weighedMgPerL, 8);
    expect(row.crystalWaterMgPerL).toBeGreaterThan(0);
  });

  it('derives the hydration multiplier from the salt molar masses', () => {
    const model = buildSaltUnitsExplainerModel(recipeWithSalts([
      { saltId: 'mgcl2', targetPpm: 40, formIdx: 1 },
    ]));
    const salt = SALTS.find(item => item.id === 'mgcl2')!;

    expect(model.hydration.saltId).toBe('mgcl2');
    expect(model.hydration.forms.find(form => form.saltFormIdx === 1)?.multiplier).toBeCloseTo(
      salt.hydrationForms[1].molarMass / salt.anhydrousMass,
      8,
    );
  });

  it('chooses the first hydrated salt in recipe order, independent of page-one mass sorting', () => {
    const model = buildSaltUnitsExplainerModel(recipeWithSalts([
      { saltId: 'nacl', targetPpm: 100 },
      { saltId: 'mgcl2', targetPpm: 300, formIdx: 0 },
      { saltId: 'cacl2', targetPpm: 20, formIdx: 1 },
      { saltId: 'mgso4', targetPpm: 100, formIdx: 1 },
    ]));

    expect(model.rows[0].saltId).toBe('mgcl2');
    expect(model.hydration.saltId).toBe('cacl2');
  });

  it('uses the selected calcium sulfate hydration form in the comparison', () => {
    const gypsum = SALTS.find(item => item.id === 'caso4')!;
    const model = buildSaltUnitsExplainerModel(recipeWithSalts([
      { saltId: 'caso4', targetPpm: 40, formIdx: gypsum.defaultFormIdx },
    ]));

    expect(model.rows[0].form.label).toBe('Dihydrate (Gypsum)');
    expect(model.hydration.saltId).toBe('caso4');
    expect(model.hydration.forms[0].label).toBe('Dihydrate (Gypsum)');
    expect(model.hydration.forms[1].isDryReference).toBe(true);
  });

  it('computes GH and KH from the same complete ion totals used by the recipe', () => {
    const recipe = recipeWithSalts([
      { saltId: 'mgcl2', targetPpm: 40, formIdx: 1 },
      { saltId: 'cacl2', targetPpm: 30, formIdx: 1 },
      { saltId: 'nahco3', targetPpm: 25 },
      { saltId: 'khco3', targetPpm: 20 },
    ]);
    const model = buildSaltUnitsExplainerModel(recipe);
    const targets = Object.fromEntries(recipe.salts.map(entry => [entry.saltId, entry.targetPpm]));
    const ions = computeIonTotals(targets, {}, 1);

    expect(model.gh).toBeCloseTo(computeGH(ions), 8);
    expect(model.kh).toBeCloseTo(computeKH(ions), 8);
    expect(model.totalIons).toEqual(ions);
  });

  it('shows one through four recipe salts without a hidden-count label', () => {
    for (const saltIds of [['mgcl2'], ['mgcl2', 'cacl2', 'mgso4', 'nahco3']]) {
      const model = buildSaltUnitsExplainerModel(recipeWithSalts(saltIds.map(saltId => ({ saltId }))));
      expect(model.rows).toHaveLength(saltIds.length);
      expect(model.hiddenSaltCount).toBe(0);
    }
  });

  it('shows only four rows and reports the rest for recipes with six or more salts', () => {
    const saltIds = ['mgcl2', 'cacl2', 'mgso4', 'nahco3', 'khco3', 'nacl'];
    const model = buildSaltUnitsExplainerModel(recipeWithSalts(saltIds.map(saltId => ({ saltId }))));

    expect(model.rows).toHaveLength(4);
    expect(model.hiddenSaltCount).toBe(2);
    expect(model.allRows).toHaveLength(6);
    expect(model.rows.map(row => row.saltId)).toEqual(['mgcl2', 'cacl2', 'mgso4', 'nahco3']);
  });

  it('uses six rounded common-form examples when no recipe has active salt targets', () => {
    const model = buildSaltUnitsExplainerModel(null);
    const emptyRecipe = buildSaltUnitsExplainerModel({
      name: 'Zero target recipe',
      salts: [{ saltId: 'mgcl2', targetPpm: 0, formIdx: 1 }],
    });

    expect(model.isFallback).toBe(true);
    expect(model.rows).toHaveLength(6);
    expect(model.allRows).toHaveLength(6);
    expect(model.hydration.saltId).toBe('mgcl2');
    expect(model.rows.map(row => row.weighedMgPerL)).toEqual([85, 53, 82, 25, 25, 20]);
    expect(model.rows.map(row => row.form.label)).toEqual([
      'Hexahydrate',
      'Dihydrate',
      'Heptahydrate (Epsom)',
      'Dry form',
      'Dry form',
      'Dry form',
    ]);
    for (const row of model.rows) {
      const ionMass = row.ions.reduce((sum, ion) => sum + ion.mgPerL, 0);
      expect(ionMass + row.crystalWaterMgPerL).toBeCloseTo(row.weighedMgPerL, 8);
    }
    expect(model.rows.slice(0, 3).every(row => row.crystalWaterMgPerL > 0)).toBe(true);
    expect(model.rows.slice(3).every(row => row.crystalWaterMgPerL === 0)).toBe(true);
    expect(model.hydration.forms[0].label).toBe('Hexahydrate');
    expect(model.hydration.forms[1].label).toBe('Dry reference (rarely sold)');
    expect(model.hydration.forms[1].isDryReference).toBe(true);
    expect(model.hydration.forms[0].ions).toEqual(model.rows[0].ions);
    for (const form of model.hydration.forms) {
      expect(form.ions.reduce((sum, ion) => sum + ion.mgPerL, 0)
        + form.crystalWaterMgPerL).toBeCloseTo(form.weighedMgPerL, 8);
    }
    expect(emptyRecipe.isFallback).toBe(true);
  });
});
