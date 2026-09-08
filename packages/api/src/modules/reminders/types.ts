/**
 * Reminder state lifecycle values.
 */
export type ReminderState = 'pending' | 'triggered' | 'acknowledged';

/**
 * Supported recurrence schedule types.
 */
export type ScheduleType = 'one_time' | 'daily' | 'weekly';

/**
 * Days of the week for weekly recurring schedules.
 */
export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

/**
 * One-time reminder schedule specifying an exact trigger timestamp.
 */
export interface OneTimeSchedule {
  type: 'one_time';
  triggerAt: string;
}

/**
 * Daily recurring reminder schedule specifying time of day (HH:MM).
 */
export interface DailySchedule {
  type: 'daily';
  timeOfDay: string;
}

/**
 * Weekly recurring reminder schedule specifying active weekdays and time of day.
 */
export interface WeeklySchedule {
  type: 'weekly';
  daysOfWeek: DayOfWeek[];
  timeOfDay: string;
}

/**
 * Union of all reminder schedule types.
 */
export type ReminderSchedule = OneTimeSchedule | DailySchedule | WeeklySchedule;

/**
 * A Reminder entity as stored in and returned from the database.
 */
export interface Reminder {
  id: string;
  userId: string;
  title: string;
  schedule: ReminderSchedule;
  state: ReminderState;
  nextTriggerAt: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
}

/**
 * Input payload for creating a new reminder.
 */
export interface CreateReminderInput {
  title: string;
  schedule: ReminderSchedule;
}

/**
 * Raw row shape returned by better-sqlite3 for the reminders table.
 */
export interface ReminderRow {
  id: string;
  user_id: string;
  title: string;
  state: string;
  schedule_type: string;
  trigger_at: string | null;
  time_of_day: string | null;
  days_of_week: string | null;
  next_trigger_at: string | null;
  last_triggered_at: string | null;
  created_at: string;
}
