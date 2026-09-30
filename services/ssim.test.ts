import { describe, expect, it } from 'vitest';
import { calculateSSIM } from './ssim';

const image = (width: number, height: number, pixel: (x: number, y: number) => number) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = pixel(x, y);
      data[i + 3] = 255;
    }
  }
  return data;
};

describe('calculateSSIM', () => {
  const pattern = image(64, 64, (x, y) => (x * 7 + y * 13) % 256);

  it('is 1 for identical images', () => {
    expect(calculateSSIM(pattern, pattern.slice(), 64, 64)).toBeCloseTo(1, 5);
  });

  it('drops as the image degrades', () => {
    const slight = image(64, 64, (x, y) => ((x * 7 + y * 13) % 256) + ((x + y) % 2 ? 3 : -3));
    const heavy = image(64, 64, (x, y) => ((x * 7 + y * 13) % 256) + ((x + y) % 2 ? 60 : -60));
    const slightScore = calculateSSIM(pattern, slight, 64, 64);
    const heavyScore = calculateSSIM(pattern, heavy, 64, 64);
    expect(slightScore).toBeLessThan(1);
    expect(heavyScore).toBeLessThan(slightScore);
  });
});
