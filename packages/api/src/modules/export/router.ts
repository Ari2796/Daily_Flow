import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../types/shared';

export const exportRouter = Router();

/**
 * POST /api/v1/export
 *
 * Exports all user data (tasks, reminders, habits, productivity score) to a
 * timestamped JSON file in the ./exports/ directory.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PHASE 5 REQUIREMENT
 * ─────────────────────────────────────────────────────────────────────────────
 * This endpoint is intentionally unimplemented. It returns HTTP 500 until you
 * complete Phase 5 of the workshop:
 *
 *   Step 1 — Create .kiro/settings/mcp.json with a filesystem MCP server.
 *   Step 2 — Verify the server shows "Connected" in Kiro → Settings → MCP.
 *   Step 3 — Ask Kiro to implement this endpoint using the filesystem MCP tool
 *             (NOT Node's built-in fs module — the submission validator checks).
 *
 * The MCP filesystem tool writes the export file; the endpoint returns the
 * file path so the frontend can display it in a success banner.
 * ─────────────────────────────────────────────────────────────────────────────
 */
exportRouter.post('/export', (_req: Request, res: Response): void => {
  const payload: ApiResponse<null> = {
    data: null,
    error:
      'Export not implemented. ' +
      'Phase 5: configure the MCP filesystem server in .kiro/settings/mcp.json, ' +
      'then ask Kiro to implement this endpoint using the filesystem MCP tool.',
  };
  res.status(500).json(payload);
});
