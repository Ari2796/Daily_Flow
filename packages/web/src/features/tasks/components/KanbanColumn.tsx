import { Task, TaskStatus } from '../types';
import styles from './TaskBoard.module.css';

const COLUMN_LABELS: Record<TaskStatus, string> = {
  Todo: '📋 To Do',
  In_Progress: '⚡ In Progress',
  Done: '✅ Done',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface TaskCardProps {
  task: Task;
  col: TaskStatus;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDragStart: (id: string) => void;
}

/**
 * Single Kanban card with drag and status advance/rewind actions.
 */
export function TaskCard({ task, col, onStatusChange, onDragStart }: TaskCardProps): JSX.Element {
  return (
    <div
      className={styles.card}
      draggable
      onDragStart={(): void => onDragStart(task.id)}
    >
      <div className={styles.cardTop}>
        <span
          className={styles.priorityDot}
          style={{
            background: col === 'Done' ? '#22c55e' : col === 'In_Progress' ? '#f59e0b' : '#818cf8',
          }}
          title={col}
        />
        <span className={styles.cardTitle}>{task.title}</span>
      </div>
      {task.description && <p className={styles.cardDesc}>{task.description}</p>}
      <div className={styles.cardMeta}>
        <span className={styles.dueDate}>📅 {formatDate(task.createdAt)}</span>
      </div>
      <div className={styles.cardActions}>
        {col !== 'Todo' && (
          <button
            className={styles.actionBtn}
            onClick={(): void =>
              onStatusChange(task.id, col === 'Done' ? 'In_Progress' : 'Todo')
            }
          >
            ← Back
          </button>
        )}
        {col !== 'Done' && (
          <button
            className={styles.actionBtn}
            onClick={(): void =>
              onStatusChange(task.id, col === 'Todo' ? 'In_Progress' : 'Done')
            }
          >
            Forward →
          </button>
        )}
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  col: TaskStatus;
  tasks: Task[];
  isDragging: boolean;
  onDrop: (col: TaskStatus) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDragStart: (id: string) => void;
}

/**
 * One Kanban column: header, cards list, and drop zone.
 */
export function KanbanColumn({
  col,
  tasks,
  isDragging,
  onDrop,
  onStatusChange,
  onDragStart,
}: KanbanColumnProps): JSX.Element {
  return (
    <div
      className={`${styles.column} ${isDragging ? styles.dropTarget : ''}`}
      onDragOver={(e): void => e.preventDefault()}
      onDrop={(): void => onDrop(col)}
    >
      <div className={styles.colHeader}>
        <span className={styles.colTitle}>{COLUMN_LABELS[col]}</span>
        <span className={styles.colCount}>{tasks.length}</span>
      </div>
      <div className={styles.cardList}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            col={col}
            onStatusChange={onStatusChange}
            onDragStart={onDragStart}
          />
        ))}
        {tasks.length === 0 && (
          <div className={styles.emptyCol}>Drop tasks here</div>
        )}
      </div>
    </div>
  );
}
