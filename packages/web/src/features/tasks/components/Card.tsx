import { Task, TaskStatus } from '../types';
import styles from './Card.module.css';

interface CardProps {
  task: Task;
  onMove: (taskId: string, status: TaskStatus) => void;
}

const STATUS_TRANSITIONS: Record<TaskStatus, { prev: TaskStatus | null; next: TaskStatus | null }> = {
  Todo:        { prev: null,          next: 'In_Progress' },
  In_Progress: { prev: 'Todo',        next: 'Done' },
  Done:        { prev: 'In_Progress', next: null },
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  Todo: 'To Do',
  In_Progress: 'In Progress',
  Done: 'Done',
};

/**
 * Displays a single task card with title, optional description, status badge,
 * and forward/back navigation buttons.
 */
export function Card({ task, onMove }: CardProps): JSX.Element {
  const { prev, next } = STATUS_TRANSITIONS[task.status];

  return (
    <article className={styles.card} aria-label={task.title}>
      <div className={styles.header}>
        <span className={`${styles.badge} ${styles[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      <h3 className={styles.title}>{task.title}</h3>

      {task.description && (
        <p className={styles.description}>{task.description}</p>
      )}

      <footer className={styles.actions}>
        {prev && (
          <button
            className={styles.btnSecondary}
            onClick={() => onMove(task.id, prev)}
            aria-label={`Move "${task.title}" back to ${STATUS_LABELS[prev]}`}
          >
            ← {STATUS_LABELS[prev]}
          </button>
        )}
        {next && (
          <button
            className={styles.btnPrimary}
            onClick={() => onMove(task.id, next)}
            aria-label={`Move "${task.title}" to ${STATUS_LABELS[next]}`}
          >
            {STATUS_LABELS[next]} →
          </button>
        )}
      </footer>
    </article>
  );
}
