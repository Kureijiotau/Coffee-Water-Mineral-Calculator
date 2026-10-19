import dropperLineupPhoto from '@assets/watermancer-guide-step5-dropper-lineup.jpg';
import { MilligramTooltipText } from './MilligramTooltip';

type WatermancerGuideStep5IntroProps = {
  summary: string;
  onOpenWatermancer: () => void;
};

export default function WatermancerGuideStep5Intro({
  summary,
  onOpenWatermancer,
}: WatermancerGuideStep5IntroProps) {
  const linkText = 'Watermancer';
  const linkStart = summary.indexOf(linkText);

  return (
    <>
      <p className="mt-1 text-sm font-medium text-cyan-100/80">
        {linkStart < 0
          ? <MilligramTooltipText text={summary} />
          : <MilligramTooltipText text={summary.slice(0, linkStart)} />}
        {linkStart >= 0 && (
          <button
            type="button"
            onClick={onOpenWatermancer}
            aria-label="Open the Watermancer calculator"
            data-testid="button-open-watermancer-step5"
            className="rounded-sm font-semibold text-cyan-200 underline decoration-cyan-300/50 underline-offset-4 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
          >
            {linkText}
          </button>
        )}
        {linkStart >= 0 && (
          <MilligramTooltipText text={summary.slice(linkStart + linkText.length)} />
        )}
      </p>
      <figure className="mt-4 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/30">
        <img
          src={dropperLineupPhoto}
          alt="A row of labeled mineral-salt dropper bottles."
          width={1800}
          height={719}
          loading="lazy"
          decoding="async"
          data-testid="guide-step5-dropper-lineup"
          className="aspect-[2.5/1] w-full object-cover"
        />
      </figure>
    </>
  );
}
