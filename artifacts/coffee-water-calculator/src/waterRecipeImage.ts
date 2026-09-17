import jsQR from 'jsqr';
import QRCode from 'qrcode';

const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const WATERMANCER_METADATA_KEY = 'Watermancer-Recipe';
export const WATERMANCER_QR_PREFIX = 'WMQR1:';
export type RecipeImageMimeType = 'image/png' | 'image/webp' | 'image/jpeg';

const RECIPE_ION_COLORS: Record<string, string> = {
  sodium: '#fb7185',
  potassium: '#c084fc',
  magnesium: '#fde047',
  calcium: '#fb923c',
  chloride: '#60a5fa',
  sulfate: '#818cf8',
  bicarbonate: '#5eead4',
  carbonate: '#a3e635',
};

function recipeIonColor(id: string): string {
  return RECIPE_ION_COLORS[id] ?? '#0d6170';
}

export function getRecipeImageMimeType(
  fileName: string,
  declaredType = '',
): RecipeImageMimeType | null {
  const normalizedType = declaredType.toLowerCase().split(';', 1)[0];
  if (normalizedType === 'image/png' || normalizedType === 'image/webp' || normalizedType === 'image/jpeg') {
    return normalizedType;
  }
  const normalizedName = fileName.toLowerCase();
  if (normalizedName.endsWith('.png')) return 'image/png';
  if (normalizedName.endsWith('.webp')) return 'image/webp';
  if (normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

function matchesBytes(bytes: Uint8Array, signature: ArrayLike<number>, offset = 0): boolean {
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[offset + index] !== signature[index]) return false;
  }
  return true;
}

function matchesPngSignature(bytes: Uint8Array): boolean {
  return matchesBytes(bytes, PNG_SIGNATURE);
}

export function isPngImageBytes(input: ArrayBuffer | Uint8Array): boolean {
  return matchesPngSignature(input instanceof Uint8Array ? input : new Uint8Array(input));
}

export function detectRecipeImageMimeType(
  input: ArrayBuffer | Uint8Array,
): RecipeImageMimeType | null {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (matchesPngSignature(bytes)) return 'image/png';
  if (
    matchesBytes(bytes, [0xff, 0xd8, 0xff])
  ) {
    return 'image/jpeg';
  }
  if (
    matchesBytes(bytes, [0x52, 0x49, 0x46, 0x46])
    && matchesBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }
  return null;
}

export function resolveRecipeImageMimeType(
  fileName: string,
  declaredType: string,
  input: ArrayBuffer | Uint8Array,
): RecipeImageMimeType | null {
  return detectRecipeImageMimeType(input) ?? getRecipeImageMimeType(fileName, declaredType);
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

export function extractWaterRecipeJsonFromQrText(text: string): string | null {
  return text.startsWith(WATERMANCER_QR_PREFIX)
    ? text.slice(WATERMANCER_QR_PREFIX.length)
    : null;
}

export async function createWaterRecipeQrDataUrl(
  json: string,
  width = 460,
): Promise<string> {
  return createAdaptiveQrDataUrl(`${WATERMANCER_QR_PREFIX}${json}`, width);
}

async function createAdaptiveQrDataUrl(data: string, width: number): Promise<string> {
  // Prefer strong correction for small recipes, then step down only when the
  // complete recovery payload approaches the QR capacity limit. This keeps
  // large two-water recipes exportable without dropping their data.
  let lastError: unknown;
  for (const errorCorrectionLevel of ['H', 'Q', 'M', 'L'] as const) {
    try {
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel,
        margin: 4,
        width,
        color: {
          dark: '#071a2a',
          light: '#ffffff',
        },
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Could not fit the recipe recovery payload into a QR code.');
}

export async function createWaterRecipeShareQrDataUrl(
  url: string,
  width = 460,
): Promise<string> {
  return createAdaptiveQrDataUrl(url, width);
}

export async function extractWaterRecipeJsonFromQrImage(
  imageBytes: ArrayBuffer | Uint8Array,
  mimeType: RecipeImageMimeType = 'image/png',
): Promise<string | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  const bytes = imageBytes instanceof Uint8Array ? imageBytes : new Uint8Array(imageBytes);
  const imageBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const sourceUrl = URL.createObjectURL(new Blob([imageBuffer], { type: mimeType }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not decode the recipe card image.'));
      element.src = sourceUrl;
    });
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width <= 0 || height <= 0) return null;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    const scanRegion = (x: number, y: number, regionWidth: number, regionHeight: number): string | null => {
      canvas.width = regionWidth;
      canvas.height = regionHeight;
      context.drawImage(image, x, y, regionWidth, regionHeight, 0, 0, regionWidth, regionHeight);
      const imageData = context.getImageData(0, 0, regionWidth, regionHeight);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      return decoded ? extractWaterRecipeJsonFromQrText(decoded.data) : null;
    };

    // Share cards contain both a recovery QR and a share-link QR. jsQR returns
    // only one code for a full card, so scan overlapping tiles when the first
    // code is the share link rather than the recovery payload.
    const fullCard = scanRegion(0, 0, width, height);
    if (fullCard) return fullCard;
    const tileColumns = 3;
    const tileRows = 3;
    const overlap = 0.2;
    for (let row = 0; row < tileRows; row += 1) {
      for (let column = 0; column < tileColumns; column += 1) {
        const baseX = Math.round((column * width) / tileColumns);
        const baseY = Math.round((row * height) / tileRows);
        const baseWidth = Math.ceil(width / tileColumns);
        const baseHeight = Math.ceil(height / tileRows);
        const x = Math.max(0, Math.round(baseX - baseWidth * overlap / 2));
        const y = Math.max(0, Math.round(baseY - baseHeight * overlap / 2));
        const right = Math.min(width, Math.round(baseX + baseWidth * (1 + overlap / 2)));
        const bottom = Math.min(height, Math.round(baseY + baseHeight * (1 + overlap / 2)));
        const tiled = scanRegion(x, y, right - x, bottom - y);
        if (tiled) return tiled;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function extractWaterRecipeJsonFromQrPng(
  pngBytes: ArrayBuffer | Uint8Array,
): Promise<string | null> {
  return extractWaterRecipeJsonFromQrImage(pngBytes, 'image/png');
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
  qrDataUrl?: string;
  shareQrDataUrl?: string;
  largeRecoveryQr?: boolean;
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
    qrDataUrl: input.qrDataUrl,
    shareQrDataUrl: input.shareQrDataUrl,
    largeRecoveryQr: input.largeRecoveryQr,
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
    stroke?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    filter?: string;
  } = {},
): string {
  const {
    fill = '#d8e9ef',
    size = 18,
    weight = 400,
    family = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    anchor = 'start',
    letterSpacing,
    stroke,
    strokeWidth,
    strokeOpacity,
    filter,
  } = options;
  const spacing = letterSpacing === undefined ? '' : ` letter-spacing="${letterSpacing}"`;
  const strokeAttributes = stroke
    ? ` stroke="${stroke}" stroke-width="${strokeWidth ?? 1}" stroke-opacity="${strokeOpacity ?? 0.8}" paint-order="stroke fill"`
    : '';
  const filterAttribute = filter ? ` filter="${filter}"` : '';
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}"${spacing}${strokeAttributes}${filterAttribute}>${escapeXml(text)}</text>`;
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
  const analysisText = (
    textX: number,
    textY: number,
    text: string,
    options: Parameters<typeof svgText>[3] = {},
  ) => {
    const fill = options.fill ?? '#d8e9ef';
    return svgText(textX, textY, text, {
      ...options,
      fill,
    });
  };
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
      const rowHeight = 48;
      svg += `<line x1="${innerX}" y1="${cursor + rowHeight}" x2="${innerX + innerWidth}" y2="${cursor + rowHeight}" stroke="${recipeIonColor(ion.id)}" stroke-opacity="0.42"/>`;
      svg += analysisText(innerX, cursor + 18, ion.formula, {
        fill: recipeIonColor(ion.id),
        size: 13,
        weight: 700,
        filter: 'url(#recipe-ion-text-shadow)',
      });
      svg += svgText(innerX, cursor + 36, ion.name, {
        fill: '#0b1117',
        size: 12,
        weight: 600,
      });
      svg += svgText(innerX + innerWidth, cursor + rowHeight / 2 + 5, ion.value.toFixed(1), {
        fill: recipeIonColor(ion.id),
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
  const gridPatternId = 'recipe-analysis-grid';
  const gridOverlay = `
    <defs>
      <pattern id="${gridPatternId}" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M 0 8 L 0 0 L 8 0" fill="none" stroke="#0d6170" stroke-opacity="0.12" stroke-width="1"/>
        <path d="M 8 0 L 8 8 L 0 8" fill="none" stroke="#0d6170" stroke-opacity="0.08" stroke-width="1"/>
      </pattern>
      <filter id="recipe-ion-text-shadow" x="-20%" y="-30%" width="140%" height="170%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#0b1117" flood-opacity="0.46"/>
      </filter>
    </defs>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="url(#${gridPatternId})" opacity="0.3"/>
  `;
  return {
    svg: roundedRect(x, y, width, height, '#e9f3ee', '#7cc3c5') + gridOverlay + svg,
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

function renderQrSection(model: RecipeShareCardModel, x: number, y: number, width: number): { svg: string; height: number } {
  if (!model.qrDataUrl && !model.shareQrDataUrl) return { svg: '', height: 0 };
  const innerX = x + 22;
  const gap = 18;
  if (model.largeRecoveryQr && model.qrDataUrl) {
    const recoverySize = Math.min(760, width - 66 - gap - 220);
    const shareSize = 220;
    const height = 820;
    let svg = roundedRect(x, y, width, height, '#111a24', '#233346');
    const recoveryY = y + 24;
    svg += `<rect x="${innerX}" y="${recoveryY}" width="${recoverySize}" height="${recoverySize}" rx="4" fill="#ffffff"/>`;
    svg += `<image href="${escapeXml(model.qrDataUrl)}" x="${innerX}" y="${recoveryY}" width="${recoverySize}" height="${recoverySize}" preserveAspectRatio="xMidYMid meet"/>`;
    if (model.shareQrDataUrl) {
      const shareX = innerX + recoverySize + gap;
      const shareY = y + 220;
      svg += `<rect x="${shareX}" y="${shareY}" width="${shareSize}" height="${shareSize}" rx="4" fill="#ffffff"/>`;
      svg += `<image href="${escapeXml(model.shareQrDataUrl)}" x="${shareX}" y="${shareY}" width="${shareSize}" height="${shareSize}" preserveAspectRatio="xMidYMid meet"/>`;
      svg += svgText(shareX + shareSize / 2, shareY + shareSize + 22, 'SHARE LINK', {
        fill: '#47737a',
        size: 10,
        weight: 700,
        letterSpacing: 1.3,
        anchor: 'middle',
      });
    }
    return { svg, height };
  }
  const qrSize = Math.min(150, Math.max(126, Math.floor((width - 66 - gap) / 2)));
  const hasTwoQrs = Boolean(model.qrDataUrl && model.shareQrDataUrl);
  const height = qrSize + (hasTwoQrs ? 92 : 54);
  let svg = roundedRect(x, y, width, height, '#111a24', '#233346');
  const qrItems = [
    model.qrDataUrl
      ? { dataUrl: model.qrDataUrl, kind: 'app' as const }
      : null,
    model.shareQrDataUrl
      ? { dataUrl: model.shareQrDataUrl, kind: 'share' as const }
      : null,
  ].filter((item): item is { dataUrl: string; kind: 'app' | 'share' } => item !== null);
  qrItems.forEach((item, index) => {
    const cardWidth = qrSize + 24;
    const itemX = hasTwoQrs
      ? innerX + index * (cardWidth + gap)
      : x + (width - cardWidth) / 2;
    const cardY = y + 12;
    const qrX = itemX + 12;
    const qrY = cardY + 30;
    const cardHeight = qrSize + (hasTwoQrs ? 54 : 42);
    svg += roundedRect(itemX, cardY, cardWidth, cardHeight, '#182432', '#233346');
    if (item.kind === 'share') {
      svg += roundedRect(itemX + 12, cardY + 9, cardWidth - 24, 16, '#173c43', '#21585b');
      svg += svgText(itemX + cardWidth / 2, cardY + 21, 'SHARE LINK', {
        fill: '#47737a',
        size: 8,
        weight: 700,
        letterSpacing: 0.9,
        anchor: 'middle',
      });
    }
    svg += `<rect x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" rx="4" fill="#ffffff"/>`;
    svg += `<image href="${escapeXml(item.dataUrl)}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>`;
    if (item.kind === 'share') {
      svg += svgText(itemX + cardWidth / 2, cardY + cardHeight - 10, 'OPEN IN BROWSER', {
        fill: '#8a9ba8',
        size: 8,
        weight: 600,
        anchor: 'middle',
      });
    }
  });
  return { svg, height };
}

/**
 * Creates a content-only SVG. Its height is calculated from wrapped content,
 * so the same recipe has the same pixels regardless of browser viewport.
 */
export function buildRecipeShareCardSvg(input: RecipeShareCardInput): { svg: string; width: number; height: number } {
  const model = createRecipeShareCardModel(input);
  const cardX = RECIPE_SHARE_CARD_PADDING;
  const cardWidth = RECIPE_SHARE_CARD_WIDTH - RECIPE_SHARE_CARD_PADDING * 2;
  const innerX = cardX + 36;
  const innerWidth = cardWidth - 72;
  const titleLines = wrapRecipeShareCardText(model.recipeName, 34);
  const finalLines = wrapRecipeShareCardText(model.finalStep, 92);
  const waterHeight = model.waterSteps.length > 0 ? 205 + model.waterSteps.length * 86 : 0;
  const saltHeight = model.saltSteps.length > 0
    ? 182 + model.saltSteps.reduce((total, step) => total + (step.note ? 102 : 78), 0)
    : 118;
  const analysisRows = model.analysis.ions.reduce((total, ion) => total + 1, 0);
  const analysisGroups = new Set(model.analysis.ions.map(ion => ion.category)).size;
  const analysisHeight = 220 + analysisRows * 56 + analysisGroups * 34;
  const finalHeight = Math.max(112, 62 + finalLines.length * 22);
  const headerHeight = Math.max(228, 158 + titleLines.length * 34);
  const sectionGap = 18;
  const contentHeight = headerHeight
    + (waterHeight ? waterHeight + sectionGap : 0)
    + saltHeight + sectionGap
    + analysisHeight + sectionGap
    + finalHeight;
  const height = contentHeight + RECIPE_SHARE_CARD_PADDING * 2 + 36;
  let cursor = RECIPE_SHARE_CARD_PADDING + headerHeight;
  let body = `<rect width="${RECIPE_SHARE_CARD_WIDTH}" height="${height}" fill="#dbece5"/>`;
  body += `<rect x="${cardX}" y="${RECIPE_SHARE_CARD_PADDING}" width="${cardWidth}" height="${contentHeight}" rx="20" fill="#edf7f1" stroke="#c3ddd2" stroke-width="2"/>`;
  body += svgText(innerX, RECIPE_SHARE_CARD_PADDING + 46, 'WATERMANCER', {
    fill: '#177b79',
    size: 16,
    weight: 800,
    letterSpacing: 2.2,
  });
  body += svgText(cardX + cardWidth - 36, RECIPE_SHARE_CARD_PADDING + 46, 'WM / 0427 / RECIPE', {
    fill: '#789793',
    size: 11,
    weight: 700,
    family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
    letterSpacing: 1.2,
    anchor: 'end',
  });
  body += `<line x1="${innerX}" y1="${RECIPE_SHARE_CARD_PADDING + 72}" x2="${cardX + cardWidth - 36}" y2="${RECIPE_SHARE_CARD_PADDING + 72}" stroke="#b9d4ca"/>`;
  body += svgText(innerX, RECIPE_SHARE_CARD_PADDING + 111, 'FILTER COFFEE · PREPARED WATER', {
    fill: '#6c8f8a',
    size: 12,
    weight: 700,
    letterSpacing: 1.8,
  });
  body += titleLines.map((line, index) => svgText(
    innerX,
    RECIPE_SHARE_CARD_PADDING + 150 + index * 34,
    line,
    { fill: '#126d70', size: 31, weight: 800, family: 'Georgia, serif' },
  )).join('');
  body += svgText(innerX, RECIPE_SHARE_CARD_PADDING + 180 + titleLines.length * 34, model.batchLabel, {
    fill: '#789793',
    size: 13,
    weight: 600,
    family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  });
  body += roundedRect(cardX + cardWidth - 226, RECIPE_SHARE_CARD_PADDING + 104, 190, 76, '#e1f3ec', '#8bc9bb');
  body += svgText(cardX + cardWidth - 210, RECIPE_SHARE_CARD_PADDING + 128, 'APPROX. TDS', {
    fill: '#4c8f88',
    size: 10,
    weight: 700,
    letterSpacing: 1.5,
  });
  body += svgText(cardX + cardWidth - 210, RECIPE_SHARE_CARD_PADDING + 159, model.analysis.tds.toFixed(1), {
    fill: '#168b87',
    size: 27,
    weight: 800,
    family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  });
  body += svgText(cardX + cardWidth - 52, RECIPE_SHARE_CARD_PADDING + 159, 'mg/L', {
    fill: '#4c8f88',
    size: 10,
    weight: 700,
    anchor: 'end',
  });

  const renderPreviewSection = (label: string, title: string, y: number, sectionHeight: number, tone: 'dark' | 'light') => {
    const fill = tone === 'dark' ? '#143e4b' : '#e9f5ef';
    const stroke = tone === 'dark' ? '#235d69' : '#8bc9bb';
    const headingColor = tone === 'dark' ? '#bce9df' : '#207b78';
    let section = roundedRect(cardX + 36, y, innerWidth, sectionHeight, fill, stroke);
    section += svgText(innerX + 18, y + 30, `${label} /`, {
      fill: tone === 'dark' ? '#7ad0c2' : '#55a49b',
      size: 10,
      weight: 700,
      family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      letterSpacing: 1.1,
    });
    section += svgText(innerX + 56, y + 30, title, {
      fill: headingColor,
      size: 18,
      weight: 700,
    });
    section += `<line x1="${innerX + 230}" y1="${y + 25}" x2="${cardX + cardWidth - 54}" y2="${y + 25}" stroke="${stroke}" stroke-opacity="0.75"/>`;
    return section;
  };

  if (waterHeight) {
    body += renderPreviewSection('01', 'Prepare the water', cursor, waterHeight, 'dark');
    let rowY = cursor + 54;
    model.waterSteps.forEach((step, index) => {
      const rowHeight = 70;
      body += roundedRect(innerX + 18, rowY, innerWidth - 36, rowHeight, index % 2 === 0 ? '#1c4e5d' : '#1a4857', '#347180');
      body += svgText(innerX + 34, rowY + 20, step.label.toUpperCase(), { fill: '#8bc0bd', size: 9, weight: 700, letterSpacing: 1.3 });
      body += svgText(innerX + 34, rowY + 43, step.name, { fill: '#e5f5f1', size: 17, weight: 700 });
      body += svgText(cardX + cardWidth - 54, rowY + 40, step.amount, {
        fill: '#b9eee1',
        size: 19,
        weight: 700,
        family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        anchor: 'end',
      });
      rowY += rowHeight + 12;
    });
    cursor += waterHeight + sectionGap;
  }

  body += renderPreviewSection('02', 'Add the mineral salts', cursor, saltHeight, 'dark');
  let saltY = cursor + 52;
  if (model.saltSteps.length > 0) {
    body += svgWrappedText(innerX + 18, saltY, model.saltIntro, 104, { fill: '#a8d1cb', size: 13, lineHeight: 18 }).svg;
    saltY += 42;
    model.saltSteps.forEach((step, index) => {
      const noteLines = step.note ? wrapRecipeShareCardText(step.note, 82) : [];
      const rowHeight = noteLines.length > 0 ? 88 : 66;
      const fill = noteLines.length > 0 ? '#5a3544' : index % 2 === 0 ? '#1c4e5d' : '#1a4857';
      const stroke = noteLines.length > 0 ? '#d98193' : '#347180';
      body += roundedRect(innerX + 18, saltY, innerWidth - 36, rowHeight, fill, stroke);
      body += svgText(innerX + 34, saltY + 20, `${String(index + 1).padStart(2, '0')} / ${step.form}`.toUpperCase(), {
        fill: noteLines.length > 0 ? '#ffc5ce' : '#8bc0bd',
        size: 9,
        weight: 700,
        letterSpacing: 1.1,
      });
      body += svgText(innerX + 34, saltY + 43, `${step.name} ${step.formula}`, { fill: '#e5f5f1', size: 16, weight: 700 });
      body += svgText(cardX + cardWidth - 54, saltY + 39, step.amount, {
        fill: noteLines.length > 0 ? '#ffe5a8' : '#b9eee1',
        size: 17,
        weight: 700,
        family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        anchor: 'end',
      });
      if (noteLines.length > 0) {
        body += noteLines.map((line, lineIndex) => svgText(innerX + 34, saltY + 65 + lineIndex * 15, line, {
          fill: '#ffc5ce',
          size: 10,
          weight: 700,
        })).join('');
      }
      saltY += rowHeight + 10;
    });
    if (model.mixingNote) {
      const noteLines = wrapRecipeShareCardText(model.mixingNote, 96);
      body += svgText(innerX + 18, saltY + 14, 'MIXING VESSEL', { fill: '#8bcfc5', size: 10, weight: 700, letterSpacing: 1.2 });
      body += noteLines.map((line, index) => svgText(innerX + 18, saltY + 36 + index * 17, line, { fill: '#ccebe4', size: 12, weight: 600 })).join('');
    }
  } else {
    body += svgText(innerX + 18, saltY + 25, 'No mineral salts are needed for this recipe.', { fill: '#a8d1cb', size: 14 });
  }
  cursor += saltHeight + sectionGap;

  body += renderPreviewSection('03', 'Mineral analysis', cursor, analysisHeight, 'light');
  body += svgText(innerX + 18, cursor + 58, 'FINAL MIX / ION BALANCE', { fill: '#5a9790', size: 10, weight: 700, letterSpacing: 1.4 });
  body += svgText(cardX + cardWidth - 54, cursor + 58, 'mg/L', { fill: '#6d9790', size: 10, weight: 700, anchor: 'end' });
  body += svgText(innerX + 18, cursor + 84, model.recipeName, { fill: '#126d70', size: 22, weight: 800, family: 'Georgia, serif' });
  let ionY = cursor + 112;
  const categories: Array<RecipeShareCardIon['category']> = ['Cations', 'Anions', 'Other modeled ions'];
  for (const category of categories) {
    const ions = model.analysis.ions.filter(ion => ion.category === category);
    if (ions.length === 0) continue;
    body += svgText(innerX + 18, ionY, category.toUpperCase(), { fill: '#5a9790', size: 10, weight: 700, letterSpacing: 1.4 });
    ionY += 22;
    for (const ion of ions) {
      const ionColor = recipeIonColor(ion.id);
      body += `<line x1="${innerX + 18}" y1="${ionY + 42}" x2="${cardX + cardWidth - 54}" y2="${ionY + 42}" stroke="${ionColor}" stroke-opacity="0.32"/>`;
      body += svgText(innerX + 18, ionY + 18, ion.formula, { fill: ionColor, size: 14, weight: 800, filter: 'url(#recipe-ion-text-shadow)' });
      body += svgText(innerX + 18, ionY + 35, ion.name, { fill: '#223636', size: 12, weight: 600 });
      body += svgText(cardX + cardWidth - 54, ionY + 25, ion.value.toFixed(1), {
        fill: ionColor,
        size: 19,
        weight: 800,
        family: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        anchor: 'end',
      });
      ionY += 56;
    }
    ionY += 16;
  }
  const metricWidth = (innerWidth - 36) / 3;
  const metrics = [['GH', model.analysis.gh, '°dH'], ['KH', model.analysis.kh, '°dH'], ['ION TOTAL', model.analysis.tds, 'mg/L']] as const;
  metrics.forEach(([label, value, unit], index) => {
    const metricX = innerX + 18 + metricWidth * index + metricWidth / 2;
    body += svgText(metricX, cursor + analysisHeight - 72, label, { fill: '#5a9790', size: 9, weight: 700, letterSpacing: 1.1, anchor: 'middle' });
    body += svgText(metricX, cursor + analysisHeight - 45, value.toFixed(1), { fill: '#126d70', size: 23, weight: 800, family: 'ui-monospace, SFMono-Regular, Consolas, monospace', anchor: 'middle' });
    body += svgText(metricX, cursor + analysisHeight - 27, unit, { fill: '#6d9790', size: 9, weight: 700, anchor: 'middle' });
  });
  cursor += analysisHeight + sectionGap;

  body += roundedRect(cardX + 36, cursor, innerWidth, finalHeight, '#e1f2e8', '#9bcdbd');
  body += svgText(innerX + 18, cursor + 29, 'FINAL / VERIFY AND BREW', { fill: '#3e8d7c', size: 10, weight: 700, letterSpacing: 1.3 });
  body += finalLines.map((line, index) => svgText(innerX + 18, cursor + 57 + index * 22, line, { fill: '#315d51', size: 13, weight: 600 })).join('');
  body += svgText(cardX + cardWidth - 54, cursor + 29, 'W / 04', { fill: '#6c9f8f', size: 10, weight: 700, family: 'ui-monospace, SFMono-Regular, Consolas, monospace', anchor: 'end' });
  body += svgText(RECIPE_SHARE_CARD_WIDTH / 2, height - 20, 'mg/L = ppm · Mix carefully and adjust extraction to taste', {
    fill: '#6c929d',
    size: 11,
    weight: 600,
    anchor: 'middle',
    letterSpacing: 0.5,
  });
  body = `<defs><filter id="recipe-ion-text-shadow" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#0b1117" flood-opacity="0.46"/></filter></defs>${body}`;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${RECIPE_SHARE_CARD_WIDTH}" height="${height}" viewBox="0 0 ${RECIPE_SHARE_CARD_WIDTH} ${height}" text-rendering="geometricPrecision" shape-rendering="geometricPrecision">${body}</svg>`,
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
  const embeddedImageUrls = [...svg.matchAll(/<image href="([^"]+)"/g)].map(match => match[1]);
  await Promise.all(embeddedImageUrls.map(src => new Promise<void>((resolve, reject) => {
    const embedded = new Image();
    embedded.onload = () => resolve();
    embedded.onerror = () => reject(new Error('Could not decode an embedded recipe-card image.'));
    embedded.src = src;
  })));
  const sourceBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const sourceUrl = URL.createObjectURL(sourceBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not decode the recipe share card.'));
      element.src = sourceUrl;
    });
    // Chromium can fire the outer SVG load event before nested data-URI QR
    // images have painted. Give those embedded images a frame to settle before
    // rasterizing the card.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
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