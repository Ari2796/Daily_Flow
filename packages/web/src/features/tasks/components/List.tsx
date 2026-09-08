import { useState } from 'react';
import { TasksProvider, useTasks } from '../tasksContext';
import { Card } from './Card';
import { Form } from './Form';
import { TaskStatus } from '../types';
import styles from './List.module.css';

const COLUMNS: { status: TaskStatus; label: string; emoji: string }[] = [
  { status: 'Todo',        label: 'To Do',       emoji: '📋' },
  { status: 'In_Progress', label: 'In Progress',  emoji: '⚡' },
  { status: 'Done',        label: 'Done',         emoji: '✅' },
];

/**
 * Inner board component — consumes TasksContext.
 * Renders three Kanban columns; each column lists its task cards.
 */
function TaskBoard(): JSX.Element {
  const { board, loading, error, addTask, moveTask } = useTasks();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>Task Board</h2>
        <button
          className={styles.btnAdd}
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
        >
          {showForm ? '✕ Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
        <Form
          onSubmit={async (input) => {
            await addTask(input);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {loading && <p className={styles.loading}>Loading tasks…</p>}

      <div className={styles.board}>
        {COLUMNS.map(({ status, label, emoji }) => {
          const tasks = board[status];
          return (
            <section key={status} className={styles.column} aria-label={label}>
              <header className={styles.columnHeader}>
                <span className={styles.columnEmoji}>{emoji}</span>
                <span className={styles.columnLabel}>{label}</span>
                <span className={styles.columnCount}>{tasks.length}</span>
              </header>

              <div className={styles.cardList}>
                {tasks.length === 0 ? (
                  <p className={styles.empty}>No tasks here</p>
                ) : (
                  tasks.map((task) => (
                    <Card
                      key={task.id}
                      task={task}
                      onMove={(id, newStatus) => void moveTask(id, newStatus)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Public entry point for the tasks feature.
 * Wraps the board in a TasksProvider so it fetches and manages its own state.
 */
export function List(): JSX.Element {
  return (
    <TasksProvider>
      <TaskBoard />
    </TasksProvider>
  );
}
