import { calculateSSIM } from '../ssim';

export type OutputMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ResizeTarget {
  /** fit: longest side in px. width/height: that side in px. percent: of the original. */
  mode: 'fit' | 'width' | 'height' | 'percent';
  value: number;
}

export interface DecodeOptions {
  /** Scales the image down (never up), keeping its aspect ratio. */
  resize?: ResizeTarget;
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
  /** WebP only. In lossless mode libwebp treats `quality` as encoder effort. */
  lossless?: boolean;
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

export const targetDimensions = (width: number, height: number, resize?: ResizeTarget) => {
  if (!resize || !(resize.value > 0)) return { width, height };
  const { mode, value } = resize;
  const side = mode === 'fit' ? Math.max(width, height) : mode === 'width' ? width : mode === 'height' ? height : 100;
  const scale = value / side;
  if (scale >= 1) return { width, height };
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

// Lanczos needs the whole source in JS and WASM memory at once; above this, use the canvas.
const LANCZOS_MAX_PIXELS = 24_000_000;

const draw = (source: CanvasImageSource, width: number, height: number, flatten?: boolean): Canvas2D => {
  const ctx = createCanvas(width, height);
  if (flatten) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(source, 0, 0, width, height);
  return ctx;
};

const lanczos = async (image: ImageData, width: number, height: number): Promise<ImageData> => {
  const { default: resize } = await import('@jsquash/resize');
  // Gamma-space, like the canvas halving steps before it, so all paths agree on brightness.
  return resize(image, { width, height, method: 'lanczos3', linearRGB: false });
};

export const decodeImage = async (
  blob: Blob,
  options: DecodeOptions = {}
): Promise<{ image: ImageData; resized: boolean }> => {
  const bitmap = await toBitmap(blob);
  const flatten = options.flattenBackground;
  try {
    const { width, height } = targetDimensions(bitmap.width, bitmap.height, options.resize);
    if (width === bitmap.width && height === bitmap.height) {
      return { image: draw(bitmap, width, height, flatten).getImageData(0, 0, width, height), resized: false };
    }

    // Halve on the canvas while that still leaves 2x the target: a 2:1 bilinear step
    // doesn't alias, and it keeps the Lanczos input small.
    let ctx: Canvas2D | null = null;
    let w = bitmap.width;
    let h = bitmap.height;
    while (w / 2 >= width * 2) {
      w = Math.round(w / 2);
      h = Math.round(h / 2);
      ctx = draw(ctx?.canvas ?? bitmap, w, h, flatten);
    }

    if (w * h <= LANCZOS_MAX_PIXELS) {
      try {
        const input = (ctx ?? draw(bitmap, w, h, flatten)).getImageData(0, 0, w, h);
        return { image: await lanczos(input, width, height), resized: true };
      } catch (error) {
        console.warn('Lanczos resize failed, using canvas resize', error);
      }
    }
    return {
      image: draw(ctx?.canvas ?? bitmap, width, height, flatten).getImageData(0, 0, width, height),
      resized: true,
    };
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
      return params.lossless ? encode(image, { lossless: 1, exact: 1, quality }) : encode(image, { quality });
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

  private constructor(
    readonly image: ImageData,
    /** True when `resize` scaled the source down. */
    readonly resized: boolean
  ) {}

  static async open(blob: Blob, options: DecodeOptions = {}): Promise<ImageSession> {
    const { image, resized } = await decodeImage(blob, options);
    return new ImageSession(image, resized);
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
