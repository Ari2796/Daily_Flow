import { useState } from 'react';
import { TaskBoard } from './features/tasks/components/TaskBoard';
import styles from './App.module.css';

type ActiveTab = 'tasks' | 'reminders' | 'habits' | 'score';

/**
 * Root application component.
 * Renders the navigation header and the currently active module.
 * @returns The main DailyFlow application layout
 */
export default function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo}>◈</span>
          <h1 className={styles.title}>DailyFlow</h1>
        </div>
        <nav className={styles.nav}>
          {(['tasks', 'reminders', 'habits', 'score'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              className={`${styles.navBtn} ${activeTab === tab ? styles.active : ''}`}
              onClick={(): void => setActiveTab(tab)}
            >
              {tab === 'tasks' && '📝 '}
              {tab === 'reminders' && '⏰ '}
              {tab === 'habits' && '🔥 '}
              {tab === 'score' && '📊 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        {activeTab === 'tasks' && <TaskBoard />}

        {activeTab === 'reminders' && (
          <div className={styles.placeholder}>
            <p className={styles.placeholderTitle}>⏰ Reminder Engine</p>
            <p>Phase 3 — run the <code>scaffold-module</code> skill with <code>MODULE_NAME=reminders</code></p>
          </div>
        )}

        {activeTab === 'habits' && (
          <div className={styles.placeholder}>
            <p className={styles.placeholderTitle}>🔥 Habit Tracker</p>
            <p>Phase 3 — run the <code>scaffold-module</code> skill with <code>MODULE_NAME=habits</code></p>
          </div>
        )}

        {activeTab === 'score' && (
          <div className={styles.placeholder}>
            <p className={styles.placeholderTitle}>📊 Productivity Score</p>
            <p>Phase 3 — build this module manually using Kiro (it aggregates all three other modules)</p>
          </div>
        )}
      </main>
    </div>
  );
}
