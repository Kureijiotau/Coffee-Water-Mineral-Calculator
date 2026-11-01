import { describe, expect, it } from 'vitest';
import { computeIonTotals } from './waterData';
import { DAYS, ROBERT_ASAMI_WEEK1_SALT_RECIPES } from './week1GuideRecipes';

describe('Robert Asami Week 1 shared recipe catalog', () => {
  it('converts all seven guide days without changing salt targets or forms', () => {
    expect(ROBERT_ASAMI_WEEK1_SALT_RECIPES).toHaveLength(7);

    DAYS.forEach((day, index) => {
      const recipe = ROBERT_ASAMI_WEEK1_SALT_RECIPES[index];
      expect(recipe.id).toBe(`robert-asami-week1-day-${day.day}`);
      expect(recipe.name).toBe(day.title);
      expect(Object.keys(recipe.salts).sort()).toEqual(
        Object.keys(day.targets).filter(id => day.targets[id] > 0).sort(),
      );

      for (const [saltId, target] of Object.entries(day.targets)) {
        if (target <= 0) continue;
        expect(Number(recipe.salts[saltId].target)).toBeCloseTo(target, 8);
        expect(recipe.salts[saltId].formIdx).toBe(day.formIdx[saltId]);
      }
    });
  });

  it('derives zero-TDS ion targets from each day recipe', () => {
    DAYS.forEach((day, dayIndex) => {
      const recipe = ROBERT_ASAMI_WEEK1_SALT_RECIPES[dayIndex];
      const recipeTargets = Object.fromEntries(
        Object.entries(recipe.salts).map(([saltId, entry]) => [saltId, Number(entry.target)]),
      );

      expect(computeIonTotals(recipeTargets, {}, 1)).toEqual(
        computeIonTotals(day.targets, {}, 1),
      );
    });
  });

  it('keeps Day 5 cataloged as the published recipe without optional swaps', () => {
    const day5 = ROBERT_ASAMI_WEEK1_SALT_RECIPES[4];
    expect(Object.keys(day5.salts).sort()).toEqual(['cacl2', 'khco3', 'mgso4']);
    expect(day5.salts.mgcl2).toBeUndefined();
    expect(day5.salts.nahco3).toBeUndefined();
  });
});
