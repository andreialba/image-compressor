import { OptimizationSettings } from '../types';

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/** Derives a safe output filename from the original name and result MIME type. Handles filenames without extensions. */
export const getOutputFileName = (originalName: string, mime: string): string => {
  let extension: string;
  if (mime === 'image/jpeg') extension = 'jpg';
  else if (mime === 'image/png') extension = 'png';
  else if (mime === 'image/webp') extension = 'webp';
  else {
    const fromName = originalName.split('.').pop();
    extension = fromName && fromName !== originalName ? fromName : 'bin';
  }
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex >= 0 ? originalName.substring(0, dotIndex) : originalName;
  return `${baseName}.${extension}`;
};

export const calculateSavings = (original: number, compressed: number): number => {
  if (original === 0) return 0;
  const savings = ((original - compressed) / original) * 100;
  return parseFloat(savings.toFixed(1));
};

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const areSettingsEqual = (a?: OptimizationSettings, b?: OptimizationSettings): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.quality === b.quality &&
    a.useSmartCompression === b.useSmartCompression &&
    a.format === b.format &&
    a.lossless === b.lossless &&
    a.stripExif === b.stripExif &&
    a.convertToRgb === b.convertToRgb &&
    a.resizeWidth === b.resizeWidth
  );
};