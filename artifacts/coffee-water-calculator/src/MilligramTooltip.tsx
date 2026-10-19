import { createElement, type ReactNode } from 'react';

const gramFormatter = new Intl.NumberFormat('en-US', {
  useGrouping: false,
  maximumSignificantDigits: 7,
});

export function formatMilligramsAsGrams(amountMg: number): string | undefined {
  if (!Number.isFinite(amountMg)) return undefined;
  return `${gramFormatter.format(amountMg / 1000)} g`;
}

export default function MilligramTooltip({
  amountMg,
  suffix = '',
  children,
}: {
  amountMg: number;
  suffix?: string;
  children?: ReactNode;
}) {
  const grams = formatMilligramsAsGrams(amountMg);
  return (
    <span
      data-mass-tooltip="mg"
      title={grams ? `${grams}${suffix}` : undefined}
    >
      {children}
    </span>
  );
}

const MASS_VALUE_PATTERN = /(?<![\w.])([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*mg(\/drop)?(?![\w/])/gi;

export function MilligramTooltipText({ text }: { text: string }) {
  const output: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = MASS_VALUE_PATTERN.exec(text)) !== null) {
    const [, amountText, suffix = ''] = match;
    const amountMg = Number(amountText.replaceAll(',', ''));
    if (match.index > cursor) output.push(text.slice(cursor, match.index));

    output.push(createElement(
      MilligramTooltip,
      { amountMg, suffix, key: `mg-tooltip-${key}` },
      match[0],
    ));
    cursor = match.index + match[0].length;
    key += 1;
  }

  if (cursor === 0) return text;
  if (cursor < text.length) output.push(text.slice(cursor));
  return <>{output}</>;
}
