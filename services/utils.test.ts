import { describe, expect, it } from 'vitest';
import type { OptimizationSettings } from '../types';
import {
  areSettingsEqual,
  calculateSavings,
  formatBytes,
  getInputMimeType,
  getOutputFileName,
  isSupportedImageFile,
  uniqueFileName,
} from './utils';

describe('getOutputFileName', () => {
  it('swaps the extension for the output type', () => {
    expect(getOutputFileName('photo.png', 'image/webp')).toBe('photo.webp');
    expect(getOutputFileName('photo.JPEG', 'image/jpeg')).toBe('photo.jpg');
    expect(getOutputFileName('my.holiday.photo.png', 'image/jpeg')).toBe('my.holiday.photo.jpg');
  });

  it('handles names without an extension', () => {
    expect(getOutputFileName('photo', 'image/png')).toBe('photo.png');
    expect(getOutputFileName('photo', '')).toBe('photo.bin');
  });
});

describe('uniqueFileName', () => {
  it('numbers duplicates, ignoring case', () => {
    const used = new Set(['photo.webp', 'photo-1.webp']);
    expect(uniqueFileName('new.webp', used)).toBe('new.webp');
    expect(uniqueFileName('Photo.webp', used)).toBe('Photo-2.webp');
  });

  it('handles names without an extension and dotfiles', () => {
    expect(uniqueFileName('photo', new Set(['photo']))).toBe('photo-1');
    expect(uniqueFileName('.hidden', new Set(['.hidden']))).toBe('.hidden-1');
  });
});

describe('file type detection', () => {
  it('uses the MIME type, falling back to the extension', () => {
    expect(isSupportedImageFile(new File([], 'a.bin', { type: 'image/png' }))).toBe(true);
    expect(isSupportedImageFile(new File([], 'a.WEBP'))).toBe(true);
    expect(isSupportedImageFile(new File([], 'a.gif', { type: 'image/gif' }))).toBe(false);
    expect(getInputMimeType(new File([], 'a.jpg'))).toBe('image/jpeg');
  });
});

describe('formatting', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('calculates savings, negative when the file grew', () => {
    expect(calculateSavings(1000, 250)).toBe(75);
    expect(calculateSavings(1000, 1100)).toBe(-10);
    expect(calculateSavings(0, 10)).toBe(0);
  });
});

describe('areSettingsEqual', () => {
  const base: OptimizationSettings = {
    quality: 80,
    useSmartCompression: true,
    format: 'original',
    lossless: false,
    stripExif: true,
    resizeMode: 'none',
  };

  it('compares every setting', () => {
    expect(areSettingsEqual(base, { ...base })).toBe(true);
    expect(areSettingsEqual(base, { ...base, resizeMode: 'fit', resizeValue: 800 })).toBe(false);
    expect(areSettingsEqual({ ...base, resizeValue: 800 }, { ...base, resizeValue: 900 })).toBe(false);
    expect(areSettingsEqual(base, undefined)).toBe(false);
  });
});
