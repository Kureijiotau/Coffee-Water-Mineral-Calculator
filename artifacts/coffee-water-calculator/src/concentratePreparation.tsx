export const WATER_MASS_NOTE = 'For plain water at room temperature, 1 mL ≈ 1 g, so you can weigh your water. This approximation does not apply to finished concentrate.';
type PreparationInput = { totalStockMassG: number; waterMassG: number; saltLabel: string };
const grams = (value: number) => Number(value.toFixed(3)).toString();
export function buildConcentratePreparationSteps({ totalStockMassG, waterMassG, saltLabel }: PreparationInput): string[] {
  if (![totalStockMassG, waterMassG].every(v => Number.isFinite(v) && v > 0) || waterMassG > totalStockMassG) return [];
  return [
    'Place the bottle on the scale and tare it once.',
    `Add ${saltLabel} to the bottle.`,
    'If you weigh the salt on parchment, use a splash of your measured water to rinse any clinging crystals into the bottle.',
    `Add water until the total contents weigh ${grams(totalStockMassG)} g (salt + water; bottle excluded).`,
    'Leave enough headspace for shaking.',
    'Cap the bottle and shake/mix until the salt dissolves.',
  ];
}
export function ConcentratePreparationSteps(input: PreparationInput) {
  const steps = buildConcentratePreparationSteps(input);
  if (!steps.length) return <p role="alert">Enter a valid stock weight and water amount before preparing this stock.</p>;
  return <div className="space-y-3 text-sm text-slate-300" data-testid="mass-stock-preparation">
    <ol className="list-decimal space-y-2 pl-5">{steps.map(step => <li key={step}>{step}</li>)}</ol>
    <p className="text-xs text-slate-400">{WATER_MASS_NOTE}</p>
  </div>;
}
