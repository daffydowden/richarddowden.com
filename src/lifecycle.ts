export interface LifecycleConfig {
  settlingMs: number;
  initialGenerationsPerSecond: number;
  /** Called after each CA step to display the new state. */
  render: () => void;
  /** Called once per CA generation step. */
  step: () => void;
}

export interface LifecycleHandle {
  stop: () => void;
}

export function startLifecycle(cfg: LifecycleConfig): LifecycleHandle {
  let stopped = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  const stepInterval = 1000 / cfg.initialGenerationsPerSecond;

  // Drive stepping with setTimeout instead of RAF. The previous RAF loop
  // ran a no-op callback at 60-120 Hz and decided whether to step using a
  // threshold (`now - lastStepTime >= stepInterval`); with a 6 gen/s
  // target, that threshold lands awkwardly between vsync intervals (e.g.
  // 167ms is just over 10 vsyncs at 60Hz), producing a visible
  // 10-vs-11-vsync alternation. Stepping on a fixed timer locks the
  // cadence cleanly. Rendering is part of the same callback — the GL
  // command stream lands on the next compositor frame regardless of
  // whether we're inside RAF or not.
  function tick() {
    if (stopped) return;
    cfg.step();
    cfg.render();
    timerId = setTimeout(tick, stepInterval);
  }

  // Initial settling delay: lets the seed sit visible before erosion.
  timerId = setTimeout(tick, cfg.settlingMs);

  function pause() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }
  function resume() {
    if (timerId === null && !stopped) {
      // Browser may have cleared the drawing buffer while hidden;
      // repaint immediately so the canvas isn't blank on return,
      // then resume the step cadence.
      cfg.render();
      timerId = setTimeout(tick, stepInterval);
    }
  }

  function visibility() {
    if (document.hidden) pause();
    else resume();
  }
  document.addEventListener('visibilitychange', visibility);

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
