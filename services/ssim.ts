/**
 * Mean structural similarity (SSIM) over the luminance channel, using
 * non-overlapping 8x8 windows. Both buffers must be RGBA of the same size.
 */
export const calculateSSIM = (
  data1: Uint8ClampedArray,
  data2: Uint8ClampedArray,
  width: number,
  height: number
): number => {
  const K1 = 0.01;
  const K2 = 0.03;
  const L = 255;
  const C1 = (K1 * L) * (K1 * L);
  const C2 = (K2 * L) * (K2 * L);

  const windowSize = 8;
  const N = windowSize * windowSize;
  let mssim = 0;
  let numWindows = 0;

  const luma = (data: Uint8ClampedArray, idx: number) =>
    0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

  for (let y = 0; y + windowSize <= height; y += windowSize) {
    for (let x = 0; x + windowSize <= width; x += windowSize) {
      let meanx = 0, meany = 0;

      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = ((y + wy) * width + (x + wx)) * 4;
          meanx += luma(data1, idx);
          meany += luma(data2, idx);
        }
      }
      meanx /= N;
      meany /= N;

      let varx = 0, vary = 0, covxy = 0;
      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = ((y + wy) * width + (x + wx)) * 4;
          const dx = luma(data1, idx) - meanx;
          const dy = luma(data2, idx) - meany;
          varx += dx * dx;
          vary += dy * dy;
          covxy += dx * dy;
        }
      }
      varx /= N - 1;
      vary /= N - 1;
      covxy /= N - 1;

      const num = (2 * meanx * meany + C1) * (2 * covxy + C2);
      const den = (meanx * meanx + meany * meany + C1) * (varx + vary + C2);
      mssim += num / den;
      numWindows++;
    }
  }

  return numWindows === 0 ? 1 : mssim / numWindows;
};
