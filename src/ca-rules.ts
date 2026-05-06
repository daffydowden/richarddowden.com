export type CellState = 0 | 1 | 2; // dead | alive | dying (3-state rules use 2)
export type RuleFn = (state: CellState, liveNeighbors: number) => CellState;
export type RuleId = 'conway' | 'briansBrain' | 'dayAndNight' | 'custom';

export const conway: RuleFn = (state, n) => {
  if (state === 1) return n === 2 || n === 3 ? 1 : 0;
  return n === 3 ? 1 : 0;
};

export const briansBrain: RuleFn = (state, n) => {
  if (state === 1) return 2;
  if (state === 2) return 0;
  return n === 2 ? 1 : 0;
};

const DAY_NIGHT_B = new Set([3, 6, 7, 8]);
const DAY_NIGHT_S = new Set([3, 4, 6, 7, 8]);
export const dayAndNight: RuleFn = (state, n) => {
  if (state === 1) return DAY_NIGHT_S.has(n) ? 1 : 0;
  return DAY_NIGHT_B.has(n) ? 1 : 0;
};

/**
 * Tuned for the brief: persistence + emergence. The name should remain
 * semi-recognizable for 30-120s before dissolving.
 *
 * Strategy: a near-Conway rule with extra survival on n=4 and a small
 * birth on n=2 (slows extinction in dense regions like rasterized text).
 * Tune in implementation by visual inspection of the rendered name's
 * decay timeline.
 */
export const custom: RuleFn = (state, n) => {
  if (state === 1) {
    // S2348: extra survival to keep dense letter-bodies alive longer.
    return n === 2 || n === 3 || n === 4 || n === 8 ? 1 : 0;
  }
  // B3 (standard) + a sparse B6 (occasional rebirth at edges).
  return n === 3 || n === 6 ? 1 : 0;
};

export const RULES: Record<RuleId, RuleFn> = {
  conway,
  briansBrain,
  dayAndNight,
  custom,
};
