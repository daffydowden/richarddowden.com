export const VS_QUAD = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/**
 * Step shader: reads previous state from uPrev (RG8: R=state, G=glyph index),
 * writes next state to R, preserves glyph index in G unchanged.
 * State levels: alive=1.0, dead=0.0, dying=0.5 (for 3-state rules).
 *
 * Rule injected via #define RULE_<id>; only one is active per linked program.
 *   RULE_CONWAY        — B3/S23
 *   RULE_BRIANS_BRAIN  — 3-state, B2 / D / dead-after-1
 *   RULE_DAY_NIGHT     — B3678/S34678
 *   RULE_CUSTOM        — tuned: B36/S2348
 */
export const FS_STEP = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uPrev;
uniform vec2 uResolution; // texture dims in cells

float sampleAt(vec2 cell) {
  // Clamp to edges; CA does not wrap.
  vec2 uv = (cell + 0.5) / uResolution;
  float v = texture(uPrev, uv).r;
  return v > 0.75 ? 1.0 : v > 0.25 ? 0.5 : 0.0;
}

void main() {
  vec2 cell = floor(vUv * uResolution);
  vec2 uvC = (cell + 0.5) / uResolution;
  vec2 packed = texture(uPrev, uvC).rg;
  float vC = packed.r;
  float c = vC > 0.75 ? 1.0 : vC > 0.25 ? 0.5 : 0.0;
  float glyph = packed.g; // preserve unchanged

  // Count live (==1.0) neighbors; ignore dying.
  float n = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx == 0 && dy == 0) continue;
      vec2 nc = cell + vec2(float(dx), float(dy));
      if (nc.x < 0.0 || nc.y < 0.0 || nc.x >= uResolution.x || nc.y >= uResolution.y) continue;
      if (sampleAt(nc) > 0.75) n += 1.0;
    }
  }

  float next = 0.0;

#ifdef RULE_CONWAY
  if (c > 0.75) next = (n == 2.0 || n == 3.0) ? 1.0 : 0.0;
  else          next = (n == 3.0) ? 1.0 : 0.0;
#endif

#ifdef RULE_BRIANS_BRAIN
  if (c > 0.75) next = 0.5;          // alive -> dying
  else if (c > 0.25) next = 0.0;     // dying -> dead
  else next = (n == 2.0) ? 1.0 : 0.0;
#endif

#ifdef RULE_DAY_NIGHT
  if (c > 0.75) {
    next = (n == 3.0 || n == 4.0 || n == 6.0 || n == 7.0 || n == 8.0) ? 1.0 : 0.0;
  } else {
    next = (n == 3.0 || n == 6.0 || n == 7.0 || n == 8.0) ? 1.0 : 0.0;
  }
#endif

#ifdef RULE_CUSTOM
  if (c > 0.75) {
    next = (n == 2.0 || n == 3.0 || n == 4.0 || n == 8.0) ? 1.0 : 0.0;
  } else {
    next = (n == 3.0 || n == 6.0) ? 1.0 : 0.0;
  }
#endif

  outColor = vec4(next, glyph, 0.0, 1.0);
}
`;

/**
 * Render shader: reads current state + glyph index from a single packed
 * RG8 texture, samples glyph atlas at the per-cell glyph offset.
 *
 * Output: opaque mark on transparent background; the canvas sits over
 * the field-colored body element, so transparency = field color.
 */
export const FS_RENDER = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uState;       // RG8: R=state (1/0.5/0), G=glyph index byte
uniform sampler2D uAtlas;       // RGBA atlas, glyphs side by side
uniform vec2 uGridSize;         // cells across, cells down
uniform float uAtlasLen;        // number of glyphs in atlas
uniform vec3 uMarkColor;        // sRGB-linear of the mark color

void main() {
  vec2 cell = floor(vUv * uGridSize);
  vec2 inCell = fract(vUv * uGridSize);

  // The seed was uploaded from a canvas (top-down rows) into a WebGL
  // texture (bottom-up rows). Flip Y when sampling so canvas top
  // renders at screen top.
  vec2 cellFlipped = vec2(cell.x, uGridSize.y - 1.0 - cell.y);
  vec2 uvCell = (cellFlipped + 0.5) / uGridSize;

  vec2 packed = texture(uState, uvCell).rg;
  float state = packed.r;
  if (state < 0.25) discard;

  // R8 normalises 0..255 to 0..1, so de-normalise by multiplying by 255
  // and floor-clamp to stay within the atlas.
  float glyphIdx = floor(packed.g * 255.0 + 0.5);
  glyphIdx = min(glyphIdx, uAtlasLen - 1.0);

  float u = (glyphIdx + inCell.x) / uAtlasLen;
  float v = inCell.y;
  float alpha = texture(uAtlas, vec2(u, v)).a;

  float opacity = state > 0.75 ? 1.0 : 0.5;
  outColor = vec4(uMarkColor, alpha * opacity);
}
`;

export function defineRule(rule: 'conway' | 'briansBrain' | 'dayAndNight' | 'custom'): string {
  switch (rule) {
    case 'conway':      return '#define RULE_CONWAY\n';
    case 'briansBrain': return '#define RULE_BRIANS_BRAIN\n';
    case 'dayAndNight': return '#define RULE_DAY_NIGHT\n';
    case 'custom':      return '#define RULE_CUSTOM\n';
  }
}

export function buildStepShader(rule: 'conway' | 'briansBrain' | 'dayAndNight' | 'custom'): string {
  // Inject the #define after the #version line.
  return FS_STEP.replace('#version 300 es\n', `#version 300 es\n${defineRule(rule)}`);
}
