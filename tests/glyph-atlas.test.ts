import { describe, it, expect } from 'vitest';
import { buildGlyphAtlas } from '../src/glyph-atlas';

describe('glyph-atlas', () => {
  it('buildGlyphAtlas returns correct shape and dimensions', () => {
    const cellSize = 32;
    const atlas = buildGlyphAtlas(cellSize, '#000');
    expect(atlas).toHaveProperty('canvas');
    expect(atlas.cellSize).toBe(32);
    expect(atlas.alphabetLength).toBe(8);
    expect(atlas.canvas.width).toBe(8 * cellSize);
    expect(atlas.canvas.height).toBe(cellSize);
  });
});
