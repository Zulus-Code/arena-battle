// ─── Star Rating ──────────────────────────────────────────────────────────────
// Pure functions for computing level star ratings based on score, time, accuracy.

export interface StarThresholds {
  readonly bronze: { readonly minScore: number; readonly maxTime: number; readonly minAccuracy: number };
  readonly silver: { readonly minScore: number; readonly maxTime: number; readonly minAccuracy: number };
  readonly gold:   { readonly minScore: number; readonly maxTime: number; readonly minAccuracy: number };
}

/**
 * Compute star rating for a level completion.
 * Gold requires ALL gold thresholds met, silver requires ALL silver, etc.
 * Returns 0 (no stars) through 3 (gold).
 */
export function computeStars(
  thresholds: StarThresholds,
  score: number,
  time: number,
  accuracy: number,
): 0 | 1 | 2 | 3 {
  // Check from highest to lowest
  if (
    score >= thresholds.gold.minScore &&
    time <= thresholds.gold.maxTime &&
    accuracy >= thresholds.gold.minAccuracy
  ) {
    return 3;
  }

  if (
    score >= thresholds.silver.minScore &&
    time <= thresholds.silver.maxTime &&
    accuracy >= thresholds.silver.minAccuracy
  ) {
    return 2;
  }

  if (
    score >= thresholds.bronze.minScore &&
    time <= thresholds.bronze.maxTime &&
    accuracy >= thresholds.bronze.minAccuracy
  ) {
    return 1;
  }

  return 0;
}
