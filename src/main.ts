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

interface Theme {
  field: string;     // CSS color (oklch ok)
  mark: string;      // CSS color
  fontFamily: string;// font-family stack including a fallback
}

const THEMES: Theme[] = [
  {
    field: 'oklch(86% 0.018 165)',
    mark: 'oklch(18% 0.012 165)',
    fontFamily: "'Anton', 'Impact', 'Helvetica Neue', sans-serif",
  },
  {
    field: 'oklch(80% 0.022 250)',
    mark: 'oklch(20% 0.014 250)',
    fontFamily: "'Bebas Neue', 'Impact', 'Helvetica Neue', sans-serif",
  },
  {
    field: 'oklch(86% 0.060 90)',
    mark: 'oklch(22% 0.030 90)',
    fontFamily: "'Abril Fatface', 'Times New Roman', serif",
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

interface Run {
  /** Render the T=0 frame and return immediately (no animation loop). */
  render: () => void;
  /** Start the animation loop. Idempotent. */
  start: () => void;
  /** Cancel the loop and release per-run GPU resources. */
  stop: () => void;
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

  const cellSize = layoutResult.cellSize;
  const gridW = Math.floor(canvas.width / cellSize);
  const gridH = Math.floor(canvas.height / cellSize);
  const seedW = gridW * cellSize;
  const seedH = gridH * cellSize;

  const initial = rasterizeSeed({
    lines: layoutResult.lines,
    width: seedW,
    height: seedH,
    fontSizePx: layoutResult.fontSizePx,
    cellSize,
    fontFamily: theme.fontFamily,
  });

  const markColor = readMarkColorFromCSS();
  const markRgbCss = `rgb(${markColor.map((c) => Math.round(c * 255)).join(',')})`;
  const atlas = buildGlyphAtlas(cellSize, markRgbCss);

  let stepProgram: WebGLProgram;
  let renderProgram: WebGLProgram;
  try {
    stepProgram = linkProgram(gl, VS_QUAD, buildStepShader('custom'));
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
    ping = createPingPong(gl, gridW, gridH, initial);
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
        // Settling here is short because the user has just clicked. They
        // know it's about to move; no need to hold the static frame.
        settlingMs: 250,
        initialGenerationsPerSecond: 6,
        minGenerationsPerSecond: 2,
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

  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

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

  // Reduced-motion: render T=0 of theme 0 and don't react to clicks.
  // The page is calm. The visitor sees the name and that's it.
  if (prefersReducedMotion()) return;

  let started = false;
  // Auto-start fallback: if the visitor doesn't click within 5s the
  // simulation begins on its own so the canvas isn't a dead image for
  // anyone who didn't notice the cursor:pointer affordance.
  let autoStartTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    if (!started) {
      run?.start();
      started = true;
    }
    autoStartTimer = null;
  }, 5000);

  canvas.addEventListener('click', () => {
    if (!started) {
      // First click: cancel the auto-start timer and start now.
      if (autoStartTimer !== null) {
        clearTimeout(autoStartTimer);
        autoStartTimer = null;
      }
      run?.start();
      started = true;
      return;
    }
    // Subsequent clicks: advance theme, rebuild run, kick simulation.
    themeIndex = (themeIndex + 1) % THEMES.length;
    applyTheme(THEMES[themeIndex]!);
    run?.stop();
    run = startRun(canvas, gl, THEMES[themeIndex]!);
    run?.render();
    run?.start();
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
