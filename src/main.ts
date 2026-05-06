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
import { startLifecycle, prefersReducedMotion } from './lifecycle';

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
  // Avoid duplicate fallback if WebGL fails twice (e.g., after resize).
  if (document.querySelector('img.fallback')) return;
  const img = document.createElement('img');
  img.src = '/og.png';
  img.alt = '';
  img.className = 'fallback';
  document.body.appendChild(img);
}

async function boot() {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const layoutResult = layout({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: dpr,
  });

  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);

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
      return;
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
    return;
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
    gl.viewport(0, 0, canvas!.width, canvas!.height);
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

  if (prefersReducedMotion()) {
    // Render T=0 once. No animation loop.
    render();
    return;
  }

  startLifecycle({
    settlingMs: 1500,
    initialGenerationsPerSecond: 15,
    minGenerationsPerSecond: 4,
    step,
    render,
  });
}

boot().catch((e) => {
  console.error('boot failed', e);
});
