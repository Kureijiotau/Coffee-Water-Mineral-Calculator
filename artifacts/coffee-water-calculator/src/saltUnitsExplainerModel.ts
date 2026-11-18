import {
  computeGH,
  computeIonTotals,
  computeKH,
  computeSaltMg,
  IONS,
  SALTS,
  SUPPLEMENTAL_IONS,
  type IonId,
  type SaltInfo,
} from './waterData';

export type SaltUnitsRecipeInput = {
  name: string;
  salts: Array<{
    saltId: string;
    targetPpm: number;
    formIdx: number;
  }>;
};

export type SaltUnitsIonAmount = {
  ionId: IonId;
  mgPerL: number;
};

export type SaltUnitsSaltRow = {
  saltId: string;
  saltName: string;
  formula: string;
  targetPpm: number;
  formIdx: number;
  form: SaltInfo['hydrationForms'][number];
  weighedMgPerL: number;
  ions: SaltUnitsIonAmount[];
  supplementalIons: Array<{ name: string; mgPerL: number }>;
  otherSaltMassMgPerL: number;
  reactionUptakeMgPerL: number;
  crystalWaterMgPerL: number;
  dryExample: boolean;
};

export type SaltUnitsHydrationForm = {
  index: number;
  saltFormIdx: number;
  isDryReference: boolean;
  label: string;
  weighedMgPerL: number;
  multiplier: number;
  ions: SaltUnitsIonAmount[];
  supplementalMassMgPerL: number;
  otherSaltMassMgPerL: number;
  reactionUptakeMgPerL: number;
  crystalWaterMgPerL: number;
};

export type SaltUnitsExplainerModel = {
  isFallback: boolean;
  recipeName: string;
  allRows: SaltUnitsSaltRow[];
  rows: SaltUnitsSaltRow[];
  hiddenSaltCount: number;
  totalIons: Record<IonId, number>;
  gh: number;
  kh: number;
  hydration: {
    saltId: string;
    saltName: string;
    targetPpm: number;
    forms: SaltUnitsHydrationForm[];
  };
};

const FALLBACK_EXAMPLES: Array<{
  saltId: string;
  saltMgL: number;
}> = [
  { saltId: 'mgcl2', saltMgL: 40 },
  { saltId: 'cacl2', saltMgL: 40 },
  { saltId: 'mgso4', saltMgL: 40 },
  { saltId: 'nahco3', saltMgL: 25 },
  { saltId: 'khco3', saltMgL: 25 },
  { saltId: 'nacl', saltMgL: 20 },
];

const DISPLAY_LIMIT = 4;

function roundedFallbackRows(): SaltUnitsSaltRow[] {
  return FALLBACK_EXAMPLES.flatMap(example => {
    const salt = SALTS.find(item => item.id === example.saltId);
    const formIdx = salt?.defaultFormIdx ?? 0;
    const sourceForm = salt?.hydrationForms[formIdx] ?? salt?.hydrationForms[0];
    if (!salt || !sourceForm) return [];
    const exactWeighedMgPerL = computeSaltMg(
      example.saltMgL,
      1,
      sourceForm.molarMass,
      salt.anhydrousMass,
    );
    const weighedMgPerL = Math.round(exactWeighedMgPerL);
    const ionTotals = computeIonTotals({ [salt.id]: example.saltMgL }, {}, 1);
    const ions = salt.ions
      .map(({ ionId }) => ({ ionId, mgPerL: ionTotals[ionId] ?? 0 }))
      .filter(ion => ion.mgPerL > 0);
    const supplementalIons = (salt.supplementalIons ?? []).map(contribution => ({
      name: SUPPLEMENTAL_IONS.find(item => item.id === contribution.ionId)?.name ?? contribution.ionId,
      mgPerL: example.saltMgL * contribution.fraction,
    }));
    const form = {
      ...sourceForm,
      label: formIdx === 0 ? 'Dry form' : sourceForm.label,
    };
    const crystalWaterMgPerL = Math.max(
      0,
      weighedMgPerL
        - ions.reduce((sum, ion) => sum + ion.mgPerL, 0)
        - supplementalIons.reduce((sum, ion) => sum + ion.mgPerL, 0),
    );
    return [{
      saltId: salt.id,
      saltName: salt.name,
      formula: salt.formula,
      targetPpm: example.saltMgL,
      formIdx,
      form,
      weighedMgPerL,
      ions,
      supplementalIons,
      otherSaltMassMgPerL: 0,
      reactionUptakeMgPerL: 0,
      crystalWaterMgPerL,
      dryExample: true,
    }];
  });
}

function recipeRows(recipe: SaltUnitsRecipeInput): SaltUnitsSaltRow[] {
  return recipe.salts.flatMap(entry => {
    const salt = SALTS.find(item => item.id === entry.saltId);
    if (!salt || !Number.isFinite(entry.targetPpm) || entry.targetPpm <= 0) return [];
    const formIdx = Math.max(0, Math.min(
      Number.isInteger(entry.formIdx) ? entry.formIdx : salt.defaultFormIdx ?? 0,
      salt.hydrationForms.length - 1,
    ));
    const form = salt.hydrationForms[formIdx] ?? salt.hydrationForms[0];
    if (!form) return [];
    const ionTotals = computeIonTotals({ [salt.id]: entry.targetPpm }, {}, 1);
    const ions = salt.ions
      .map(({ ionId }) => ({ ionId, mgPerL: ionTotals[ionId] ?? 0 }))
      .filter(ion => ion.mgPerL > 0);
    const supplementalIons = (salt.supplementalIons ?? []).map(contribution => ({
      name: SUPPLEMENTAL_IONS.find(item => item.id === contribution.ionId)?.name ?? contribution.ionId,
      mgPerL: entry.targetPpm * contribution.fraction,
    }));
    const weighedMgPerL = computeSaltMg(entry.targetPpm, 1, form.molarMass, salt.anhydrousMass);
    const representedDryMass = ions.reduce((sum, ion) => sum + ion.mgPerL, 0)
      + supplementalIons.reduce((sum, ion) => sum + ion.mgPerL, 0);
    const otherSaltMassMgPerL = Math.max(0, entry.targetPpm - representedDryMass);
    const reactionUptakeMgPerL = Math.max(0, representedDryMass - entry.targetPpm);
    const crystalWaterMgPerL = entry.targetPpm
      * (form.molarMass - salt.anhydrousMass)
      / salt.anhydrousMass;
    return [{
      saltId: salt.id,
      saltName: salt.name,
      formula: salt.formula,
      targetPpm: entry.targetPpm,
      formIdx,
      form,
      weighedMgPerL,
      ions,
      supplementalIons,
      otherSaltMassMgPerL,
      reactionUptakeMgPerL,
      crystalWaterMgPerL,
      dryExample: false,
    }];
  });
}

function ionsFromRows(rows: SaltUnitsSaltRow[]): Record<IonId, number> {
  const totals = Object.fromEntries(IONS.map(ion => [ion.id, 0])) as Record<IonId, number>;
  for (const row of rows) {
    for (const ion of row.ions) totals[ion.ionId] += ion.mgPerL;
  }
  return totals;
}

function buildHydrationComparison(
  rows: SaltUnitsSaltRow[],
  recipeRowsBySaltId: Map<string, SaltUnitsSaltRow>,
): SaltUnitsExplainerModel['hydration'] {
  const hasHydrationOptions = (row: SaltUnitsSaltRow) => {
    const salt = SALTS.find(item => item.id === row.saltId);
    return (salt?.hydrationForms.length ?? 0) > 1;
  };
  const hydrated = rows.find(row => row.formIdx > 0 && hasHydrationOptions(row))
    ?? rows.find(hasHydrationOptions);
  const comparisonSalt = hydrated
    ? SALTS.find(item => item.id === hydrated.saltId)!
    : SALTS.find(item => item.id === 'mgcl2')!;
  const selectedEntry = recipeRowsBySaltId.get(comparisonSalt.id);
  const targetPpm = hydrated?.targetPpm ?? selectedEntry?.targetPpm ?? 40;
  const roundedExample = rows.find(row => row.saltId === comparisonSalt.id && row.dryExample);
  const selectedFormIdx = roundedExample?.formIdx
    ?? hydrated?.formIdx
    ?? selectedEntry?.formIdx
    ?? comparisonSalt.defaultFormIdx
    ?? 0;
  const hydratedFormIndices = comparisonSalt.hydrationForms
    .map((_, index) => index)
    .filter(index => index > 0);
  const formIndices = [
    selectedFormIdx,
    ...hydratedFormIndices.filter(index => index !== selectedFormIdx),
    ...(selectedFormIdx === 0 ? [] : [0]),
  ];
  const forms = formIndices.map((saltFormIdx, index) => {
    const form = comparisonSalt.hydrationForms[saltFormIdx];
    if (!form) return null;
    const isDryReference = saltFormIdx === 0 && selectedFormIdx !== 0;
    const ionTotals = computeIonTotals({ [comparisonSalt.id]: targetPpm }, {}, 1);
    const ions = roundedExample?.ions ?? comparisonSalt.ions
      .map(({ ionId }) => ({ ionId, mgPerL: ionTotals[ionId] ?? 0 }))
      .filter(ion => ion.mgPerL > 0);
    const supplementalMassMgPerL = (comparisonSalt.supplementalIons ?? [])
      .reduce((sum, ion) => sum + targetPpm * ion.fraction, 0);
    const exactWeighedMgPerL = computeSaltMg(targetPpm, 1, form.molarMass, comparisonSalt.anhydrousMass);
    const weighedMgPerL = roundedExample
      ? (saltFormIdx === roundedExample.formIdx
        ? roundedExample.weighedMgPerL
        : Math.round(exactWeighedMgPerL))
      : exactWeighedMgPerL;
    const representedDryMass = ions.reduce((sum, ion) => sum + ion.mgPerL, 0) + supplementalMassMgPerL;
    const otherSaltMassMgPerL = Math.max(0, targetPpm - representedDryMass);
    const reactionUptakeMgPerL = Math.max(0, representedDryMass - targetPpm);
    const crystalWaterMgPerL = roundedExample
      ? Math.max(0, weighedMgPerL
        - ions.reduce((sum, ion) => sum + ion.mgPerL, 0)
        - supplementalMassMgPerL)
      : targetPpm * (form.molarMass - comparisonSalt.anhydrousMass) / comparisonSalt.anhydrousMass;
    return {
      index,
      saltFormIdx,
      isDryReference,
      label: isDryReference ? 'Dry reference (rarely sold)' : form.label,
      weighedMgPerL,
      multiplier: form.molarMass / comparisonSalt.anhydrousMass,
      ions,
      supplementalMassMgPerL,
      otherSaltMassMgPerL,
      reactionUptakeMgPerL,
      crystalWaterMgPerL,
    };
  }).filter((form): form is NonNullable<typeof form> => form !== null);
  return {
    saltId: comparisonSalt.id,
    saltName: comparisonSalt.name,
    targetPpm,
    forms,
  };
}

export function buildSaltUnitsExplainerModel(
  recipe: SaltUnitsRecipeInput | null,
): SaltUnitsExplainerModel {
  const selectedRows = recipe ? recipeRows(recipe) : [];
  const isFallback = selectedRows.length === 0;
  const allRows = isFallback
    ? roundedFallbackRows()
    : [...selectedRows].sort((a, b) => b.weighedMgPerL - a.weighedMgPerL);
  const visibleRows = isFallback ? allRows : allRows.slice(0, DISPLAY_LIMIT);
  const hiddenSaltCount = Math.max(0, allRows.length - visibleRows.length);
  const totalIons = ionsFromRows(allRows);
  const rowsBySaltId = new Map(selectedRows.map(row => [row.saltId, row]));
  return {
    isFallback,
    recipeName: isFallback ? 'ROUNDED EXAMPLE' : recipe!.name,
    allRows,
    rows: visibleRows,
    hiddenSaltCount,
    totalIons,
    gh: computeGH(totalIons),
    kh: computeKH(totalIons),
    hydration: buildHydrationComparison(isFallback ? allRows : selectedRows, rowsBySaltId),
  };
}
