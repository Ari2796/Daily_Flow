/**
 * Breakdown of individual score components, each in [0, 1].
 */
export interface ScoreBreakdown {
  taskCompletionRate: number;
  reminderAcknowledgementRate: number;
  habitStreakConsistency: number;
}

/**
 * Full productivity score response from the API.
 */
export interface ProductivityScore {
  /** Weighted composite score in [0, 100], rounded to 2 dp. */
  score: number;
  breakdown: ScoreBreakdown;
  /** ISO-8601 timestamp at which the score was computed. */
  calculatedAt: string;
}
