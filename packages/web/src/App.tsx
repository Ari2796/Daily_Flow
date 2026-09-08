import { useState } from 'react';
import { TasksProvider } from './features/tasks/tasksContext';
import { TaskBoard } from './features/tasks/components/TaskBoard';
import { RemindersProvider } from './features/reminders/remindersContext';
import { ReminderList } from './features/reminders/components/ReminderList';
import { HabitsProvider } from './features/habits/habitsContext';
import { HabitList } from './features/habits/components/HabitList';
import { ScoreProvider } from './features/score/scoreContext';
import { ScorePanel } from './features/score/components/ScorePanel';
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
        {activeTab === 'tasks' && (
          <TasksProvider>
            <TaskBoard />
          </TasksProvider>
        )}

        {activeTab === 'reminders' && (
          <RemindersProvider>
            <ReminderList />
          </RemindersProvider>
        )}

        {activeTab === 'habits' && (
          <HabitsProvider>
            <HabitList />
          </HabitsProvider>
        )}

        {activeTab === 'score' && (
          <ScoreProvider>
            <ScorePanel />
          </ScoreProvider>
        )}
      </main>
    </div>
  );
}
