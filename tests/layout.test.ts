import { describe, it, expect } from 'vitest';
import { layout } from '../src/layout';

describe('layout', () => {
  it('returns single-line full name for ultrawide (>=2400)', () => {
    const r = layout({ viewportWidth: 2560, viewportHeight: 1080 });
    expect(r.copy).toBe('RICHARD DOWDEN');
    expect(r.lines).toEqual(['RICHARD DOWDEN']);
  });

  it('returns two stacked words for standard desktop', () => {
    const r = layout({ viewportWidth: 1024, viewportHeight: 768 });
    expect(r.copy).toBe('RICHARD DOWDEN');
    expect(r.lines).toEqual(['RICHARD', 'DOWDEN']);
  });

  it('returns two stacked words for 1080p (1920x1080)', () => {
    const r = layout({ viewportWidth: 1920, viewportHeight: 1080 });
    expect(r.lines).toEqual(['RICHARD', 'DOWDEN']);
  });

  it('returns initials only for narrow phone', () => {
    const r = layout({ viewportWidth: 390, viewportHeight: 844 });
    expect(r.copy).toBe('R·D');
    expect(r.lines).toEqual(['R', '·D']);
  });

  it('uses two lines at exactly 600px (boundary)', () => {
    const r = layout({ viewportWidth: 600, viewportHeight: 800 });
    expect(r.lines).toEqual(['RICHARD', 'DOWDEN']);
  });

  it('uses one line at exactly 2400px (boundary)', () => {
    const r = layout({ viewportWidth: 2400, viewportHeight: 1200 });
    expect(r.lines).toEqual(['RICHARD DOWDEN']);
  });

  it('uses two lines at exactly 2399px (boundary)', () => {
    const r = layout({ viewportWidth: 2399, viewportHeight: 1200 });
    expect(r.lines).toEqual(['RICHARD', 'DOWDEN']);
  });

  it('cellSize is integer px', () => {
    const r = layout({ viewportWidth: 1024, viewportHeight: 768 });
    expect(Number.isInteger(r.cellSize)).toBe(true);
    expect(r.cellSize).toBeGreaterThan(0);
  });

  it('cellSize is consistent across breakpoints (16 or 24)', () => {
    const a = layout({ viewportWidth: 1024, viewportHeight: 768 });
    const b = layout({ viewportWidth: 1920, viewportHeight: 1080 });
    expect([16, 24]).toContain(a.cellSize);
    expect([16, 24]).toContain(b.cellSize);
  });

  it('cellSize is 16 on retina (devicePixelRatio >= 2), 24 otherwise', () => {
    const retina = layout({ viewportWidth: 1024, viewportHeight: 768, devicePixelRatio: 2 });
    const standard = layout({ viewportWidth: 1024, viewportHeight: 768, devicePixelRatio: 1 });
    expect(retina.cellSize).toBe(16);
    expect(standard.cellSize).toBe(24);
  });

  it('fontSizePx is an integer multiple of cellSize', () => {
    const r = layout({ viewportWidth: 1024, viewportHeight: 768 });
    expect(r.fontSizePx % r.cellSize).toBe(0);
  });

  it('fontSizePx is non-negative for degenerate viewports', () => {
    const zeroH = layout({ viewportWidth: 1024, viewportHeight: 0 });
    const zeroW = layout({ viewportWidth: 0, viewportHeight: 768 });
    const zeroBoth = layout({ viewportWidth: 0, viewportHeight: 0 });
    expect(zeroH.fontSizePx).toBeGreaterThanOrEqual(0);
    expect(zeroW.fontSizePx).toBeGreaterThanOrEqual(0);
    expect(zeroBoth.fontSizePx).toBeGreaterThanOrEqual(0);
  });
});
