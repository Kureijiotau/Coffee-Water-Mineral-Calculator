import type { ReactElement } from 'react';
import { IonName } from './WatermancerGuideIonTokens';
import { WatermancerGuideWorkflowMatchingScene } from './WatermancerGuideWorkflowMatchingScene';
import { WatermancerGuideWorkflowRecipeCardScene } from './WatermancerGuideWorkflowRecipeCardScene';
import { WatermancerGuideWorkflowRecipeSetupScenes } from './WatermancerGuideWorkflowRecipeSetupScenes';
import { WatermancerGuideWorkflowWaterScene } from './WatermancerGuideWorkflowWaterScene';

export function WatermancerGuideWorkflow(): ReactElement {
  return (
    <div className="min-w-0 space-y-7" data-testid="watermancer-guide-workflow">
      <p className="rounded-xl border border-cyan-300/15 bg-cyan-400/[0.04] px-4 py-3 text-sm leading-6 text-cyan-100/90">
        These are screenshots of the actual Watermancer interface. Your saved profiles and values may differ.
      </p>
      <GuideRecipeSummary />
      <WatermancerGuideWorkflowRecipeSetupScenes />
      <WatermancerGuideWorkflowWaterScene />
      <WatermancerGuideWorkflowMatchingScene />
      <WatermancerGuideWorkflowRecipeCardScene />
    </div>
  );
}

function GuideRecipeSummary(): ReactElement {
  return (
    <section
      aria-labelledby="watermancer-guide-recipe-title"
      className="rounded-xl border border-cyan-300/20 bg-slate-950/75 p-4 sm:p-5"
      data-testid="watermancer-guide-recipe"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Example batch
          </p>
          <h2
            id="watermancer-guide-recipe-title"
            className="mt-1 text-lg font-semibold text-slate-50 sm:text-xl"
          >
            Guide recipe
          </h2>
        </div>
        <span className="rounded-lg border border-cyan-300/20 bg-cyan-400/[0.08] px-3 py-1.5 text-sm font-semibold text-cyan-100">
          1 L batch
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3.5">
          <p className="text-sm font-semibold text-slate-100">Water amounts</p>
          <dl className="mt-2 space-y-2 text-sm leading-6">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-300">RO / distilled water</dt>
              <dd className="shrink-0 font-semibold text-slate-50">966 mL</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-300">Evian</dt>
              <dd className="shrink-0 font-semibold text-slate-50">34 mL</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3.5">
          <p className="text-sm font-semibold text-slate-100">Mineral salts</p>
          <ul className="mt-2 grid gap-2">
            <li className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-2.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium leading-5 text-slate-100">
                  Magnesium sulfate heptahydrate
                </span>
                <span className="shrink-0 text-sm font-semibold text-cyan-100">14 mg</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                MgSO₄·7H₂O · <IonName id="magnesium">Mg²⁺</IonName> +{' '}
                <IonName id="sulfate">SO₄²⁻</IonName>
              </p>
            </li>
            <li className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-2.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium leading-5 text-slate-100">
                  Magnesium chloride hexahydrate
                </span>
                <span className="shrink-0 text-sm font-semibold text-cyan-100">20 mg</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                MgCl₂·6H₂O · <IonName id="magnesium">Mg²⁺</IonName> + 2{' '}
                <IonName id="chloride">Cl⁻</IonName>
              </p>
            </li>
            <li className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-2.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium leading-5 text-slate-100">
                  Sodium chloride
                </span>
                <span className="shrink-0 text-sm font-semibold text-cyan-100">4 mg</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                NaCl · <IonName id="sodium">Na⁺</IonName> + <IonName id="chloride">Cl⁻</IonName>
              </p>
            </li>
            <li className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-2.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium leading-5 text-slate-100">
                  Potassium chloride
                </span>
                <span className="shrink-0 text-sm font-semibold text-cyan-100">2 mg</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                KCl · <IonName id="potassium">K⁺</IonName> + <IonName id="chloride">Cl⁻</IonName>
              </p>
            </li>
          </ul>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Watermancer calculates the final ion readings from the selected water and these salt doses.
      </p>
    </section>
  );
}
