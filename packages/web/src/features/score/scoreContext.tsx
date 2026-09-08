import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { ProductivityScore } from './types';
import { apiFetchScore } from './api';

// ── State ─────────────────────────────────────────────────────────────────────

interface ScoreState {
  score: ProductivityScore | null;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: ScoreState = {
  score: null,
  loading: false,
  error: null,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type ScoreAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: ProductivityScore }
  | { type: 'FETCH_ERROR'; payload: string };

function scoreReducer(state: ScoreState, action: ScoreAction): ScoreState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, score: action.payload, error: null };

    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ScoreContextValue {
  score: ProductivityScore | null;
  loading: boolean;
  error: string | null;
  refreshScore: () => Promise<void>;
}

const ScoreContext = createContext<ScoreContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface ScoreProviderProps {
  children: ReactNode;
}

export function ScoreProvider({ children }: ScoreProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(scoreReducer, INITIAL_STATE);

  const refreshScore = useCallback(async (): Promise<void> => {
    dispatch({ type: 'FETCH_START' });
    try {
      const data = await apiFetchScore();
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load score';
      dispatch({ type: 'FETCH_ERROR', payload: message });
    }
  }, []);

  // Load score on mount
  useEffect(() => {
    void refreshScore();
  }, [refreshScore]);

  return (
    <ScoreContext.Provider
      value={{
        score: state.score,
        loading: state.loading,
        error: state.error,
        refreshScore,
      }}
    >
      {children}
    </ScoreContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook to access the productivity score state and refresh action.
 * Must be used inside a {@link ScoreProvider}.
 */
export function useScore(): ScoreContextValue {
  const ctx = useContext(ScoreContext);
  if (!ctx) {
    throw new Error('useScore must be used inside a ScoreProvider');
  }
  return ctx;
}
