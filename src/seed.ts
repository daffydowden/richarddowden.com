export interface SeedInput {
  lines: string[];
  width: number;          // canvas width in CSS pixels
  height: number;         // canvas height in CSS pixels
  fontSizePx: number;     // cap height target
  cellSize: number;       // CA cell size in px (output buffer is width/cellSize x height/cellSize)
  /** Override canvas factory for tests / non-OffscreenCanvas environments. */
  createCanvas?: (w: number, h: number) => HTMLCanvasElement | OffscreenCanvas;
}

const DEFAULT_FONT_FAMILY =
  "'Druk Wide Web', 'Compacta', 'Impact', 'Helvetica Neue', sans-serif";

function defaultCreate(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Rasterize the typeset name to a 1-bit grid of CA cells.
 * The buffer is row-major: index = y * (width/cellSize) + x.
 * Each byte is 0 (dead) or 1 (alive).
 */
export function rasterizeSeed(input: SeedInput): Uint8Array {
  const { lines, width, height, fontSizePx, cellSize } = input;
  const create = input.createCanvas ?? defaultCreate;
  const canvas = create(width, height);
  const ctx = (canvas as HTMLCanvasElement).getContext('2d', {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error('rasterizeSeed: 2D canvas context unavailable');

  // Field is transparent; mark is opaque black. We threshold on alpha.
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = `900 ${fontSizePx}px ${DEFAULT_FONT_FAMILY}`;

  const lineHeight = fontSizePx * 0.85;
  const totalTextHeight = lineHeight * lines.length;
  const yStart = Math.floor((height - totalTextHeight) / 2);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (!line) continue;
    const measured = ctx.measureText(line);
    const xStart = Math.floor((width - measured.width) / 2);
    ctx.fillText(line, xStart, yStart + i * lineHeight);
  }

  const cellsW = Math.floor(width / cellSize);
  const cellsH = Math.floor(height / cellSize);
  const out = new Uint8Array(cellsW * cellsH);

  // Sample the alpha at each cell's center.
  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;
  for (let cy = 0; cy < cellsH; cy++) {
    for (let cx = 0; cx < cellsW; cx++) {
      const px = cx * cellSize + Math.floor(cellSize / 2);
      const py = cy * cellSize + Math.floor(cellSize / 2);
      const i = (py * width + px) * 4;
      const alpha = data[i + 3] ?? 0;
      out[cy * cellsW + cx] = alpha > 128 ? 1 : 0;
    }
  }
  return out;
}
