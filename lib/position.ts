export const POSITION_STEP = 1000;
/** Below this gap two neighbours are too close to split again, so the column is renumbered. */
export const MIN_GAP = 1e-6;

/**
 * A position between two neighbours, either of which may be missing (top or bottom of the column).
 * Dropping a card writes this one number; nothing else in the column changes.
 */
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return POSITION_STEP;
  if (before === null) return (after ?? 0) - POSITION_STEP;
  if (after === null) return before + POSITION_STEP;
  return (before + after) / 2;
}

export function needsRebalance(before: number | null, after: number | null): boolean {
  return before !== null && after !== null && after - before < MIN_GAP;
}

/** Fresh, evenly spaced positions for `count` items in order. */
export function evenPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_STEP);
}
