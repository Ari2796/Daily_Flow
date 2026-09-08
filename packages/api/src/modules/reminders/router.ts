import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../types/shared';
import { Reminder, CreateReminderInput } from './types';
import {
  createReminder,
  getReminder,
  getRemindersForUser,
  acknowledgeReminder,
} from './service';

export const remindersRouter = Router();

/**
 * Resolves the userId from the request (attaching from auth or fallback).
 */
function resolveUserId(req: Request): string | null {
  const user = (req as Request & { user?: { id: string } }).user;
  if (user?.id) return user.id;

  const header = req.headers['x-user-id'];
  if (typeof header === 'string' && header.length > 0) return header;

  return null;
}

// ── POST /api/v1/reminders ───────────────────────────────────────────────────
remindersRouter.post('/', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  const { title, schedule } = req.body as Partial<CreateReminderInput>;

  if (typeof title !== 'string') {
    const payload: ApiResponse<null> = {
      data: null,
      error: 'VALIDATION_ERROR: title is required and must be a string',
    };
    res.status(400).json(payload);
    return;
  }

  if (!schedule || typeof schedule !== 'object') {
    const payload: ApiResponse<null> = {
      data: null,
      error: 'VALIDATION_ERROR: schedule configuration is required',
    };
    res.status(400).json(payload);
    return;
  }

  try {
    const reminder = createReminder(userId, { title, schedule });
    const payload: ApiResponse<Reminder> = { data: reminder, error: null };
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

// ── GET /api/v1/reminders ────────────────────────────────────────────────────
remindersRouter.get('/', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  const reminders = getRemindersForUser(userId);
  const payload: ApiResponse<Reminder[]> = { data: reminders, error: null };
  res.json(payload);
});

// ── GET /api/v1/reminders/:id ────────────────────────────────────────────────
remindersRouter.get('/:id', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  try {
    const reminder = getReminder(userId, req.params.id);
    const payload: ApiResponse<Reminder> = { data: reminder, error: null };
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

// ── POST /api/v1/reminders/:id/acknowledge ───────────────────────────────────
remindersRouter.post('/:id/acknowledge', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  try {
    const reminder = acknowledgeReminder(userId, req.params.id);
    const payload: ApiResponse<Reminder> = { data: reminder, error: null };
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
