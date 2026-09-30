import { describe, expect, it } from 'vitest';
import { copyJpegExif, stripMetadata } from './exif';

const bytes = (...parts: (number[] | Uint8Array | string)[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : Array.from(p)))
  );

const u16 = (n: number) => [n >> 8, n & 0xff];
const u32le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24];
const u32be = (n: number) => [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];

const segment = (marker: number, payload: Uint8Array) => bytes(u16(marker), u16(payload.length + 2), payload);

/** Little-endian EXIF APP1 with an orientation tag, followed by `extra` text. */
const exifSegment = (orientation: number, extra = 'SECRET-GPS') =>
  segment(
    0xffe1,
    bytes('Exif\0\0', 'II', [42, 0], u32le(8), [1, 0], [0x12, 0x01, 3, 0], u32le(1), [orientation, 0, 0, 0], u32le(0), extra)
  );

const jpeg = (...segments: Uint8Array[]) =>
  bytes(
    [0xff, 0xd8],
    ...segments,
    segment(0xffdb, bytes(new Array(65).fill(1))), // DQT
    segment(0xffda, bytes([1, 1, 0, 0, 63, 0])), // SOS header
    [0x12, 0xff, 0x00, 0x34, 0xff, 0xd3, 0x56], // entropy data with a stuffed byte and a restart marker
    [0xff, 0xd9]
  );

const read = async (blob: Blob | null) => new Uint8Array(await blob!.arrayBuffer());
const contains = (haystack: Uint8Array, text: string) =>
  new TextDecoder('latin1').decode(haystack).includes(text);

const readOrientation = (data: Uint8Array) => {
  const text = new TextDecoder('latin1').decode(data);
  const tiff = text.indexOf('Exif\0\0') + 6;
  const view = new DataView(data.buffer, data.byteOffset);
  const little = view.getUint16(tiff) === 0x4949;
  const ifd0 = tiff + view.getUint32(tiff + 4, little);
  return view.getUint16(ifd0 + 2 + 8, little);
};

describe('stripMetadata: JPEG', () => {
  it('removes EXIF, XMP and comments but keeps JFIF, ICC and the image data', async () => {
    const icc = segment(0xffe2, bytes('ICC_PROFILE\0', [1, 1, 9, 9]));
    const xmp = segment(0xffe1, bytes('http://ns.adobe.com/xap/1.0/\0<x/>'));
    const comment = segment(0xfffe, bytes('a comment'));
    const input = jpeg(segment(0xffe0, bytes('JFIF\0', [1, 1, 0, 0, 1, 0, 1, 0, 0])), exifSegment(1), xmp, icc, comment);

    const out = await read(await stripMetadata(new Blob([input]), 'image/jpeg'));

    expect(contains(out, 'SECRET-GPS')).toBe(false);
    expect(contains(out, 'ns.adobe.com')).toBe(false);
    expect(contains(out, 'a comment')).toBe(false);
    expect(contains(out, 'JFIF')).toBe(true);
    expect(contains(out, 'ICC_PROFILE')).toBe(true);
    expect(contains(out, 'Exif')).toBe(false); // orientation 1 needs no tag
    expect(Array.from(out.slice(-2))).toEqual([0xff, 0xd9]);
  });

  it('keeps a non-default orientation in a minimal EXIF block after JFIF', async () => {
    const jfif = segment(0xffe0, bytes('JFIF\0', [1, 1, 0, 0, 1, 0, 1, 0, 0]));
    const out = await read(await stripMetadata(new Blob([jpeg(jfif, exifSegment(6))]), 'image/jpeg'));

    expect(contains(out, 'SECRET-GPS')).toBe(false);
    expect(readOrientation(out)).toBe(6);
    const text = new TextDecoder('latin1').decode(out);
    expect(text.indexOf('JFIF')).toBeLessThan(text.indexOf('Exif'));
  });

  it('drops data appended after the end-of-image marker', async () => {
    const input = bytes(jpeg(), [0xff, 0xd8], 'SECOND-IMAGE-EXIF', [0xff, 0xd9]);
    const out = await read(await stripMetadata(new Blob([input]), 'image/jpeg'));
    expect(contains(out, 'SECOND-IMAGE')).toBe(false);
    expect(out.length).toBe(jpeg().length);
  });

  it('returns null for truncated or non-JPEG data', async () => {
    const full = jpeg(exifSegment(1));
    expect(await stripMetadata(new Blob([full.slice(0, full.length - 10)]), 'image/jpeg')).toBeNull();
    expect(await stripMetadata(new Blob([bytes('not a jpeg')]), 'image/jpeg')).toBeNull();
  });
});

const pngChunk = (type: string, data: Uint8Array) => bytes(u32be(data.length), type, data, [0, 0, 0, 0]);
const png = (...chunks: Uint8Array[]) =>
  bytes(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    pngChunk('IHDR', bytes(new Array(13).fill(0))),
    ...chunks,
    pngChunk('IDAT', bytes([1, 2, 3])),
    pngChunk('IEND', bytes())
  );

describe('stripMetadata: PNG', () => {
  it('removes text and time chunks, keeps iCCP', async () => {
    const input = png(pngChunk('tEXt', bytes('Author\0SECRET')), pngChunk('iCCP', bytes('icc')), pngChunk('tIME', bytes([0, 0, 0, 0, 0, 0, 0])));
    const out = await read(await stripMetadata(new Blob([input]), 'image/png'));
    expect(contains(out, 'SECRET')).toBe(false);
    expect(contains(out, 'tIME')).toBe(false);
    expect(contains(out, 'iCCP')).toBe(true);
    expect(contains(out, 'IEND')).toBe(true);
  });

  it('refuses a PNG with an eXIf chunk', async () => {
    expect(await stripMetadata(new Blob([png(pngChunk('eXIf', bytes('MM')))]), 'image/png')).toBeNull();
  });
});

const riffChunk = (type: string, data: Uint8Array) =>
  bytes(type, u32le(data.length), data, data.length % 2 ? [0] : []);
const webp = (...chunks: Uint8Array[]) => {
  const body = bytes('WEBP', ...chunks);
  return bytes('RIFF', u32le(body.length), body);
};

describe('stripMetadata: WebP', () => {
  it('returns simple-format files unchanged', async () => {
    const file = new Blob([webp(riffChunk('VP8 ', bytes([1, 2, 3, 4])))]);
    expect(await stripMetadata(file, 'image/webp')).toBe(file);
  });

  it('removes XMP, clears its flag and fixes the RIFF size', async () => {
    const vp8x = bytes([0x04 | 0x10, 0, 0, 0], new Array(6).fill(0));
    const input = webp(riffChunk('VP8X', vp8x), riffChunk('VP8 ', bytes([1, 2, 3, 4])), riffChunk('XMP ', bytes('SECRET')));
    const out = await read(await stripMetadata(new Blob([input]), 'image/webp'));

    expect(contains(out, 'SECRET')).toBe(false);
    const view = new DataView(out.buffer);
    expect(view.getUint32(4, true)).toBe(out.length - 8);
    expect(out[20] & 0x04).toBe(0); // XMP flag
    expect(out[20] & 0x10).toBe(0x10); // alpha flag untouched
  });

  it('refuses a WebP with an EXIF chunk', async () => {
    const input = webp(riffChunk('VP8X', bytes(new Array(10).fill(0))), riffChunk('EXIF', bytes('MM')));
    expect(await stripMetadata(new Blob([input]), 'image/webp')).toBeNull();
  });
});

describe('copyJpegExif', () => {
  it('copies EXIF into the encoded JPEG with orientation reset to 1', async () => {
    const source = new Blob([jpeg(exifSegment(6))]);
    const out = await read(await copyJpegExif(source, new Blob([jpeg()])));
    expect(contains(out, 'SECRET-GPS')).toBe(true);
    expect(readOrientation(out)).toBe(1);
  });

  it('leaves the encoded JPEG alone when the source has no EXIF', async () => {
    const encoded = new Blob([jpeg()]);
    expect(await copyJpegExif(new Blob([jpeg()]), encoded)).toBe(encoded);
  });
});
