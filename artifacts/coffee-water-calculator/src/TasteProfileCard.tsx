import { Coffee, Flame, Droplets, Wind } from 'lucide-react';
import type { IonId } from '@/waterData';

interface Props {
  ionTotals: Record<IonId, number>;
  gh: number;
  kh: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function scDescription(sc: number): string {
  if (sc < 0.5) return 'Chloride strongly dominant — pronounced body, round mouthfeel, softer acidity.';
  if (sc < 1.0) return 'Chloride leaning — good body with moderate clarity.';
  if (sc < 1.5) return 'Balanced — clarity and body in harmony.';
  if (sc < 3.0) return 'Sulfate leaning — bright, crisp acidity with decent structure.';
  return 'Sulfate dominant — sharp clarity, dry finish, high perceived acidity.';
}

function ghDescriptor(gh: number): string {
  if (gh < 30) return 'Very soft — extraction may feel weak or hollow.';
  if (gh < 60) return 'Soft — clean and delicate, may lack depth.';
  if (gh < 120) return 'Moderate — solid extraction, balanced body.';
  if (gh < 200) return 'Bold — strong extraction, good for light roasts.';
  return 'Very hard — high extraction force; can become harsh or bitter.';
}

function khDescriptor(kh: number): string {
  if (kh < 25) return 'Very low buffer — aggressively bright, sharp acidity.';
  if (kh < 50) return 'Low buffer — crisp, lively, clean.';
  if (kh < 80) return 'Moderate buffer — balanced acidity, good clarity.';
  if (kh < 120) return 'High buffer — acidity is muted, rounder cup.';
  return 'Very high buffer — flat, dull acidity; may taste chalky.';
}

interface Profile {
  score: number;      // 0-10 how suitable
  body: string;
  acidity: string;
  note: string;
}

function scoreLightRoast(ionTotals: Record<IonId, number>, gh: number, kh: number, sc: number): Profile {
  // Light roasts: need high extraction (GH >100), clarity (SC >2), moderate KH (30-60)
  const ghScore = clamp((gh - 40) / 15, 0, 10) * 0.35;
  const scScore = clamp((sc - 1) / 2, 0, 10) * 0.30;
  const khScore = kh < 80 ? clamp((50 - Math.abs(kh - 45)) / 10, 0, 10) * 0.20 : 0;
  const mgBonus = clamp((ionTotals.magnesium - 2) / 2, 0, 10) * 0.15;
  const score = clamp(ghScore + scScore + khScore + mgBonus, 0, 10);

  const body = gh > 120 ? 'Medium-full' : gh > 60 ? 'Light-medium' : 'Thin';
  const acidity = sc > 2 ? 'Bright, crisp' : sc > 1 ? 'Moderate' : 'Soft, round';

  let note: string;
  if (score >= 7) note = 'Excellent for light roasts — high extraction lifts floral and fruity notes.';
  else if (score >= 4) note = 'Decent for light roasts — try increasing GH or sulfate for more clarity.';
  else note = 'Suboptimal for light roasts — water is too soft or lacks acidity.';

  return { score, body, acidity, note };
}

function scoreMediumRoast(ionTotals: Record<IonId, number>, gh: number, kh: number, sc: number): Profile {
  // Medium roasts: balanced GH (60-150), balanced SC (0.8-2), moderate KH (40-80)
  const ghScore = clamp(10 - Math.abs(gh - 100) / 12, 0, 10) * 0.35;
  const scScore = clamp(10 - Math.abs(sc - 1.5) * 3, 0, 10) * 0.25;
  const khScore = clamp(10 - Math.abs(kh - 55) / 8, 0, 10) * 0.25;
  const naBonus = clamp((ionTotals.sodium - 2) / 3, 0, 10) * 0.15;
  const score = clamp(ghScore + scScore + khScore + naBonus, 0, 10);

  const body = gh > 120 ? 'Full' : gh > 60 ? 'Medium' : 'Light';
  const acidity = sc > 2 ? 'Pronounced' : sc > 0.8 ? 'Moderate' : 'Soft';

  let note: string;
  if (score >= 7) note = 'Excellent for medium roasts — balanced extraction highlights chocolate and nut notes.';
  else if (score >= 4) note = 'Workable for medium roasts — adjust GH and SC ratio toward balance.';
  else note = 'Not ideal for medium roasts — water is too extreme in one direction.';

  return { score, body, acidity, note };
}

function scoreWashed(ionTotals: Record<IonId, number>, gh: number, kh: number, sc: number): Profile {
  // Washed: clarity is king — higher SC, moderate GH, lower KH
  const scScore = clamp(10 - Math.abs(sc - 3) * 2, 0, 10) * 0.35;
  const ghScore = clamp(10 - Math.abs(gh - 90) / 10, 0, 10) * 0.30;
  const khScore = clamp(10 - Math.abs(kh - 40) / 8, 0, 10) * 0.20;
  const caScore = clamp((ionTotals.calcium - 5) / 5, 0, 10) * 0.15;
  const score = clamp(scScore + ghScore + khScore + caScore, 0, 10);

  const body = gh > 120 ? 'Medium-full' : gh > 60 ? 'Light-medium' : 'Thin';
  const acidity = sc > 2 ? 'Crisp, clean' : sc > 1 ? 'Moderate' : 'Soft';

  let note: string;
  if (score >= 7) note = 'Excellent for washed coffees — clarity and separation of terroir.';
  else if (score >= 4) note = 'Decent for washed — lean toward higher SC ratio for better separation.';
  else note = 'Not ideal for washed — water is too heavy or murky for clean notes.';

  return { score, body, acidity, note };
}

function scoreNatural(ionTotals: Record<IonId, number>, gh: number, kh: number, sc: number): Profile {
  // Natural: fruit-forward — higher Mg, lower SC (more body), moderate KH
  const mgScore = clamp((ionTotals.magnesium - 3) / 2.5, 0, 10) * 0.35;
  const scScore = clamp(10 - Math.abs(sc - 1) * 3, 0, 10) * 0.25;
  const ghScore = clamp(10 - Math.abs(gh - 110) / 12, 0, 10) * 0.20;
  const khScore = clamp(10 - Math.abs(kh - 55) / 10, 0, 10) * 0.20;
  const score = clamp(mgScore + scScore + ghScore + khScore, 0, 10);

  const body = gh > 100 ? 'Full, syrupy' : gh > 50 ? 'Medium' : 'Light';
  const acidity = sc > 2 ? 'Bright' : sc > 0.7 ? 'Moderate' : 'Low, round';

  let note: string;
  if (score >= 7) note = 'Excellent for naturals — Mg-driven fruit extraction with good body.';
  else if (score >= 4) note = 'Decent for naturals — try increasing Mg and lowering SC ratio.';
  else note = 'Not ideal for naturals — water is too lean for fruit-forward processing.';

  return { score, body, acidity, note };
}

function scoreCoFerment(ionTotals: Record<IonId, number>, gh: number, kh: number, sc: number): Profile {
  // Co-ferment/high impact: massive flavor already — clean, balanced water to let process shine
  const ghScore = clamp(10 - Math.abs(gh - 80) / 10, 0, 10) * 0.30;
  const scScore = clamp(10 - Math.abs(sc - 1.2) * 3, 0, 10) * 0.25;
  const khScore = clamp(10 - Math.abs(kh - 50) / 8, 0, 10) * 0.25;
  const purityPenalty = ionTotals.sodium > 15 || ionTotals.magnesium > 12 ? 2 : 0;
  const score = clamp(ghScore + scScore + khScore - purityPenalty, 0, 10);

  const body = gh > 120 ? 'Full' : gh > 60 ? 'Medium' : 'Light';
  const acidity = sc > 2 ? 'Bright' : sc > 0.7 ? 'Moderate' : 'Soft';

  let note: string;
  if (score >= 7) note = 'Excellent for co-ferments — clean water lets the process character come through.';
  else if (score >= 4) note = 'Decent — try dialing back Mg/Na to avoid clashing with heavy processing.';
  else note = 'Not ideal — water is too assertive for high-impact processes.';

  return { score, body, acidity, note };
}

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

export default function TasteProfileCard({ ionTotals, gh, kh }: Props) {
  const sc = ionTotals.chloride > 0 ? ionTotals.sulfate / ionTotals.chloride : ionTotals.sulfate > 0 ? 20 : 0;

  const light = scoreLightRoast(ionTotals, gh, kh, sc);
  const medium = scoreMediumRoast(ionTotals, gh, kh, sc);
  const washed = scoreWashed(ionTotals, gh, kh, sc);
  const natural = scoreNatural(ionTotals, gh, kh, sc);
  const cof = scoreCoFerment(ionTotals, gh, kh, sc);

  const hasData = ionTotals.sulfate > 0 || ionTotals.chloride > 0 || ionTotals.magnesium > 0 || ionTotals.calcium > 0;

  if (!hasData) {
    return (
      <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700/40 bg-gradient-to-r from-amber-600 to-orange-500">
          <Coffee className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white">Taste Profile</span>
        </div>
        <div className="px-5 py-6 text-center text-xs text-slate-500 italic">
          Set salt targets or mineral waters to see how this profile might taste.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700/40 bg-gradient-to-r from-amber-600 to-orange-500">
        <Coffee className="w-4 h-4 text-white" />
        <span className="text-sm font-semibold text-white">Taste Profile</span>
      </div>

      <div className="px-5 py-3 space-y-1 text-[11px] text-slate-400 border-b border-slate-700/30">
        <p className="flex items-center gap-1.5">
          <Droplets className="w-3 h-3 text-sky-400" />
          SC ratio (SO₄/Cl): <span className="font-mono text-sky-300 font-semibold">{sc.toFixed(1)}</span>
          <span className="text-slate-500">·</span>
          {scDescription(sc)}
        </p>
        <p className="flex items-center gap-1.5">
          <Wind className="w-3 h-3 text-cyan-400" />
          GH: <span className="font-mono text-cyan-300 font-semibold">{gh.toFixed(1)}</span> ppm
          <span className="text-slate-500">·</span>
          {ghDescriptor(gh)}
        </p>
        <p className="flex items-center gap-1.5">
          <Flame className="w-3 h-3 text-amber-400" />
          KH: <span className="font-mono text-amber-300 font-semibold">{kh.toFixed(1)}</span> ppm
          <span className="text-slate-500">·</span>
          {khDescriptor(kh)}
        </p>
      </div>

      <div className="px-5 py-3 space-y-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">By roast level</span>
        <ProfileRow label={<><Flame className="w-3 h-3 inline text-amber-400" /> Light / Extra Light</>} profile={light} />
        <ProfileRow label={<><Flame className="w-3 h-3 inline text-orange-400" /> Medium</>} profile={medium} />

        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 pt-1 block">By process</span>
        <ProfileRow label={<><Droplets className="w-3 h-3 inline text-sky-400" /> Washed</>} profile={washed} />
        <ProfileRow label={<><Wind className="w-3 h-3 inline text-emerald-400" /> Natural</>} profile={natural} />
        <ProfileRow label={<><Coffee className="w-3 h-3 inline text-purple-400" /> Co-ferment / High impact</>} profile={cof} />
      </div>
    </div>
  );
}
