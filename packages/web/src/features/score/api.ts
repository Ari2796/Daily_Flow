import { ProductivityScore } from './types';
import { apiFetch, unwrap } from '../../lib/apiFetch';

const BASE = '/api/v1/score';

/**
 * Fetches the current productivity score for the authenticated user.
 * GET /api/v1/score
 *
 * @param asOfDate - Optional YYYY-MM-DD override for "today" (streak reference).
 */
export async function apiFetchScore(asOfDate?: string): Promise<ProductivityScore> {
  const url = asOfDate ? `${BASE}?asOfDate=${encodeURIComponent(asOfDate)}` : BASE;
  const res = await apiFetch(url);
  return unwrap<ProductivityScore>(res);
}
