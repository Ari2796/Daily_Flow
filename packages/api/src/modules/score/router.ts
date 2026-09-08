import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../types/shared';
import { ProductivityScore } from './types';
import { computeProductivityScore } from './service';

export const scoreRouter = Router();

/**
 * Resolves the userId from the request.
 * Falls back to the x-user-id header for local dev / testing without auth.
 */
function resolveUserId(req: Request): string | null {
  const user = (req as Request & { user?: { id: string } }).user;
  if (user?.id) return user.id;

  const header = req.headers['x-user-id'];
  if (typeof header === 'string' && header.length > 0) return header;

  return null;
}

// ── GET /api/v1/score ─────────────────────────────────────────────────────────
/**
 * Returns the current productivity score for the authenticated user.
 * The score is computed on-the-fly (no persistence) from the three modules.
 *
 * Query params:
 *   - asOfDate (optional): YYYY-MM-DD to override the "today" reference for
 *     streak calculations. Useful for testing. Defaults to current UTC date.
 */
scoreRouter.get('/', (req: Request, res: Response): void => {
  const userId = resolveUserId(req);
  if (!userId) {
    const payload: ApiResponse<null> = { data: null, error: 'UNAUTHORIZED' };
    res.status(401).json(payload);
    return;
  }

  const asOfDate =
    typeof req.query.asOfDate === 'string' && req.query.asOfDate
      ? req.query.asOfDate
      : undefined;

  try {
    const productivityScore = computeProductivityScore(userId, asOfDate);
    const payload: ApiResponse<ProductivityScore> = {
      data: productivityScore,
      error: null,
    };
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const payload: ApiResponse<null> = { data: null, error: message };
    res.status(500).json(payload);
  }
});
