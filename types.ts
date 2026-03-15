export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface OptimizationSettings {
  quality: number; // 0 to 100
  useSmartCompression: boolean; // Use SSIM to determine quality
  format: 'original' | 'jpeg' | 'webp';
  lossless: boolean;
  stripExif: boolean;
  convertToRgb: boolean;
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