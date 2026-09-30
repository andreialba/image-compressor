const SOI = 0xffd8;
const EOI = 0xffd9;
const SOS = 0xffda;
const APP0 = 0xffe0;
const APP1 = 0xffe1;
const APP2 = 0xffe2;
const APP14 = 0xffee;
const COM = 0xfffe;
const EXIF_HEADER = 0x45786966; // "Exif"
const ORIENTATION_TAG = 0x0112;
const HEADER_SCAN_LIMIT = 1024 * 1024;

/**
 * Returns the EXIF APP1 segment of a JPEG with its orientation tag reset to 1,
 * or null if the file has no EXIF block. The decoded pixels are already rotated,
 * so carrying the original orientation forward would rotate them twice.
 */
const extractExifSegment = async (jpeg: Blob): Promise<ArrayBuffer | null> => {
  const buffer = await jpeg.slice(0, HEADER_SCAN_LIMIT).arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== SOI) return null;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if (marker === SOS || (marker & 0xff00) !== 0xff00) break;
    const length = view.getUint16(offset + 2);
    const segmentEnd = offset + 2 + length;
    if (segmentEnd > view.byteLength) break;

    if (isExifSegment(view, offset)) {
      const segment = buffer.slice(offset, segmentEnd);
      const orientation = findOrientation(new DataView(segment));
      orientation?.view.setUint16(orientation.offset, 1, orientation.little);
      return segment;
    }
    offset = segmentEnd;
  }
  return null;
};

const isExifSegment = (view: DataView, offset: number) =>
  view.getUint16(offset) === APP1 && view.getUint16(offset + 2) >= 8 && view.getUint32(offset + 4) === EXIF_HEADER;

/** Locates the orientation value inside an EXIF APP1 segment. */
const findOrientation = (segment: DataView) => {
  const tiff = 10; // marker(2) + length(2) + "Exif\0\0"(6)
  if (segment.byteLength < tiff + 8) return null;
  const byteOrder = segment.getUint16(tiff);
  const little = byteOrder === 0x4949;
  if (!little && byteOrder !== 0x4d4d) return null;
  if (segment.getUint16(tiff + 2, little) !== 42) return null;

  const ifd0 = tiff + segment.getUint32(tiff + 4, little);
  if (ifd0 + 2 > segment.byteLength) return null;
  const entryCount = segment.getUint16(ifd0, little);
  for (let i = 0; i < entryCount; i++) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 12 > segment.byteLength) return null;
    if (segment.getUint16(entry, little) === ORIENTATION_TAG) {
      return { view: segment, offset: entry + 8, little };
    }
  }
  return null;
};

/** Copies EXIF metadata from a source JPEG into a freshly encoded JPEG. */
export const copyJpegExif = async (source: Blob, encoded: Blob): Promise<Blob> => {
  const exif = await extractExifSegment(source);
  if (!exif) return encoded;
  const target = await encoded.arrayBuffer();
  return new Blob([target.slice(0, 2), exif, target.slice(2)], { type: 'image/jpeg' });
};

/** A minimal EXIF APP1 segment holding only an orientation tag. */
const orientationSegment = (orientation: number): ArrayBuffer => {
  const view = new DataView(new ArrayBuffer(36));
  view.setUint16(0, APP1);
  view.setUint16(2, 34);
  view.setUint32(4, EXIF_HEADER); // followed by two zero bytes
  view.setUint16(10, 0x4d4d); // big-endian TIFF
  view.setUint16(12, 42);
  view.setUint32(14, 8); // IFD0 right after the TIFF header
  view.setUint16(18, 1); // one entry
  view.setUint16(20, ORIENTATION_TAG);
  view.setUint16(22, 3); // SHORT
  view.setUint32(24, 1);
  view.setUint16(28, orientation);
  // Bytes 32-35: next-IFD offset 0.
  return view.buffer;
};

const hasPrefix = (view: DataView, offset: number, text: string) =>
  [...text].every((char, i) => view.getUint8(offset + i) === char.charCodeAt(0));

const stripJpeg = (buffer: ArrayBuffer): Blob | null => {
  const view = new DataView(buffer);
  if (view.getUint16(0) !== SOI) return null;

  const kept: ArrayBuffer[] = [];
  let orientation = 1;
  let offset = 2;
  for (;;) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) return null;
    if (marker === SOS) break;
    const segmentEnd = offset + 2 + view.getUint16(offset + 2);
    if (segmentEnd > view.byteLength) return null;

    const isApp = marker >= APP0 && marker <= 0xffef;
    const keep =
      !isApp && marker !== COM
        ? true
        : marker === APP0 || marker === APP14 || (marker === APP2 && hasPrefix(view, offset + 4, 'ICC_PROFILE\0'));
    if (keep) {
      kept.push(buffer.slice(offset, segmentEnd));
    } else if (isExifSegment(view, offset)) {
      const found = findOrientation(new DataView(buffer, offset, segmentEnd - offset));
      if (found) orientation = found.view.getUint16(found.offset, found.little);
    }
    offset = segmentEnd;
  }

  // Walk the scans to EOI, skipping marker segments so their payloads aren't
  // mistaken for EOI. Anything after EOI (appended MPF images, vendor trailers)
  // can carry its own metadata and is dropped.
  const bytes = new Uint8Array(buffer);
  const scanStart = offset;
  let end = -1;
  let i = offset;
  while (i + 1 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const next = bytes[i + 1];
    if (next === 0x00 || next === 0xff || (next >= 0xd0 && next <= 0xd7)) {
      i += next === 0xff ? 1 : 2;
      continue;
    }
    if ((0xff00 | next) === EOI) {
      end = i + 2;
      break;
    }
    if (i + 3 >= bytes.length) return null;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  if (end < 0) return null;

  if (orientation >= 2 && orientation <= 8) {
    const first = kept.length > 0 && new DataView(kept[0]).getUint16(0) === APP0 ? 1 : 0;
    kept.splice(first, 0, orientationSegment(orientation));
  }
  return new Blob([buffer.slice(0, 2), ...kept, buffer.slice(scanStart, end)], { type: 'image/jpeg' });
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_METADATA_CHUNKS = ['tEXt', 'zTXt', 'iTXt', 'tIME'];

const chunkType = (view: DataView, offset: number) =>
  String.fromCharCode(...new Uint8Array(view.buffer, offset, 4));

const stripPng = (buffer: ArrayBuffer): Blob | null => {
  const view = new DataView(buffer);
  if (!PNG_SIGNATURE.every((byte, i) => view.getUint8(i) === byte)) return null;

  const kept: ArrayBuffer[] = [buffer.slice(0, 8)];
  let offset = 8;
  for (;;) {
    const chunkEnd = offset + 12 + view.getUint32(offset);
    if (chunkEnd > view.byteLength) return null;
    const type = chunkType(view, offset + 4);
    // Browsers may honour eXIf orientation, so dropping it could rotate the image.
    if (type === 'eXIf') return null;
    if (!PNG_METADATA_CHUNKS.includes(type)) kept.push(buffer.slice(offset, chunkEnd));
    if (type === 'IEND') break;
    offset = chunkEnd;
  }
  return new Blob(kept, { type: 'image/png' });
};

const VP8X_XMP_FLAG = 0x04;

const stripWebp = (buffer: ArrayBuffer, original: Blob): Blob | null => {
  const view = new DataView(buffer);
  if (chunkType(view, 0) !== 'RIFF' || chunkType(view, 8) !== 'WEBP') return null;
  // Only the extended (VP8X) format can hold metadata.
  if (chunkType(view, 12) !== 'VP8X') return original;

  const riffEnd = Math.min(view.byteLength, 8 + view.getUint32(4, true));
  const kept: ArrayBuffer[] = [];
  let dropped = false;
  let offset = 12;
  while (offset + 8 <= riffEnd) {
    const size = view.getUint32(offset + 4, true);
    const chunkEnd = offset + 8 + size + (size & 1);
    if (chunkEnd > riffEnd) return null;
    const type = chunkType(view, offset);
    if (type === 'EXIF') return null; // same orientation concern as PNG eXIf
    if (type === 'XMP ') dropped = true;
    else kept.push(buffer.slice(offset, chunkEnd));
    offset = chunkEnd;
  }
  if (!dropped) return original;

  const vp8x = new Uint8Array(kept[0]);
  vp8x[8] &= ~VP8X_XMP_FLAG;
  const header = new DataView(buffer.slice(0, 12));
  header.setUint32(4, 4 + kept.reduce((sum, chunk) => sum + chunk.byteLength, 0), true);
  return new Blob([header.buffer, ...kept], { type: 'image/webp' });
};

/**
 * The file's own bytes with EXIF, XMP, IPTC and text metadata removed, keeping
 * ICC profiles and JPEG orientation. Null when it cannot be stripped safely.
 */
export const stripMetadata = async (file: Blob, mime: string): Promise<Blob | null> => {
  try {
    const buffer = await file.arrayBuffer();
    if (mime === 'image/jpeg') return stripJpeg(buffer);
    if (mime === 'image/png') return stripPng(buffer);
    if (mime === 'image/webp') return stripWebp(buffer, file);
    return null;
  } catch {
    // DataView reads past the end of a truncated file.
    return null;
  }
};
