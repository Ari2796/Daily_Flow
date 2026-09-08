import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { exportRouter } from './modules/export/router';
import { tasksRouter } from './modules/tasks/router';
import { ApiResponse } from './types/shared';

/**
 * Creates and configures the Express application.
 * Module routers are registered here after Phase 3 (scaffold-module skill).
 * @returns Configured Express application instance
 */
export function createApp(): Application {
  const app = express();

  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json());

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response): void => {
    const payload: ApiResponse<{ status: string; timestamp: string }> = {
      data: { status: 'ok', timestamp: new Date().toISOString() },
      error: null,
    };
    res.json(payload);
  });

  // ── Export (Phase 5 — requires MCP filesystem configuration) ──────────────
  app.use('/api/v1', exportRouter);

  // ── Tasks ──────────────────────────────────────────────────────────────────
  app.use('/api/v1/tasks', tasksRouter);

  // ── Module routers — uncomment after Phase 3 ──────────────────────────────
  // app.use('/api/v1/reminders', remindersRouter);
  // app.use('/api/v1/habits',    habitsRouter);
  // app.use('/api/v1/score',     scoreRouter);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response): void => {
    const payload: ApiResponse<null> = { data: null, error: 'Route not found' };
    res.status(404).json(payload);
  });

  // ── Global error handler ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error(err.stack);
    const payload: ApiResponse<null> = { data: null, error: err.message };
    res.status(500).json(payload);
  });

  return app;
}
