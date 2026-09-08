import { Reminder } from '../types';
import styles from './Reminders.module.css';

interface ReminderCardProps {
  reminder: Reminder;
  onAcknowledge: (id: string) => void;
}

/**
 * Formats a schedule object into a readable human description.
 */
function formatSchedule(reminder: Reminder): string {
  const { schedule } = reminder;
  if (schedule.type === 'one_time') {
    const d = new Date(schedule.triggerAt);
    return `One-time: ${d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
  }
  if (schedule.type === 'daily') {
    return `Daily at ${schedule.timeOfDay}`;
  }
  const days = schedule.daysOfWeek.map((d) => d.slice(0, 3)).join(', ');
  return `Weekly (${days}) at ${schedule.timeOfDay}`;
}

/**
 * Card component for rendering a single reminder item.
 */
export function ReminderCard({
  reminder,
  onAcknowledge,
}: ReminderCardProps): JSX.Element {
  const isAcked = reminder.state === 'acknowledged';

  const badgeClass =
    reminder.state === 'acknowledged'
      ? styles.badgeAcknowledged
      : reminder.state === 'triggered'
      ? styles.badgeTriggered
      : styles.badgePending;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{reminder.title}</h3>
        <span className={`${styles.badge} ${badgeClass}`}>{reminder.state}</span>
      </div>

      <div className={styles.cardDetails}>
        <span className={styles.scheduleBadge}>⏰ {formatSchedule(reminder)}</span>
        {reminder.nextTriggerAt && (
          <span>
            Next: {new Date(reminder.nextTriggerAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        )}
      </div>

      <button
        className={`${styles.ackButton} ${isAcked ? styles.ackButtonDisabled : ''}`}
        disabled={isAcked}
        onClick={(): void => onAcknowledge(reminder.id)}
      >
        {isAcked ? '✓ Acknowledged' : 'Acknowledge'}
      </button>
    </div>
  );
}
