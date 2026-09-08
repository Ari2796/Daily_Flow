import { useState, useCallback, ChangeEvent, FormEvent } from 'react';
import styles from './TaskBoard.module.css';
import { KanbanColumn } from './KanbanColumn';
import { TaskForm, FormState } from './TaskForm';
import { useTasks } from '../tasksContext';
import { TaskStatus } from '../types';

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  priority: 'medium',
  category: 'work',
  dueDate: '',
};

const COLUMNS: TaskStatus[] = ['Todo', 'In_Progress', 'Done'];

/**
 * Kanban task board component connected to TasksContext.
 * Persists all task creations and status updates to the backend SQLite database.
 *
 * @returns The full task board UI
 */
export function TaskBoard(): JSX.Element {
  const { board, loading, error, addTask, moveTask } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleFormChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const handleAddTask = useCallback(
    async (e: FormEvent): Promise<void> => {
      e.preventDefault();
      if (!form.title.trim()) return;
      await addTask({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
    [form, addTask]
  );

  const handleStatusChange = useCallback(
    (id: string, newStatus: TaskStatus): void => {
      void moveTask(id, newStatus);
    },
    [moveTask]
  );

  const handleDragStart = useCallback((id: string): void => {
    setDraggedId(id);
  }, []);

  const handleDrop = useCallback(
    (targetStatus: TaskStatus): void => {
      if (!draggedId) return;
      void moveTask(draggedId, targetStatus);
      setDraggedId(null);
    },
    [draggedId, moveTask]
  );

  const doneCount = board.Done.length;
  const totalCount = board.Todo.length + board.In_Progress.length + board.Done.length;
  const completionRate = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return (
    <div className={styles.board}>
      {/* ── Header ── */}
      <div className={styles.boardHeader}>
        <div>
          <h2 className={styles.boardTitle}>📝 Task Board</h2>
          <p className={styles.boardMeta}>
            {doneCount} / {totalCount} done &nbsp;·&nbsp;{completionRate}% completion rate
          </p>
        </div>
        <button className={styles.addBtn} onClick={(): void => setShowForm((v) => !v)}>
          {showForm ? '✕ Cancel' : '+ New Task'}
        </button>
      </div>

      {error && <p className={styles.errorText}>Error: {error}</p>}
      {loading && totalCount === 0 && <p className={styles.boardMeta}>Loading tasks…</p>}

      {/* ── Add Task Form ── */}
      {showForm && (
        <TaskForm form={form} onChange={handleFormChange} onSubmit={handleAddTask} />
      )}

      {/* ── Kanban Columns ── */}
      <div className={styles.columns}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col}
            col={col}
            tasks={board[col]}
            isDragging={draggedId !== null}
            onDrop={handleDrop}
            onStatusChange={handleStatusChange}
            onDragStart={handleDragStart}
          />
        ))}
      </div>
    </div>
  );
}
