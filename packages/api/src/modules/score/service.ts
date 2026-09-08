import { getCompletionRate } from '../tasks/service';
import { getAcknowledgementRate } from '../reminders/service';
import { getStreakConsistency } from '../habits/service';
import { ProductivityScore, ScoreBreakdown } from './types';

/**
 * Component weights for the productivity score formula.
 * Must sum to 1.0.
 *
 * - Task completion rate:          40 %
 * - Reminder acknowledgement rate: 30 %
 * - Habit streak consistency:      30 %
 */
const WEIGHTS = {
  taskCompletion: 0.4,
  reminderAcknowledgement: 0.3,
  habitStreak: 0.3,
} as const;

/**
 * Computes the productivity score for a given user.
 *
 * Formula:
 *   score = clamp(round((
 *     taskCompletionRate      * 0.40 +
 *     reminderAcknowledgement * 0.30 +
 *     habitStreakConsistency  * 0.30
 *   ) * 100, 2dp), 0, 100)
 *
 * Each component is already in [0, 1] and rounded to 4 dp by its own service.
 * The final score is in [0, 100] rounded to 2 decimal places.
 *
 * @param userId  - The user whose score to compute.
 * @param asOfDate - Optional YYYY-MM-DD date for streak calculation (defaults to today UTC).
 * @returns A {@link ProductivityScore} object with the composite score, breakdown, and timestamp.
 */
export function computeProductivityScore(
  userId: string,
  asOfDate: string = new Date().toISOString().slice(0, 10)
): ProductivityScore {
  const taskCompletionRate = getCompletionRate(userId);
  const reminderAcknowledgementRate = getAcknowledgementRate(userId);
  const habitStreakConsistency = getStreakConsistency(userId, asOfDate);

  const breakdown: ScoreBreakdown = {
    taskCompletionRate,
    reminderAcknowledgementRate,
    habitStreakConsistency,
  };

  const rawScore =
    taskCompletionRate * WEIGHTS.taskCompletion +
    reminderAcknowledgementRate * WEIGHTS.reminderAcknowledgement +
    habitStreakConsistency * WEIGHTS.habitStreak;

  // Scale to 0-100, round to 2 dp, and clamp to [0, 100]
  const score = Math.max(0, Math.min(100, Math.round(rawScore * 100 * 100) / 100));

  return {
    score,
    breakdown,
    calculatedAt: new Date().toISOString(),
  };
}
