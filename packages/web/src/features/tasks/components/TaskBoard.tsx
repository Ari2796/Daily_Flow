// WORKSHOP NOTE — Phase 6:
// This file is intentionally monolithic at 280+ lines.
// The project's .eslintrc.json enforces max-lines: 200 as an ESLint ERROR.
// Vite runs ESLint on build (vite-plugin-eslint with failOnError: true).
// This means `npm run build` FAILS until you refactor this file.
//
// Phase 6 — Use the Kiro Refactor Power:
//   Select this entire file → Right-click → Kiro: Refactor
//   Ask Kiro to extract KanbanColumn.tsx and TaskCard.tsx.
//   Each file must be under 200 lines. TaskBoard keeps state management.

import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import styles from './TaskBoard.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'todo' | 'in_progress' | 'done';
type Priority = 'low' | 'medium' | 'high';
type Category = 'work' | 'personal' | 'health';

interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  category: Category;
  dueDate: string | null;
  createdAt: string;
}

interface FormState {
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  dueDate: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  priority: 'medium',
  category: 'work',
  dueDate: '',
};

const PRIORITY_COLOURS: Record<Priority, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

const COLUMN_LABELS: Record<Status, string> = {
  todo: '📋 To Do',
  in_progress: '⚡ In Progress',
  done: '✅ Done',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── TaskBoard (monolithic — all state, columns, cards, and form in one file) ──

/**
 * Kanban task board component.
 * Renders three columns (Todo, In Progress, Done) with inline task creation.
 *
 * WORKSHOP NOTE: This component intentionally violates the max-lines: 200
 * ESLint rule. Refactor it in Phase 6 using the Kiro Refactor Power.
 *
 * @returns The full task board UI
 */
export function TaskBoard(): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'sample-1',
      title: 'Read the workshop guide',
      description: 'Complete all phases in order — each one unlocks the next.',
      status: 'done',
      priority: 'high',
      category: 'work',
      dueDate: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-2',
      title: 'Write product.md steering file',
      description: 'Must be done BEFORE running the Spec agent (Phase 1).',
      status: 'todo',
      priority: 'high',
      category: 'work',
      dueDate: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-3',
      title: 'Run scaffold-module skill × 3',
      description: 'Tasks, Reminders, Habits — one skill run each (Phase 3).',
      status: 'todo',
      priority: 'medium',
      category: 'work',
      dueDate: null,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const visibleTasks = tasks.filter((t) => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const handleFormChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const handleAddTask = useCallback(
    (e: FormEvent): void => {
      e.preventDefault();
      if (!form.title.trim()) return;
      const newTask: Task = {
        id: generateId(),
        title: form.title.trim(),
        description: form.description.trim(),
        status: 'todo',
        priority: form.priority,
        category: form.category,
        dueDate: form.dueDate || null,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
    [form]
  );

  const handleStatusChange = useCallback((id: string, newStatus: Status): void => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  }, []);

  const handleDelete = useCallback((id: string): void => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleDragStart = useCallback((id: string): void => {
    setDraggedId(id);
  }, []);

  const handleDrop = useCallback(
    (targetStatus: Status): void => {
      if (!draggedId) return;
      handleStatusChange(draggedId, targetStatus);
      setDraggedId(null);
    },
    [draggedId, handleStatusChange]
  );

  const completionRate = tasks.length === 0 ? 0 :
    Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100);

  return (
    <div className={styles.board}>

      {/* ── Header ── */}
      <div className={styles.boardHeader}>
        <div>
          <h2 className={styles.boardTitle}>📝 Task Board</h2>
          <p className={styles.boardMeta}>
            {tasks.filter((t) => t.status === 'done').length} / {tasks.length} done
            &nbsp;·&nbsp;{completionRate}% completion rate
          </p>
        </div>
        <button className={styles.addBtn} onClick={(): void => setShowForm((v) => !v)}>
          {showForm ? '✕ Cancel' : '+ New Task'}
        </button>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <label className={styles.filterLabel}>Category:</label>
        <select
          className={styles.filterSelect}
          value={filterCategory}
          onChange={(e): void => setFilterCategory(e.target.value as Category | 'all')}
        >
          <option value="all">All</option>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
          <option value="health">Health</option>
        </select>
        <label className={styles.filterLabel}>Priority:</label>
        <select
          className={styles.filterSelect}
          value={filterPriority}
          onChange={(e): void => setFilterPriority(e.target.value as Priority | 'all')}
        >
          <option value="all">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* ── Add Task Form ── */}
      {showForm && (
        <form className={styles.form} onSubmit={handleAddTask}>
          <input
            className={styles.input}
            name="title"
            placeholder="Task title *"
            value={form.title}
            onChange={handleFormChange}
            required
          />
          <textarea
            className={styles.textarea}
            name="description"
            placeholder="Description (optional)"
            value={form.description}
            onChange={handleFormChange}
            rows={2}
          />
          <div className={styles.formRow}>
            <select className={styles.select} name="priority" value={form.priority} onChange={handleFormChange}>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <select className={styles.select} name="category" value={form.category} onChange={handleFormChange}>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="health">Health</option>
            </select>
            <input
              className={styles.input}
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleFormChange}
            />
            <button className={styles.submitBtn} type="submit">Add</button>
          </div>
        </form>
      )}

      {/* ── Kanban Columns ── */}
      <div className={styles.columns}>
        {(['todo', 'in_progress', 'done'] as Status[]).map((col) => (
          <div
            key={col}
            className={`${styles.column} ${draggedId ? styles.dropTarget : ''}`}
            onDragOver={(e): void => e.preventDefault()}
            onDrop={(): void => handleDrop(col)}
          >
            <div className={styles.colHeader}>
              <span className={styles.colTitle}>{COLUMN_LABELS[col]}</span>
              <span className={styles.colCount}>
                {visibleTasks.filter((t) => t.status === col).length}
              </span>
            </div>

            <div className={styles.cardList}>
              {visibleTasks
                .filter((t) => t.status === col)
                .map((task) => (
                  <div
                    key={task.id}
                    className={styles.card}
                    draggable
                    onDragStart={(): void => handleDragStart(task.id)}
                  >
                    <div className={styles.cardTop}>
                      <span
                        className={styles.priorityDot}
                        style={{ background: PRIORITY_COLOURS[task.priority] }}
                        title={`${task.priority} priority`}
                      />
                      <span className={styles.cardTitle}>{task.title}</span>
                    </div>
                    {task.description && (
                      <p className={styles.cardDesc}>{task.description}</p>
                    )}
                    <div className={styles.cardMeta}>
                      <span className={styles.categoryTag}>{task.category}</span>
                      {task.dueDate && (
                        <span className={styles.dueDate}>📅 {formatDate(task.dueDate)}</span>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      {col !== 'todo' && (
                        <button
                          className={styles.actionBtn}
                          onClick={(): void =>
                            handleStatusChange(task.id, col === 'in_progress' ? 'todo' : 'in_progress')
                          }
                        >
                          ← Back
                        </button>
                      )}
                      {col !== 'done' && (
                        <button
                          className={styles.actionBtn}
                          onClick={(): void =>
                            handleStatusChange(task.id, col === 'todo' ? 'in_progress' : 'done')
                          }
                        >
                          Forward →
                        </button>
                      )}
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={(): void => handleDelete(task.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

              {visibleTasks.filter((t) => t.status === col).length === 0 && (
                <div className={styles.emptyCol}>Drop tasks here</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
