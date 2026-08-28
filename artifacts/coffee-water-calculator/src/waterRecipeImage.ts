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