const SOI = 0xffd8;
const SOS = 0xffda;
const APP1 = 0xffe1;
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

    if (marker === APP1 && length >= 8 && view.getUint32(offset + 4) === EXIF_HEADER) {
      const segment = buffer.slice(offset, segmentEnd);
      resetOrientation(new DataView(segment));
      return segment;
    }
    offset = segmentEnd;
  }
  return null;
};

const resetOrientation = (segment: DataView) => {
  const tiff = 10; // marker(2) + length(2) + "Exif\0\0"(6)
  if (segment.byteLength < tiff + 8) return;
  const byteOrder = segment.getUint16(tiff);
  const little = byteOrder === 0x4949;
  if (!little && byteOrder !== 0x4d4d) return;
  if (segment.getUint16(tiff + 2, little) !== 42) return;

  const ifd0 = tiff + segment.getUint32(tiff + 4, little);
  if (ifd0 + 2 > segment.byteLength) return;
  const entryCount = segment.getUint16(ifd0, little);
  for (let i = 0; i < entryCount; i++) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 12 > segment.byteLength) return;
    if (segment.getUint16(entry, little) === ORIENTATION_TAG) {
      segment.setUint16(entry + 8, 1, little);
      return;
    }
  }
};

/** Copies EXIF metadata from a source JPEG into a freshly encoded JPEG. */
export const copyJpegExif = async (source: Blob, encoded: Blob): Promise<Blob> => {
  const exif = await extractExifSegment(source);
  if (!exif) return encoded;
  const target = await encoded.arrayBuffer();
  return new Blob([target.slice(0, 2), exif, target.slice(2)], { type: 'image/jpeg' });
};
