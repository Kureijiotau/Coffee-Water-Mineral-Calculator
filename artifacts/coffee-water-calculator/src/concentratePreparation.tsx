export const WATER_MASS_NOTE = 'For plain water at room temperature, 1 mL ≈ 1 g, so you can weigh your water. This approximation does not apply to finished concentrate.';
type PreparationInput = { totalStockMassG: number; waterMassG: number; saltLabel: string };
const grams = (value: number) => Number(value.toFixed(3)).toString();
export function buildConcentratePreparationSteps({ totalStockMassG, waterMassG, saltLabel }: PreparationInput): string[] {
  if (![totalStockMassG, waterMassG].every(v => Number.isFinite(v) && v > 0) || waterMassG > totalStockMassG) return [];
  return [
    'Tare the empty bottle or mixing vessel once.',
    `Add ${grams(waterMassG * 0.2)}–${grams(waterMassG * 0.3)} g water (20–30% of the calculated ${grams(waterMassG)} g water).`,
    `Transfer ${saltLabel}. Use a splash of the remaining measured water to rinse clinging crystals from the parchment into the bottle.`,
    'Shake/mix to dissolve. If needed, add more of the remaining calculated water while mixing; do not add uncounted extra water. Follow salt separation and mixing-order warnings.',
    `Add the remaining water until the total contents weigh ${grams(totalStockMassG)} g, excluding the bottle. Do not tare again between the first water and this final reading.`,
    'Mix thoroughly and label with the salt/form, mass-based strength, and total stock weight. Leave enough bottle headroom for shaking.',
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
