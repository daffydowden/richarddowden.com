export class WebGLNotAvailable extends Error {
  constructor() {
    super('WebGL2 unavailable');
    this.name = 'WebGLNotAvailable';
  }
}

export class ShaderCompileError extends Error {
  constructor(stage: 'vertex' | 'fragment' | 'link', log: string) {
    super(`${stage} shader error: ${log}`);
    this.name = 'ShaderCompileError';
  }
}

export interface WebGLBundle {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
}

export function createBundle(canvas: HTMLCanvasElement): WebGLBundle {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    preserveDrawingBuffer: false,
    premultipliedAlpha: false,
    // alpha:true so the canvas composites over the field-colored <body>;
    // the render shader emits straight-alpha vec4(uMarkColor, glyphAlpha).
    alpha: true,
  });
  if (!gl) throw new WebGLNotAvailable();
  return { gl, canvas };
}

export function compileShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string,
  stage: 'vertex' | 'fragment',
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new ShaderCompileError(stage, 'createShader returned null');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? '(no log)';
    gl.deleteShader(shader);
    throw new ShaderCompileError(stage, log);
  }
  return shader;
}

export function linkProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource, 'vertex');
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource, 'fragment');
  const program = gl.createProgram();
  if (!program) throw new ShaderCompileError('link', 'createProgram returned null');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? '(no log)';
    throw new ShaderCompileError('link', log);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

export interface PingPong {
  read: { tex: WebGLTexture; fb: WebGLFramebuffer };
  write: { tex: WebGLTexture; fb: WebGLFramebuffer };
  swap: () => void;
  width: number;
  height: number;
}

/**
 * Two single-channel R8 textures wrapped in framebuffers, swapped each step.
 * R8 is enough for 0|1; for 3-state rules (Brian's Brain) bump to RG8 or
 * pack states in two bits.
 */
export function createPingPong(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  initial: Uint8Array,
): PingPong {
  function makeAttachment(): { tex: WebGLTexture; fb: WebGLFramebuffer } {
    const tex = gl.createTexture();
    if (!tex) throw new Error('createTexture returned null');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    if (!fb) throw new Error('createFramebuffer returned null');
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('framebuffer incomplete');
    }
    return { tex, fb };
  }

  const a = makeAttachment();
  const b = makeAttachment();

  // Upload initial state into a.tex
  gl.bindTexture(gl.TEXTURE_2D, a.tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.UNSIGNED_BYTE, initial);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  let read = a;
  let write = b;
  return {
    get read() { return read; },
    get write() { return write; },
    swap() {
      const tmp = read;
      read = write;
      write = tmp;
    },
    width,
    height,
  };
}

export function uploadTexture(
  gl: WebGL2RenderingContext,
  source: TexImageSource,
): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error('createTexture returned null');
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}
