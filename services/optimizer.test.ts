// @vitest-environment happy-dom
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { OptimizedFile, OptimizationSettings, ProcessingStatus } from '../types';
import { createZipArchive, getDownloadableFiles, resolveOutputMime } from './optimizer';

const settings = (format: OptimizationSettings['format']): OptimizationSettings => ({
  quality: 80,
  useSmartCompression: true,
  format,
  lossless: false,
  stripExif: true,
  resizeMode: 'none',
});

const completed = (name: string, result: Blob, originalSize = 100): OptimizedFile => ({
  id: name,
  originalFile: new File([], name),
  previewUrl: '',
  status: ProcessingStatus.COMPLETED,
  progress: 100,
  originalSize,
  resultBlob: result,
  compressedSize: result.size,
});

describe('resolveOutputMime', () => {
  it('keeps the input type for "original", falling back to JPEG', () => {
    expect(resolveOutputMime(new File([], 'a.png', { type: 'image/png' }), settings('original'))).toBe('image/png');
    expect(resolveOutputMime(new File([], 'a.webp'), settings('original'))).toBe('image/webp');
    expect(resolveOutputMime(new File([], 'a.gif', { type: 'image/gif' }), settings('original'))).toBe('image/jpeg');
    expect(resolveOutputMime(new File([], 'a.png', { type: 'image/png' }), settings('webp'))).toBe('image/webp');
  });
});

describe('downloads', () => {
  const webp = (size: number) => new Blob([new Uint8Array(size)], { type: 'image/webp' });

  it('includes every completed file, even ones that grew', () => {
    const files = [
      completed('small.png', webp(10)),
      completed('grew.png', webp(500)),
      { ...completed('pending.png', webp(1)), status: ProcessingStatus.PENDING },
    ];
    expect(getDownloadableFiles(files).map((f) => f.id)).toEqual(['small.png', 'grew.png']);
  });

  it('gives files with the same output name distinct names in the ZIP', async () => {
    const zip = await createZipArchive([
      completed('photo.png', webp(10)),
      completed('photo.jpg', webp(20)),
      completed('PHOTO.jpeg', webp(30)),
    ]);
    const names = Object.keys((await JSZip.loadAsync(await zip.arrayBuffer())).files);
    expect(names).toEqual(['photo.webp', 'photo-1.webp', 'PHOTO-2.webp']);
  });
});
