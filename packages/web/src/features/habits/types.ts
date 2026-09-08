/**
 * Habit entity from API.
 */
export interface Habit {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

/**
 * Habit entity with current streak calculation.
 */
export interface HabitWithStreak extends Habit {
  streak: number;
}

/**
 * Completion record for a given day.
 */
export interface CompletionRecord {
  id: string;
  habitId: string;
  userId: string;
  date: string;
}

/**
 * Input for creating a new habit.
 */
export interface CreateHabitInput {
  name: string;
}

/**
 * Response when completing a habit.
 */
export interface CompleteHabitResponse {
  habit: HabitWithStreak;
  completionRecord: CompletionRecord;
}
