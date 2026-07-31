import { Coffee, Flame, Droplets, Wind } from 'lucide-react';
import type { IonId } from '@/waterData';

interface Props {
  ionTotals: Record<IonId, number>;
  gh: number;
  kh: number;
  collapsed?: boolean;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// — Descriptor helpers ———————————————————————————

function scDescription(sc: number): string {
  if (sc < 0.3) return 'Chloride heavily dominant — broad body, round mouthfeel, acidity is very soft.';
  if (sc < 0.6) return 'Chloride dominant — pronounced body, low perceived acidity, silky texture.';
  if (sc < 1.0) return 'Chloride leaning — good body with moderate clarity.';
  if (sc < 1.8) return 'Balanced — clarity and body in harmony.';
  if (sc < 3.0) return 'Sulfate leaning — bright, crisp acidity, drier finish.';
  if (sc < 5.0) return 'Sulfate dominant — sharp clarity, drying finish, high perceived acidity.';
  return 'Sulfate extremely dominant — aggressive, drying, potentially harsh/bitter.';
}

function ghDescriptor(gh: number): string {
  if (gh < 25) return 'Very soft — extraction is weak; cup may taste hollow or thin.';
  if (gh < 50) return 'Soft — clean and delicate; suits very light floral roasts.';
  if (gh < 90) return 'Moderate — balanced extraction, good versatility.';
  if (gh < 150) return 'Bold — strong extraction, fuller body, good for medium-dark roasts.';
  return 'Very hard — aggressive extraction; risk of harshness or astringency.';
}

function khDescriptor(kh: number): string {
  if (kh < 15) return 'Minimal buffer — aggressively bright, sharply acidic, tea-like.';
  if (kh < 35) return 'Low buffer — crisp, lively, clean; lets acidity sing.';
  if (kh < 65) return 'Moderate buffer — balanced acidity, broad compatibility.';
  if (kh < 100) return 'High buffer — acidity is noticeably muted, round and smooth.';
  return 'Very high buffer — flat, dull acidity; can taste chalky or soapy.';
}

function mgDescriptor(mg: number): string {
  if (mg < 3) return 'Low Mg — clean profile, but may lack fruit extraction.';
  if (mg < 10) return 'Moderate Mg — good fruit clarity, balanced structure.';
  if (mg < 20) return 'Elevated Mg — pronounced fruit extraction, crisp mouthfeel.';
  return 'High Mg — can taste sharp or drying at this level.';
}

function caDescriptor(ca: number): string {
  if (ca < 10) return 'Low Ca — body may feel weak or hollow.';
  if (ca < 30) return 'Moderate Ca — good structure and sweetness extraction.';
  if (ca < 50) return 'Elevated Ca — full body, heavy mouthfeel.';
  return 'High Ca — can taste chalky and mask aromatics.';
}

interface Profile {
  score: number;
  body: string;
  acidity: string;
  note: string;
}

// — Scoring functions ————————————————————————————————

function scoreLightRoast(ionTotals: Record<IonId, number>, gh: number, kh: number, sc: number): Profile {
  // Modern approach (Empirical Water Glacial ~35/24, Sey, MoonWake):
  // Light roasts already have intense delicate acidity — water should let it through,
  // not bulldoze it. Low-moderate GH (30-70), low KH (20-40), moderate SC (1-2),
  // moderate Mg (5-15) to lift fruit without harshness.
  const ghScore = clamp(10 - Math.abs(gh - 50) / 7, 0, 10) * 0.30;
  const khScore = clamp(10 - Math.abs(kh - 30) / 6, 0, 10) * 0.25;
  const scScore = clamp(10 - Math.abs(sc - 1.5) * 2, 0, 10) * 0.25;
  const mgScore = clamp(10 - Math.abs(ionTotals.magnesium - 9) / 3, 0, 10) * 0.20;
  const score = clamp(ghScore + khScore + scScore + mgScore, 0, 10);

  const body = gh < 50 ? 'Light, tea-like' : gh < 90 ? 'Light-medium' : 'Medium';
  const acidity = kh < 35 ? 'Bright, crisp' : kh < 65 ? 'Moderate' : 'Soft, muted';

  let note: string;
  if (score >= 7) note = 'Excellent for light roasts — mineral level lets delicate florals and fruit acids come through cleanly.';
  else if (score >= 4) note = 'Workable for light roasts — lean toward lower GH/KH and moderate sulfate for clarity.';
  else note = 'Not ideal for light roasts — water is too aggressive or too flat for these fragile coffees.';

  return { score, body, acidity, note };
}

function scoreMediumRoast(ionTotals: Record<IonId, number>, gh: number, kh: number, sc: number): Profile {
  // Medium roasts need more extraction power and buffer to balance developed roast flavors.
  // GH 70-130, KH 40-70, SC 1-2, Na can add sweetness.
  const ghScore = clamp(10 - Math.abs(gh - 100) / 12, 0, 10) * 0.30;
  const khScore = clamp(10 - Math.abs(kh - 55) / 8, 0, 10) * 0.25;
  const scScore = clamp(10 - Math.abs(sc - 1.5) * 2.5, 0, 10) * 0.25;
  const naScore = clamp(10 - Math.abs(ionTotals.sodium - 8) / 4, 0, 10) * 0.10;
  const caScore = clamp((ionTotals.calcium - 8) / 5, 0, 10) * 0.10;
  const score = clamp(ghScore + khScore + scScore + naScore + caScore, 0, 10);

  const body = gh < 60 ? 'Light' : gh < 130 ? 'Medium' : 'Full';
  const acidity = kh < 35 ? 'Pronounced' : kh < 70 ? 'Moderate, balanced' : 'Low, smooth';

  let note: string;
  if (score >= 7) note = 'Excellent for medium roasts — balanced extraction highlights chocolate, nut, and stone-fruit notes.';
  else if (score >= 4) note = 'Workable for medium roasts — aim for GH 70-130, KH 40-70, balanced SC ratio.';
  else note = 'Not ideal for medium roasts — body or acidity is likely out of balance for this roast level.';

  return { score, body, acidity, note };
}

function scoreWashed(ionTotals: Record<IonId, number>, gh: number, kh: number, sc: number): Profile {
  // Washed coffees are clean by nature — they reward clarity.
  // Moderate SC (1.5-3), moderate GH (60-100), lower KH (20-40) to let origin character show.
  const scScore = clamp(10 - Math.abs(sc - 2.2) * 2, 0, 10) * 0.35;
  const ghScore = clamp(10 - Math.abs(gh - 80) / 10, 0, 10) * 0.25;
  const khScore = clamp(10 - Math.abs(kh - 30) / 7, 0, 10) * 0.25;
  const caScore = clamp((ionTotals.calcium - 5) / 5, 0, 10) * 0.15;
  const score = clamp(scScore + ghScore + khScore + caScore, 0, 10);

  const body = gh < 50 ? 'Light, clean' : gh < 110 ? 'Medium, elegant' : 'Full';
  const acidity = sc > 1.5 ? 'Crisp, transparent' : sc > 0.6 ? 'Moderate' : 'Soft, round';

  let note: string;
  if (score >= 7) note = 'Excellent for washed coffees — clarity and terroir separation are well supported.';
  else if (score >= 4) note = 'Decent for washed — lean toward higher SC ratio and lower KH for better transparency.';
  else note = 'Not ideal for washed — water is too heavy or over-buffered for clean, articulate cups.';

  return { score, body, acidity, note };
}

function scoreNatural(ionTotals: Record<IonId, number>, gh: number, kh: number, sc: number): Profile {
  // Naturals are fruit-forward, often with heavy body. They benefit from Mg-driven fruit
  // extraction, moderate body support, and not-too-high clarity.
  // Higher Mg (8-20), lower SC (0.5-1.5), moderate GH (80-120), moderate KH (40-70).
  const mgScore = clamp(10 - Math.abs(ionTotals.magnesium - 13) / 3.5, 0, 10) * 0.30;
  const scScore = clamp(10 - Math.abs(sc - 1.0) * 3, 0, 10) * 0.25;
  const ghScore = clamp(10 - Math.abs(gh - 100) / 12, 0, 10) * 0.25;
  const khScore = clamp(10 - Math.abs(kh - 55) / 10, 0, 10) * 0.20;
  const score = clamp(mgScore + scScore + ghScore + khScore, 0, 10);

  const body = gh < 70 ? 'Medium' : gh < 140 ? 'Full, syrupy' : 'Heavy';
  const acidity = sc > 2 ? 'Bright' : sc > 0.6 ? 'Moderate, round' : 'Low, soft';

  let note: string;
  if (score >= 7) note = 'Excellent for naturals — Mg lifts fruit intensity while balanced body supports the winey character.';
  else if (score >= 4) note = 'Decent for naturals — try raising Mg to 8-15 ppm and keeping SC ratio near 1:1.';
  else note = 'Not ideal for naturals — water is either too lean or too clarity-focused for fruit-forward processing.';

  return { score, body, acidity, note };
}

function scoreCoFerment(ionTotals: Record<IonId, number>, gh: number, kh: number, sc: number): Profile {
  // Co-ferments / high-impact processes already bring massive flavor.
  // Water should be neutral and clean — don't compete.
  // GH 50-100, KH 30-55, SC 1-1.8, keep Mg/Na moderate.
  const ghScore = clamp(10 - Math.abs(gh - 75) / 10, 0, 10) * 0.30;
  const khScore = clamp(10 - Math.abs(kh - 42) / 8, 0, 10) * 0.25;
  const scScore = clamp(10 - Math.abs(sc - 1.4) * 3, 0, 10) * 0.25;
  const purityPenalty =
    (ionTotals.sodium > 18 ? 2 : ionTotals.sodium > 12 ? 1 : 0) +
    (ionTotals.magnesium > 16 ? 2 : ionTotals.magnesium > 11 ? 1 : 0) +
    (ionTotals.calcium > 45 ? 1 : 0);
  const score = clamp(ghScore + khScore + scScore - purityPenalty, 0, 10);

  const body = gh < 60 ? 'Light' : gh < 110 ? 'Medium' : 'Full';
  const acidity = sc > 1.8 ? 'Bright' : sc > 0.7 ? 'Moderate' : 'Soft';

  let note: string;
  if (score >= 7) note = 'Excellent for co-ferments — clean, restrainted water lets the process character speak without interference.';
  else if (score >= 4) note = 'Decent — try dialing back Mg (<12) and Na (<10) to avoid clashing with intense processing.';
  else note = 'Not ideal — water is too assertive for high-impact processes; aim for neutral, balanced minerals.';

  return { score, body, acidity, note };
}

// — UI helpers ——————————————————————————————————————————

function scoreBadge(score: number): { label: string; color: string; dot: string } {
  if (score >= 7) return { label: 'Excellent', color: 'text-emerald-300', dot: 'bg-emerald-400' };
  if (score >= 4) return { label: 'Decent',     color: 'text-amber-300', dot: 'bg-amber-400' };
  return { label: 'Suboptimal', color: 'text-rose-300', dot: 'bg-rose-400' };
}

const SCORE_BAR_SEGMENTS = 10;

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {Array.from({ length: SCORE_BAR_SEGMENTS }).map((_, i) => {
        const filled = i < Math.round(score);
        return <div key={i} className={`h-1 flex-1 rounded-full ${filled ? 'bg-current' : 'bg-slate-700/50'}`} />;
      })}
    </div>
  );
}

function ProfileRow({ label, profile }: { label: React.ReactNode; profile: Profile }) {
  const badge = scoreBadge(profile.score);
  return (
    <div className="border-b border-slate-700/30 last:border-b-0 pb-2.5 last:pb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        <span className={`text-[11px] font-semibold ${badge.color}`}>{badge.label}</span>
      </div>
      <ScoreBar score={profile.score} />
      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
        <span>Body: <span className="text-slate-300">{profile.body}</span></span>
        <span className="text-slate-600">·</span>
        <span>Acidity: <span className="text-slate-300">{profile.acidity}</span></span>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{profile.note}</p>
    </div>
  );
}

function TasteProfileCup() {
  return (
    <span className="taste-profile-cup inline-flex h-4 w-4 items-center justify-center text-white" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M4 8.25h9.5v4.1A3.65 3.65 0 0 1 9.85 16H7.65A3.65 3.65 0 0 1 4 12.35v-4.1Z"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <path d="M13.5 9.15h1.1a2.1 2.1 0 0 1 0 4.2h-1.1" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
        <path d="M3 16.5h11" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
        <path className="taste-profile-steam taste-profile-steam-one" d="M6.5 6.5c-1-1 .9-1.4 0-2.6" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1" strokeLinecap="round" />
        <path className="taste-profile-steam taste-profile-steam-two" d="M9 6.5c-1-1 .9-1.4 0-2.6" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1" strokeLinecap="round" />
        <path className="taste-profile-steam taste-profile-steam-three" d="M11.5 6.5c-1-1 .9-1.4 0-2.6" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// — Main component ————————————————————————————————————

export default function TasteProfileCard({ ionTotals, gh, kh, collapsed = false }: Props) {
  const sc = ionTotals.chloride > 0
    ? ionTotals.sulfate / ionTotals.chloride
    : ionTotals.sulfate > 0 ? 20 : 0;

  const hasData = ionTotals.sulfate > 0 || ionTotals.chloride > 0
    || ionTotals.magnesium > 0 || ionTotals.calcium > 0;

  if (!hasData) {
    return (
      <details open={!collapsed} className="group bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
        <summary className="flex list-none cursor-pointer items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-600 to-orange-500 [&::-webkit-details-marker]:hidden">
         <Coffee className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white">Taste Profile</span>
          <span className="ml-auto text-xs text-white/60 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-slate-700/40 px-5 py-6 text-center text-xs text-slate-500 italic">
            Set salt targets or mineral waters to see how this profile might taste.
        </div>
      </details>
    );
  }

  const light = scoreLightRoast(ionTotals, gh, kh, sc);
  const medium = scoreMediumRoast(ionTotals, gh, kh, sc);
  const washed = scoreWashed(ionTotals, gh, kh, sc);
  const natural = scoreNatural(ionTotals, gh, kh, sc);
  const cof = scoreCoFerment(ionTotals, gh, kh, sc);

  return (
    <details open={!collapsed} className="group bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
      <summary className="flex list-none cursor-pointer items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-600 to-orange-500 [&::-webkit-details-marker]:hidden">
        <TasteProfileCup />
        <span className="text-sm font-semibold text-white">Taste Profile</span>
        <span className="ml-auto text-xs text-white/60 transition-transform group-open:rotate-180">⌄</span>
      </summary>

      {/* Overview metrics */}
      <div className="border-t border-slate-700/40 px-5 py-3 space-y-1.5 text-[11px] text-slate-400 border-b border-slate-700/30">
        <p className="flex items-start gap-1.5">
          <Droplets className="w-3 h-3 text-sky-400 mt-0.5 shrink-0" />
          <span>
            SC ratio (SO₄/Cl): <span className="font-mono text-sky-300 font-semibold">{sc.toFixed(1)}</span>
            <span className="text-slate-500 mx-1">·</span>
            {scDescription(sc)}
          </span>
        </p>
        <p className="flex items-start gap-1.5">
          <Wind className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
          <span>
            GH: <span className="font-mono text-cyan-300 font-semibold">{gh.toFixed(1)}</span> ppm CaCO₃
            <span className="text-slate-500 mx-1">·</span>
            {ghDescriptor(gh)}
          </span>
        </p>
        <p className="flex items-start gap-1.5">
          <Flame className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
          <span>
            KH: <span className="font-mono text-amber-300 font-semibold">{kh.toFixed(1)}</span> ppm CaCO₃
            <span className="text-slate-500 mx-1">·</span>
            {khDescriptor(kh)}
          </span>
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 text-[11px]">
          <p>
            <span className="text-slate-500">Mg:</span>{' '}
            <span className="font-mono text-slate-300">{ionTotals.magnesium.toFixed(1)} ppm</span>
            <span className="text-slate-500 ml-1">·</span>
            <span className="text-slate-400 ml-0.5">{mgDescriptor(ionTotals.magnesium)}</span>
          </p>
          <p>
            <span className="text-slate-500">Ca:</span>{' '}
            <span className="font-mono text-slate-300">{ionTotals.calcium.toFixed(1)} ppm</span>
            <span className="text-slate-500 ml-1">·</span>
            <span className="text-slate-400 ml-0.5">{caDescriptor(ionTotals.calcium)}</span>
          </p>
        </div>
      </div>

      {/* Profile scores */}
      <div className="px-5 py-3 space-y-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">By roast level</span>
        <ProfileRow label={<><Flame className="w-3 h-3 inline text-amber-400" /> Light / Extra Light</>} profile={light} />
        <ProfileRow label={<><Flame className="w-3 h-3 inline text-orange-400" /> Medium</>} profile={medium} />

        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 pt-1 block">By process</span>
        <ProfileRow label={<><Droplets className="w-3 h-3 inline text-sky-400" /> Washed</>} profile={washed} />
        <ProfileRow label={<><Wind className="w-3 h-3 inline text-emerald-400" /> Natural</>} profile={natural} />
        <ProfileRow label={<><Coffee className="w-3 h-3 inline text-purple-400" /> Co-ferment / High impact</>} profile={cof} />
      </div>
    </details>
  );
}
