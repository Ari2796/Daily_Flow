import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../types/shared';
import { Task, TaskBoard, TaskStatus } from './types';
import {
  createTask,
  getTask,
  updateTaskStatus,
  getBoardForUser,
} from './service';

export const tasksRouter = Router();

/** Accepted status values for request validation. */
const VALID_STATUSES = new Set<string>(['Todo', 'In_Progress', 'Done']);

/**
 * Resolves the userId from the request.
 * Until the auth middleware is wired up, falls back to a query/header param
 * so the module can be tested independently.
 */
function resolveUserId(req: Request): string | null {
  // When auth middleware is present it attaches req.user.id
  const user = (req as Request & { user?: { id: string } }).user;
  if (user?.id) return user.id;

  // Fallback for local dev / testing without auth
  const header = req.headers['x-user-id'];
  if (typeof header === 'string' && header.length > 0) return header;

  return null;
}

// ── POST /api/v1/tasks ────────────────────────────────────────────────────────
tasksRouter.post('/', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  const { title, description } = req.body as { title?: unknown; description?: unknown };

  if (typeof title !== 'string') {
    const payload: ApiResponse<null> = {
      data: null,
      error: 'VALIDATION_ERROR: title is required and must be a string',
    };
    res.status(400).json(payload);
    return;
  }

  if (description !== undefined && typeof description !== 'string') {
    const payload: ApiResponse<null> = {
      data: null,
      error: 'VALIDATION_ERROR: description must be a string',
    };
    res.status(400).json(payload);
    return;
  }

  try {
    const task = createTask(userId, {
      title,
      description: typeof description === 'string' ? description : undefined,
    });
    const payload: ApiResponse<Task> = { data: task, error: null };
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

// ── GET /api/v1/tasks/board ───────────────────────────────────────────────────
tasksRouter.get('/board', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  const board = getBoardForUser(userId);
  const payload: ApiResponse<TaskBoard> = { data: board, error: null };
  res.json(payload);
});

// ── GET /api/v1/tasks/:id ─────────────────────────────────────────────────────
tasksRouter.get('/:id', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  try {
    const task = getTask(userId, req.params.id);
    const payload: ApiResponse<Task> = { data: task, error: null };
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

// ── PATCH /api/v1/tasks/:id/status ───────────────────────────────────────────
tasksRouter.patch('/:id/status', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  const { status } = req.body as { status?: unknown };

  if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
    const payload: ApiResponse<null> = {
      data: null,
      error: 'VALIDATION_ERROR: status must be one of Todo, In_Progress, Done',
    };
    res.status(400).json(payload);
    return;
  }

  try {
    const task = updateTaskStatus(userId, req.params.id, status as TaskStatus);
    const payload: ApiResponse<Task> = { data: task, error: null };
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
