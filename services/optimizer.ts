import JSZip from 'jszip';
import { OptimizationSettings, OptimizedFile, ProcessingStatus } from '../types';
import { getOutputFileName, getInputMimeType } from './utils';
import { openImageSession, type ImageSessionHandle } from './codec/client';
import type { OutputMime } from './codec/engine';
import { copyJpegExif } from './exif';

const LARGE_FILE_BYTES = 12 * 1024 * 1024;
const VERY_LARGE_FILE_BYTES = 25 * 1024 * 1024;

const isSmartCompressionEnabled = (settings: OptimizationSettings): boolean => {
  return settings.useSmartCompression || settings.lossless;
};

export const getRecommendedConcurrency = (
  filesToProcessCount: number,
  settings: OptimizationSettings
): number => {
  const cpuCount = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;

  if (isSmartCompressionEnabled(settings)) {
    if (cpuCount <= 4 || filesToProcessCount >= 8) {
      return 1;
    }

    return 2;
  }

  return Math.max(1, Math.min(3, Math.floor(cpuCount / 2)));
};

export const getCompressionErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Compression canceled';
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('memory') || message.includes('allocation')) {
    return 'Image is too large for this device. Try fewer files or resize first.';
  }

  if (message.includes('webassembly') || message.includes('wasm')) {
    return 'Your browser could not load the compression engine.';
  }

  if (message.includes('decode') || message.includes('bitmap') || message.includes('canvas')) {
    return 'This image could not be decoded in your browser.';
  }

  if (message.includes('mime') || message.includes('format') || message.includes('type')) {
    return 'This image format is not supported for compression.';
  }

  return 'Compression failed. Try another format or a smaller image.';
};

export const resolveOutputMime = (file: File, settings: OptimizationSettings): OutputMime => {
  if (settings.format !== 'original') return `image/${settings.format}`;
  const input = getInputMimeType(file);
  return input === 'image/jpeg' || input === 'image/png' || input === 'image/webp' || input === 'image/avif'
    ? input
    : 'image/jpeg';
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
};

// --- Main Processing Logic ---

export const processImage = async (
  file: File,
  settings: OptimizationSettings,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<Blob> => {
  const mime = resolveOutputMime(file, settings);
  throwIfAborted(signal);

  const session = await openImageSession(file, {
    maxDimension: settings.resizeWidth || undefined,
    // JPEG has no alpha channel; without this, transparency turns black.
    flattenBackground: mime === 'image/jpeg',
  });

  try {
    throwIfAborted(signal);
    onProgress(10);

    let result: Blob;
    if (mime === 'image/png') {
      // OxiPNG is lossless, so there is nothing to search for.
      result = await session.encode({ mime, quality: 100, pngLevel: 2, optimiseAlpha: !settings.lossless });
    } else if (isSmartCompressionEnabled(settings)) {
      result = await smartEncode(session, file, mime, settings, onProgress, signal);
    } else {
      result = await session.encode({ mime, quality: settings.quality });
    }
    throwIfAborted(signal);

    if (mime === 'image/jpeg' && getInputMimeType(file) === 'image/jpeg' && !settings.stripExif) {
      result = await copyJpegExif(file, result);
    }

    onProgress(100);
    return result;
  } finally {
    session.close();
  }
};

/**
 * Binary-searches the lowest quality whose SSIM against the source still meets
 * the target, starting from the user's preferred quality.
 */
const smartEncode = async (
  session: ImageSessionHandle,
  file: File,
  mime: OutputMime,
  settings: OptimizationSettings,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<Blob> => {
  const SSIM_TARGET = settings.lossless ? 0.99 : 0.98;
  const MIN_QUALITY = settings.lossless ? 0.7 : 0.5;
  const MAX_QUALITY = 1.0;
  const userQuality = Math.max(0.5, Math.min(1.0, settings.quality / 100));
  const isLargeFile = file.size >= LARGE_FILE_BYTES;
  const isVeryLargeFile = file.size >= VERY_LARGE_FILE_BYTES;
  const sampleWidth = isLargeFile ? 384 : 512;
  // AVIF encodes are an order of magnitude slower, so search less.
  const iterations = mime === 'image/avif' ? 4 : isLargeFile ? 6 : 8;

  const encodeAt = (quality: number) => session.encode({ mime, quality: Math.round(quality * 100) });

  // Very large images: one pass at a safe quality rather than a full search.
  if (isVeryLargeFile && !settings.lossless) {
    return encodeAt(Math.max(0.82, userQuality));
  }

  let minQ = Math.max(MIN_QUALITY, userQuality - 0.2);
  let maxQ = MAX_QUALITY;
  let bestBlob: Blob | null = null;
  let bestSize = Number.POSITIVE_INFINITY;

  for (let i = 0; i < iterations; i++) {
    throwIfAborted(signal);

    const currentQ = Math.max(MIN_QUALITY, Math.min(MAX_QUALITY, (minQ + maxQ) / 2));
    const candidate = await encodeAt(currentQ);
    throwIfAborted(signal);

    const ssim = await session.similarity(candidate, sampleWidth);
    onProgress(10 + ((i + 1) / iterations) * 80);

    if (ssim === null) {
      console.warn('Dimension mismatch during smart compress, using this candidate');
      return candidate;
    }

    const lowQuality = currentQ <= userQuality * 0.85;
    const overlyAggressive = ssim < SSIM_TARGET + 0.005;

    // Accept candidate only when SSIM target hit and we are not too aggressive.
    if (ssim >= SSIM_TARGET && (!lowQuality || ssim >= SSIM_TARGET + 0.01)) {
      if (candidate.size < bestSize) {
        bestBlob = candidate;
        bestSize = candidate.size;
      }
      maxQ = currentQ;

      // Good enough and close to the requested quality: stop early.
      if (currentQ >= userQuality * 0.98 && ssim >= SSIM_TARGET + 0.01) {
        break;
      }
    } else {
      minQ = currentQ;

      // when too aggressive quality drop has visible loss, step back
      if (overlyAggressive) {
        minQ = Math.max(minQ, currentQ + 0.01);
      }
    }

    if (maxQ - minQ < 0.015) break;
  }

  if (bestBlob) {
    return bestBlob;
  }

  // fallback to stable baseline quality in worst case
  const fallbackQ = settings.lossless ? 0.9 : Math.max(0.8, userQuality);
  return encodeAt(fallbackQ);
};

export const createZipArchive = async (files: OptimizedFile[]): Promise<Blob> => {
  const zip = new JSZip();

  // Filter only completed files that have a result AND are smaller than original
  const successfulFiles = files.filter(f =>
    f.status === ProcessingStatus.COMPLETED &&
    f.resultBlob &&
    (f.compressedSize || 0) < f.originalSize
  );

  successfulFiles.forEach((file) => {
    if (file.resultBlob) {
      const fileName = getOutputFileName(file.originalFile.name, file.resultBlob.type);
      zip.file(fileName, file.resultBlob);
    }
  });

  return await zip.generateAsync({ type: 'blob' });
};
