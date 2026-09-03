const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const WATERMANCER_METADATA_KEY = 'Watermancer-Recipe';

function matchesPngSignature(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24)
    | ((bytes[offset + 1] ?? 0) << 16)
    | ((bytes[offset + 2] ?? 0) << 8)
    | (bytes[offset + 3] ?? 0)
  ) >>> 0;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function asciiBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function asciiString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function chunkType(bytes: Uint8Array, offset: number): string {
  return asciiString(bytes.slice(offset + 4, offset + 8));
}

function findIendOffset(bytes: Uint8Array): number | null {
  if (!matchesPngSignature(bytes)) return null;
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= bytes.length) {
    const dataLength = readUint32(bytes, offset);
    const chunkEnd = offset + 12 + dataLength;
    if (chunkEnd > bytes.length) return null;
    if (chunkType(bytes, offset) === 'IEND') return offset;
    offset = chunkEnd;
  }
  return null;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1
        ? (crc >>> 1) ^ 0xedb88320
        : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = asciiBytes(type);
  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const checksumInput = new Uint8Array(typeBytes.length + data.length);
  checksumInput.set(typeBytes);
  checksumInput.set(data, typeBytes.length);
  writeUint32(chunk, 8 + data.length, crc32(checksumInput));
  return chunk;
}

function createMetadataChunk(json: string): Uint8Array {
  const keyword = asciiBytes(WATERMANCER_METADATA_KEY);
  const text = new TextEncoder().encode(json);
  // iTXt: keyword, compression flag/method, language tag, translated
  // keyword, then UTF-8 text. The payload is intentionally uncompressed.
  const data = new Uint8Array(keyword.length + 5 + text.length);
  let offset = 0;
  data.set(keyword, offset);
  offset += keyword.length;
  data[offset] = 0;
  offset += 1;
  data[offset] = 0;
  offset += 1;
  data[offset] = 0;
  offset += 1;
  data[offset] = 0;
  offset += 1;
  data[offset] = 0;
  offset += 1;
  data.set(text, offset);
  return createChunk('iTXt', data);
}

export function embedWaterRecipeJsonInPng(
  pngBytes: ArrayBuffer | Uint8Array,
  json: string,
): Uint8Array<ArrayBuffer> {
  const bytes = pngBytes instanceof Uint8Array ? pngBytes : new Uint8Array(pngBytes);
  const iendOffset = findIendOffset(bytes);
  if (iendOffset === null) {
    throw new Error('The Watermancer image is not a valid PNG.');
  }
  const metadata = createMetadataChunk(json);
  const output = new Uint8Array(new ArrayBuffer(bytes.length + metadata.length));
  output.set(bytes.slice(0, iendOffset), 0);
  output.set(metadata, iendOffset);
  output.set(bytes.slice(iendOffset), iendOffset + metadata.length);
  return output;
}

export function extractWaterRecipeJsonFromPng(
  pngBytes: ArrayBuffer | Uint8Array,
): string | null {
  const bytes = pngBytes instanceof Uint8Array ? pngBytes : new Uint8Array(pngBytes);
  if (!matchesPngSignature(bytes)) return null;

  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= bytes.length) {
    const dataLength = readUint32(bytes, offset);
    const dataStart = offset + 8;
    const chunkEnd = offset + 12 + dataLength;
    if (chunkEnd > bytes.length) return null;
    if (chunkType(bytes, offset) === 'iTXt') {
      const data = bytes.slice(dataStart, dataStart + dataLength);
      const keywordEnd = data.indexOf(0);
      if (keywordEnd < 0 || asciiString(data.slice(0, keywordEnd)) !== WATERMANCER_METADATA_KEY) {
        offset = chunkEnd;
        continue;
      }
      let textOffset = keywordEnd + 1;
      if (textOffset + 2 > data.length) return null;
      const compressionFlag = data[textOffset];
      textOffset += 2;
      if (compressionFlag !== 0) return null;
      const languageEnd = data.indexOf(0, textOffset);
      if (languageEnd < 0) return null;
      const translatedKeywordEnd = data.indexOf(0, languageEnd + 1);
      if (translatedKeywordEnd < 0) return null;
      return new TextDecoder().decode(data.slice(translatedKeywordEnd + 1));
    }
    if (chunkType(bytes, offset) === 'IEND') return null;
    offset = chunkEnd;
  }
  return null;
}

export const RECIPE_SHARE_CARD_WIDTH = 1200;
const RECIPE_SHARE_CARD_PADDING = 56;

export type RecipeShareCardWaterStep = {
  label: string;
  name: string;
  amount: string;
};

export type RecipeShareCardSaltStep = {
  name: string;
  formula: string;
  form: string;
  amount: string;
  contributionPpm: number;
  note?: string;
};

export type RecipeShareCardIon = {
  id: string;
  name: string;
  formula: string;
  value: number;
  category: 'Cations' | 'Anions' | 'Other modeled ions';
};

export type RecipeShareCardProfileTarget = {
  id: string;
  name: string;
  formula: string;
  value: number;
};

export type RecipeShareCardProfile = {
  id?: string;
  name: string;
  source: string;
  details?: string;
  targets: RecipeShareCardProfileTarget[];
};

export type RecipeShareCardModel = {
  recipeName: string;
  batchLabel: string;
  waterSteps: RecipeShareCardWaterStep[];
  saltTitle: string;
  saltIntro: string;
  saltSteps: RecipeShareCardSaltStep[];
  mixingNote?: string;
  finalStep: string;
  tdsTarget: number;
  analysis: {
    ions: RecipeShareCardIon[];
    tds: number;
    gh: number;
    kh: number;
  };
  profile?: RecipeShareCardProfile;
  concentrateGuide?: {
    stockLabel: string;
    doses: Array<{ label: string; milliliters: number; drops: number }>;
    dropsPerMl: number;
  };
};

export type RecipeShareCardInput = RecipeShareCardModel;

function finiteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Wraps text without ellipsizing it. Long individual words are split so labels
 * cannot escape the fixed SVG card bounds.
 */
export function wrapRecipeShareCardText(text: string, maxCharacters: number): string[] {
  const limit = Math.max(1, Math.floor(maxCharacters));
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (word.length > limit) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let index = 0; index < word.length; index += limit) {
        lines.push(word.slice(index, index + limit));
      }
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > limit) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

export function createRecipeShareCardModel(input: RecipeShareCardInput): RecipeShareCardModel {
  return {
    ...input,
    recipeName: input.recipeName.trim() || 'Mineral recipe',
    batchLabel: input.batchLabel.trim() || 'Finished water',
    saltTitle: input.saltTitle.trim() || 'Add the minerals in order',
    saltIntro: input.saltIntro.trim(),
    waterSteps: input.waterSteps.map(step => ({
      label: step.label.trim() || 'Water',
      name: step.name.trim() || 'Unnamed water',
      amount: step.amount.trim() || '0 mL',
    })),
    saltSteps: input.saltSteps.map(step => ({
      ...step,
      name: step.name.trim() || 'Unnamed mineral',
      formula: step.formula.trim(),
      form: step.form.trim(),
      amount: step.amount.trim() || 'None needed',
      contributionPpm: finiteNumber(step.contributionPpm),
      note: step.note?.trim() || undefined,
    })),
    mixingNote: input.mixingNote?.trim() || undefined,
    finalStep: input.finalStep.trim() || 'Verify the water is clear and all minerals are dissolved before brewing.',
    tdsTarget: finiteNumber(input.tdsTarget),
    analysis: {
      ...input.analysis,
      ions: input.analysis.ions.map(ion => ({
        ...ion,
        name: ion.name.trim() || ion.id,
        formula: ion.formula.trim(),
        value: finiteNumber(ion.value),
      })),
      tds: finiteNumber(input.analysis.tds),
      gh: finiteNumber(input.analysis.gh),
      kh: finiteNumber(input.analysis.kh),
    },
    profile: input.profile
      ? {
        ...(input.profile.id ? { id: input.profile.id.trim() } : {}),
        name: input.profile.name.trim() || 'Custom target profile',
        source: input.profile.source.trim() || 'Watermancer',
        ...(input.profile.details?.trim() ? { details: input.profile.details.trim() } : {}),
        targets: input.profile.targets.map(target => ({
          id: target.id.trim(),
          name: target.name.trim() || target.id.trim(),
          formula: target.formula.trim(),
          value: finiteNumber(target.value),
        })),
      }
      : undefined,
    concentrateGuide: input.concentrateGuide
      ? {
        stockLabel: input.concentrateGuide.stockLabel.trim() || 'Concentrate',
        doses: input.concentrateGuide.doses.map(dose => ({
          label: dose.label.trim(),
          milliliters: finiteNumber(dose.milliliters),
          drops: Math.max(0, Math.round(finiteNumber(dose.drops))),
        })),
        dropsPerMl: finiteNumber(input.concentrateGuide.dropsPerMl),
      }
      : undefined,
  };
}

function svgText(
  x: number,
  y: number,
  text: string,
  options: {
    fill?: string;
    size?: number;
    weight?: number;
    family?: string;
    anchor?: 'start' | 'middle' | 'end';
    letterSpacing?: number;
  } = {},
): string {
  const {
    fill = '#d8e9ef',
    size = 18,
    weight = 400,
    family = 'Arial, Helvetica, sans-serif',
    anchor = 'start',
    letterSpacing,
  } = options;
  const spacing = letterSpacing === undefined ? '' : ` letter-spacing="${letterSpacing}"`;
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}"${spacing}>${escapeXml(text)}</text>`;
}

function svgWrappedText(
  x: number,
  y: number,
  text: string,
  maxCharacters: number,
  options: Parameters<typeof svgText>[3] & { lineHeight?: number } = {},
): { svg: string; lines: string[] } {
  const { lineHeight = 22, ...textOptions } = options;
  const lines = wrapRecipeShareCardText(text, maxCharacters);
  return {
    lines,
    svg: lines.map((line, index) => svgText(x, y + index * lineHeight, line, textOptions)).join(''),
  };
}

function roundedRect(x: number, y: number, width: number, height: number, fill: string, stroke?: string): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1"` : ''}/>`;
}

function sectionLabel(x: number, y: number, label: string, color = '#79d9df'): string {
  return svgText(x, y, label.toUpperCase(), {
    fill: color,
    size: 13,
    weight: 700,
    letterSpacing: 2.1,
  });
}

function renderWaterSection(model: RecipeShareCardModel, x: number, y: number, width: number): { svg: string; height: number } {
  const innerX = x + 26;
  const innerWidth = width - 52;
  let cursor = y + 58;
  let svg = '';
  for (const [index, step] of model.waterSteps.entries()) {
    const nameLines = wrapRecipeShareCardText(step.name, 36);
    const rowHeight = Math.max(58, nameLines.length * 20 + 28);
    svg += roundedRect(innerX, cursor, innerWidth, rowHeight, index % 2 === 0 ? '#17384a' : '#153346', '#2a6473');
    svg += svgText(innerX + 16, cursor + 22, step.label.toUpperCase(), {
      fill: '#80b8c2',
      size: 10,
      weight: 700,
      letterSpacing: 1.4,
    });
    svg += nameLines.map((line, lineIndex) => svgText(
      innerX + 16,
      cursor + 43 + lineIndex * 20,
      line,
      { fill: '#ecf7f8', size: 17, weight: 700 },
    )).join('');
    svg += svgText(innerX + innerWidth - 16, cursor + rowHeight / 2 + 6, step.amount, {
      fill: '#9ce7e7',
      size: 21,
      weight: 700,
      family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      anchor: 'end',
    });
    cursor += rowHeight + 10;
  }
  const height = Math.max(100, cursor - y + 18);
  return {
    svg: roundedRect(x, y, width, height, '#102d3d', '#285466')
      + sectionLabel(innerX, y + 31, '01 · Prepare the water')
      + svg,
    height,
  };
}

function renderSaltSection(model: RecipeShareCardModel, x: number, y: number, width: number): { svg: string; height: number } {
  const innerX = x + 26;
  const innerWidth = width - 52;
  let cursor = y + 58;
  let svg = '';
  const intro = svgWrappedText(innerX, cursor, model.saltIntro, 73, {
    fill: '#a8c3cc',
    size: 14,
    lineHeight: 20,
  });
  cursor += intro.lines.length * 20 + 15;
  for (const [index, step] of model.saltSteps.entries()) {
    const nameLines = wrapRecipeShareCardText(`${index + 1}. ${step.name}`, 41);
    const meta = [step.form, step.formula].filter(Boolean).join(' · ');
    const metaLines = meta ? wrapRecipeShareCardText(meta, 50) : [];
    const noteLines = step.note ? wrapRecipeShareCardText(step.note, 57) : [];
    const rowHeight = Math.max(74, 20 + nameLines.length * 21 + metaLines.length * 17 + noteLines.length * 17);
    const isLast = Boolean(step.note);
    svg += roundedRect(innerX, cursor, innerWidth, rowHeight, isLast ? '#513245' : index % 2 === 0 ? '#20334d' : '#213047', isLast ? '#df8797' : '#3e5c7b');
    svg += nameLines.map((line, lineIndex) => svgText(
      innerX + 16,
      cursor + 26 + lineIndex * 21,
      line,
      { fill: isLast ? '#fff0f2' : '#e7f2ff', size: 17, weight: 700 },
    )).join('');
    const metaY = cursor + 26 + nameLines.length * 21;
    svg += metaLines.map((line, lineIndex) => svgText(
      innerX + 16,
      metaY + lineIndex * 17,
      line,
      { fill: '#9eb9c9', size: 12, weight: 600 },
    )).join('');
    if (noteLines.length > 0) {
      const noteY = metaY + metaLines.length * 17 + 16;
      svg += noteLines.map((line, lineIndex) => svgText(
        innerX + 16,
        noteY + lineIndex * 17,
        line,
        { fill: '#ffc8cf', size: 11, weight: 700, letterSpacing: 0.7 },
      )).join('');
    }
    svg += svgText(innerX + innerWidth - 16, cursor + 31, step.amount, {
      fill: isLast ? '#fff2b5' : '#b8e6ff',
      size: 20,
      weight: 700,
      family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      anchor: 'end',
    });
    if (step.contributionPpm > 0) {
      svg += svgText(innerX + innerWidth - 16, cursor + rowHeight - 15, `${step.contributionPpm.toFixed(1)} ppm total`, {
        fill: '#8ed9e6',
        size: 11,
        weight: 600,
        family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        anchor: 'end',
      });
    }
    cursor += rowHeight + 10;
  }
  if (model.saltSteps.length === 0) {
    svg += svgText(innerX, cursor + 16, 'No mineral salts are needed for this recipe.', { fill: '#a8c3cc', size: 14 });
    cursor += 36;
  }
  if (model.mixingNote) {
    const noteLines = wrapRecipeShareCardText(model.mixingNote, 72);
    const noteHeight = noteLines.length * 19 + 34;
    svg += roundedRect(innerX, cursor, innerWidth, noteHeight, '#173b4a', '#4c8791');
    svg += svgText(innerX + 16, cursor + 22, 'MIXING VESSEL', {
      fill: '#8ed9d7',
      size: 10,
      weight: 700,
      letterSpacing: 1.4,
    });
    svg += noteLines.map((line, index) => svgText(
      innerX + 16,
      cursor + 42 + index * 19,
      line,
      { fill: '#d1eef0', size: 13, weight: 600 },
    )).join('');
    cursor += noteHeight + 10;
  }
  const height = Math.max(124, cursor - y + 18);
  svg = roundedRect(x, y, width, height, '#102d3d', '#285466')
    + sectionLabel(innerX, y + 31, model.saltTitle)
    + svg;
  return { svg, height };
}

function renderAnalysisSection(model: RecipeShareCardModel, x: number, y: number, width: number): { svg: string; height: number } {
  const innerX = x + 26;
  const innerWidth = width - 52;
  let cursor = y + 58;
  let svg = '';
  svg += svgText(innerX, y + 31, 'MINERAL ANALYSIS', {
    fill: '#47737a',
    size: 13,
    weight: 700,
    letterSpacing: 2.1,
  });
  svg += svgText(x + width - 26, y + 31, 'FINAL MIX', {
    fill: '#0d6170',
    size: 11,
    weight: 700,
    letterSpacing: 1.6,
    anchor: 'end',
  });
  const nameLines = wrapRecipeShareCardText(model.recipeName, 26);
  svg += nameLines.map((line, index) => svgText(
    x + width / 2,
    cursor + 25 + index * 25,
    line,
    { fill: '#0d6170', size: 23, weight: 700, family: 'Georgia, serif', anchor: 'middle' },
  )).join('');
  cursor += Math.max(56, nameLines.length * 25 + 30);
  svg += `<line x1="${innerX}" y1="${cursor}" x2="${innerX + innerWidth}" y2="${cursor}" stroke="#0d6170" stroke-opacity="0.3"/>`;
  cursor += 24;

  const categories: Array<RecipeShareCardIon['category']> = ['Cations', 'Anions', 'Other modeled ions'];
  for (const category of categories) {
    const ions = model.analysis.ions.filter(ion => ion.category === category);
    if (ions.length === 0) continue;
    svg += svgText(innerX, cursor, category.toUpperCase(), {
      fill: '#47737a',
      size: 11,
      weight: 700,
      letterSpacing: 1.7,
    });
    cursor += 18;
    for (const ion of ions) {
      const ionName = wrapRecipeShareCardText(`${ion.formula} · ${ion.name}`, 25);
      const rowHeight = Math.max(38, ionName.length * 16 + 16);
      svg += `<line x1="${innerX}" y1="${cursor + rowHeight}" x2="${innerX + innerWidth}" y2="${cursor + rowHeight}" stroke="#0d6170" stroke-opacity="0.14"/>`;
      svg += ionName.map((line, index) => svgText(
        innerX,
        cursor + 18 + index * 16,
        line,
        { fill: '#173f49', size: 13, weight: index === 0 ? 700 : 600 },
      )).join('');
      svg += svgText(innerX + innerWidth, cursor + rowHeight / 2 + 5, ion.value.toFixed(1), {
        fill: '#0d6170',
        size: 18,
        weight: 700,
        family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        anchor: 'end',
      });
      svg += svgText(innerX + innerWidth, cursor + rowHeight / 2 + 20, 'mg/L', {
        fill: '#47737a',
        size: 9,
        weight: 700,
        letterSpacing: 1.1,
        anchor: 'end',
      });
      cursor += rowHeight;
    }
    cursor += 18;
  }

  const metricTop = cursor;
  svg += `<line x1="${innerX}" y1="${metricTop}" x2="${innerX + innerWidth}" y2="${metricTop}" stroke="#0d6170" stroke-opacity="0.3"/>`;
  const metrics = [
    ['APPROX. TDS', model.analysis.tds],
    ['GH', model.analysis.gh],
    ['KH', model.analysis.kh],
  ] as const;
  const metricWidth = innerWidth / metrics.length;
  metrics.forEach(([label, value], index) => {
    const metricX = innerX + metricWidth * index + metricWidth / 2;
    svg += svgText(metricX, metricTop + 29, label, {
      fill: '#47737a',
      size: 10,
      weight: 700,
      letterSpacing: 1.2,
      anchor: 'middle',
    });
    svg += svgText(metricX, metricTop + 56, value.toFixed(0), {
      fill: '#0d6170',
      size: 25,
      weight: 700,
      family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      anchor: 'middle',
    });
    svg += svgText(metricX, metricTop + 72, 'ppm', {
      fill: '#47737a',
      size: 9,
      weight: 700,
      letterSpacing: 1,
      anchor: 'middle',
    });
  });
  cursor = metricTop + 96;
  const ratio = model.analysis.kh > 0
    ? `${(model.analysis.gh / model.analysis.kh).toFixed(2)}:1`
    : model.analysis.gh > 0 ? '∞:1' : '—';
  svg += svgText(innerX, cursor + 4, `Estimated final TDS: ${model.analysis.tds.toFixed(0)} ppm`, {
    fill: '#47737a',
    size: 11,
    weight: 700,
  });
  svg += svgText(innerX + innerWidth, cursor + 4, `GH:KH ${ratio}`, {
    fill: '#47737a',
    size: 11,
    weight: 700,
    family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
    anchor: 'end',
  });
  const height = cursor - y + 32;
  return {
    svg: roundedRect(x, y, width, height, '#e9f3ee', '#7cc3c5') + svg,
    height,
  };
}

function renderConcentrateGuide(model: RecipeShareCardModel, x: number, y: number, width: number): { svg: string; height: number } {
  if (!model.concentrateGuide) return { svg: '', height: 0 };
  const innerX = x + 22;
  const innerWidth = width - 44;
  const height = 150;
  let svg = roundedRect(x, y, width, height, '#e9f3ee', '#7cc3c5');
  svg += svgText(innerX, y + 27, 'CONCENTRATE DOSING REFERENCE', {
    fill: '#47737a',
    size: 11,
    weight: 700,
    letterSpacing: 1.5,
  });
  svg += svgText(x + width - 22, y + 27, model.concentrateGuide.stockLabel, {
    fill: '#0d6170',
    size: 11,
    weight: 700,
    anchor: 'end',
  });
  const doseWidth = innerWidth / Math.max(1, model.concentrateGuide.doses.length);
  model.concentrateGuide.doses.forEach((dose, index) => {
    const doseX = innerX + index * doseWidth;
    svg += roundedRect(doseX, y + 44, doseWidth - 10, 72, '#ffffff', '#b2d3cf');
    svg += svgText(doseX + 14, y + 66, dose.label, { fill: '#47737a', size: 11, weight: 700 });
    svg += svgText(doseX + 14, y + 91, `${dose.milliliters.toFixed(1)} mL`, {
      fill: '#0d6170',
      size: 19,
      weight: 700,
      family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
    });
    svg += svgText(doseX + 14, y + 108, `≈ ${dose.drops.toLocaleString()} drops`, { fill: '#47737a', size: 10, weight: 600 });
  });
  svg += svgText(innerX, y + 138, `Calibrated setting: ${model.concentrateGuide.dropsPerMl.toFixed(1)} drops per mL`, {
    fill: '#47737a',
    size: 10,
    weight: 600,
  });
  return { svg, height };
}

/**
 * Creates a content-only SVG. Its height is calculated from wrapped content,
 * so the same recipe has the same pixels regardless of browser viewport.
 */
export function buildRecipeShareCardSvg(input: RecipeShareCardInput): { svg: string; width: number; height: number } {
  const model = createRecipeShareCardModel(input);
  const contentWidth = RECIPE_SHARE_CARD_WIDTH - RECIPE_SHARE_CARD_PADDING * 2;
  const leftWidth = 690;
  const rightWidth = contentWidth - leftWidth - 28;
  const titleLines = wrapRecipeShareCardText(model.recipeName, 36);
  const headerHeight = Math.max(154, 90 + titleLines.length * 34);
  const top = RECIPE_SHARE_CARD_PADDING + headerHeight + 28;
  const water = renderWaterSection(model, RECIPE_SHARE_CARD_PADDING, top, leftWidth);
  const analysis = renderAnalysisSection(model, RECIPE_SHARE_CARD_PADDING + leftWidth + 28, top, rightWidth);
  const saltTop = top + water.height + 20;
  const salt = renderSaltSection(model, RECIPE_SHARE_CARD_PADDING, saltTop, leftWidth);
  const guideTop = top + analysis.height + 20;
  const guide = renderConcentrateGuide(model, RECIPE_SHARE_CARD_PADDING + leftWidth + 28, guideTop, rightWidth);
  const finalTop = saltTop + salt.height + 20;
  const finalLines = wrapRecipeShareCardText(model.finalStep, 76);
  const finalHeight = Math.max(92, finalLines.length * 21 + 50);
  const contentBottom = Math.max(finalTop + finalHeight, guideTop + guide.height);
  const height = contentBottom + RECIPE_SHARE_CARD_PADDING;
  const headerX = RECIPE_SHARE_CARD_PADDING;
  let body = `<rect width="${RECIPE_SHARE_CARD_WIDTH}" height="${height}" fill="#071a2a"/>`;
  body += `<rect x="0" y="0" width="${RECIPE_SHARE_CARD_WIDTH}" height="${RECIPE_SHARE_CARD_PADDING + headerHeight}" fill="#0a2435"/>`;
  body += `<circle cx="${RECIPE_SHARE_CARD_WIDTH - 95}" cy="82" r="66" fill="#1a6670" fill-opacity="0.2"/>`;
  body += `<circle cx="${RECIPE_SHARE_CARD_WIDTH - 140}" cy="30" r="35" fill="#55c9c5" fill-opacity="0.1"/>`;
  body += svgText(headerX, 62, 'WATERMANCER · COFFEE WATER RECIPE', {
    fill: '#77d8d7',
    size: 14,
    weight: 700,
    letterSpacing: 2.8,
  });
  body += titleLines.map((line, index) => svgText(
    headerX,
    102 + index * 34,
    line,
    { fill: '#f2fbfa', size: 31, weight: 700, family: 'Georgia, serif' },
  )).join('');
  body += svgText(headerX, 102 + titleLines.length * 34 + 6, model.batchLabel, { fill: '#a4c5cc', size: 14, weight: 600 });
  body += roundedRect(RECIPE_SHARE_CARD_WIDTH - RECIPE_SHARE_CARD_PADDING - 260, 44, 260, 72, '#123c4a', '#2b7880');
  body += svgText(RECIPE_SHARE_CARD_WIDTH - RECIPE_SHARE_CARD_PADDING - 240, 69, 'ESTIMATED FINAL TDS', {
    fill: '#8ed9d7',
    size: 11,
    weight: 700,
    letterSpacing: 1.5,
  });
  body += svgText(RECIPE_SHARE_CARD_WIDTH - RECIPE_SHARE_CARD_PADDING - 240, 99, `${model.analysis.tds.toFixed(0)} ppm`, {
    fill: '#f6ffff',
    size: 26,
    weight: 700,
    family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  });
  body += water.svg + salt.svg + analysis.svg + guide.svg;
  body += roundedRect(RECIPE_SHARE_CARD_PADDING, finalTop, leftWidth, finalHeight, '#12382f', '#3d8f78');
  body += sectionLabel(RECIPE_SHARE_CARD_PADDING + 26, finalTop + 31, 'Final · Verify and brew', '#8ce1b1');
  body += finalLines.map((line, index) => svgText(
    RECIPE_SHARE_CARD_PADDING + 26,
    finalTop + 58 + index * 21,
    line,
    { fill: '#dcf8e8', size: 14, weight: 600 },
  )).join('');
  if (model.tdsTarget > 0) {
    body += svgText(RECIPE_SHARE_CARD_PADDING + leftWidth - 26, finalTop + 31, `${model.tdsTarget.toFixed(0)} ppm target`, {
      fill: '#baf5d0',
      size: 13,
      weight: 700,
      family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      anchor: 'end',
    });
  }
  body += svgText(RECIPE_SHARE_CARD_WIDTH / 2, height - 20, 'mg/L = ppm · Mix carefully and adjust extraction to taste', {
    fill: '#6c929d',
    size: 11,
    weight: 600,
    anchor: 'middle',
    letterSpacing: 0.5,
  });
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${RECIPE_SHARE_CARD_WIDTH}" height="${height}" viewBox="0 0 ${RECIPE_SHARE_CARD_WIDTH} ${height}">${body}</svg>`,
    width: RECIPE_SHARE_CARD_WIDTH,
    height,
  };
}

export async function rasterizeRecipeShareCard(
  svg: string,
  width: number,
  height: number,
  format: 'png' | 'jpeg' = 'png',
  pixelRatio = 2,
): Promise<Blob> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('Recipe card images can only be created in a browser.');
  }
  const safeRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 2;
  const sourceBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const sourceUrl = URL.createObjectURL(sourceBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not decode the recipe share card.'));
      element.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * safeRatio);
    canvas.height = Math.ceil(height * safeRatio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create the recipe share card canvas.');
    context.scale(safeRatio, safeRatio);
    context.fillStyle = '#071a2a';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode the recipe share card.'));
      }, `image/${format}`, format === 'jpeg' ? 0.95 : undefined);
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}