import { useState, FormEvent, ChangeEvent } from 'react';
import { CreateTaskInput } from '../types';
import styles from './Form.module.css';

interface FormProps {
  onSubmit: (input: CreateTaskInput) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  title: string;
  description: string;
}

const EMPTY: FormState = { title: '', description: '' };

/**
 * Controlled form for creating a new task.
 * Calls onSubmit with validated input, then resets itself.
 * Calls onCancel when the user dismisses without submitting.
 */
export function Form({ onSubmit, onCancel }: FormProps): JSX.Element {
  const [values, setValues] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!values.title.trim()) {
      setError('Title is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim() || undefined,
      });
      setValues(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={(e) => void handleSubmit(e)} noValidate>
      <h3 className={styles.heading}>New Task</h3>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <label className={styles.label} htmlFor="task-title">
        Title <span aria-hidden="true">*</span>
      </label>
      <input
        id="task-title"
        className={styles.input}
        type="text"
        name="title"
        value={values.title}
        onChange={handleChange}
        placeholder="What needs to be done?"
        maxLength={255}
        required
        autoFocus
      />

      <label className={styles.label} htmlFor="task-description">
        Description
      </label>
      <textarea
        id="task-description"
        className={styles.textarea}
        name="description"
        value={values.description}
        onChange={handleChange}
        placeholder="Optional details…"
        maxLength={2000}
        rows={3}
      />

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnCancel}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.btnSubmit}
          disabled={submitting}
        >
          {submitting ? 'Adding…' : 'Add Task'}
        </button>
      </div>
    </form>
  );
}
