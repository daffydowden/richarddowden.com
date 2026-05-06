export interface LifecycleConfig {
  settlingMs: number;
  initialGenerationsPerSecond: number;
  minGenerationsPerSecond: number;
  /** Called once per animation frame to render. */
  render: () => void;
  /** Called once per CA generation step. */
  step: () => void;
}

export interface LifecycleHandle {
  stop: () => void;
}

export function startLifecycle(cfg: LifecycleConfig): LifecycleHandle {
  let stopped = false;
  let rafId: number | null = null;
  let lastFrameTime = performance.now();
  let lastStepTime = lastFrameTime;
  const initialInterval = 1000 / cfg.initialGenerationsPerSecond;
  const minInterval = 1000 / cfg.minGenerationsPerSecond;
  let stepInterval = initialInterval;
  let elapsedSinceStart = 0;
  let frameCount = 0;
  let fpsAccumulator = 0;

  function loop(now: number) {
    if (stopped) return;
    const dt = now - lastFrameTime;
    lastFrameTime = now;
    elapsedSinceStart += dt;

    // Render is coupled to step: between generations the output pixels are
    // identical (no inter-frame fade), so calling render() per RAF is pure
    // waste. Drives ~10x fewer GPU draws on a 60Hz display at 6 gen/s.
    if (elapsedSinceStart >= cfg.settlingMs && now - lastStepTime >= stepInterval) {
      cfg.step();
      cfg.render();
      lastStepTime = now;
    }

    // FPS tracking: sample over 1s windows. Symmetric damper — if the host
    // is keeping up we ramp step rate back toward the initial target.
    frameCount++;
    fpsAccumulator += dt;
    if (fpsAccumulator >= 1000) {
      const fps = (frameCount * 1000) / fpsAccumulator;
      if (fps < 30) {
        stepInterval = Math.min(minInterval, stepInterval * 2);
      } else if (fps > 50 && stepInterval > initialInterval) {
        stepInterval = Math.max(initialInterval, stepInterval / 1.5);
      }
      frameCount = 0;
      fpsAccumulator = 0;
    }

    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }
  function resume() {
    if (rafId === null && !stopped) {
      lastFrameTime = performance.now();
      lastStepTime = lastFrameTime;
      // The browser may have cleared the drawing buffer while hidden;
      // repaint immediately so the canvas isn't blank on return.
      cfg.render();
      rafId = requestAnimationFrame(loop);
    }
  }

  function visibility() {
    if (document.hidden) pause();
    else resume();
  }
  document.addEventListener('visibilitychange', visibility);

  rafId = requestAnimationFrame(loop);

  return {
    stop() {
      stopped = true;
      pause();
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
