/**
 * Task status values representing the three Kanban columns.
 */
export type TaskStatus = 'Todo' | 'In_Progress' | 'Done';

/**
 * A task entity as stored in and returned from the database.
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
 * Input required to create a new task.
 * Status is always initialised to 'Todo'.
 */
export interface CreateTaskInput {
  title: string;
  description?: string;
}

/**
 * Input required to update a task's Kanban status.
 */
export interface UpdateTaskStatusInput {
  status: TaskStatus;
}

/**
 * The Kanban board view: tasks grouped by status.
 * All three columns are always present, even when empty.
 */
export interface TaskBoard {
  Todo: Task[];
  In_Progress: Task[];
  Done: Task[];
}

/**
 * Raw row shape returned by better-sqlite3 for the tasks table.
 * Column names use snake_case as stored in SQLite.
 */
export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
