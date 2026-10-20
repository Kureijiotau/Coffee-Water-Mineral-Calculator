import type { ReactElement } from 'react';
import { WatermancerGuideWorkflowMatchingScene } from './WatermancerGuideWorkflowMatchingScene';
import { WatermancerGuideWorkflowRecipeCardScene } from './WatermancerGuideWorkflowRecipeCardScene';
import { WatermancerGuideWorkflowRecipeSetupScenes } from './WatermancerGuideWorkflowRecipeSetupScenes';
import { WatermancerGuideWorkflowWaterScene } from './WatermancerGuideWorkflowWaterScene';

export function WatermancerGuideWorkflow(): ReactElement {
  return (
    <div className="min-w-0 space-y-7" data-testid="watermancer-guide-workflow">
      <p className="rounded-xl border border-cyan-300/15 bg-cyan-400/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-cyan-100/75">
        These are screenshots of the actual Watermancer interface. Your saved profiles and values may differ.
      </p>
      <WatermancerGuideWorkflowRecipeSetupScenes />
      <WatermancerGuideWorkflowWaterScene />
      <WatermancerGuideWorkflowMatchingScene />
      <WatermancerGuideWorkflowRecipeCardScene />
    </div>
  );
}
