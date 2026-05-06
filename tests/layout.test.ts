import { describe, it, expect } from 'vitest';
import { layout } from '../src/layout';

describe('layout', () => {
  it('returns single-line full name for ultrawide', () => {
    const r = layout({ viewportWidth: 1920, viewportHeight: 1080 });
    expect(r.copy).toBe('RICHARD DOWDEN');
    expect(r.lines).toEqual(['RICHARD DOWDEN']);
  });

  it('returns two stacked words for standard desktop', () => {
    const r = layout({ viewportWidth: 1024, viewportHeight: 768 });
    expect(r.copy).toBe('RICHARD DOWDEN');
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

  it('uses one line at exactly 1280px (boundary)', () => {
    const r = layout({ viewportWidth: 1280, viewportHeight: 720 });
    expect(r.lines).toEqual(['RICHARD DOWDEN']);
  });

  it('cellSize is integer px', () => {
    const r = layout({ viewportWidth: 1024, viewportHeight: 768 });
    expect(Number.isInteger(r.cellSize)).toBe(true);
    expect(r.cellSize).toBeGreaterThan(0);
  });

  it('cellSize is consistent across breakpoints (8 or 12)', () => {
    const a = layout({ viewportWidth: 1024, viewportHeight: 768 });
    const b = layout({ viewportWidth: 1920, viewportHeight: 1080 });
    expect([8, 12]).toContain(a.cellSize);
    expect([8, 12]).toContain(b.cellSize);
  });

  it('cellSize is 8 on retina (devicePixelRatio >= 2), 12 otherwise', () => {
    const retina = layout({ viewportWidth: 1024, viewportHeight: 768, devicePixelRatio: 2 });
    const standard = layout({ viewportWidth: 1024, viewportHeight: 768, devicePixelRatio: 1 });
    expect(retina.cellSize).toBe(8);
    expect(standard.cellSize).toBe(12);
  });

  it('fontSizePx is an integer multiple of cellSize', () => {
    const r = layout({ viewportWidth: 1024, viewportHeight: 768 });
    expect(r.fontSizePx % r.cellSize).toBe(0);
  });
});
