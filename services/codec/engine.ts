import { calculateSSIM } from '../ssim';

export type OutputMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface DecodeOptions {
  /** Longest side is scaled down to this many pixels when larger. */
  maxDimension?: number;
  /** Paint transparent areas white (for formats without alpha). */
  flattenBackground?: boolean;
}

export interface EncodeParams {
  mime: OutputMime;
  /** 0-100. Ignored for PNG, which is always lossless. */
  quality: number;
  /** OxiPNG effort, 1-6. */
  pngLevel?: number;
  /** Let OxiPNG rewrite fully transparent pixels for better compression. */
  optimiseAlpha?: boolean;
}

type Canvas2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

const createCanvas = (width: number, height: number): Canvas2D => {
  let ctx: Canvas2D | null;
  if (typeof OffscreenCanvas !== 'undefined') {
    ctx = new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true });
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
};

const toBitmap = (blob: Blob): Promise<ImageBitmap> =>
  createImageBitmap(blob, { imageOrientation: 'from-image' });

const fitDimensions = (width: number, height: number, maxDimension?: number) => {
  if (!maxDimension || Math.max(width, height) <= maxDimension) return { width, height };
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

export const decodeImage = async (blob: Blob, options: DecodeOptions = {}): Promise<ImageData> => {
  const bitmap = await toBitmap(blob);
  try {
    const { width, height } = fitDimensions(bitmap.width, bitmap.height, options.maxDimension);
    const ctx = createCanvas(width, height);
    if (options.flattenBackground) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    bitmap.close();
  }
};

export const encodeImage = async (image: ImageData, params: EncodeParams): Promise<ArrayBuffer> => {
  const quality = Math.round(Math.max(0, Math.min(100, params.quality)));
  switch (params.mime) {
    case 'image/jpeg': {
      const { encode } = await import('@jsquash/jpeg');
      return encode(image, { quality });
    }
    case 'image/webp': {
      const { encode } = await import('@jsquash/webp');
      return encode(image, { quality });
    }
    case 'image/png': {
      const { optimise } = await import('@jsquash/oxipng');
      return optimise(image, {
        level: params.pngLevel ?? 2,
        optimiseAlpha: params.optimiseAlpha ?? false,
      });
    }
  }
};

const sampleDimensions = (width: number, height: number, sampleWidth: number) => {
  const scale = Math.min(1, sampleWidth / width);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
};

const downsample = async (bitmap: ImageBitmap, width: number, height: number): Promise<ImageData> => {
  try {
    const ctx = createCanvas(width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    bitmap.close();
  }
};

/**
 * Holds one decoded image so it can be encoded repeatedly (smart-mode search)
 * without paying the decode cost each time.
 */
export class ImageSession {
  private referenceSample: { width: number; data: ImageData } | null = null;

  private constructor(readonly image: ImageData) {}

  static async open(blob: Blob, options: DecodeOptions = {}): Promise<ImageSession> {
    return new ImageSession(await decodeImage(blob, options));
  }

  get width() {
    return this.image.width;
  }

  get height() {
    return this.image.height;
  }

  encode(params: EncodeParams): Promise<ArrayBuffer> {
    return encodeImage(this.image, params);
  }

  /**
   * SSIM between the decoded source and an encoded candidate, both downscaled
   * to `sampleWidth`. Returns null when the candidate's dimensions do not match.
   */
  async similarity(candidate: Blob, sampleWidth: number): Promise<number | null> {
    const { width, height } = sampleDimensions(this.width, this.height, sampleWidth);

    if (!this.referenceSample || this.referenceSample.width !== width) {
      const bitmap = await createImageBitmap(this.image);
      this.referenceSample = { width, data: await downsample(bitmap, width, height) };
    }

    const candidateBitmap = await toBitmap(candidate);
    if (candidateBitmap.width !== this.width || candidateBitmap.height !== this.height) {
      candidateBitmap.close();
      return null;
    }
    const candidateSample = await downsample(candidateBitmap, width, height);

    return calculateSSIM(this.referenceSample.data.data, candidateSample.data, width, height);
  }
}
