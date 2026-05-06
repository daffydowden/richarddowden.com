export interface LayoutInput {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio?: number;
}

export interface LayoutResult {
  copy: string;
  lines: string[];
  cellSize: number;
  fontSizePx: number;
}

export function layout(input: LayoutInput): LayoutResult {
  const { viewportWidth, viewportHeight, devicePixelRatio = 1 } = input;
  const cellSize = devicePixelRatio >= 2 ? 8 : 12;

  let copy: string;
  let lines: string[];

  if (viewportWidth < 600) {
    copy = 'R·D';
    lines = ['R', '·D'];
  } else if (viewportWidth < 1280) {
    copy = 'RICHARD DOWDEN';
    lines = ['RICHARD', 'DOWDEN'];
  } else {
    copy = 'RICHARD DOWDEN';
    lines = ['RICHARD DOWDEN'];
  }

  // fontSizePx is the visible cap height in px, snapped to integer multiples
  // of cellSize so the rasterized seed aligns to the CA grid.
  const longestLineChars = Math.max(...lines.map((l) => l.length));
  const padding = Math.floor(viewportWidth * 0.04); // matches CSS 4vmin-ish
  const usableWidth = viewportWidth - padding * 2;
  const approxPxPerChar = usableWidth / longestLineChars;
  // Heavy condensed faces are roughly 0.5 width-to-height.
  const rawFontSize = approxPxPerChar / 0.5;
  const linesShown = lines.length;
  const verticalCap = (viewportHeight - padding * 2) / linesShown;
  const target = Math.min(rawFontSize, verticalCap);
  const fontSizePx = Math.floor(target / cellSize) * cellSize;

  return { copy, lines, cellSize, fontSizePx };
}
