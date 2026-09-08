import { Task, TaskBoard, TaskStatus, CreateTaskInput } from './types';
import { apiFetch, unwrap } from '../../lib/apiFetch';

const BASE = '/api/v1/tasks';

/**
 * Creates a new task via POST /api/v1/tasks.
 */
export async function apiCreateTask(input: CreateTaskInput): Promise<Task> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return unwrap<Task>(res);
}

/**
 * Fetches the Kanban board (all tasks grouped by status).
 * GET /api/v1/tasks/board
 */
export async function apiFetchBoard(): Promise<TaskBoard> {
  const res = await apiFetch(`${BASE}/board`);
  return unwrap<TaskBoard>(res);
}

/**
 * Fetches a single task by ID.
 * GET /api/v1/tasks/:id
 */
export async function apiFetchTask(taskId: string): Promise<Task> {
  const res = await apiFetch(`${BASE}/${taskId}`);
  return unwrap<Task>(res);
}

/**
 * Updates the status of a task.
 * PATCH /api/v1/tasks/:id/status
 */
export async function apiUpdateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<Task> {
  const res = await apiFetch(`${BASE}/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return unwrap<Task>(res);
}
