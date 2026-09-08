/**
 * A habit entity as stored in the database.
 */
export interface Habit {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

/**
 * A habit entity decorated with its current calculated streak.
 */
export interface HabitWithStreak extends Habit {
  streak: number;
}

/**
 * A record marking a habit as completed on a specific calendar date (YYYY-MM-DD).
 */
export interface CompletionRecord {
  id: string;
  habitId: string;
  userId: string;
  date: string;
}

/**
 * Input payload for creating a new habit.
 */
export interface CreateHabitInput {
  name: string;
}

/**
 * Response payload when completing a habit.
 */
export interface CompleteHabitResponse {
  habit: HabitWithStreak;
  completionRecord: CompletionRecord;
}

/**
 * Raw row shape returned by better-sqlite3 for the habits table.
 */
export interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

/**
 * Raw row shape returned by better-sqlite3 for the completion_records table.
 */
export interface CompletionRecordRow {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
}
