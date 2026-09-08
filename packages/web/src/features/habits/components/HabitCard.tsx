import { HabitWithStreak } from '../types';
import styles from './Habits.module.css';

interface HabitCardProps {
  habit: HabitWithStreak;
  onComplete: (habitId: string) => void;
}

/**
 * Renders an individual habit card with streak counter and completion trigger.
 */
export function HabitCard({ habit, onComplete }: HabitCardProps): JSX.Element {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{habit.name}</h3>
        <span className={styles.streakBadge}>
          🔥 {habit.streak} {habit.streak === 1 ? 'day' : 'days'}
        </span>
      </div>

      <button
        className={styles.completeButton}
        onClick={(): void => onComplete(habit.id)}
      >
        ✓ Mark Complete Today
      </button>
    </div>
  );
}
