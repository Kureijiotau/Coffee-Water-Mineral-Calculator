import type { ReactNode } from 'react';
import { IonChip, IonName, MetricChip, MetricName } from './WatermancerGuideIonTokens';

function TargetCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-700/60 bg-slate-950/25 p-3">
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      <div className="mt-2 flex flex-wrap items-center gap-2">{children}</div>
    </section>
  );
}

export function WatermancerGuideStartingFramework() {
  return (
    <div className="mt-4 space-y-3" data-testid="guide-starting-framework">
      <div className="grid gap-3 sm:grid-cols-2">
        <TargetCard title="Buffer">
          <IonChip id="bicarbonate" value="11–12.5" />
          <MetricChip kind="KH" value="9.0–10.3" />
        </TargetCard>

        <TargetCard title="Hardness">
          <MetricChip kind="GH" value="22+" />
          <IonChip id="calcium" value="0–2.1" />
          <IonChip id="magnesium" value="4.5+" />
        </TargetCard>

        <TargetCard title="Chloride + sulfate">
          <p className="w-full text-sm leading-relaxed text-slate-300">
            Keep <IonName id="chloride">chloride</IonName> + <IonName id="sulfate">sulfate</IonName>{' '}
            around <strong className="text-slate-100">14–15 ppm combined</strong>; stay below 20 ppm.
          </p>
          <IonChip id="sulfate" value="0–7" />
          <span className="text-xs text-slate-400">usual starting range</span>
        </TargetCard>

        <TargetCard title="Sodium + potassium">
          <IonChip id="sodium" value="1.6–3.4" />
          <IonChip id="potassium" value="0–2" />
        </TargetCard>
      </div>

      <aside className="rounded-xl border border-slate-700/60 bg-slate-900/35 px-3 py-3">
        <p className="text-sm leading-relaxed text-slate-300">
          In my tastings, more <IonName id="chloride">chloride</IonName> felt fuller and left a sticky
          sort of linger on the finish. <IonName id="sulfate">Sulfate</IonName> felt faster, cleaner,
          and crisper, but it hit the dryness wall very quickly. Your palate may respond differently.
          Taste, contrast, and take notes.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          In my softer tests, I lowered <MetricName kind="GH" /> and the{' '}
          <IonName id="chloride">chloride</IonName>/<IonName id="sulfate">sulfate</IonName> targets,
          while keeping <MetricName kind="KH" /> near 10. Strength scales all selected targets
          together; adjust them manually if you want <MetricName kind="KH" /> to stay near 10. Change
          one target at a time.
        </p>
      </aside>
    </div>
  );
}
