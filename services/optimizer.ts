import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { OptimizationSettings, OptimizedFile, ProcessingStatus } from '../types';
import { getOutputFileName } from './utils';

// --- SSIM Implementation ---

/**
 * Gets pixel data from a blob by rendering it to a small canvas.
 * We downscale large images to speed up SSIM calculation without significant loss of metric accuracy.
 */
const getPixelData = async (blob: Blob, maxWidth = 512): Promise<{ data: Uint8ClampedArray, width: number, height: number }> => {
  const img = await createImageBitmap(blob);
  const scale = Math.min(1, maxWidth / img.width);
  const width = Math.floor(img.width * scale);
  const height = Math.floor(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("Could not get canvas context");
  
  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height);
  img.close(); // Release memory
  return { data: data.data, width, height };
};

/**
 * Calculates a simplified structural similarity index (SSIM) between two image buffers.
 * This implementation focuses on the luminance (Y) channel.
 */
const calculateSSIM = (
  data1: Uint8ClampedArray, 
  data2: Uint8ClampedArray, 
  width: number, 
  height: number
): number => {
  // Constants for SSIM (standard values)
  const K1 = 0.01;
  const K2 = 0.03;
  const L = 255;
  const C1 = (K1 * L) * (K1 * L);
  const C2 = (K2 * L) * (K2 * L);

  let mssim = 0;
  const windowSize = 8;
  const numWindows = Math.floor(width / windowSize) * Math.floor(height / windowSize);
  
  if (numWindows === 0) return 1;

  for (let y = 0; y < height - windowSize; y += windowSize) {
    for (let x = 0; x < width - windowSize; x += windowSize) {
      
      let meanx = 0, meany = 0;
      let varx = 0, vary = 0, covxy = 0;

      // Pass 1: Calculate Mean
      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = ((y + wy) * width + (x + wx)) * 4;
          // RGB to Luma (Y)
          const y1 = 0.299 * data1[idx] + 0.587 * data1[idx+1] + 0.114 * data1[idx+2];
          const y2 = 0.299 * data2[idx] + 0.587 * data2[idx+1] + 0.114 * data2[idx+2];
          
          meanx += y1;
          meany += y2;
        }
      }
      const N = windowSize * windowSize;
      meanx /= N;
      meany /= N;

      // Pass 2: Calculate Variance and Covariance
      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = ((y + wy) * width + (x + wx)) * 4;
          const y1 = 0.299 * data1[idx] + 0.587 * data1[idx+1] + 0.114 * data1[idx+2];
          const y2 = 0.299 * data2[idx] + 0.587 * data2[idx+1] + 0.114 * data2[idx+2];
          
          varx += (y1 - meanx) * (y1 - meanx);
          vary += (y2 - meany) * (y2 - meany);
          covxy += (y1 - meanx) * (y2 - meany);
        }
      }
      varx /= (N - 1);
      vary /= (N - 1);
      covxy /= (N - 1);

      // Compute SSIM for this window
      const num = (2 * meanx * meany + C1) * (2 * covxy + C2);
      const den = (meanx * meanx + meany * meany + C1) * (varx + vary + C2);
      
      mssim += num / den;
    }
  }

  return mssim / numWindows;
};

// --- Main Processing Logic ---

export const processImage = async (
  file: File,
  settings: OptimizationSettings,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<Blob> => {
  if (settings.useSmartCompression || settings.lossless) {
    return processImageSmart(file, settings, onProgress, signal);
  }

  const quality = settings.quality / 100;
  return processImageStandard(file, settings, quality, onProgress, signal);
};

// Standard single-pass compression (JPEG, PNG, WebP via browser-image-compression)
const processImageStandard = async (
  file: File,
  settings: OptimizationSettings,
  qualityFactor: number,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<Blob> => {
  const targetMimeType = settings.format === 'original' ? file.type : `image/${settings.format}`;

  const options = {
    maxSizeMB: 50,
    maxWidthOrHeight: settings.resizeWidth || undefined,
    useWebWorker: true,
    fileType: targetMimeType,
    initialQuality: qualityFactor,
    onProgress: onProgress,
    alwaysKeepResolution: true,
    preserveExif: !settings.stripExif,
    ...(signal && { signal }),
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error('Compression error:', error);
    throw error;
  }
};

// Iterative Smart Compression using SSIM
const processImageSmart = async (
  file: File,
  settings: OptimizationSettings,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<Blob> => {
  const SSIM_TARGET = settings.lossless ? 0.985 : 0.96;
  const originalPixels = await getPixelData(file);

  let minQ = settings.lossless ? 0.7 : 0.3;
  let maxQ = 1.0;
  let bestBlob: Blob | null = null;
  let bestSize = Number.POSITIVE_INFINITY;
  const iterations = 7;

  onProgress(10);

  for (let i = 0; i < iterations; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const currentQ = (minQ + maxQ) / 2;

    const compressedBlob = await processImageStandard(file, settings, currentQ, (p) => {
      onProgress(10 + ((i / iterations) * 80) + (p * 0.2));
    }, signal);

    // Get Compressed Pixels
    const compressedPixels = await getPixelData(compressedBlob);

    // Check match dimensions (sanity check, usually safe due to keepResolution)
    if (originalPixels.width !== compressedPixels.width || originalPixels.height !== compressedPixels.height) {
      console.warn("Dimension mismatch during smart compress, falling back to standard");
      return compressedBlob;
    }

    // Measure SSIM
    const ssim = calculateSSIM(
      originalPixels.data,
      compressedPixels.data,
      originalPixels.width,
      originalPixels.height
    );

    // Keep best candidate that meets quality target, with minimum size
    if (ssim >= SSIM_TARGET) {
      if (compressedBlob.size < bestSize) {
        bestBlob = compressedBlob;
        bestSize = compressedBlob.size;
      }
      maxQ = currentQ;
    } else {
      minQ = currentQ;
    }

    // Early stop when quality bracket is too narrow
    if (maxQ - minQ < 0.02) {
      break;
    }
  }

  onProgress(100);

  if (bestBlob) {
    return bestBlob;
  }

  // Fallback: If we never hit the target (rare), return a reasonable default
  // 0.9 for lossless, 0.75 for lossy (balanced default)
  const fallbackQ = settings.lossless ? 0.9 : 0.75;
  return await processImageStandard(file, settings, fallbackQ, () => {}, signal);
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