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
  let stepInterval = 1000 / cfg.initialGenerationsPerSecond;
  let elapsedSinceStart = 0;
  let frameCount = 0;
  let fpsAccumulator = 0;

  function loop(now: number) {
    if (stopped) return;
    const dt = now - lastFrameTime;
    lastFrameTime = now;
    elapsedSinceStart += dt;

    cfg.render();

    if (elapsedSinceStart >= cfg.settlingMs && now - lastStepTime >= stepInterval) {
      cfg.step();
      lastStepTime = now;
    }

    // FPS tracking: sample over 1s windows.
    frameCount++;
    fpsAccumulator += dt;
    if (fpsAccumulator >= 1000) {
      const fps = (frameCount * 1000) / fpsAccumulator;
      if (fps < 30) {
        // Halve the step rate (slow CA), don't touch render.
        const newGps = Math.max(
          cfg.minGenerationsPerSecond,
          (1000 / stepInterval) / 2,
        );
        stepInterval = 1000 / newGps;
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
