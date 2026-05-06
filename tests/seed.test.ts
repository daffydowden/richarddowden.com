import { describe, it, expect } from 'vitest';
import { rasterizeSeed } from '../src/seed';

function makeTestCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

describe('rasterizeSeed', () => {
  it('returns a buffer of width*height bytes', () => {
    const buf = rasterizeSeed({
      lines: ['RICHARD'],
      width: 320,
      height: 80,
      fontSizePx: 64,
      cellSize: 8,
      createCanvas: makeTestCanvas,
    });
    expect(buf.byteLength).toBe(40 * 10); // (320/8) * (80/8)
  });

  it('contains at least one live cell for non-empty text', () => {
    const buf = rasterizeSeed({
      lines: ['R'],
      width: 64,
      height: 64,
      fontSizePx: 48,
      cellSize: 8,
      createCanvas: makeTestCanvas,
    });
    let live = 0;
    for (const b of buf) if (b === 1) live++;
    expect(live).toBeGreaterThan(0);
  });

  it('is deterministic: same input → identical buffer', () => {
    const args = {
      lines: ['DOWDEN'] as string[],
      width: 256,
      height: 64,
      fontSizePx: 56,
      cellSize: 8,
      createCanvas: makeTestCanvas,
    };
    const a = rasterizeSeed(args);
    const b = rasterizeSeed(args);
    expect(a).toEqual(b);
  });

  it('blank lines produce a buffer of all zeros', () => {
    const buf = rasterizeSeed({
      lines: [''],
      width: 64,
      height: 64,
      fontSizePx: 48,
      cellSize: 8,
      createCanvas: makeTestCanvas,
    });
    expect(buf.every((b) => b === 0)).toBe(true);
  });

  it('empty lines array produces a buffer of all zeros', () => {
    const buf = rasterizeSeed({
      lines: [],
      width: 64,
      height: 64,
      fontSizePx: 48,
      cellSize: 8,
      createCanvas: makeTestCanvas,
    });
    expect(buf.every((b) => b === 0)).toBe(true);
  });

  it('two lines stack vertically', () => {
    const buf = rasterizeSeed({
      lines: ['R', 'D'],
      width: 64,
      height: 128,
      fontSizePx: 48,
      cellSize: 8,
      createCanvas: makeTestCanvas,
    });
    const cellsW = 64 / 8;
    const cellsH = 128 / 8;
    let topLive = 0, bottomLive = 0;
    for (let y = 0; y < cellsH; y++) {
      for (let x = 0; x < cellsW; x++) {
        const idx = y * cellsW + x;
        if (buf[idx] === 1) {
          if (y < cellsH / 2) topLive++;
          else bottomLive++;
        }
      }
    }
    expect(topLive).toBeGreaterThan(0);
    expect(bottomLive).toBeGreaterThan(0);
  });
});
