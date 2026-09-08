import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../types/shared';
import { HabitWithStreak, CompleteHabitResponse, CreateHabitInput } from './types';
import {
  createHabit,
  getHabit,
  getHabitsForUser,
  recordCompletion,
} from './service';

export const habitsRouter = Router();

/**
 * Resolves userId from request auth or header.
 */
function resolveUserId(req: Request): string | null {
  const user = (req as Request & { user?: { id: string } }).user;
  if (user?.id) return user.id;

  const header = req.headers['x-user-id'];
  if (typeof header === 'string' && header.length > 0) return header;

  return null;
}

// ── POST /api/v1/habits ───────────────────────────────────────────────────────
habitsRouter.post('/', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  const { name } = req.body as Partial<CreateHabitInput>;

  if (typeof name !== 'string') {
    const payload: ApiResponse<null> = {
      data: null,
      error: 'VALIDATION_ERROR: name is required and must be a string',
    };
    res.status(400).json(payload);
    return;
  }

  try {
    const habit = createHabit(userId, { name });
    const payload: ApiResponse<HabitWithStreak> = { data: habit, error: null };
    res.status(201).json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const payload: ApiResponse<null> = {
      data: null,
      error: `VALIDATION_ERROR: ${message}`,
    };
    res.status(400).json(payload);
  }
});

// ── GET /api/v1/habits ────────────────────────────────────────────────────────
habitsRouter.get('/', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  const habits = getHabitsForUser(userId);
  const payload: ApiResponse<HabitWithStreak[]> = { data: habits, error: null };
  res.json(payload);
});

// ── GET /api/v1/habits/:id ────────────────────────────────────────────────────
habitsRouter.get('/:id', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  try {
    const habit = getHabit(userId, req.params.id);
    const payload: ApiResponse<HabitWithStreak> = { data: habit, error: null };
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message === 'NOT_FOUND') {
      const payload: ApiResponse<null> = { data: null, error: 'NOT_FOUND' };
      res.status(404).json(payload);
      return;
    }
    const payload: ApiResponse<null> = { data: null, error: message };
    res.status(500).json(payload);
  }
});

// ── POST /api/v1/habits/:id/complete ──────────────────────────────────────────
habitsRouter.post('/:id/complete', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  const { date } = req.body as { date?: unknown };

  if (date !== undefined && typeof date !== 'string') {
    const payload: ApiResponse<null> = {
      data: null,
      error: 'VALIDATION_ERROR: date must be a string formatted as YYYY-MM-DD',
    };
    res.status(400).json(payload);
    return;
  }

  try {
    const result = recordCompletion(userId, req.params.id, date);
    const payload: ApiResponse<CompleteHabitResponse> = {
      data: result,
      error: null,
    };
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message === 'NOT_FOUND') {
      const payload: ApiResponse<null> = { data: null, error: 'NOT_FOUND' };
      res.status(404).json(payload);
      return;
    }
    const payload: ApiResponse<null> = { data: null, error: message };
    res.status(500).json(payload);
  }
});
