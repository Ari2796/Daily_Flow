import { useState, FormEvent } from 'react';
import { CreateReminderInput, ScheduleType, DayOfWeek } from '../types';
import styles from './Reminders.module.css';

const ALL_DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

interface ReminderFormProps {
  onSubmit: (input: CreateReminderInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Form component to create a new reminder.
 */
export function ReminderForm({
  onSubmit,
  onCancel,
}: ReminderFormProps): JSX.Element {
  const [title, setTitle] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [triggerAt, setTriggerAt] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('09:00');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['Monday', 'Wednesday', 'Friday']);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleDay = (day: DayOfWeek): void => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSubmitting(true);
      if (scheduleType === 'one_time') {
        if (!triggerAt) {
          setError('Please select a date and time');
          setSubmitting(false);
          return;
        }
        await onSubmit({
          title: title.trim(),
          schedule: {
            type: 'one_time',
            triggerAt: new Date(triggerAt).toISOString(),
          },
        });
      } else if (scheduleType === 'daily') {
        await onSubmit({
          title: title.trim(),
          schedule: {
            type: 'daily',
            timeOfDay,
          },
        });
      } else {
        if (selectedDays.length === 0) {
          setError('Select at least one day of the week');
          setSubmitting(false);
          return;
        }
        await onSubmit({
          title: title.trim(),
          schedule: {
            type: 'weekly',
            daysOfWeek: selectedDays,
            timeOfDay,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reminder');
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.formCard} onSubmit={handleSubmit}>
      <h3>Create New Reminder</h3>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <label>Title</label>
          <input
            type="text"
            className={styles.inputField}
            placeholder="e.g. Weekly team sync"
            value={title}
            maxLength={200}
            onChange={(e): void => setTitle(e.target.value)}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Schedule Type</label>
          <select
            className={styles.inputField}
            value={scheduleType}
            onChange={(e): void => setScheduleType(e.target.value as ScheduleType)}
          >
            <option value="daily">Daily Recurring</option>
            <option value="weekly">Weekly Recurring</option>
            <option value="one_time">One-Time</option>
          </select>
        </div>

        {scheduleType === 'one_time' && (
          <div className={styles.inputGroup}>
            <label>Date & Time</label>
            <input
              type="datetime-local"
              className={styles.inputField}
              value={triggerAt}
              onChange={(e): void => setTriggerAt(e.target.value)}
            />
          </div>
        )}

        {scheduleType !== 'one_time' && (
          <div className={styles.inputGroup}>
            <label>Time of Day</label>
            <input
              type="time"
              className={styles.inputField}
              value={timeOfDay}
              onChange={(e): void => setTimeOfDay(e.target.value)}
            />
          </div>
        )}

        {scheduleType === 'weekly' && (
          <div className={styles.inputGroup}>
            <label>Days of Week</label>
            <div className={styles.daysGrid}>
              {ALL_DAYS.map((day) => (
                <button
                  type="button"
                  key={day}
                  className={`${styles.dayChip} ${selectedDays.includes(day) ? styles.dayChipActive : ''}`}
                  onClick={(): void => toggleDay(day)}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.btnCancel} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles.btnPrimary} disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Reminder'}
        </button>
      </div>
    </form>
  );
}
