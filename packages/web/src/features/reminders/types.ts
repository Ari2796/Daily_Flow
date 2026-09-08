/**
 * State of a reminder in its lifecycle.
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
 * One-time schedule with a specific trigger timestamp.
 */
export interface OneTimeSchedule {
  type: 'one_time';
  triggerAt: string;
}

/**
 * Daily schedule repeating at a specified time (HH:MM).
 */
export interface DailySchedule {
  type: 'daily';
  timeOfDay: string;
}

/**
 * Weekly schedule repeating on selected weekdays at a specified time.
 */
export interface WeeklySchedule {
  type: 'weekly';
  daysOfWeek: DayOfWeek[];
  timeOfDay: string;
}

/**
 * Union of all supported reminder schedules.
 */
export type ReminderSchedule = OneTimeSchedule | DailySchedule | WeeklySchedule;

/**
 * Reminder entity as returned from the API.
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
 * Payload for creating a new reminder.
 */
export interface CreateReminderInput {
  title: string;
  schedule: ReminderSchedule;
}
