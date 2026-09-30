import { describe, expect, it } from 'vitest';
import { targetDimensions } from './engine';

describe('targetDimensions', () => {
  it('fits the longest side', () => {
    expect(targetDimensions(4000, 3000, { mode: 'fit', value: 1000 })).toEqual({ width: 1000, height: 750 });
    expect(targetDimensions(3000, 4000, { mode: 'fit', value: 1000 })).toEqual({ width: 750, height: 1000 });
  });

  it('sets width, height or percentage, keeping the aspect ratio', () => {
    expect(targetDimensions(4000, 3000, { mode: 'width', value: 800 })).toEqual({ width: 800, height: 600 });
    expect(targetDimensions(4000, 3000, { mode: 'height', value: 600 })).toEqual({ width: 800, height: 600 });
    expect(targetDimensions(4000, 3000, { mode: 'percent', value: 25 })).toEqual({ width: 1000, height: 750 });
  });

  it('never enlarges', () => {
    expect(targetDimensions(800, 600, { mode: 'width', value: 2000 })).toEqual({ width: 800, height: 600 });
    expect(targetDimensions(800, 600, { mode: 'percent', value: 150 })).toEqual({ width: 800, height: 600 });
  });

  it('ignores missing or invalid values and keeps at least 1px', () => {
    expect(targetDimensions(800, 600)).toEqual({ width: 800, height: 600 });
    expect(targetDimensions(800, 600, { mode: 'width', value: 0 })).toEqual({ width: 800, height: 600 });
    expect(targetDimensions(10000, 10, { mode: 'width', value: 100 })).toEqual({ width: 100, height: 1 });
  });
});
