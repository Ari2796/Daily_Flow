import { Reminder, CreateReminderInput } from './types';
import { apiFetch, unwrap } from '../../lib/apiFetch';

const BASE = '/api/v1/reminders';

/**
 * Creates a new reminder via POST /api/v1/reminders.
 */
export async function apiCreateReminder(input: CreateReminderInput): Promise<Reminder> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return unwrap<Reminder>(res);
}

/**
 * Fetches all reminders for the current user.
 * GET /api/v1/reminders
 */
export async function apiFetchReminders(): Promise<Reminder[]> {
  const res = await apiFetch(BASE);
  return unwrap<Reminder[]>(res);
}

/**
 * Fetches a single reminder by ID.
 * GET /api/v1/reminders/:id
 */
export async function apiFetchReminder(reminderId: string): Promise<Reminder> {
  const res = await apiFetch(`${BASE}/${reminderId}`);
  return unwrap<Reminder>(res);
}

/**
 * Acknowledges a reminder.
 * POST /api/v1/reminders/:id/acknowledge
 */
export async function apiAcknowledgeReminder(reminderId: string): Promise<Reminder> {
  const res = await apiFetch(`${BASE}/${reminderId}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return unwrap<Reminder>(res);
}
