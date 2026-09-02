alueStyles.length];
                      return (
                          <div key={`step-salt-${salt.id}`} className={`rounded-lg border px-2 py-1.5 ${saltStyle}`} style={saltVisualStyle(salt)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div
                                  className="text-xs font-semibold text-[color:var(--salt-primary)] sm:text-sm"
                                  style={{ '--salt-primary': getSaltColorTokens(salt).primary } as CSSProperties}
                                >
                                {index + 1}. {nerdLevel === 'brewer' ? simpleSaltNames[salt.id] ?? salt.name : salt.name}
                              </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-300/65">
                                 {nerdLevel === 'brewer' ? (
                                   <><span>{saltGroup(salt)} ·</span><SaltIonBadges salt={salt} /></>
                                 ) : (
                                   <><span>{form.label} ·</span><SaltIonBadges salt={salt} /></>
                                 )}
                              </div>
                               {allInOneConcentrate && isAlkalinitySalt && (
                                 <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-rose-100">
                                   Last — add only after the other salts are clear
                                 </div>
                               )}
                            </div>
                              <div className="shrink-0 text-right">
                                <span className={`inline-block rounded-md border px-2 py-1 font-mono text-base font-bold leading-none tabular-nums sm:text-lg ${saltValueStyle}`}>
                                  {amountLabel(salt, stepSaltTargets)}
                                </span>
                                {saltContributionPpm > 0 && (
                                  <div className="mt-1 text-[10px] font-medium tabular-nums text-cyan-200/80">
                                    {saltContributionPpm.toFixed(1)} ppm total
                                  </div>
                                )}
                              </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </li>
            )}
            {useMixingVessel && (
            <li className="flex gap-3 rounded-xl border border-sky-400/15 bg-slate-900/35 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-xs font-bold text-sky-100 ring-1 ring-sky-300/20">3</span>
              <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200">Combine the salt concentrate</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    Reserve {formatWaterVolume(mixingVesselMl)} of the prepared water for the salt concentrate. Dissolve the salts completely, then add the concentrate to the remaining water, rinse the vessel into the batch, and stir thoroughly.
                  </div>
                </div>
              </li>
            )}
            <li className="flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/20">{useMixingVessel ? 4 : orderedRecipeSalts.length > 0 ? 3 : 2}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200">Verify and brew</div>
                <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  Check for approximately <span className="inline-flex rounded-md border border-emerald-300/45 bg-emerald-400/20 px-1.5 py-0.5 font-mono font-bold tabular-nums text-emerald-100">{tdsTarget.toFixed(0)} ppm TDS</span>. The water should be clear and all minerals fully dissolved. Proceed with your brew method and adjust extraction to taste.
                </div>
              </div>
            </li>
          </ol>
           {saveImageError && (
             <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[10px] leading-relaxed text-amber-100" role="status">
                Couldn’t create the share-card image in this browser. Try again, or use the recipe steps on screen.
             </p>
           )}
           <p className="border-t border-slate-700/50 pt-3 text-[10px] leading-relaxed text-slate-500">
            Small amounts are difficult to weigh accurately. For better consistency, multiply the recipe for a larger batch or use a concentrate.
          </p>
           </div>
           <div className="min-w-0">
             <MineralAnalysisLabel
               recipeName={recipeName}
               finalIons={finalProfileIons}
               tds={finalProfileTds}
               gh={finalProfileGh}
               kh={finalProfileKh}
             />
             <div className="mt-3">
               <button
                 type="button"
                 onClick={handleSaveImage}
                 disabled={isSavingImage}
                 className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-200/70 bg-sky-400 px-4 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:cursor-wait disabled:opacity-60"
                  title="Download a clean share-card image of this recipe"
               >
                 <Download className="h-5 w-5" aria-hidden="true" />
                  <span>{isSavingImage ? 'Saving share card…' : 'Save Recipe Image'}</span>
               </button>
               <p className="mt-1.5 text-center text-[10px] text-slate-500">
                  Download a clean PNG share card with the recipe steps and mineral analysis.
               </p>
                <div
                  className="mt-3 flex items-start gap-2.5 rounded-xl border border-cyan-300/25 bg-cyan-400/[0.08] px-3 py-2.5 text-left"
                  role="note"
                >
                  <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100">
                      Shareable + importable
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-cyan-100/75">
                      Send this recipe card to someone else. They can import the <span className="font-mono text-cyan-100">.WATER.png</span> image to load the recipe.
                    </p>
                  </div>
                </div>
             </div>
           {concentrateOn && concentrateDoseMlPerLiter > 0 && concentrateLiters > 0 && (
             <aside
               className="relative mt-3 overflow-hidden rounded-[1.35rem] border border-[#7cc3c5] bg-[#e9f3ee] text-[#173f49] shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)]"
               aria-label="Concentrate dosing reference"
             >
               <div
                 className="absolute inset-0 opacity-30"
                 style={{
                   backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 7px, rgba(13,97,112,0.12) 8px), repeating-linear-gradient(90deg, transparent 0, transparent 7px, rgba(13,97,112,0.08) 8px)',
                 }}
               />
               <div className="relative p-4 sm:p-5">
                 <div className="flex items-center justify-between gap-3 border-b-2 border-[#0d6170] pb-3">
                   <div>
                     <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#47737a]">Concentrate guide</div>
                     <h2 className="font-['Georgia'] text-lg font-bold tracking-tight text-[#173f49]">Dosing reference</h2>
                   </div>
                   <div className="text-right">
                     <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#0d6170]">Stock</div>
                     <div className="mt-0.5 text-[9px] text-[#47737a]">{formatWaterVolume(concentrateLiters * 1000)}</div>
                   </div>
                 </div>
                 <div className="mt-3 grid grid-cols-2 gap-2">
                 {[
                   {
                     label: '1 L',
                     milliliters: concentrateDoseMlPerLiter,
                     drops: concentrateDropsPerLiter,
                   },
                   {
                     label: '1 US gal',
                     milliliters: concentrateDoseMlPerGallon,
                     drops: concentrateDropsPerGallon,
                   },
                  ].map(dose => (
                    <div key={dose.label} className="rounded-lg border border-[#0d6170]/20 bg-white/40 px-2.5 py-2.5">
                     <div className="font-bold uppercase tracking-[0.16em] text-[#47737a] text-[18px]">{dose.label}</div>
                     <div className="mt-1.5 font-mono text-base font-bold tabular-nums text-[#0d6170]">{dose.milliliters.toFixed(1)} mL</div>
                     <div className="mt-0.5 flex items-center gap-1 text-[#47737a] text-[16px]">
                       <Droplet className="h-3.5 w-3.5 shrink-0 text-[#0d6170]" aria-hidden="true" />
                       <span>≈ {dose.drops.toLocaleString()} drops</span>
                     </div>
                      </div>
                  ))}
                 </div>
                 <div className="mt-3 border-t border-[#0d6170]/35 pt-3 text-[9px] leading-relaxed text-[#47737a]">
                   Drops use your calibrated setting of <span className="font-mono font-bold text-[#0d6170]">{dropsPerMl.toFixed(1)}</span> drops per mL.
                 </div>
               </div>
             </aside>
           )}
           </div>
           </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrewStationMode({
  saltTargets,
  recipeRows,
  liters,
  concentrateOn,
  concentrateLiters,
  concentrateStrength,
  onClose,
}: {
  saltTargets: Record<string, number>;
  recipeRows: SaltRow[];
  liters: number;
  concentrateOn: boolean;
  concentrateLiters: number;
  concentrateStrength: number;
  onClose: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [scaleReading, setScaleReading] = useState('');
  const [wakeLockActive, setWakeLockActive] = useState(false);

  useEffect(() => {
    type ScreenWakeLock = {
      release: () => Promise<void>;
      addEventListener?: (type: 'release', listener: () => void) => void;
    };
    let wakeLock: ScreenWakeLock | null = null;
    let cancelled = false;
    const requestWakeLock = async () => {
      const wakeLockApi = (navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<ScreenWakeLock> };
      }).wakeLock;
      if (!wakeLockApi) return;
      try {
        wakeLock = await wakeLockApi.request('screen');
        if (!cancelled) setWakeLockActive(true);
        wakeLock.addEventListener?.('release', () => {
          if (!cancelled) setWakeLockActive(false);
        });
      } catch {
        setWakeLockActive(false);
      }
    };
    void requestWakeLock();
    return () => {
      cancelled = true;
      if (wakeLock) void wakeLock.release();
    };
  }, []);

  const steps = [
    { id: 'mgso4', label: 'Epsom Salt' },
    { id: 'nahco3', label: 'Baking Soda' },
    { id: 'nacl', label: 'Table Salt' },
    ...(saltTargets.kcl > 0.05 ? [{ id: 'kcl', label: 'Potassium Chloride' }] : []),
    ...(saltTargets.cacl2 > 0.05 ? [{ id: 'cacl2', label: 'Calcium Chloride' }] : []),
  ].map(step => {
    const salt = SALTS.find(item => item.id === step.id);
    const target = saltTargets[step.id] ?? 0;
    const volume = concentrateOn && concentrateLiters > 0 ? concentrateLiters : liters;
    const saltIndex = salt ? SALTS.findIndex(item => item.id === salt.id) : -1;
    const formIndex = salt && saltIndex >= 0
      ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
      : salt?.defaultFormIdx ?? 0;
    const form = salt
      ? salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0]
      : undefined;
    const massMg = salt && target > 0
      ? computeSaltMg(target, volume || 1, form!.molarMass, salt.anhydrousMass)
        * (concentrateOn ? concentrateStrength : 1)
      : 0;
    return { ...step, grams: massMg / 1000 };
  }).filter(step => step.grams > 0);

  const safeIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const currentStep = steps[safeIndex];
  const currentSalt = currentStep ? SALTS.find(salt => salt.id === currentStep.id) : undefined;
  const rawReading = parseFloat(scaleReading);
  // The field represents the net running weight shown by the scale. Tare is a
  // physical scale action, so it must not also be subtracted from this value.
  const actualTotal = Number.isFinite(rawReading) ? Math.max(0, rawReading) : 0;
  // Use the rounded values shown in the step cards so the running target agrees
  // with the numbers the brewer can actually read and dose.
  const roundedGrams = (value: number) => Math.round(value * 1000) / 1000;
  const currentTarget = currentStep ? roundedGrams(currentStep.grams) : 0;
  const cumulativeTarget = steps.slice(0, safeIndex + 1).reduce((sum, step) => sum + roundedGrams(step.grams), 0);
  const targetDifference = actualTotal - cumulativeTarget;
  const tolerance = Math.max(0.005, currentTarget * 0.02);
  const isOnTarget = Boolean(currentStep) && Math.abs(targetDifference) <= tolerance;
  const isFinished = steps.length > 0 && safeIndex === steps.length - 1 && isOnTarget;
  const formatted = (value: number) => value.toFixed(3);
  const targetLow = Math.max(0, currentTarget - tolerance);
  const targetHigh = currentTarget + tolerance;
  const gaugePosition = Math.max(0, Math.min(100, 50 + (targetDifference / Math.max(currentTarget * 0.1, 0.01)) * 50));
  const gaugeTone = isOnTarget
    ? 'bg-emerald-400'
    : Math.abs(targetDifference) <= Math.max(currentTarget * 0.1, 0.01)
      ? 'bg-amber-300'
      : 'bg-rose-400';

  const tare = () => {
    setScaleReading('0');
  };

  if (steps.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black p-6 text-white">
        <div className="text-center">
          <p className="text-2xl font-bold">No minerals to weigh</p>
          <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-white px-6 py-3 font-bold text-black">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-4 sm:px-8 sm:py-5">
        <header className="flex min-h-8 items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="text-sm font-black uppercase tracking-wider text-zinc-300 sm:text-lg">
            Step {safeIndex + 1} of {steps.length}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 transition hover:bg-zinc-900 hover:text-zinc-200" aria-label="Close brew station">
            ← Exit
          </button>
        </header>

        <main className="flex flex-1 flex-col pt-1 pb-10 sm:pt-0 sm:pb-12">
          <div className="text-center">
            <div className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Current ingredient</div>
             <h1
               className="mt-3 text-5xl font-black tracking-tight text-[color:var(--salt-primary)] sm:mt-4 sm:text-8xl"
               style={currentSalt ? { '--salt-primary': getSaltColorTokens(currentSalt).primary } as CSSProperties : undefined}
             >
               {currentStep.label}
             </h1>
             {currentSalt && (
               <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-400">
                 <span className="font-semibold text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(currentSalt).primary } as CSSProperties}>{currentSalt.formula}</span>
                 <span aria-hidden="true">·</span>
                 <SaltIonBadges salt={currentSalt} className="text-sm" />
               </div>
             )}
            <div className="mt-9 text-base font-bold uppercase tracking-[0.22em] text-zinc-500 sm:mt-11 sm:text-xl">Add this much</div>
            <div className="mt-1 font-mono text-7xl font-black tracking-tight text-emerald-300 sm:text-9xl">{formatted(currentStep.grams)}<span className="ml-2 text-3xl sm:text-5xl">g</span></div>
            <div className="mt-3 text-sm font-bold text-zinc-500">
              Acceptable running total: {formatted(cumulativeTarget - tolerance)}–{formatted(cumulativeTarget + tolerance)} g
            </div>
          </div>

          <div className="mx-auto mt-12 w-full max-w-4xl rounded-[2rem] border-2 border-zinc-700 bg-zinc-950 p-5 sm:mt-16 sm:p-10">
            <label className="block text-center text-base font-bold uppercase tracking-wider text-zinc-400 sm:text-xl" htmlFor="brew-station-scale">
              Scale reading · running total
            </label>
            <div className="mt-5 flex items-center gap-3 sm:mt-6 sm:gap-5">
              <input
                id="brew-station-scale"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.001"
                value={scaleReading}
                onChange={event => setScaleReading(event.target.value)}
                placeholder="0.000"
                className="min-w-0 flex-1 rounded-3xl border-2 border-zinc-600 bg-black px-4 py-5 text-center font-mono text-5xl font-black text-white outline-none focus:border-emerald-400 sm:px-6 sm:py-7 sm:text-7xl"
                autoFocus
              />
              <span className="text-4xl font-black text-zinc-400 sm:text-6xl">g</span>
            </div>
            <div className="mt-5">
              <div className="relative h-4 rounded-full bg-zinc-800">
                <div className="absolute inset-y-0 left-1/2 w-1/5 -translate-x-1/2 rounded-full bg-emerald-400/35" aria-hidden="true" />
                <div
                  className={`absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-black shadow-lg ${gaugeTone}`}
                  style={{ left: `${gaugePosition}%` }}
                  aria-hidden="true"
                />
                <div className="absolute inset-x-0 top-7 flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                  <span>-10%</span><span>Perfect</span><span>+10%</span>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-center sm:mt-6 sm:gap-5">
              <div className="rounded-3xl bg-zinc-900 p-4 sm:p-6">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 sm:text-base">Actual total</div>
                <div className="mt-2 font-mono text-2xl font-bold text-white sm:text-4xl">{formatted(actualTotal)} g</div>
              </div>
              <div className="rounded-3xl bg-zinc-900 p-4 sm:p-6">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 sm:text-base">Target after this step</div>
                <div className="mt-2 font-mono text-2xl font-bold text-white sm:text-4xl">{formatted(cumulativeTarget)} g</div>
              </div>
            </div>
            <div className={`mt-3 rounded-3xl p-4 text-center sm:p-5 ${isOnTarget ? 'bg-emerald-500/20' : 'bg-zinc-900'}`}>
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 sm:text-base">Difference from target</div>
              <div className={`mt-2 font-mono text-2xl font-bold ${isOnTarget ? 'text-emerald-300' : targetDifference > 0 ? 'text-rose-300' : 'text-amber-300'} sm:text-4xl`}>
                {targetDifference >= 0 ? '+' : ''}{formatted(targetDifference)} g
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {isOnTarget ? 'on cumulative target' : targetDifference < 0 ? 'under cumulative target' : 'over cumulative target'}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:mt-6">
              <button type="button" onClick={tare} className="rounded-2xl border border-zinc-600 px-5 py-4 text-base font-bold text-zinc-200 hover:bg-zinc-800 sm:px-6 sm:text-lg">
                Tare / zero scale
              </button>
              <span className="text-xs text-zinc-500 sm:text-sm">
                {wakeLockActive ? 'Screen staying awake' : 'Screen wake lock unavailable'} · scale is net weight
              </span>
            </div>
          </div>

          <div className={`mx-auto mt-7 w-full max-w-4xl rounded-2xl px-5 py-5 text-center text-xl font-black sm:text-2xl ${isOnTarget ? 'bg-emerald-400 text-black' : 'bg-zinc-900 text-zinc-400'}`}>
            {isOnTarget ? 'Check — on target' : targetDifference < 0 ? `Add ${formatted(Math.abs(targetDifference))} g to reach the cumulative target` : `Remove ${formatted(targetDifference)} g to reach the cumulative target`}
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => setStepIndex(index => Math.max(0, index - 1))}
              className="min-h-14 flex-1 rounded-2xl border border-zinc-700 px-4 py-4 text-lg font-bold text-zinc-300 disabled:opacity-30"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setStepIndex(index => Math.min(steps.length - 1, index + 1))}
              className="min-h-14 flex-[2] rounded-2xl bg-emerald-400 px-4 py-4 text-lg font-black text-black"
            >
            {isFinished ? 'Finished — mix minerals' : isOnTarget ? 'Next mineral' : 'Next anyway'}
            </button>
          </div>
          <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">
            Keep the container on the scale. Enter the running net weight after each addition; the target total includes every mineral already added.
          </p>
        </main>
      </div>
    </div>
  );
}

const BrewerFlavorPanel = memo(function BrewerFlavorPanel({
  flavor,
  suggestedIons,
  onChange,
  onOpenStartingRecipe,
}: {
  flavor: BrewerFlavorInput;
  suggestedIons: Record<IonId, number>;
  onChange: (flavor: BrewerFlavorInput) => void;
  onOpenStartingRecipe: () => void;
}) {
  const gh = computeGH(suggestedIons);
  const kh = computeKH(suggestedIons);
  const direction = flavor.brightness >= 65
    ? flavor.juiciness >= 60 ? 'Bright, juicy, and clear' : 'Bright and crisp'
    : flavor.body >= 60
      ? 'Round, full, and structured'
      : 'Balanced and approachable';
  const magnesium = suggestedIons.magnesium ?? 0;
  const calcium = suggestedIons.calcium ?? 0;
  const hardnessTotal = magnesium + calcium;
  const magnesiumShare = hardnessTotal > 0 ? Math.round((magnesium / hardnessTotal) * 100) : 0;
  const calciumShare = hardnessTotal > 0 ? 100 - magnesiumShare : 0;
  const bufferCue = suggestedIons.bicarbonate < 35
    ? 'Light buffer keeps acidity vivid'
    : suggestedIons.bicarbonate > 60
      ? 'More buffer rounds sharp acidity'
      : 'Balanced buffer for a versatile cup';

  return (
    <div className="border-b border-slate-700/40 bg-sky-500/5 px-4 py-4 sm:px-6">
       <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">Build your water by flavor</div>
          <p className="mt-1 text-xs text-slate-400">
            Start with RO / distilled water, then click the pyramid or drag the star. Your mineral recipe updates instantly.
          </p>
        </div>
         <button
           type="button"
           onClick={onOpenStartingRecipe}
           className="flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-300/35 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:border-violet-200/65 hover:bg-violet-500/20 hover:shadow-lg hover:shadow-violet-950/20"
           title="Answer coffee preference questions to create a tunable starting mineral recipe"
         >
           <Sparkles className="h-3.5 w-3.5" />
           Build from my coffee
         </button>
      </div>
      <BrewerFlavorPyramid flavor={flavor} onChange={onChange} />
      <BrewerFlavorRadar flavor={flavor} suggestedIons={suggestedIons} />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ['brightness', 'Brightness / acidity', 'Soft', 'Bright'],
          ['juiciness', 'Fruit character', 'Balanced', 'Juicy'],
          ['sweetness', 'Sweetness / clarity', 'Crisp', 'Round'],
          ['body', 'Body / mouthfeel', 'Light', 'Full'],
        ] as const).map(([key, label, low, high]) => {
          const status = brewerSliderStatus(flavor[key]);
          return (
            <div key={key} className="rounded-lg border border-slate-700/50 bg-slate-900/30 px-2.5 py-2">
              <div className="truncate text-[10px] text-slate-500">{label}</div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${status.className}`}>{status.label}</span>
                <span className="font-mono text-xs text-sky-300">{flavor[key]}</span>
              </div>
              <BrewerFlavorBar
                value={flavor[key]}
                label={label}
                onChange={value => onChange({ ...flavor, [key]: value })}
              />
              <div className="mt-1 flex justify-between text-[9px] text-slate-600"><span>{low}</span><span>{high}</span></div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2 rounded-xl border border-slate-700/50 bg-slate-900/35 px-3 py-3 sm:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Suggested flavor direction</div>
          <div className="mt-1 text-sm font-medium text-slate-200">{direction}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">GH</div>
          <div className="mt-1 font-mono text-sm text-cyan-300">{gh.toFixed(0)} ppm</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">KH</div>
          <div className="mt-1 font-mono text-sm text-cyan-300">{kh.toFixed(0)} ppm</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Hardness balance</div>
          <div className="mt-1 font-mono text-xs text-slate-300">
            Mg:Ca {magnesiumShare}:{calciumShare}
          </div>
          <div className="mt-0.5 text-[9px] text-slate-600">{magnesium.toFixed(0)} · {calcium.toFixed(0)} ppm</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-900/25 px-3 py-2 text-[10px]">
        <span className="font-semibold uppercase tracking-wider text-slate-500">Water read</span>
        <span className="text-sky-200">{bufferCue}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400">Mg pulls intensity; Ca adds focus and roundness</span>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        0–60 stays within Aiki’s safe band · 60–75 is elevated · 75–100 is out of range. Use the steps button for a simple preparation guide.
      </p>
    </div>
  );
});

function BrewerFlavorBar({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const draggingRef = useRef(false);

  const setFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextValue = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    onChange(Math.max(0, Math.min(100, nextValue)));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value} out of 100`}
      onPointerDown={event => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setFromPointer(event);
      }}
      onPointerMove={event => {
        if (draggingRef.current) setFromPointer(event);
      }}
      onPointerUp={event => {
        draggingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={event => {
        draggingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onKeyDown={event => {
        const amount = event.shiftKey ? 10 : 5;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          onChange(Math.max(0, value - amount));
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          onChange(Math.min(100, value + amount));
        } else if (event.key === 'Home') {
          event.preventDefault();
          onChange(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          onChange(100);
        }
      }}
      className="group mt-2 cursor-grab select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 active:cursor-grabbing"
      style={{ touchAction: 'none' }}
      title={`Click or drag to set ${label}`}
    >
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-700/70 transition group-hover:bg-slate-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500/70 to-cyan-300 transition-[width]"
          style={{ width: `${value}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-100 bg-sky-300 shadow-[0_0_8px_rgb(56_189_248_/_0.7)] transition-[left]"
          style={{ left: `${value}%` }}
        />
      </div>
    </div>
  );
}

function BrewerFlavorPyramid({
  flavor,
  onChange,
}: {
  flavor: BrewerFlavorInput;
  onChange: (flavor: BrewerFlavorInput) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const apex = { x: 320, y: 42 };
  const left = { x: 72, y: 290 };
  const right = { x: 568, y: 290 };
  const weights = {
    apex: (flavor.brightness + flavor.juiciness) / 200,
    left: flavor.sweetness / 100,
    right: flavor.body / 100,
  };
  const weightTotal = weights.apex + weights.left + weights.right;
  const point = {
    x: weightTotal > 0
      ? (apex.x * weights.apex + left.x * weights.left + right.x * weights.right) / weightTotal
      : (apex.x + left.x + right.x) / 3,
    y: weightTotal > 0
      ? (apex.y * weights.apex + left.y * weights.left + right.y * weights.right) / weightTotal
      : (apex.y + left.y + right.y) / 3,
  };

  const flavorFromPoint = (x: number, y: number): BrewerFlavorInput => {
    const denominator =
      (left.y - right.y) * (apex.x - right.x) + (right.x - left.x) * (apex.y - right.y);
    let apexWeight =
      ((left.y - right.y) * (x - right.x) + (right.x - left.x) * (y - right.y)) / denominator;
    let leftWeight =
      ((right.y - apex.y) * (x - right.x) + (apex.x - right.x) * (y - right.y)) / denominator;
    let rightWeight = 1 - apexWeight - leftWeight;
    const positiveWeights = {
      apex: Math.max(0, apexWeight),
      left: Math.max(0, leftWeight),
      right: Math.max(0, rightWeight),
    };
    const total = positiveWeights.apex + positiveWeights.left + positiveWeights.right || 1;
    apexWeight = positiveWeights.apex / total;
    leftWeight = positiveWeights.left / total;
    rightWeight = positiveWeights.right / total;
    return {
      brightness: Math.round(apexWeight * 100),
      juiciness: Math.round(apexWeight * 100),
      sweetness: Math.round(leftWeight * 100),
      body: Math.round(rightWeight * 100),
    };
  };

  const pointIsInsidePyramid = (x: number, y: number) => {
    const denominator =
      (left.y - right.y) * (apex.x - right.x) + (right.x - left.x) * (apex.y - right.y);
    const apexWeight =
      ((left.y - right.y) * (x - right.x) + (right.x - left.x) * (y - right.y)) / denominator;
    const leftWeight =
      ((right.y - apex.y) * (x - right.x) + (apex.x - right.x) * (y - right.y)) / denominator;
    const rightWeight = 1 - apexWeight - leftWeight;
    return apexWeight >= 0 && leftWeight >= 0 && rightWeight >= 0;
  };

  const getPointerPosition = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 640,
      y: ((event.clientY - rect.top) / rect.height) * 340,
    };
  };

  const flushPendingPointerUpdate = () => {
    const position = pendingPointerPositionRef.current;
    pendingPointerPositionRef.current = null;
    if (position) onChange(flavorFromPoint(position.x, position.y));
  };

  const updateFromPointer = (
    event: React.PointerEvent<SVGSVGElement>,
    immediate = false,
  ) => {
    const position = getPointerPosition(event);
    if (!position) return;
    pendingPointerPositionRef.current = position;
    if (immediate) {
      if (pointerFrameRef.current !== null) {
        cancelAnimationFrame(pointerFrameRef.current);
        pointerFrameRef.current = null;
      }
      flushPendingPointerUpdate();
      return;
    }
    if (pointerFrameRef.current !== null) return;
    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      flushPendingPointerUpdate();
    });
  };

  useEffect(() => () => {
    if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
  }, []);

  const moveByKeyboard = (event: React.KeyboardEvent<SVGCircleElement>) => {
    const amount = event.shiftKey ? 10 : 5;
    let x = point.x;
    let y = point.y;
    if (event.key === 'ArrowLeft') x -= amount;
    else if (event.key === 'ArrowRight') x += amount;
    else if (event.key === 'ArrowUp') y -= amount;
    else if (event.key === 'ArrowDown') y += amount;
    else return;
    event.preventDefault();
    onChange(flavorFromPoint(x, y));
  };

  return (
    <div className={`mt-4 rounded-xl border px-2 py-3 transition sm:px-4 ${
      isDragging ? 'border-sky-300/45 bg-sky-500/[0.05]' : 'border-slate-700/50 bg-slate-900/35'
    }`}>
      <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {isDragging ? 'Release to lock in this balance' : 'Drag the star to shape your cup'}
      </div>
      <div className="flex justify-center">
        <svg
          ref={svgRef}
          viewBox="0 0 640 340"
          className="h-auto w-full max-w-[640px] touch-none select-none"
          role="img"
          aria-label="Interactive taste pyramid. Drag the star between brightness and fruit acidity, sweetness and clarity, and body and mouthfeel."
           onPointerDown={event => {
             const position = getPointerPosition(event);
             if (!position || !pointIsInsidePyramid(position.x, position.y)) return;
             draggingRef.current = true;
             setIsDragging(true);
             event.currentTarget.setPointerCapture(event.pointerId);
              updateFromPointer(event, true);
           }}
           onPointerMove={event => {
             if (draggingRef.current) updateFromPointer(event);
           }}
           onPointerUp={event => {
              updateFromPointer(event, true);
             draggingRef.current = false;
             setIsDragging(false);
             if (event.currentTarget.hasPointerCapture(event.pointerId)) {
               event.currentTarget.releasePointerCapture(event.pointerId);
             }
           }}
            onPointerCancel={() => {
              if (pointerFrameRef.current !== null) {
                cancelAnimationFrame(pointerFrameRef.current);
                pointerFrameRef.current = null;
              }
              flushPendingPointerUpdate();
              draggingRef.current = false;
              setIsDragging(false);
            }}
           onPointerEnter={() => setIsHovering(true)}
           onPointerLeave={() => setIsHovering(false)}
           style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
        >
          <defs>
            <linearGradient id="brewer-pyramid-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <polygon
            points={`${apex.x},${apex.y} ${left.x},${left.y} ${right.x},${right.y}`}
            fill="url(#brewer-pyramid-fill)"
            stroke={isDragging || isHovering ? 'rgb(125 211 252 / 0.9)' : 'rgb(125 211 252 / 0.65)'}
            strokeWidth="2"
            style={{ transition: 'stroke 160ms ease' }}
          />
          {[apex, left, right].map((vertex, index) => (
            <circle key={index} cx={vertex.x} cy={vertex.y} r="3.5" fill="rgb(125 211 252 / 0.75)" />
          ))}
          <text x={apex.x} y="22" textAnchor="middle" fill="rgb(226 232 240)" fontSize="14" fontWeight="600">Brightness / Fruit Acidity</text>
          <text x="64" y="318" textAnchor="start" fill="rgb(226 232 240)" fontSize="14" fontWeight="600">Sweetness &amp; Clarity</text>
          <text x="576" y="318" textAnchor="end" fill="rgb(226 232 240)" fontSize="14" fontWeight="600">Body &amp; Mouthfeel</text>
          <circle
            cx={point.x}
            cy={point.y}
            r={isDragging ? 26 : 19}
            fill="rgb(14 165 233 / 0.16)"
            style={{ transition: 'r 160ms ease' }}
          />
          {isDragging && (
            <circle cx={point.x} cy={point.y} r="19" fill="none" stroke="rgb(56 189 248 / 0.45)" strokeWidth="2">
              <animate attributeName="r" values="14;30" dur="0.9s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0" dur="0.9s" repeatCount="indefinite" />
            </circle>
          )}
          <circle
            cx={point.x}
            cy={point.y}
            r={isDragging ? 14 : 12}
            fill="#f8fafc"
            stroke="#38bdf8"
            strokeWidth={isDragging ? 4 : 3}
            tabIndex={0}
            role="slider"
            aria-label="Taste profile position"
            aria-valuetext={`${flavor.brightness} brightness, ${flavor.juiciness} fruit, ${flavor.sweetness} sweetness, ${flavor.body} body`}
            onKeyDown={moveByKeyboard}
            onFocus={() => setIsHovering(true)}
            onBlur={() => setIsHovering(false)}
            style={{ cursor: isDragging ? 'grabbing' : 'grab', transition: 'r 160ms ease, stroke-width 160ms ease' }}
          />
          <text
            x={point.x}
            y={point.y + 5}
            textAnchor="middle"
            fill="#0284c7"
            fontSize={isDragging ? 17 : 15}
            fontWeight="700"
            style={{ pointerEvents: 'none', transition: 'font-size 160ms ease' }}
          >
            ★
          </text>
        </svg>
      </div>
    </div>
  );
}

function BrewerFlavorRadar({
  flavor,
  suggestedIons,
}: {
  flavor: BrewerFlavorInput;
  suggestedIons: Record<IonId, number>;
}) {
  const clampRadar = (value: number) => Math.max(12, Math.min(96, value));
  const scores = [
    clampRadar(flavor.brightness * 0.72 + Math.min(suggestedIons.sulfate, 30) * 0.8 + 8),
    clampRadar(flavor.body * 0.72 + Math.min(suggestedIons.calcium, 45) * 0.38 + 8),
    clampRadar(flavor.sweetness * 0.58 + flavor.juiciness * 0.22 + Math.min(suggestedIons.chloride, 35) * 0.45 + 10),
    clampRadar((100 - Math.min(suggestedIons.bicarbonate, 90)) * 0.4 + flavor.brightness * 0.3 + flavor.juiciness * 0.2 + 12),
  ];
  const labels = [
    { text: 'Brightness / Fruit Acidity', x: 140, y: 10, anchor: 'middle' as const },
    { text: 'Body / Mouthfeel', x: 270, y: 116, anchor: 'start' as const },
    { text: 'Sweetness', x: 140, y: 230, anchor: 'middle' as const },
    { text: 'Clarity', x: 10, y: 116, anchor: 'end' as const },
  ];
  const center = { x: 140, y: 112 };
  const radius = 75;
  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + index * (Math.PI / 2);
    const distance = radius * (value / 100);
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
    };
  };
  const polygon = scores.map((score, index) => {
    const p = point(index, score);
    return `${p.x},${p.y}`;
  }).join(' ');
  const gridPolygon = (scale: number) => [0, 1, 2, 3].map(index => {
    const p = point(index, scale);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/35 px-3 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Predicted flavor profile
      </div>
      <div className="flex justify-center overflow-x-auto">
        <svg
          viewBox="0 0 280 242"
          className="h-56 w-full max-w-[360px] min-w-[280px]"
          role="img"
          aria-label="Live predicted flavor profile radar"
        >
          {[25, 50, 75, 100].map(scale => (
            <polygon
              key={scale}
              points={gridPolygon(scale)}
              fill="none"
              stroke="rgb(71 85 105 / 0.45)"
              strokeWidth="1"
            />
          ))}
          {[0, 1, 2, 3].map(index => {
            const end = point(index, 100);
            return (
              <line
                key={index}
                x1={center.x}
                y1={center.y}
                x2={end.x}
                y2={end.y}
                stroke="rgb(71 85 105 / 0.5)"
                strokeWidth="1"
              />
            );
          })}
          <polygon
            points={polygon}
            fill="rgb(14 165 233 / 0.28)"
            stroke="rgb(56 189 248)"
            strokeWidth="2"
            className="transition-all duration-300"
          />
          {scores.map((score, index) => {
            const p = point(index, score);
            return <circle key={index} cx={p.x} cy={p.y} r="3.5" fill="rgb(125 211 252)" />;
          })}
          {labels.map(label => (
            <text
              key={label.text}
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              fill="rgb(148 163 184)"
              fontSize="9"
            >
              {label.text}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function WaterMetadataFields({
  metadata,
  onChange,
}: {
  metadata: Partial<Record<keyof WaterMetadata, string>>;
  onChange: (metadata: Partial<Record<keyof WaterMetadata, string>>) => void;
}) {
  return (
    <details className="rounded-lg border border-slate-700/50 bg-slate-900/25">
      <summary className="cursor-pointer select-none px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
        Reported water metadata
      </summary>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-700/40 p-3 sm:grid-cols-4">
        {WATER_METADATA_FIELDS.map(field => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-[10px] text-slate-500">
              {field.label}{field.unit ? ` (${field.unit})` : ''}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step={field.key === 'ph' ? '0.01' : 'any'}
              value={metadata[field.key] ?? ''}
              onChange={e => onChange({ ...metadata, [field.key]: e.target.value })}
              placeholder="—"
              className="w-full rounded-lg border border-slate-600/60 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
            />
          </label>
        ))}
      </div>
    </details>
  );
}

function WaterHardnessRatioFooter({
  ions,
}: {
  ions: Partial<Record<IonId, string>>;
}) {
  const waterIons = completeIonTotals(
    numericIons(ions) as Partial<Record<IonId, number>>,
  );
  const gh = computeGH(waterIons);
  const kh = computeKH(waterIons);
  const ratio = kh > 0 && Number.isFinite(gh / kh)
    ? `${(gh / kh).toFixed(2)} : 1`
    : '—';

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-700/40 pt-2"
      aria-label={`Water hardness balance: GH ${fmt(gh)} ppm, KH ${kh > 0 ? `${fmt(kh)} ppm` : 'not available'}, ratio ${ratio}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        GH : KH balance
      </span>
      <div className="flex flex-wrap items-center gap-2 text-[11px] tabular-nums">
        <span className="font-semibold text-[color:var(--ion-fg)]" style={ionVisualStyle('magnesium')}>
          GH {fmt(gh)}
        </span>
        <span className="text-slate-600">:</span>
        <span className="font-semibold text-[color:var(--ion-fg)]" style={ionVisualStyle('bicarbonate')}>
          KH {kh > 0 ? fmt(kh) : '—'}
        </span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">
          Ratio <span className="font-semibold text-sky-300">{ratio}</span>
        </span>
      </div>
    </div>
  );
}

function IonWatchDisclosure({
  ions,
  activeProfile,
}: {
  ions: Partial<Record<IonId, number>>;
  activeProfile: WaterProfile;
}) {
  const flaggedIons = ACTIVE_ION_IDS
    .map(id => {
      const ion = ION_MAP[id];
      const ppm = ions[id] ?? 0;
      const level = classifyIon(ppm, activeProfile.ranges[id]);
      return { id, ion, ppm, level };
    })
    .filter(item => item.level !== 'green');
  const watchLevel: TrafficLevel = flaggedIons.some(item => item.level === 'red')
    ? 'red'
    : flaggedIons.some(item => item.level === 'yellow')
      ? 'yellow'
      : 'green';

  return (
    <details className="group border-t border-indigo-400/15 bg-indigo-500/[0.035]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs text-slate-300 hover:bg-indigo-500/[0.06] sm:px-6 [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full border border-indigo-400/35 bg-indigo-500/10"
          aria-label={`Ion status: ${TRAFFIC_STYLES[watchLevel].label}`}
          title={`Ion status: ${TRAFFIC_STYLES[watchLevel].label}`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              watchLevel === 'green'
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.95)]'
                : watchLevel === 'yellow'
                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.95)]'
                  : 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.95)]'
            }`}
          />
        </span>
        <span className="font-semibold">{activeProfile.name} ion check</span>
        <span className="text-slate-500">
          {flaggedIons.length === 0
            ? 'All monitored ions in range'
            : `${flaggedIons.length} ion${flaggedIons.length === 1 ? '' : 's'} to review`}
        </span>
        <span className="ml-auto text-slate-500 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-2 border-t border-indigo-400/10 px-4 py-3 sm:px-6">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Based on the final source-water-plus-salts mixture and {activeProfile.name} guidance.{' '}
          {activeProfile.id === AIKI_DEFAULT_PROFILE.id && (
            <a
              href="https://discord.com/channels/1194136643637096508/1423022322465505380/1504865270882373775"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-300 underline decoration-indigo-300/40 underline-offset-2 transition hover:text-indigo-200"
            >
              View Aiki&apos;s original Discord post
            </a>
          )}
        </p>
        {flaggedIons.length === 0 ? (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[11px] text-emerald-200">
            No elevated or out-of-range ions detected.
          </p>
        ) : (
          flaggedIons.map(({ id, ion, ppm, level }) => {
            const style = TRAFFIC_STYLES[level];
            const range = activeProfile.ranges[id];
            return (
              <div
                key={id}
                className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2.5`}
                style={{ ...ionVisualStyle(id), boxShadow: 'inset 3px 0 0 var(--ion-border)' }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className={`text-xs font-semibold ${style.text}`}>
                    <span className="text-[color:var(--ion-fg)]" title={ion.name}>{ion.formula}</span> · {style.label}
                  </span>
                  <span className={`font-mono text-[11px] ${style.text}`}>
                    {ppm.toFixed(1)} ppm · preferred &lt;{range.greenMax}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  {ion.flagNotes[level]}
                </p>
              </div>
            );
          })
        )}
    </div>
    </details>
  );
}

function IonDeviationDisclosure({
  actual,
  target,
}: {
  actual: Partial<Record<IonId, number>>;
  target: Partial<Record<IonId, number>>;
}) {
  const deviations = IONS
    .map(({ id }) => ({
      id,
      actual: actual[id] ?? 0,
      target: target[id] ?? 0,
      delta: (actual[id] ?? 0) - (target[id] ?? 0),
    }))
    .filter(item => Math.abs(item.delta) > 0.05);
  const overshoots = deviations.filter(item => item.delta > 0);
  const underdoses = deviations.filter(item => item.delta < 0);
  const status: TrafficLevel = overshoots.length > 0
    ? 'red'
    : underdoses.length > 0
      ? 'yellow'
      : 'green';

  return (
    <details className="group mt-3 border-t border-indigo-400/15 bg-indigo-500/[0.035]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-xs text-slate-300 hover:bg-indigo-500/[0.06] [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full border border-indigo-400/35 bg-indigo-500/10"
          aria-label={`Ion deviation status: ${TRAFFIC_STYLES[status].label}`}
          title={`Ion deviation status: ${TRAFFIC_STYLES[status].label}`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === 'green'
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.95)]'
                : status === 'yellow'
                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.95)]'
                  : 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.95)]'
            }`}
          />
        </span>
        <span className="font-semibold">Ion deviation from original recipe</span>
        <span className="text-slate-500">
          {deviations.length === 0
            ? 'No meaningful deviation'
            : `${overshoots.length} over · ${underdoses.length} under`}
        </span>
        <span className="ml-auto text-slate-500 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-2 border-t border-indigo-400/10 px-3 py-3">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Final source-water-plus-salts mixture compared with the original salt-only recipe. Small differences are hidden.
        </p>
        {deviations.length === 0 ? (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[11px] text-emerald-200">
            No meaningful ion deviation detected.
          </p>
        ) : (
          deviations.map(({ id, actual: actualPpm, target: targetPpm, delta }) => {
            const over = delta > 0;
            const style = over ? TRAFFIC_STYLES.red : TRAFFIC_STYLES.yellow;
            return (
              <div
                key={id}
                className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2.5`}
                style={{ ...ionVisualStyle(id), boxShadow: 'inset 3px 0 0 var(--ion-border)' }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className={`text-xs font-semibold ${style.text}`}>
                    <span className="text-[color:var(--ion-fg)]" title={ION_MAP[id].name}>{ION_MAP[id].formula}</span> · {over ? 'Over target' : 'Under target'}
                  </span>
                  <span className={`font-mono text-[11px] ${style.text}`}>
                    {over ? '+' : '−'}{Math.abs(delta).toFixed(1)} ppm
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  Final {actualPpm.toFixed(1)} ppm vs original {targetPpm.toFixed(1)} ppm.
                </p>
              </div>
            );
          })
        )}
      </div>
    </details>
  );
}

const STRENGTH_OPTIONS = [10, 25, 50, 100, 150, 200, 500];

const STOCK_COLOR_CLASSES = {
  sky:    { border: 'border-sky-500/30',    bg: 'bg-sky-500/5',    heading: 'text-sky-300',    doseBg: 'bg-sky-500/10 border-sky-500/20',    doseText: 'text-sky-200' },
  violet: { border: 'border-violet-500/30', bg: 'bg-violet-500/5', heading: 'text-violet-300', doseBg: 'bg-violet-500/10 border-violet-500/20', doseText: 'text-violet-200' },
  amber:  { border: 'border-amber-500/30',  bg: 'bg-amber-500/5',  heading: 'text-amber-300',  doseBg: 'bg-amber-500/10 border-amber-500/20',  doseText: 'text-amber-200' },
};

function SplitStockCard({
  group, saltTargets, rows, strength, volumeMl, batchL, warnings,
  onStrengthChange, onVolumeChange,
}: {
  group: StockGroup;
  saltTargets: Record<string, number>;
  rows: SaltRow[];
  strength: number;
  volumeMl: string;
  batchL: number;
  warnings: ConcentrateWarning[];
  onStrengthChange: (v: number) => void;
  onVolumeChange: (v: string) => void;
}) {
  const cls = STOCK_COLOR_CLASSES[group.color];
  const stockL = num(volumeMl) / 1000;
  const dosePerLiter = strength > 0 ? 1000 / strength : 0;
  const dosePerBatch = dosePerLiter * batchL;

  return (
    <div className={`rounded-xl border ${cls.border} ${cls.bg} px-4 py-3 space-y-3`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className={`w-3.5 h-3.5 ${cls.heading}`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${cls.heading}`}>{group.name}</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300">Strength:</label>
          <select
            value={STRENGTH_OPTIONS.includes(strength) ? String(strength) : 'custom'}
            onChange={e => {
              onStrengthChange(e.target.value === 'custom' ? 0 : Number(e.target.value));
            }}
            className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
          >
            {STRENGTH_OPTIONS.map(v => <option key={v} value={v}>×{v}</option>)}
            <option value="custom">Custom</option>
          </select>
          {!STRENGTH_OPTIONS.includes(strength) && (
            <input
              type="number"
              inputMode="numeric"
              min={2}
              value={strength || ''}
              onChange={e => onStrengthChange(Number(e.target.value) || 0)}
              placeholder="×"
              aria-label={`${group.name} custom stock strength multiplier`}
              className="w-20 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300">Volume:</label>
          <input
            type="number"
            inputMode="decimal"
            value={volumeMl}
            onChange={e => onVolumeChange(e.target.value)}
            placeholder="500"
            className="w-24 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
          />
          <span className="text-xs text-slate-400">mL</span>
        </div>
      </div>

      {/* Dosing info */}
      {strength > 0 && stockL > 0 && (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${cls.doseText} ${cls.doseBg} rounded-lg px-3 py-2 border`}>
          <span>Add <strong>{dosePerLiter.toFixed(1)} mL</strong> per liter of brew water</span>
          {batchL > 0 && <span>· <strong>{dosePerBatch.toFixed(1)} mL</strong> per batch</span>}
        </div>
      )}

      {/* Salt masses */}
      <div className="space-y-1">
        {group.saltIds.map(saltId => {
          const salt = SALTS.find(s => s.id === saltId)!;
          const saltIdx = SALTS.indexOf(salt);
           const row = rows[saltIdx] ?? {
             target: '',
             formIdx: salt.defaultFormIdx ?? 0,
           };
          const form = salt.hydrationForms[row.formIdx];
          const target = saltTargets[saltId] ?? 0;
          const mg = strength > 0 && stockL > 0 && target > 0
            ? computeSaltMg(target, stockL, form.molarMass, salt.anhydrousMass) * strength
            : 0;
          const massLabel = mg >= 1000 ? `${(mg / 1000).toFixed(3)} g` : `${mg.toFixed(2)} mg`;
          const formLabel = salt.hydrationForms.length > 1 ? ` (${form.label})` : '';
          return (
            <div key={saltId} className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-300">{salt.name}{formLabel}</span>
              <span className="text-xs font-mono text-emerald-300 shrink-0">{mg > 0 ? massLabel : '—'}</span>
            </div>
          );
        })}
      </div>

      {/* Warnings for this group */}
      {warnings.filter(w => w.severity !== 'info').length > 0 && (
        <div className="space-y-1.5">
          {warnings.filter(w => w.severity !== 'info').map((w, wi) => (
            <div
              key={wi}
              className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                w.severity === 'error'
                  ? 'text-rose-200 bg-rose-500/10 border border-rose-500/25'
                  : 'text-amber-200 bg-amber-500/10 border border-amber-500/25'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${w.severity === 'error' ? 'text-rose-400' : 'text-amber-400'}`} />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      </div>
  );
}

export default App;
