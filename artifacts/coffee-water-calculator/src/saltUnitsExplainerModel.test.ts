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
    expect(model.hydration.forms[1].multiplier).toBeCloseTo(
      salt.hydrationForms[1].molarMass / salt.anhydrousMass,
      8,
    );
  });

  it('chooses the first hydrated salt in recipe order, independent of page-one mass sorting', () => {
    const model = buildSaltUnitsExplainerModel(recipeWithSalts([
      { saltId: 'nacl', targetPpm: 100 },
      { saltId: 'cacl2', targetPpm: 20, formIdx: 1 },
      { saltId: 'mgcl2', targetPpm: 100, formIdx: 1 },
    ]));

    expect(model.rows[0].saltId).toBe('mgcl2');
    expect(model.hydration.saltId).toBe('cacl2');
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

  it('uses the six rounded dry-salt examples when no recipe has active salt targets', () => {
    const model = buildSaltUnitsExplainerModel(null);
    const emptyRecipe = buildSaltUnitsExplainerModel({
      name: 'Zero target recipe',
      salts: [{ saltId: 'mgcl2', targetPpm: 0, formIdx: 1 }],
    });

    expect(model.isFallback).toBe(true);
    expect(model.rows).toHaveLength(6);
    expect(model.allRows).toHaveLength(6);
    expect(model.hydration.saltId).toBe('mgcl2');
    expect(model.hydration.forms[0].ions).toEqual(model.allRows[0].ions);
    expect(model.rows[0].weighedMgPerL).toBe(40);
    expect(model.rows[0].ions.reduce((sum, ion) => sum + ion.mgPerL, 0)
      + model.rows[0].crystalWaterMgPerL).toBeCloseTo(40, 8);
    expect(emptyRecipe.isFallback).toBe(true);
  });
});
