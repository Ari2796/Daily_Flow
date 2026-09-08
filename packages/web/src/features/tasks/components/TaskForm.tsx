import { ChangeEvent, FormEvent } from 'react';
import styles from './TaskBoard.module.css';

type Priority = 'low' | 'medium' | 'high';
type Category = 'work' | 'personal' | 'health';

export interface FormState {
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  dueDate: string;
}

interface TaskFormProps {
  form: FormState;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent) => void;
}

/**
 * Inline form for creating a new task.
 */
export function TaskForm({ form, onChange, onSubmit }: TaskFormProps): JSX.Element {
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <input
        className={styles.input}
        name="title"
        placeholder="Task title *"
        value={form.title}
        onChange={onChange}
        required
      />
      <textarea
        className={styles.textarea}
        name="description"
        placeholder="Description (optional)"
        value={form.description}
        onChange={onChange}
        rows={2}
      />
      <div className={styles.formRow}>
        <select className={styles.select} name="priority" value={form.priority} onChange={onChange}>
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
        <select className={styles.select} name="category" value={form.category} onChange={onChange}>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
          <option value="health">Health</option>
        </select>
        <input
          className={styles.input}
          type="date"
          name="dueDate"
          value={form.dueDate}
          onChange={onChange}
        />
        <button className={styles.submitBtn} type="submit">Add</button>
      </div>
    </form>
  );
}
