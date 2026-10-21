import type { ReactElement } from 'react';
import { WatermancerGuideScreenshotFrame } from './WatermancerGuideScreenshotFrame';
import { WorkflowScene } from './WatermancerGuideWorkflowPrimitives';

export function WatermancerGuideWorkflowRecipeSetupScenes(): ReactElement {
  return (
    <>
      <WorkflowScene
        number={1}
        title="Choose and manage a recipe"
        summary="Pick a saved profile or recipe, then create, edit, download, import, or reset your Watermancer workspace."
      >
        <WatermancerGuideScreenshotFrame
          title="Select a recipe"
          description="In Set your target water, select the saved Guide recipe profile to load its ion targets, or choose another saved profile or a built-in recipe."
          testId="watermancer-guide-screen-recipe-picker"
          screenshotFileName="recipe-picker.jpg"
          imageAlt="Watermancer target profile picker open above the ion cards, showing saved recipes and built-in water profiles."
        />
        <WatermancerGuideScreenshotFrame
          title="Create, edit, download, import, and reset"
          description="Use New to start a blank profile, Edit to change targets, and Download or Import to move a profile between files. Reset clears the active waters, salt choices, target inputs, and match results without deleting saved waters, profiles, or preferences."
          testId="watermancer-guide-screen-recipe-actions"
          screenshotFileName="recipe-actions.jpg"
          imageAlt="Watermancer target profile panel with New, Edit, Download, Import, and Reset controls."
        />
      </WorkflowScene>

      <WorkflowScene
        number={2}
        title="Set the plan"
        summary="Choose the ion profile you want to reach and set the final batch volume for the water you are preparing."
      >
        <WatermancerGuideScreenshotFrame
          title="Set ion targets"
          description="Edit opens the fields for all eight ion targets. Enter values in ppm, then choose Save as new or Cancel."
          testId="watermancer-guide-screen-ion-targets"
          screenshotFileName="ion-targets.jpg"
          imageAlt="Watermancer edit mode with eight ion target fields and Save as new and Cancel buttons."
        />
        <WatermancerGuideScreenshotFrame
          title="Set final batch volume"
          description="Choose the finished batch size in liters or US gallons. Watermancer updates source-water amounts and salt doses for that volume."
          testId="watermancer-guide-screen-batch-volume"
          screenshotFileName="batch-volume.jpg"
          imageAlt="Watermancer final batch volume control with a batch amount and liters or US gallons unit selection."
        />
      </WorkflowScene>
    </>
  );
}
