import type { ReactElement } from 'react';
import { WatermancerGuideScreenshotFrame } from './WatermancerGuideScreenshotFrame';
import { WorkflowScene } from './WatermancerGuideWorkflowPrimitives';

export function WatermancerGuideWorkflowRecipeCardScene(): ReactElement {
  return (
    <WorkflowScene
      number={5}
      title="Review and save"
      summary="Check the finished batch, its water sources and salt doses, then save a clean image of the recipe card."
    >
      <WatermancerGuideScreenshotFrame
          title="View and save the Guide recipe card"
          description="Review the Guide recipe's source-water amounts, physical salt doses, and calculated final ion analysis. Choose Save Recipe Image to download the shareable, importable .WATER.png card."
        testId="watermancer-guide-screen-recipe-card"
        screenshotFileName="recipe-card.jpg"
        imageAlt="Watermancer recipe steps and mineral-analysis dialog with source-water amounts, physical salt doses, final ions, and Save Recipe Image."
      />
    </WorkflowScene>
  );
}
