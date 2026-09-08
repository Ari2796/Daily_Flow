import { useState, FormEvent } from 'react';
import { CreateHabitInput } from '../types';
import styles from './Habits.module.css';

interface HabitFormProps {
  onSubmit: (input: CreateHabitInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Form to create a new habit.
 */
export function HabitForm({ onSubmit, onCancel }: HabitFormProps): JSX.Element {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Habit name is required');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({ name: name.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create habit');
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.formCard} onSubmit={handleSubmit}>
      <h3>Create New Habit</h3>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.inputGroup}>
        <label>Habit Name</label>
        <input
          type="text"
          className={styles.inputField}
          placeholder="e.g. Read 15 pages of a book"
          value={name}
          maxLength={200}
          onChange={(e): void => setName(e.target.value)}
        />
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.btnCancel} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Habit'}
        </button>
      </div>
    </form>
  );
}
