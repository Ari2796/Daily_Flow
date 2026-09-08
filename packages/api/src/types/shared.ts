/**
 * Core User entity shared across all DailyFlow modules.
 * All module entities (Task, Reminder, Habit) must reference this via userId.
 * Never create module-local user objects.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * Standard API response envelope used by every DailyFlow endpoint.
 * All route handlers must return this shape — never a raw object.
 * On success: { data: T, error: null }
 * On failure: { data: null, error: string }
 * @template T - The type of the success payload
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Pagination metadata attached to list responses.
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Wrapper for paginated list endpoints.
 * @template T - The type of items in the list
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
