import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Reminder, CreateReminderInput } from './types';
import {
  apiCreateReminder,
  apiFetchReminders,
  apiAcknowledgeReminder,
} from './api';

// ── State ─────────────────────────────────────────────────────────────────────

interface RemindersState {
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: RemindersState = {
  reminders: [],
  loading: false,
  error: null,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type RemindersAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Reminder[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'REMINDER_ADDED'; payload: Reminder }
  | { type: 'REMINDER_ACKNOWLEDGED'; payload: Reminder };

function remindersReducer(
  state: RemindersState,
  action: RemindersAction
): RemindersState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, reminders: action.payload, error: null };

    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };

    case 'REMINDER_ADDED':
      return {
        ...state,
        reminders: [...state.reminders, action.payload],
      };

    case 'REMINDER_ACKNOWLEDGED':
      return {
        ...state,
        reminders: state.reminders.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
      };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface RemindersContextValue {
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
  refreshReminders: () => Promise<void>;
  addReminder: (input: CreateReminderInput) => Promise<void>;
  acknowledge: (reminderId: string) => Promise<void>;
}

const RemindersContext = createContext<RemindersContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface RemindersProviderProps {
  children: ReactNode;
}

export function RemindersProvider({
  children,
}: RemindersProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(remindersReducer, INITIAL_STATE);

  const refreshReminders = useCallback(async (): Promise<void> => {
    dispatch({ type: 'FETCH_START' });
    try {
      const items = await apiFetchReminders();
      dispatch({ type: 'FETCH_SUCCESS', payload: items });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load reminders';
      dispatch({ type: 'FETCH_ERROR', payload: message });
    }
  }, []);

  const addReminder = useCallback(
    async (input: CreateReminderInput): Promise<void> => {
      const reminder = await apiCreateReminder(input);
      dispatch({ type: 'REMINDER_ADDED', payload: reminder });
    },
    []
  );

  const acknowledge = useCallback(
    async (reminderId: string): Promise<void> => {
      const reminder = await apiAcknowledgeReminder(reminderId);
      dispatch({ type: 'REMINDER_ACKNOWLEDGED', payload: reminder });
    },
    []
  );

  useEffect(() => {
    void refreshReminders();
  }, [refreshReminders]);

  return (
    <RemindersContext.Provider
      value={{
        reminders: state.reminders,
        loading: state.loading,
        error: state.error,
        refreshReminders,
        addReminder,
        acknowledge,
      }}
    >
      {children}
    </RemindersContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook to access reminders state and operations.
 * Must be used within a <RemindersProvider>.
 */
export function useReminders(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) {
    throw new Error('useReminders must be used inside a RemindersProvider');
  }
  return ctx;
}
