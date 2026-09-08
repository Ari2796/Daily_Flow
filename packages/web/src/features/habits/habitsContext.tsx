import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { HabitWithStreak, CreateHabitInput } from './types';
import {
  apiCreateHabit,
  apiFetchHabits,
  apiCompleteHabit,
} from './api';

// ── State ─────────────────────────────────────────────────────────────────────

interface HabitsState {
  habits: HabitWithStreak[];
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: HabitsState = {
  habits: [],
  loading: false,
  error: null,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type HabitsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: HabitWithStreak[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'HABIT_ADDED'; payload: HabitWithStreak }
  | { type: 'HABIT_UPDATED'; payload: HabitWithStreak };

function habitsReducer(state: HabitsState, action: HabitsAction): HabitsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, habits: action.payload, error: null };

    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };

    case 'HABIT_ADDED':
      return {
        ...state,
        habits: [...state.habits, action.payload],
      };

    case 'HABIT_UPDATED':
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id === action.payload.id ? action.payload : h
        ),
      };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface HabitsContextValue {
  habits: HabitWithStreak[];
  loading: boolean;
  error: string | null;
  refreshHabits: () => Promise<void>;
  addHabit: (input: CreateHabitInput) => Promise<void>;
  completeHabit: (habitId: string, date?: string) => Promise<void>;
}

const HabitsContext = createContext<HabitsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface HabitsProviderProps {
  children: ReactNode;
}

export function HabitsProvider({ children }: HabitsProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(habitsReducer, INITIAL_STATE);

  const refreshHabits = useCallback(async (): Promise<void> => {
    dispatch({ type: 'FETCH_START' });
    try {
      const items = await apiFetchHabits();
      dispatch({ type: 'FETCH_SUCCESS', payload: items });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load habits';
      dispatch({ type: 'FETCH_ERROR', payload: message });
    }
  }, []);

  const addHabit = useCallback(
    async (input: CreateHabitInput): Promise<void> => {
      const habit = await apiCreateHabit(input);
      dispatch({ type: 'HABIT_ADDED', payload: habit });
    },
    []
  );

  const completeHabit = useCallback(
    async (habitId: string, date?: string): Promise<void> => {
      const res = await apiCompleteHabit(habitId, date);
      dispatch({ type: 'HABIT_UPDATED', payload: res.habit });
    },
    []
  );

  useEffect(() => {
    void refreshHabits();
  }, [refreshHabits]);

  return (
    <HabitsContext.Provider
      value={{
        habits: state.habits,
        loading: state.loading,
        error: state.error,
        refreshHabits,
        addHabit,
        completeHabit,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook to access habits state and actions.
 */
export function useHabits(): HabitsContextValue {
  const ctx = useContext(HabitsContext);
  if (!ctx) {
    throw new Error('useHabits must be used inside a HabitsProvider');
  }
  return ctx;
}
