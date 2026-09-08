import { HabitWithStreak, CreateHabitInput, CompleteHabitResponse } from './types';
import { apiFetch, unwrap } from '../../lib/apiFetch';

const BASE = '/api/v1/habits';

/**
 * Creates a new habit via POST /api/v1/habits.
 */
export async function apiCreateHabit(input: CreateHabitInput): Promise<HabitWithStreak> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return unwrap<HabitWithStreak>(res);
}

/**
 * Fetches all habits with current streaks for the user.
 * GET /api/v1/habits
 */
export async function apiFetchHabits(): Promise<HabitWithStreak[]> {
  const res = await apiFetch(BASE);
  return unwrap<HabitWithStreak[]>(res);
}

/**
 * Fetches a single habit by ID.
 * GET /api/v1/habits/:id
 */
export async function apiFetchHabit(habitId: string): Promise<HabitWithStreak> {
  const res = await apiFetch(`${BASE}/${habitId}`);
  return unwrap<HabitWithStreak>(res);
}

/**
 * Marks a habit as completed for a given date (defaults to today on server).
 * POST /api/v1/habits/:id/complete
 */
export async function apiCompleteHabit(
  habitId: string,
  date?: string
): Promise<CompleteHabitResponse> {
  const res = await apiFetch(`${BASE}/${habitId}/complete`, {
    method: 'POST',
    body: JSON.stringify(date ? { date } : {}),
  });
  return unwrap<CompleteHabitResponse>(res);
}
