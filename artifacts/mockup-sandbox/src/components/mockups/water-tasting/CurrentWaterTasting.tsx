import './_group.css';
import { WaterTastingTab } from './WaterTastingTab';
import type { WaterTastingProfileOption } from './waterTasting';

const profileOptions: WaterTastingProfileOption[] = [{
  sourceId: 'safe-profile',
  name: 'Aiki safe profile',
  group: 'Watermancer',
  readings: { ions: {} },
}];

export function CurrentWaterTasting() {
  return (
    <div className="app-shell min-h-screen px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <WaterTastingTab profileOptions={profileOptions} renderProfileAnalysis={() => null} onOpenWatermancer={() => {}} />
      </div>
    </div>
  );
}
