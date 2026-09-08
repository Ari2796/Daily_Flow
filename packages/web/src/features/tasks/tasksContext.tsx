import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Task, TaskBoard, TaskStatus, CreateTaskInput } from './types';
import { apiCreateTask, apiFetchBoard, apiUpdateTaskStatus } from './api';

// ── State ─────────────────────────────────────────────────────────────────────

interface TasksState {
  board: TaskBoard;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: TasksState = {
  board: { Todo: [], In_Progress: [], Done: [] },
  loading: false,
  error: null,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type TasksAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: TaskBoard }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'TASK_ADDED'; payload: Task }
  | { type: 'TASK_STATUS_UPDATED'; payload: Task };

function tasksReducer(state: TasksState, action: TasksAction): TasksState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, board: action.payload, error: null };

    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };

    case 'TASK_ADDED': {
      const task = action.payload;
      return {
        ...state,
        board: {
          ...state.board,
          [task.status]: [...state.board[task.status], task],
        },
      };
    }

    case 'TASK_STATUS_UPDATED': {
      const updated = action.payload;
      // Remove the task from all columns, then place it in the correct one.
      const removeFrom = (tasks: Task[]): Task[] =>
        tasks.filter((t) => t.id !== updated.id);

      return {
        ...state,
        board: {
          Todo: removeFrom(state.board.Todo),
          In_Progress: removeFrom(state.board.In_Progress),
          Done: [...removeFrom(state.board.Done)].concat(
            updated.status === 'Done' ? [updated] : []
          ),
        },
      };
    }

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface TasksContextValue {
  board: TaskBoard;
  loading: boolean;
  error: string | null;
  refreshBoard: () => Promise<void>;
  addTask: (input: CreateTaskInput) => Promise<void>;
  moveTask: (taskId: string, status: TaskStatus) => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface TasksProviderProps {
  children: ReactNode;
}

export function TasksProvider({ children }: TasksProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(tasksReducer, INITIAL_STATE);

  const refreshBoard = useCallback(async (): Promise<void> => {
    dispatch({ type: 'FETCH_START' });
    try {
      const board = await apiFetchBoard();
      dispatch({ type: 'FETCH_SUCCESS', payload: board });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      dispatch({ type: 'FETCH_ERROR', payload: message });
    }
  }, []);

  const addTask = useCallback(async (input: CreateTaskInput): Promise<void> => {
    const task = await apiCreateTask(input);
    dispatch({ type: 'TASK_ADDED', payload: task });
  }, []);

  const moveTask = useCallback(
    async (taskId: string, status: TaskStatus): Promise<void> => {
      const task = await apiUpdateTaskStatus(taskId, status);
      dispatch({ type: 'TASK_STATUS_UPDATED', payload: task });
    },
    []
  );

  // Load the board on mount.
  useEffect(() => {
    void refreshBoard();
  }, [refreshBoard]);

  return (
    <TasksContext.Provider
      value={{ board: state.board, loading: state.loading, error: state.error, refreshBoard, addTask, moveTask }}
    >
      {children}
    </TasksContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the Tasks context value.
 * Must be used inside a <TasksProvider>.
 */
export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error('useTasks must be used inside a TasksProvider');
  }
  return ctx;
}
