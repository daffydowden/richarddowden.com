export const ALPHABET = ['.', ':', ';', '+', '*', '#', '@', '░'] as const;
export type Glyph = typeof ALPHABET[number];

export interface GlyphAtlas {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  cellSize: number;
  alphabetLength: number;
}

const ATLAS_FONT_FAMILY = "'IBM Plex Mono', 'Menlo', 'Monaco', monospace";

export function buildGlyphAtlas(cellSize: number, markColor: string): GlyphAtlas {
  const w = cellSize * ALPHABET.length;
  const h = cellSize;
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(w, h)
      : (() => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          return c;
        })();

  const ctx =
    typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas
      ? canvas.getContext('2d')
      : (canvas as HTMLCanvasElement).getContext('2d');
  if (!ctx) throw new Error('buildGlyphAtlas: 2D context unavailable');

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = markColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Mono atlas glyphs: render at slightly less than cellSize so they don't
  // touch their bounds — we want air around each mark.
  ctx.font = `${Math.floor(cellSize * 0.9)}px ${ATLAS_FONT_FAMILY}`;

  for (let i = 0; i < ALPHABET.length; i++) {
    const cx = i * cellSize + cellSize / 2;
    const cy = cellSize / 2;
    ctx.fillText(ALPHABET[i]!, cx, cy);
  }

  return { canvas, cellSize, alphabetLength: ALPHABET.length };
}
