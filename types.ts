export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp';

export const OUTPUT_FORMATS: readonly OutputFormat[] = ['original', 'jpeg', 'png', 'webp'];

export type ResizeMode = 'none' | 'fit' | 'width' | 'height' | 'percent';

export const RESIZE_MODES: readonly ResizeMode[] = ['none', 'fit', 'width', 'height', 'percent'];

export interface OptimizationSettings {
  quality: number; // 0 to 100
  useSmartCompression: boolean; // Use SSIM to determine quality
  format: OutputFormat;
  lossless: boolean; // "Max Quality" in the UI: lossless PNG/WebP, near-lossless JPEG
  stripExif: boolean;
  resizeMode: ResizeMode;
  resizeValue?: number; // px, or % for 'percent'
}

export interface OptimizedFile {
  id: string;
  originalFile: File;
  previewUrl: string;
  status: ProcessingStatus;
  progress: number;
  resultBlob?: Blob;
  resultUrl?: string;
  originalSize: number;
  compressedSize?: number;
  error?: string;
  processedSettings?: OptimizationSettings;
}

export interface ProcessingStats {
  totalSavedBytes: number;
  totalFiles: number;
  completedFiles: number;
}
