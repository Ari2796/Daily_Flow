import { useState } from 'react';
import { useHabits } from '../habitsContext';
import { CreateHabitInput } from '../types';
import { HabitCard } from './HabitCard';
import { HabitForm } from './HabitForm';
import styles from './Habits.module.css';

/**
 * Main Habit Tracker view displaying list of habits, streak statistics, and creation form.
 */
export function HabitList(): JSX.Element {
  const { habits, loading, error, addHabit, completeHabit } = useHabits();
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async (input: CreateHabitInput): Promise<void> => {
    await addHabit(input);
    setShowForm(false);
  };

  const activeStreaks = habits.filter((h) => h.streak > 0).length;
  const maxStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.streak)) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h2>🔥 Habit Tracker</h2>
          <p>Build consistent daily habits and grow your streaks over time.</p>
        </div>
        {!showForm && (
          <button
            className={styles.btnPrimary}
            onClick={(): void => setShowForm(true)}
          >
            + New Habit
          </button>
        )}
      </div>

      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Habits</span>
          <span className={styles.statValue}>{habits.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active Streaks</span>
          <span className={styles.statValue}>{activeStreaks}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Best Streak</span>
          <span className={styles.statValue}>{maxStreak} {maxStreak === 1 ? 'day' : 'days'}</span>
        </div>
      </div>

      {showForm && (
        <HabitForm
          onSubmit={handleCreate}
          onCancel={(): void => setShowForm(false)}
        />
      )}

      {loading && <div className={styles.emptyState}>Loading habits...</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {!loading && !error && habits.length === 0 && (
        <div className={styles.emptyState}>
          No habits tracked yet. Create your first habit above!
        </div>
      )}

      {!loading && habits.length > 0 && (
        <div className={styles.cardList}>
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onComplete={completeHabit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
