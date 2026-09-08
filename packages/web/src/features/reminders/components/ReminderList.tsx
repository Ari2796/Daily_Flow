import { useState } from 'react';
import { useReminders } from '../remindersContext';
import { ReminderState, CreateReminderInput } from '../types';
import { ReminderCard } from './ReminderCard';
import { ReminderForm } from './ReminderForm';
import styles from './Reminders.module.css';

type FilterState = 'all' | ReminderState;

/**
 * Main Reminder module view containing filters, creation, and list of reminders.
 */
export function ReminderList(): JSX.Element {
  const { reminders, loading, error, addReminder, acknowledge } = useReminders();
  const [filter, setFilter] = useState<FilterState>('all');
  const [showForm, setShowForm] = useState(false);

  const filteredReminders = reminders.filter((r) =>
    filter === 'all' ? true : r.state === filter
  );

  const handleCreate = async (input: CreateReminderInput): Promise<void> => {
    await addReminder(input);
    setShowForm(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h2>⏰ Reminder Engine</h2>
          <p>Stay on track with one-time, daily, and weekly recurring reminders.</p>
        </div>
        {!showForm && (
          <button
            className={styles.btnPrimary}
            onClick={(): void => setShowForm(true)}
          >
            + New Reminder
          </button>
        )}
      </div>

      {showForm && (
        <ReminderForm
          onSubmit={handleCreate}
          onCancel={(): void => setShowForm(false)}
        />
      )}

      <div className={styles.filterBar}>
        {(['all', 'pending', 'triggered', 'acknowledged'] as FilterState[]).map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
            onClick={(): void => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({
              f === 'all'
                ? reminders.length
                : reminders.filter((r) => r.state === f).length
            })
          </button>
        ))}
      </div>

      {loading && <div className={styles.emptyState}>Loading reminders...</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {!loading && !error && filteredReminders.length === 0 && (
        <div className={styles.emptyState}>
          No {filter === 'all' ? '' : filter} reminders found.
        </div>
      )}

      {!loading && filteredReminders.length > 0 && (
        <div className={styles.cardList}>
          {filteredReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onAcknowledge={acknowledge}
            />
          ))}
        </div>
      )}
    </div>
  );
}
