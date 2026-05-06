import { layout } from './layout';
import { rasterizeSeed } from './seed';
import { buildGlyphAtlas } from './glyph-atlas';
import {
  createBundle,
  linkProgram,
  createPingPong,
  uploadTexture,
  WebGLNotAvailable,
  ShaderCompileError,
} from './webgl';
import { VS_QUAD, FS_RENDER, buildStepShader } from './shaders';
import { startLifecycle, prefersReducedMotion, type LifecycleHandle } from './lifecycle';
import {
  ROMAN,
  UNIVERS,
  templateForLayout,
  type FigletSet,
} from './figlet-templates';

type CARule = 'conway' | 'briansBrain' | 'dayAndNight' | 'custom';

interface Theme {
  field: string;
  mark: string;
  fontFamily: string;
  alphabet: readonly string[];
  /** Per-theme CA personality. Conway thins, Brian's Brain pulses in
   *  waves, Day-and-Night bursts symmetric, Custom blooms dense. */
  rule: CARule;
  /** When set, the seed is the figlet template (not a rasterized font),
   *  and each cell renders the glyph that lives at that position in the
   *  template — no random hashing. */
  figlet?: FigletSet;
}

const THEMES: Theme[] = [
  {
    field: 'oklch(86% 0.018 165)',
    mark: 'oklch(18% 0.012 165)',
    fontFamily: "'Anton', 'Impact', 'Helvetica Neue', sans-serif",
    alphabet: ['.', ':', '-', '=', '+', '*', '#', '%'],
    rule: 'custom',
  },
  {
    field: 'oklch(86% 0.060 90)',
    mark: 'oklch(22% 0.030 90)',
    fontFamily: "'Abril Fatface', 'Times New Roman', serif",
    alphabet: ['·', '∗', '✦', '✶', '✺', '❋', '✻', '✿'],
    rule: 'briansBrain',
  },
  {
    field: 'oklch(82% 0.030 60)',         // warm muted ash
    mark: 'oklch(20% 0.018 60)',
    fontFamily: "'Anton', sans-serif",    // unused for figlet rendering
    alphabet: ROMAN.alphabet,
    figlet: ROMAN,
    rule: 'dayAndNight',
  },
  {
    field: 'oklch(82% 0.020 290)',        // dusky lilac
    mark: 'oklch(20% 0.018 290)',
    fontFamily: "'Anton', sans-serif",
    alphabet: UNIVERS.alphabet,
    figlet: UNIVERS,
    rule: 'custom',
  },
];

function applyTheme(theme: Theme) {
  document.documentElement.style.setProperty('--field', theme.field);
  document.documentElement.style.setProperty('--mark', theme.mark);
}

function readMarkColorFromCSS(): [number, number, number] {
  const probe = document.createElement('span');
  probe.style.color = 'var(--mark)';
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0.07, 0.08, 0.08];
  const parts = m[1]!.split(',').map((s) => parseFloat(s.trim()));
  const [r = 0, g = 0, b = 0] = parts;
  return [r / 255, g / 255, b / 255];
}

function showFallback() {
  document.body.classList.add('webgl-unavailable');
  if (document.querySelector('img.fallback')) return;
  const img = document.createElement('img');
  img.src = '/og.png';
  img.alt = '';
  img.className = 'fallback';
  document.body.appendChild(img);
}

/**
 * Hash-based glyph map: every cell gets a deterministic glyph index
 * derived from its (x, y) position. Used by non-figlet themes.
 */
function buildHashGlyphMap(gridW: number, gridH: number, alphabetLen: number): Uint8Array {
  const out = new Uint8Array(gridW * gridH);
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      // Cheap deterministic hash; mirrors the spirit of the original
      // shader-side hash21 but lives in JS so the shader can stay
      // texture-driven.
      const h = Math.imul(x * 73856093 ^ y * 19349663, 0x5bd1e995);
      out[y * gridW + x] = (h >>> 0) % alphabetLen;
    }
  }
  return out;
}

interface SeedAndMap {
  state: Uint8Array;     // 0 dead, 255 alive
  glyphMap: Uint8Array;  // glyph index per cell
  gridW: number;
  gridH: number;
  cellSize: number;
}

/**
 * Figlet seed: the template defines both the alive/dead pattern and
 * the per-cell glyph. Cell size scales with viewport so the template
 * occupies ~80% of canvas width.
 */
function seedFromFiglet(
  set: FigletSet,
  layoutLines: readonly string[],
  canvasWidth: number,
  canvasHeight: number,
  alphabet: readonly string[],
): SeedAndMap {
  const lines = templateForLayout(set, layoutLines);
  const templateW = Math.max(...lines.map((l) => l.length));
  const templateH = lines.length;

  // Pick cellSize so the figlet template spans about 85% of the canvas
  // width (or the height limit, whichever is smaller). Floor to even
  // values for clean device-pixel alignment on retina.
  const widthCell  = Math.floor((canvasWidth  * 0.92) / templateW);
  const heightCell = Math.floor((canvasHeight * 0.80) / templateH);
  let cellSize = Math.max(2, Math.min(widthCell, heightCell));
  if (cellSize % 2 === 1) cellSize -= 1;

  const gridW = Math.floor(canvasWidth / cellSize);
  const gridH = Math.floor(canvasHeight / cellSize);

  const state = new Uint8Array(gridW * gridH);
  const glyphMap = new Uint8Array(gridW * gridH);

  // Build a char → atlas index lookup.
  const charToIdx = new Map<string, number>();
  for (let i = 0; i < alphabet.length; i++) charToIdx.set(alphabet[i]!, i);

  // Center the template inside the grid.
  const ox = Math.floor((gridW - templateW) / 2);
  const oy = Math.floor((gridH - templateH) / 2);

  for (let ty = 0; ty < templateH; ty++) {
    const row = lines[ty] ?? '';
    for (let tx = 0; tx < row.length; tx++) {
      const ch = row[tx]!;
      if (ch === ' ') continue;
      const gx = ox + tx;
      const gy = oy + ty;
      if (gx < 0 || gx >= gridW || gy < 0 || gy >= gridH) continue;
      const i = gy * gridW + gx;
      state[i] = 255;
      glyphMap[i] = charToIdx.get(ch) ?? 0;
    }
  }

  return { state, glyphMap, gridW, gridH, cellSize };
}

interface Run {
  render: () => void;
  start: () => void;
  stop: () => void;
}

/**
 * Interleave state (R) and glyphMap (G) into a packed RG8 byte buffer.
 * The ping-pong textures hold both channels so the render shader fetches
 * them in a single texture read.
 */
function packStateGlyph(state: Uint8Array, glyphMap: Uint8Array): Uint8Array {
  const out = new Uint8Array(state.length * 2);
  for (let i = 0; i < state.length; i++) {
    out[i * 2] = state[i]!;
    out[i * 2 + 1] = glyphMap[i]!;
  }
  return out;
}

function startRun(
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
  theme: Theme,
): Run | null {
  const dpr = window.devicePixelRatio || 1;
  const layoutResult = layout({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: dpr,
  });

  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);

  let state: Uint8Array;
  let glyphMap: Uint8Array;
  let gridW: number;
  let gridH: number;
  let cellSize: number;

  if (theme.figlet) {
    const seed = seedFromFiglet(
      theme.figlet,
      layoutResult.lines,
      canvas.width,
      canvas.height,
      theme.alphabet,
    );
    state = seed.state;
    glyphMap = seed.glyphMap;
    gridW = seed.gridW;
    gridH = seed.gridH;
    cellSize = seed.cellSize;
  } else {
    cellSize = layoutResult.cellSize;
    gridW = Math.floor(canvas.width / cellSize);
    gridH = Math.floor(canvas.height / cellSize);
    const seedW = gridW * cellSize;
    const seedH = gridH * cellSize;
    state = rasterizeSeed({
      lines: layoutResult.lines,
      width: seedW,
      height: seedH,
      fontSizePx: layoutResult.fontSizePx,
      cellSize,
      fontFamily: theme.fontFamily,
    });
    glyphMap = buildHashGlyphMap(gridW, gridH, theme.alphabet.length);
  }

  const markColor = readMarkColorFromCSS();
  const markRgbCss = `rgb(${markColor.map((c) => Math.round(c * 255)).join(',')})`;
  const atlas = buildGlyphAtlas(cellSize, markRgbCss, theme.alphabet);

  let stepProgram: WebGLProgram;
  let renderProgram: WebGLProgram;
  try {
    stepProgram = linkProgram(gl, VS_QUAD, buildStepShader(theme.rule));
    renderProgram = linkProgram(gl, VS_QUAD, FS_RENDER);
  } catch (e) {
    if (e instanceof ShaderCompileError) {
      console.error(e);
      showFallback();
      return null;
    }
    throw e;
  }

  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  let ping: ReturnType<typeof createPingPong>;
  try {
    ping = createPingPong(gl, gridW, gridH, packStateGlyph(state, glyphMap));
  } catch (e) {
    console.error('ping-pong setup failed:', e);
    showFallback();
    return null;
  }
  const atlasTex = uploadTexture(gl, atlas.canvas as TexImageSource);

  function bindQuad(program: WebGLProgram) {
    const loc = gl.getAttribLocation(program, 'aPos');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  function step() {
    gl.useProgram(stepProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, ping.write.fb);
    gl.viewport(0, 0, gridW, gridH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ping.read.tex);
    gl.uniform1i(gl.getUniformLocation(stepProgram, 'uPrev'), 0);
    gl.uniform2f(gl.getUniformLocation(stepProgram, 'uResolution'), gridW, gridH);
    bindQuad(stepProgram);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ping.swap();
  }

  function render() {
    gl.useProgram(renderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ping.read.tex);
    gl.uniform1i(gl.getUniformLocation(renderProgram, 'uState'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.uniform1i(gl.getUniformLocation(renderProgram, 'uAtlas'), 1);
    gl.uniform2f(gl.getUniformLocation(renderProgram, 'uGridSize'), gridW, gridH);
    gl.uniform1f(gl.getUniformLocation(renderProgram, 'uAtlasLen'), atlas.alphabetLength);
    gl.uniform3f(
      gl.getUniformLocation(renderProgram, 'uMarkColor'),
      markColor[0]!,
      markColor[1]!,
      markColor[2]!,
    );
    bindQuad(renderProgram);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function disposeGpuResources() {
    gl.deleteBuffer(quadBuf);
    gl.deleteProgram(stepProgram);
    gl.deleteProgram(renderProgram);
    gl.deleteTexture(atlasTex);
    gl.deleteTexture(ping.read.tex);
    gl.deleteTexture(ping.write.tex);
    gl.deleteFramebuffer(ping.read.fb);
    gl.deleteFramebuffer(ping.write.fb);
  }

  let lifecycle: LifecycleHandle | null = null;

  return {
    render,
    start() {
      if (lifecycle) return;
      lifecycle = startLifecycle({
        settlingMs: 250,
        initialGenerationsPerSecond: 6,
        step,
        render,
      });
    },
    stop() {
      lifecycle?.stop();
      lifecycle = null;
      disposeGpuResources();
    },
  };
}

async function boot() {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const canvasOrNull = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvasOrNull) return;
  const canvas: HTMLCanvasElement = canvasOrNull;

  let bundle;
  try {
    bundle = createBundle(canvas);
  } catch (e) {
    if (e instanceof WebGLNotAvailable) {
      showFallback();
      return;
    }
    throw e;
  }
  const { gl } = bundle;

  let themeIndex = 0;
  applyTheme(THEMES[themeIndex]!);

  let run: Run | null = startRun(canvas, gl, THEMES[themeIndex]!);
  run?.render();

  if (prefersReducedMotion()) return;

  let started = false;
  let autoStartTimer: ReturnType<typeof setTimeout> | null = null;

  function cancelAutoStart() {
    if (autoStartTimer !== null) {
      clearTimeout(autoStartTimer);
      autoStartTimer = null;
    }
  }

  function scheduleAutoStart() {
    cancelAutoStart();
    autoStartTimer = setTimeout(() => {
      if (!started) {
        run?.start();
        started = true;
      }
      autoStartTimer = null;
    }, 5000);
  }

  function advanceTheme() {
    themeIndex = (themeIndex + 1) % THEMES.length;
    applyTheme(THEMES[themeIndex]!);
    cancelAutoStart();
    run?.stop();
    run = startRun(canvas, gl, THEMES[themeIndex]!);
    run?.render();
    started = false;
    scheduleAutoStart();
  }

  scheduleAutoStart();

  canvas.addEventListener('click', () => {
    if (!started) {
      cancelAutoStart();
      run?.start();
      started = true;
    } else {
      advanceTheme();
    }
  });

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      run?.stop();
      run = startRun(canvas, gl, THEMES[themeIndex]!);
      run?.render();
      if (started) run?.start();
    }, 250);
  });
}

boot().catch((e) => {
  console.error('boot failed', e);
});
