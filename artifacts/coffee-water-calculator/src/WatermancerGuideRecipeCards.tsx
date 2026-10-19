import { ChevronDown } from 'lucide-react';
import { MilligramTooltipText } from './MilligramTooltip';
import { ION_CHEMISTRY, ION_MAP } from './waterData';
import { CHARGE_BALANCE_TOLERANCE_MEQ_PER_L } from './watermancerChargeBalance';
import {
  WATERMANCER_GUIDE_RECIPES,
  type WatermancerGuideIonId,
  type WatermancerGuideRecipe,
  type WatermancerGuideRecipeId,
  type WatermancerGuideSalt,
  type WatermancerGuideWaterSource,
} from './watermancerGuideRecipes';
import { IonName, MetricChip } from './WatermancerGuideIonTokens';

const PROFILE_ION_ORDER: readonly WatermancerGuideIonId[] = [
  'calcium',
  'magnesium',
  'sodium',
  'potassium',
  'bicarbonate',
  'chloride',
  'sulfate',
];

const SALT_PARTS: Record<
  WatermancerGuideSalt,
  { cation: WatermancerGuideIonId; anion: WatermancerGuideIonId; hydration?: string }
> = {
  'magnesium-sulfate-heptahydrate': {
    cation: 'magnesium',
    anion: 'sulfate',
    hydration: 'heptahydrate',
  },
  'magnesium-chloride-hexahydrate': {
    cation: 'magnesium',
    anion: 'chloride',
    hydration: 'hexahydrate',
  },
  'sodium-chloride': { cation: 'sodium', anion: 'chloride' },
  'potassium-chloride': { cation: 'potassium', anion: 'chloride' },
};

function SaltName({ salt }: { salt: WatermancerGuideSalt }) {
  const parts = SALT_PARTS[salt];
  return (
    <span className="text-sm">
      <IonName id={parts.cation}>{ION_MAP[parts.cation].name}</IonName>{' '}
      <IonName id={parts.anion}>{ION_MAP[parts.anion].name}</IonName>
      {parts.hydration && <span className="text-xs text-slate-400"> · {parts.hydration}</span>}
    </span>
  );
}

function WaterSourceName({ source }: { source: WatermancerGuideWaterSource }) {
  switch (source) {
    case 'ro-distilled':
      return <>RO / distilled water</>;
    case 'magnesium-bicarbonate-base':
      return (
        <>
          <IonName id="magnesium">Magnesium</IonName>{' '}
          <IonName id="bicarbonate">bicarbonate</IonName> base
        </>
      );
    case 'calcium-bicarbonate-base':
      return (
        <>
          <IonName id="calcium">Calcium</IonName>{' '}
          <IonName id="bicarbonate">bicarbonate</IonName> base
        </>
      );
    case 'berain':
      return <>Berain</>;
    case 'san-pellegrino':
      return <>San Pellegrino</>;
  }
}

function RecipeTitle({ id }: { id: WatermancerGuideRecipeId }) {
  switch (id) {
    case 'balanced-daily-driver':
      return <>Balanced daily driver</>;
    case 'all-chloride-zero-sulfate':
      return (
        <>
          All <IonName id="chloride">chloride</IonName> · zero <IonName id="sulfate">sulfate</IonName>
        </>
      );
    case 'zero-calcium-brightness':
      return (
        <>
          Zero <IonName id="calcium">calcium</IonName> · brightness test
        </>
      );
    case 'high-extraction-punch':
      return <>High-extraction punch</>;
    case 'bottled-water-blend':
      return (
        <>
          Bottled-water blend · higher <IonName id="calcium">calcium</IonName>
        </>
      );
  }
}

function profileChargeDifference(profile: WatermancerGuideRecipe['finalProfile']): number {
  return PROFILE_ION_ORDER.reduce((difference, id) => {
    const { charge, molarMass } = ION_CHEMISTRY[id];
    return difference + (profile[id] ?? 0) * charge / molarMass;
  }, 0);
}

function IonProfileReading({ id, value }: { id: WatermancerGuideIonId; value: number }) {
  const color = ION_MAP[id].color;
  return (
    <div
      className="flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2 py-1.5"
      style={{ borderColor: color.border, backgroundColor: color.soft }}
    >
      <span className="truncate text-sm font-semibold" style={{ color: color.foreground }}>
        {ION_MAP[id].formula}
      </span>
      <span className="shrink-0 text-sm font-semibold" style={{ color: color.foreground }}>
        {value.toFixed(1)}{' '}
        <span className="text-xs font-medium opacity-75">ppm</span>
      </span>
    </div>
  );
}

function RecipeChargeNote({ recipe }: { recipe: WatermancerGuideRecipe }) {
  const difference = profileChargeDifference(recipe.finalProfile);
  if (Math.abs(difference) <= CHARGE_BALANCE_TOLERANCE_MEQ_PER_L) return null;

  const signedDifference = `${difference >= 0 ? '+' : '−'}${Math.abs(difference).toFixed(3)}`;
  return (
    <div
      role="note"
      data-testid={`guide-recipe-balance-note-${recipe.id}`}
      className="mt-3 space-y-1 rounded-lg border border-amber-300/30 bg-amber-300/5 px-3 py-2 text-xs leading-relaxed text-amber-100"
    >
      {recipe.id === 'bottled-water-blend' && (
        <p>
          This blend’s{' '}
          <IonName id="sulfate">
            {ION_MAP.sulfate.formula} {recipe.finalProfile.sulfate.toFixed(1)} ppm
          </IonName>{' '}
          is above the usual starting range (
          <IonName id="sulfate">{ION_MAP.sulfate.formula} 0–7 ppm</IonName>).
        </p>
      )}
      <p>
        The listed readings leave a charge mismatch of {signedDifference} meq/L, above the app’s
        ±{CHARGE_BALANCE_TOLERANCE_MEQ_PER_L.toFixed(4)} meq/L tolerance. Treat them as approximate
        label values, not a charge-balanced target set.
      </p>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: WatermancerGuideRecipe }) {
  return (
    <details
      className="group min-w-0 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/25"
      data-testid={`guide-recipe-card-${recipe.id}`}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/70 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-100">
            <RecipeTitle id={recipe.id} />
          </span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            <MetricChip kind="GH" value={String(recipe.gh)} />
            <MetricChip kind="KH" value={String(recipe.kh)} />
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="grid gap-4 border-t border-slate-700/50 px-3 py-3 sm:grid-cols-2">
        <section className="min-w-0">
          <h5 className="text-xs font-bold uppercase tracking-wide text-slate-400">Water mix</h5>
          <ul className="mt-2 space-y-2">
            {recipe.water.map((portion, index) => (
              <li
                key={`${portion.source}-${index}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0"><WaterSourceName source={portion.source} /></span>
                <span className="shrink-0 font-medium text-slate-200">{portion.milliliters} mL</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0">
          <h5 className="text-xs font-bold uppercase tracking-wide text-slate-400">Salt dose</h5>
          {recipe.saltDoses.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {recipe.saltDoses.map(dose => (
                <li
                  key={dose.salt}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="min-w-0"><SaltName salt={dose.salt} /></span>
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-200">
                    <MilligramTooltipText text={`${dose.milligrams} mg`} />
                    <span className="ml-1.5 text-xs font-medium text-slate-400">
                      · {dose.milligrams} drops
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-300">No dry salt dose; bottled water only.</p>
          )}
        </section>

        <section className="min-w-0 sm:col-span-2">
          <h5 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Approximate final ion profile
          </h5>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROFILE_ION_ORDER.map(id => (
              <IonProfileReading key={id} id={id} value={recipe.finalProfile[id]} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <MetricChip kind="GH" value={String(recipe.gh)} />
            <MetricChip kind="KH" value={String(recipe.kh)} />
          </div>
          <RecipeChargeNote recipe={recipe} />
        </section>
      </div>
    </details>
  );
}

export function WatermancerGuideRecipeCards() {
  return (
    <div className="mt-4 space-y-3" data-testid="guide-recipe-cards">
      <p className="text-sm leading-relaxed text-slate-300">
        Five 1 L examples from my tastings. Pick one and compare it with your coffee; results can vary.
      </p>
      <p className="text-xs leading-relaxed text-slate-400">
        At exactly <MilligramTooltipText text="1 mg/drop" />, each mg of salt is one drop; otherwise,
        divide the salt dose by that stock’s measured mg/drop. The listed water portions total 1,000
        mL before drops; for an exact 1 L final batch, subtract the stock-liquid volume from RO.
      </p>
      <div className="space-y-2.5">
        {WATERMANCER_GUIDE_RECIPES.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}
