import type { ReactElement } from 'react';
import { WatermancerGuideScreenshotFrame } from './WatermancerGuideScreenshotFrame';
import { WorkflowScene } from './WatermancerGuideWorkflowPrimitives';

export function WatermancerGuideWorkflowMatchingScene(): ReactElement {
  return (
    <WorkflowScene
      number={4}
      title="Choose salts and match"
      summary="Enable the salts you want Watermancer to use, choose hydration forms, and run a match against the selected ion targets."
    >
      <WatermancerGuideScreenshotFrame
        title="Choose and enable salts"
        description="Tap Not used to enable a salt; the button changes to Use. Choose its hydration form, then use or adjust the suggested dose before matching."
        testId="watermancer-guide-screen-salt-choices"
        screenshotFileName="enabled-salts.jpg"
        imageAlt="Watermancer salt table showing enabled salts, hydration forms, suggested doses, and Use controls."
      />
      <WatermancerGuideScreenshotFrame
        title="Find the best match"
        description="Open Guide the match to set each ion's source to Water only, Water then salt, Salt only, or Optimized. Then choose Find the best match and review the result status and final mixture. This example returns a best available partial match."
        testId="watermancer-guide-screen-matching"
        screenshotFileName="best-match.jpg"
        imageAlt="Watermancer Precision Auto-match panel with per-ion source controls, Find the best match, and the best-available partial-match status."
      />
    </WorkflowScene>
  );
}
