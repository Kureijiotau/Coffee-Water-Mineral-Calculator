import type { ReactElement } from 'react';
import { WatermancerGuideScreenshotFrame } from './WatermancerGuideScreenshotFrame';
import { WorkflowScene } from './WatermancerGuideWorkflowPrimitives';

export function WatermancerGuideWorkflowWaterScene(): ReactElement {
  return (
    <WorkflowScene
      number={3}
      title="Add waters"
      summary="Enter a new mineral-water label, add a public Community profile to your plan, or share one of your own saved waters."
    >
      <WatermancerGuideScreenshotFrame
        title="Add a new water source"
          description="Enter the source name, volume, and mineral readings from its label, then choose Save to add it to My waters."
        testId="watermancer-guide-screen-add-water"
        screenshotFileName="add-water-source.jpg"
        imageAlt="Watermancer Add water source form for entering a name, volume, and mineral label readings."
      />
      <WatermancerGuideScreenshotFrame
        title="Find and use a Community water"
        description="Browse waters opens the Community waters catalog. Search by water or country, sort by ion, then choose Add to my waters. Already-added profiles show Added."
        testId="watermancer-guide-screen-community-water"
        screenshotFileName="community-waters.jpg"
        imageAlt="Community waters catalog in Watermancer with search, ion sorting, mineral readings, and Add to my waters buttons."
      />
      <WatermancerGuideScreenshotFrame
        title="Share with the community"
          description="Choose Share in the water source editor. A browser confirmation appears before publishing; confirm only when you intend to share it publicly."
        testId="watermancer-guide-screen-share-water"
        screenshotFileName="share-water.jpg"
          imageAlt="Watermancer mineral-water editor showing the actual Share button beside Save."
      />
    </WorkflowScene>
  );
}
