/**
 * Breakdown of individual component scores that make up the productivity score.
 * All component values are in [0, 1].
 */
export interface ScoreBreakdown {
  /** Fraction of tasks with status 'Done' out of all tasks. */
  taskCompletionRate: number;
  /** Fraction of due reminders that have been acknowledged. */
  reminderAcknowledgementRate: number;
  /** Normalised mean habit streak consistency over a 30-day window. */
  habitStreakConsistency: number;
}

/**
 * The full productivity score response returned by the score endpoint.
 * The composite score is a weighted sum of the three components, in [0, 100].
 */
export interface ProductivityScore {
  /** Weighted composite score, clamped to [0, 100] and rounded to 2 dp. */
  score: number;
  /** Individual component breakdown. */
  breakdown: ScoreBreakdown;
  /** ISO-8601 timestamp at which the score was computed. */
  calculatedAt: string;
}
