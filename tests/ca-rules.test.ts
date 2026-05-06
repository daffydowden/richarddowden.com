import { describe, it, expect } from 'vitest';
import {
  conway,
  briansBrain,
  dayAndNight,
  custom,
  type RuleId,
  type RuleFn,
  type CellState,
} from '../src/ca-rules';

const RULES: Record<RuleId, RuleFn> = { conway, briansBrain, dayAndNight, custom };

describe('conway (Game of Life)', () => {
  it('B3: dead cell with exactly 3 live neighbors becomes alive', () => {
    expect(conway(0, 3)).toBe(1);
  });

  it('S2: live cell with 2 live neighbors stays alive', () => {
    expect(conway(1, 2)).toBe(1);
  });

  it('S3: live cell with 3 live neighbors stays alive', () => {
    expect(conway(1, 3)).toBe(1);
  });

  it('underpopulation: live cell with 0 or 1 dies', () => {
    expect(conway(1, 0)).toBe(0);
    expect(conway(1, 1)).toBe(0);
  });

  it('overpopulation: live cell with 4..8 dies', () => {
    for (let n = 4; n <= 8; n++) {
      expect(conway(1, n)).toBe(0);
    }
  });

  it('dead cells with anything other than 3 neighbors stay dead', () => {
    for (let n = 0; n <= 8; n++) {
      if (n !== 3) expect(conway(0, n)).toBe(0);
    }
  });
});

describe("briansBrain (3-state)", () => {
  it('alive (1) always becomes dying (2)', () => {
    for (let n = 0; n <= 8; n++) expect(briansBrain(1, n)).toBe(2);
  });

  it('dying (2) always becomes dead (0)', () => {
    for (let n = 0; n <= 8; n++) expect(briansBrain(2, n)).toBe(0);
  });

  it('dead (0) with exactly 2 alive neighbors becomes alive', () => {
    expect(briansBrain(0, 2)).toBe(1);
  });

  it('dead (0) with anything other than 2 stays dead', () => {
    for (let n = 0; n <= 8; n++) {
      if (n !== 2) expect(briansBrain(0, n)).toBe(0);
    }
  });
});

describe('dayAndNight (B3678/S34678)', () => {
  it('birth on 3, 6, 7, 8 neighbors', () => {
    for (const n of [3, 6, 7, 8]) expect(dayAndNight(0, n)).toBe(1);
  });

  it('no birth on 0, 1, 2, 4, 5', () => {
    for (const n of [0, 1, 2, 4, 5]) expect(dayAndNight(0, n)).toBe(0);
  });

  it('survival on 3, 4, 6, 7, 8', () => {
    for (const n of [3, 4, 6, 7, 8]) expect(dayAndNight(1, n)).toBe(1);
  });

  it('death on 0, 1, 2, 5', () => {
    for (const n of [0, 1, 2, 5]) expect(dayAndNight(1, n)).toBe(0);
  });
});

describe('custom (tuned for richarddowden.com)', () => {
  it('produces a stable result for any (state, neighbors) pair', () => {
    for (const s of [0, 1, 2] as const) {
      for (let n = 0; n <= 8; n++) {
        const r = custom(s, n);
        expect([0, 1, 2]).toContain(r);
      }
    }
  });

  it('has at least one birth condition', () => {
    let births = 0;
    for (let n = 0; n <= 8; n++) {
      if (custom(0, n) !== 0) births++;
    }
    expect(births).toBeGreaterThan(0);
  });

  it('birth on exactly n=3 and n=6 (B36)', () => {
    const expected = [0, 0, 0, 1, 0, 0, 1, 0, 0];
    for (let n = 0; n <= 8; n++) {
      expect(custom(0, n)).toBe(expected[n]);
    }
  });

  it('survival on exactly n=2, 3, 4, 8 (S2348)', () => {
    const expected = [0, 0, 1, 1, 1, 0, 0, 0, 1];
    for (let n = 0; n <= 8; n++) {
      expect(custom(1, n)).toBe(expected[n]);
    }
  });
});

describe('RULES registry', () => {
  it('exports all four rules', () => {
    expect(Object.keys(RULES).sort()).toEqual(
      ['briansBrain', 'conway', 'custom', 'dayAndNight']
    );
  });
});

describe('conway oscillators (integration of the grid)', () => {
  // Helper: step a 2D grid by Conway's rule
  function stepGrid(g: number[][]): number[][] {
    const h = g.length;
    const w = g[0]!.length;
    const next = Array.from({ length: h }, () => Array<number>(w).fill(0));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              n += g[ny]![nx]!;
            }
          }
        }
        next[y]![x] = conway(g[y]![x]! as CellState, n);
      }
    }
    return next;
  }

  it('blinker oscillates with period 2', () => {
    const horizontal = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];
    const vertical = stepGrid(horizontal);
    const back = stepGrid(vertical);
    expect(vertical[2]).toEqual([0, 0, 1, 0, 0]);
    expect(vertical[1]![2]).toBe(1);
    expect(vertical[3]![2]).toBe(1);
    expect(back).toEqual(horizontal);
  });

  it('block is stable', () => {
    const block = [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ];
    expect(stepGrid(block)).toEqual(block);
  });
});
