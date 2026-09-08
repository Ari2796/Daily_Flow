/**
 * Task status values — mirrors the API's TaskStatus type.
 */
export type TaskStatus = 'Todo' | 'In_Progress' | 'Done';

/**
 * A Task entity as returned by the API.
 */
export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating a new task.
 */
export interface CreateTaskInput {
  title: string;
  description?: string;
}

/**
 * Payload for updating a task's Kanban status.
 */
export interface UpdateTaskStatusInput {
  status: TaskStatus;
}

/**
 * Kanban board response — tasks grouped by status column.
 * All three columns are always present.
 */
export interface TaskBoard {
  Todo: Task[];
  In_Progress: Task[];
  Done: Task[];
}
