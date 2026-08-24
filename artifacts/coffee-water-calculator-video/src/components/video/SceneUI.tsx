import { motion } from 'framer-motion';
import { Droplets, FlaskConical, Gauge, Scale, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

export const easeOut = [0.16, 1, 0.3, 1] as const;

export function Panel({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`glass ${className}`}
      initial={{ opacity: 0, y: '1.2vw', scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

export function Label({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'cyan' | 'lime' }) {
  const color = tone === 'cyan' ? 'var(--cyan)' : tone === 'lime' ? 'var(--lime)' : 'var(--muted)';
  return <span className="tiny-label mono" style={{ color }}>{children}</span>;
}

export function Pill({ children, tone = 'violet' }: { children: ReactNode; tone?: 'violet' | 'cyan' | 'lime' | 'coral' }) {
  const colors = {
    violet: { border: 'rgba(157,141,245,.3)', bg: 'rgba(157,141,245,.12)', color: 'var(--violet)' },
    cyan: { border: 'rgba(110,231,235,.3)', bg: 'rgba(110,231,235,.1)', color: 'var(--cyan)' },
    lime: { border: 'rgba(200,232,125,.3)', bg: 'rgba(200,232,125,.1)', color: 'var(--lime)' },
    coral: { border: 'rgba(231,155,121,.3)', bg: 'rgba(231,155,121,.1)', color: 'var(--coral)' },
  }[tone];
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '.35vw',
        padding: '.38vw .6vw',
        border: `1px solid ${colors.border}`,
        borderRadius: '999px',
        background: colors.bg,
        color: colors.color,
        fontSize: '.68vw',
        letterSpacing: '.04em',
      }}
    >
      {children}
    </span>
  );
}

export function Metric({
  icon,
  label,
  value,
  unit,
  tone = 'cyan',
}: {
  icon: 'drop' | 'flask' | 'gauge' | 'scale';
  label: string;
  value: string;
  unit?: string;
  tone?: 'cyan' | 'violet' | 'lime' | 'coral';
}) {
  const colors = { cyan: 'var(--cyan)', violet: 'var(--violet)', lime: 'var(--lime)', coral: 'var(--coral)' };
  const Icon = icon === 'drop' ? Droplets : icon === 'flask' ? FlaskConical : icon === 'gauge' ? Gauge : Scale;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.7vw' }}>
      <div style={{ width: '2.2vw', height: '2.2vw', display: 'grid', placeItems: 'center', border: `1px solid ${colors[tone]}44`, borderRadius: '.7vw', background: `${colors[tone]}12`, color: colors[tone] }}>
        <Icon size="1.05vw" strokeWidth={1.8} />
      </div>
      <div>
        <Label>{label}</Label>
        <div className="metric-number" style={{ color: colors[tone], marginTop: '.28vw' }}>
          {value}<span style={{ fontSize: '.78vw', marginLeft: '.25vw', letterSpacing: '-.02em', color: 'var(--muted)' }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return (
    <div>
      <Label tone="cyan">{eyebrow}</Label>
      <h2 className="display" style={{ margin: '.55vw 0 .42vw', fontSize: '2.7vw', lineHeight: 1.02, letterSpacing: '-.075em', fontWeight: 800 }}>
        {title}
      </h2>
      {detail && <p style={{ color: 'var(--muted)', fontSize: '1vw', lineHeight: 1.5, maxWidth: '30vw', margin: 0 }}>{detail}</p>}
    </div>
  );
}

export function Sparkline({ color = 'var(--cyan)', points = '0,34 28,28 52,31 78,18 102,22 126,8 150,14' }: { color?: string; points?: string }) {
  return (
    <svg viewBox="0 0 150 42" preserveAspectRatio="none" style={{ width: '100%', height: '3vw', overflow: 'visible' }}>
      <path d={`M ${points}`} fill="none" stroke={color} strokeOpacity=".16" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WaterDrop({ size = 10, color = 'var(--cyan)', delay = 0 }: { size?: number; color?: string; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: '-.6vw', scale: .6 }}
      animate={{ opacity: [0, 1, .55], y: ['-.6vw', '0vw', '.15vw'], scale: [0.6, 1, .92] }}
      transition={{ delay, duration: 1.2, ease: easeOut }}
      style={{ display: 'inline-block', width: `${size / 10}vw`, height: `${size / 10}vw`, borderRadius: '60% 60% 60% 0', transform: 'rotate(-45deg)', background: color, boxShadow: `0 0 .8vw ${color}55` }}
    />
  );
}

export function SaltRow({ name, amount, color, index }: { name: string; amount: string; color: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: '-.8vw' }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: .25 + index * .12, duration: .4, ease: easeOut }}
      style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '.72vw 0', borderBottom: '1px solid rgba(190,204,236,.08)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '.55vw' }}>
        <span style={{ width: '.52vw', height: '.52vw', borderRadius: '50%', background: color, boxShadow: `0 0 .8vw ${color}88` }} />
        <span style={{ fontSize: '.86vw', color: '#dce4f1' }}>{name}</span>
      </div>
      <span className="mono" style={{ color, fontSize: '.78vw' }}>{amount}</span>
    </motion.div>
  );
}

export function MiniHeader({ number, label, color = 'var(--cyan)' }: { number: string; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.55vw', marginBottom: '1.05vw' }}>
      <span className="mono" style={{ color, fontSize: '.7vw', letterSpacing: '.12em' }}>{number}</span>
      <span style={{ width: '1.3vw', height: '1px', background: color, opacity: .7 }} />
      <Label>{label}</Label>
    </div>
  );
}

export function RecipeStamp({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.35vw', color: 'var(--muted)', fontSize: '.68vw' }}>
      <Sparkles size=".8vw" color="var(--lime)" />
      <span className="mono">{children}</span>
    </div>
  );
}