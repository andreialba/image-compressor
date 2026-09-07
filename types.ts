export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp' | 'avif';

export const OUTPUT_FORMATS: readonly OutputFormat[] = ['original', 'jpeg', 'png', 'webp', 'avif'];

export interface OptimizationSettings {
  quality: number; // 0 to 100
  useSmartCompression: boolean; // Use SSIM to determine quality
  format: OutputFormat;
  lossless: boolean;
  stripExif: boolean;
  resizeWidth?: number;
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
