# Implementation Plan: DailyFlow

## Overview

Implement the full DailyFlow productivity application as an npm monorepo. `packages/api` delivers a Node.js/TypeScript/Express REST API backed by SQLite (better-sqlite3), with service/repository/router separation per coding standards. `packages/web` delivers a React 18/TypeScript SPA with Vite, CSS Modules, and TanStack Query. All API responses use the `{ data, error }` envelope. Property-based tests use fast-check inside Vitest.

---

## Tasks

- [ ] 1. Monorepo and project scaffolding
  - [ ] 1.1 Configure root workspace
    - Update root `package.json` with `workspaces: ["packages/*"]`, shared dev scripts (`build`, `test`, `type-check`)
    - Create root `tsconfig.base.json` with `strict: true`, `target: ESNext`, `module: NodeNext`, `moduleResolution: NodeNext`
    - Add root `.eslintrc.json` extending `@typescript-eslint/recommended` and shared Prettier config
    - Create `.gitignore` entries for `node_modules`, `dist`, `*.db`
    - _Requirements: foundation for all modules_

  - [ ] 1.2 Scaffold `packages/api`
    - Create `packages/api/package.json` with dependencies: `express`, `better-sqlite3`, `zod`, `jsonwebtoken`, `bcryptjs`, `node-cron`, `uuid`; dev dependencies: `vitest`, `fast-check`, `@types/*`, `tsx`, `typescript`
    - Create `packages/api/tsconfig.json` extending root base, with `outDir: dist`, `rootDir: src`
    - Create `packages/api/src/index.ts` as the Express app entry point (server bootstrap only — no business logic)
    - Create `packages/api/src/app.ts` that constructs and exports the Express app (registers middleware and routers)
    - Create `packages/api/src/db/connection.ts` that opens the SQLite database with `better-sqlite3` and exports the `db` instance
    - Create `packages/api/vitest.config.ts`
    - _Requirements: foundation for all API modules_

  - [ ] 1.3 Scaffold `packages/web`
    - Initialise `packages/web` with Vite React-TS template (`vite`, `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`)
    - Create `packages/web/tsconfig.json` extending root base with JSX support
    - Create `packages/web/vitest.config.ts` with `@testing-library/react` and `jsdom` environment
    - Set up `packages/web/src/main.tsx` with `QueryClientProvider` and `BrowserRouter`
    - _Requirements: foundation for all web modules_

- [ ] 2. Database schema and migrations
  - [ ] 2.1 Create SQL schema and apply it at startup
    - Write `packages/api/src/db/schema.sql` with all table DDL: `users`, `tasks` (with `task_status` CHECK constraint), `reminders` (with `reminder_state` CHECK), `habits`, `completion_records`, `notifications`
    - Add `UNIQUE INDEX` on `completion_records(habit_id, user_id, date)` (Req 11.2)
    - Add indexes: `idx_tasks_user_id`, `idx_tasks_user_status`, `idx_reminders_user_id`, `idx_reminders_next_trigger`, `idx_habits_user_id`, `idx_completion_habit_id`
    - Write `packages/api/src/db/migrate.ts` that reads and executes `schema.sql` with `db.exec()` on application startup; call it from `app.ts` before routes are registered
    - _Requirements: 1, 2, 3, 5, 10, 11_

  - [ ]* 2.2 Write unit tests for schema migration
    - Test that `migrate.ts` is idempotent (can be called twice without error) using an in-memory SQLite database
    - Test that all expected tables exist after migration
    - _Requirements: 2.6, 5.5, 10.4_

- [ ] 3. Auth module
  - [ ] 3.1 Implement auth types and repository
    - Create `packages/api/src/auth/types.ts`: `User`, `CreateUserInput`, `AuthToken`, `JwtPayload` interfaces
    - Create `packages/api/src/auth/repository.ts`: `createUser(input)`, `findUserByEmail(email)`, `findUserById(id)` — all with JSDoc
    - _Requirements: 1.1–1.6_

  - [ ] 3.2 Implement auth service
    - Create `packages/api/src/auth/service.ts`: `register(input)`, `login(email, password)` — hash password with `bcryptjs`, sign JWT with `jsonwebtoken`; export `AuthService` class with JSDoc
    - _Requirements: 1.1–1.6_

  - [ ] 3.3 Implement auth middleware and router
    - Create `packages/api/src/auth/middleware.ts`: `authenticate` middleware that validates `Authorization: Bearer <token>`, attaches `req.user = { id }` as `AuthenticatedRequest`, returns `{ data: null, error: "UNAUTHORIZED" }` on failure
    - Create `packages/api/src/auth/router.ts`: `POST /auth/register` and `POST /auth/login` with Zod validation, using `{ data, error }` envelope
    - Register auth router in `app.ts` under `/api/v1`
    - _Requirements: 1.1–1.6_

  - [ ]* 3.4 Write unit tests for auth service
    - Test `register`: creates user, hashes password, returns token; rejects duplicate email
    - Test `login`: correct credentials return token; wrong password returns error
    - Test `authenticate` middleware: valid token passes; missing/expired token returns 401
    - _Requirements: 1.5, 1.6_

- [ ] 4. Task Board module
  - [ ] 4.1 Implement task types and repository
    - Create `packages/api/src/tasks/types.ts`: `TaskStatus`, `Task`, `CreateTaskInput`, `UpdateTaskStatusInput`, `TaskBoard` interfaces
    - Create `packages/api/src/tasks/repository.ts`: `createTask(userId, input)`, `getTaskById(userId, taskId)`, `updateTaskStatus(userId, taskId, status)`, `getTasksForUser(userId)`, `countTasksByStatus(userId)` — all with JSDoc
    - _Requirements: 2.1–2.7, 3.1–3.7, 4.1–4.5_

  - [ ] 4.2 Implement TaskService
    - Create `packages/api/src/tasks/service.ts`: `createTask(userId, input)`, `getTask(userId, taskId)`, `updateTaskStatus(userId, taskId, status)`, `getBoardForUser(userId)`, `getCompletionRate(userId)` — all with JSDoc
    - `getBoardForUser` always returns all three columns (`Todo`, `In_Progress`, `Done`) even when empty (Req 4.3, 4.4)
    - `getCompletionRate` rounds to 4 decimal places; returns 0 when no tasks (Req 14.2)
    - Zod schema for `CreateTaskInput` (title: 1–255 chars, description: optional ≤2000 chars)
    - Zod schema for `UpdateTaskStatusInput` (status must be one of the three valid values)
    - _Requirements: 2.1–2.7, 3.1–3.7, 4.1–4.5, 14.1–14.5_

  - [ ] 4.3 Implement task router
    - Create `packages/api/src/tasks/router.ts`: `POST /tasks`, `GET /tasks/board`, `GET /tasks/:id`, `PATCH /tasks/:id/status`
    - All routes use `authenticate` middleware; all responses use `{ data, error }` envelope
    - Map validation errors to `400`, not-found to `404`, auth failures to `401`
    - Register task router in `app.ts` under `/api/v1`
    - _Requirements: 2.1–2.7, 3.1–3.7, 4.1–4.5_

  - [ ]* 4.4 Write property tests for Task Board (P2–P9)
    - **Property 2: Task creation produces valid initial state** — for any valid title/description, created task has status `Todo`, non-null `id`, UTC `createdAt`
    - **Property 3: Task creation round trip** — fetch by returned id returns same title/description
    - **Property 4: Invalid task titles rejected** — whitespace-only / empty titles always rejected
    - **Property 5: Task status invariant** — persisted status is always in `{Todo, In_Progress, Done}`
    - **Property 6: Status transition completeness** — any `(source, target)` pair of valid statuses succeeds
    - **Property 7: Invalid status updates rejected** — non-enum strings always rejected, existing status unchanged
    - **Property 8: Status update idempotence** — applying same status update twice equals applying it once
    - **Property 9: Task board completeness** — total tasks across columns equals total tasks stored; exactly three columns present
    - **Validates: Requirements 2.1–2.7, 3.1–3.7, 4.1–4.5, 14.1**
    - _File: `packages/api/src/tasks/task.property.test.ts`_

  - [ ]* 4.5 Write unit tests for task routes
    - Happy-path and error-path for each endpoint; verify HTTP status codes and `{ data, error }` envelope shape
    - _Requirements: 2.1–2.7, 3.4, 4.5_

- [ ] 5. Checkpoint — Task Board complete
  - Ensure all tests pass. Run `vitest --run` in `packages/api`. Ask the user if questions arise.

- [ ] 6. Reminder Engine module
  - [ ] 6.1 Implement reminder types and repository
    - Create `packages/api/src/reminders/types.ts`: `ReminderState`, `ReminderScheduleType`, `OneTimeSchedule`, `DailySchedule`, `WeeklySchedule`, `ReminderSchedule`, `DayOfWeek`, `Reminder`, `CreateReminderInput` interfaces
    - Create `packages/api/src/reminders/repository.ts`: `createReminder(userId, input)`, `getReminderById(userId, reminderId)`, `getRemindersForUser(userId)`, `updateReminderState(reminderId, state)`, `getDueReminders(now)`, `updateAfterTrigger(reminderId, state, lastTriggeredAt, nextTriggerAt)`, `countDueAndAcknowledged(userId, windowEnd)` — all with JSDoc
    - _Requirements: 5.1–5.7, 6.1–6.5, 7.1–7.5, 8.1–8.6, 9.1–9.5_

  - [ ] 6.2 Implement ReminderService — creation and scheduling logic
    - Create `packages/api/src/reminders/service.ts` with `createReminder(userId, input)`:
      - Validate title (1–200 chars), schedule type and fields using Zod
      - For `one_time`: reject `triggerAt` in the past or within 60 seconds of now (Req 6.3, 6.4)
      - For `daily`: validate `timeOfDay` is `HH:MM` in `00:00–23:59` (Req 7.2)
      - For `weekly`: require ≥1 `daysOfWeek`, validate `timeOfDay` (Req 8.4, 8.5)
      - Compute initial `nextTriggerAt` from schedule
    - Add `computeNextTrigger(reminder, triggeredAt)` pure helper that returns the next `Date` or `null` for exhausted one-time reminders
    - _Requirements: 5.1–5.7, 6.1–6.5, 7.1–7.5, 8.1–8.6_

  - [ ] 6.3 Implement ReminderService — acknowledgement and rate calculation
    - Add `acknowledgeReminder(userId, reminderId)` — idempotent; returns `403` if wrong user, `404` if not found, always `200` if belongs to user (Req 9.1–9.5)
    - Add `getAcknowledgementRate(userId)` — counts acknowledged / total due within scoring window (today), rounds to 4 decimal places; returns 0 when no due reminders (Req 15.1–15.5)
    - _Requirements: 9.1–9.5, 15.1–15.5_

  - [ ] 6.4 Implement CronRunner and `checkAndTriggerDue`
    - Create `packages/api/src/reminders/cronRunner.ts` using `node-cron` to call `reminderService.checkAndTriggerDue(new Date())` every 60 seconds
    - Add `checkAndTriggerDue(now: Date)` to `ReminderService`:
      - SELECT reminders where `next_trigger_at` is within the past 60-second window and state is not `acknowledged`
      - Atomic UPDATE with `WHERE last_triggered_at IS NULL OR last_triggered_at < startOfDay(now)` guard to enforce at-most-once per day (Req 7.4, 8.3)
      - On successful update: INSERT into `notifications`, call `computeNextTrigger` and update `next_trigger_at` (null for exhausted one-time)
    - Start `CronRunner` from `app.ts` after DB migration
    - _Requirements: 6.2, 7.3–7.5, 8.2–8.3_

  - [ ] 6.5 Implement reminder router
    - Create `packages/api/src/reminders/router.ts`: `POST /reminders`, `GET /reminders`, `GET /reminders/:id`, `POST /reminders/:id/acknowledge`
    - All routes use `authenticate` middleware; all responses use `{ data, error }` envelope
    - Register reminder router in `app.ts` under `/api/v1`
    - _Requirements: 5.1–5.7, 6.1–6.5, 7.1–7.5, 8.1–8.6, 9.1–9.5_

  - [ ]* 6.6 Write property tests for Reminder Engine (P10–P13)
    - **Property 10: Reminder creation initialises correctly** — valid input always produces `state = 'pending'`, non-null `id`, UTC `createdAt`
    - **Property 11: Reminder creation round trip** — fetch by id returns same title, schedule, `pending` state
    - **Property 12: Invalid reminder titles rejected** — empty, whitespace-only, >200 char strings always rejected
    - **Property 13: Reminder acknowledgement idempotence** — acknowledging any number of times produces same `acknowledged` state
    - **Validates: Requirements 5.1–5.7, 9.2**
    - _File: `packages/api/src/reminders/reminder.property.test.ts`_

  - [ ]* 6.7 Write unit tests for reminder routes and scheduling
    - Test each endpoint for happy path and key errors
    - Test `computeNextTrigger` for all three schedule types including exhausted one-time
    - Test `checkAndTriggerDue` at-most-once guard: two calls within same calendar day trigger only once
    - _Requirements: 6.3, 6.4, 7.4, 8.3_

- [ ] 7. Checkpoint — Reminder Engine complete
  - Ensure all tests pass. Run `vitest --run` in `packages/api`. Ask the user if questions arise.

- [ ] 8. Habit Tracker module
  - [ ] 8.1 Implement habit types and repository
    - Create `packages/api/src/habits/types.ts`: `Habit`, `HabitWithStreak`, `CompletionRecord`, `CreateHabitInput` interfaces
    - Create `packages/api/src/habits/repository.ts`: `createHabit(userId, input)`, `getHabitById(userId, habitId)`, `getHabitsForUser(userId)`, `recordCompletion(userId, habitId, date)`, `getCompletionDates(habitId)` — all with JSDoc
    - `recordCompletion` uses INSERT OR IGNORE (leveraging the UNIQUE INDEX) to enforce idempotent recording (Req 11.2)
    - _Requirements: 10.1–10.5, 11.1–11.4, 12.1–12.6_

  - [ ] 8.2 Implement HabitService — creation and completion recording
    - Create `packages/api/src/habits/service.ts` with `createHabit(userId, input)` and `recordCompletion(userId, habitId, date)` — Zod validation on name (1–200 chars); return `403`/`404` for auth/not-found errors
    - _Requirements: 10.1–10.5, 11.1–11.4_

  - [ ] 8.3 Implement streak calculation
    - Add `calculateStreak(habitId, asOfDate)` pure function in `packages/api/src/habits/streakCalculator.ts`:
      - Fetch distinct completion dates sorted DESC
      - Staleness check: if most recent date is before yesterday, return 0 (Req 12.4)
      - Walk backwards through consecutive dates, incrementing streak (Req 12.2, 12.5, 12.6)
    - Add `getHabit(userId, habitId)` and `getHabitsForUser(userId)` to `HabitService` that attach live streak to each habit
    - Add `getStreakConsistency(userId, asOfDate)` to `HabitService`: mean of per-habit streaks capped at 30, divided by 30; returns 0 when no habits (Req 16.1–16.5)
    - _Requirements: 12.1–12.6, 16.1–16.5_

  - [ ] 8.4 Implement habit router
    - Create `packages/api/src/habits/router.ts`: `POST /habits`, `GET /habits`, `GET /habits/:id`, `POST /habits/:id/complete`
    - All routes use `authenticate` middleware; all responses use `{ data, error }` envelope
    - Register habit router in `app.ts` under `/api/v1`
    - _Requirements: 10.1–10.5, 11.1–11.4, 12.1–12.6_

  - [ ]* 8.5 Write property tests for Habit Tracker (P14–P19)
    - **Property 14: Habit creation produces initial state** — valid name always produces streak 0, zero completion records, non-null `id`, UTC `createdAt`
    - **Property 15: Habit creation round trip** — fetch by id returns same name and streak 0
    - **Property 16: Completion recording idempotence** — recording same (habit, user, date) any number of times produces exactly one `CompletionRecord`
    - **Property 17: Streak calculation correctness** — for arbitrary completion date sets, returned streak equals the maximal consecutive run ending on today or yesterday; otherwise 0
    - **Property 18: Streak increment invariant** — adding completion for the day immediately after the most recent completion increases streak by exactly 1
    - **Property 19: Streak idempotence under duplicate dates** — adding completion for an already-recorded day leaves streak unchanged
    - **Validates: Requirements 10.1–10.5, 11.2, 12.1–12.6**
    - _File: `packages/api/src/habits/habit.property.test.ts`_

  - [ ]* 8.6 Write unit tests for habit routes and streak calculator
    - Test happy path and error paths for each endpoint
    - Test `calculateStreak` edge cases: empty records, single record (today), single record (yesterday), gap in sequence, streak reset
    - _Requirements: 10.1–10.5, 11.2, 12.3, 12.4_

- [ ] 9. Checkpoint — Habit Tracker complete
  - Ensure all tests pass. Run `vitest --run` in `packages/api`. Ask the user if questions arise.

- [ ] 10. Score Engine module
  - [ ] 10.1 Implement ScoreEngine types and service
    - Create `packages/api/src/score/types.ts`: `ProductivityScore` interface
    - Create `packages/api/src/score/service.ts`: `ScoreEngine` class with methods:
      - `computeTaskCompletionRate(userId)` — delegates to `TaskService.getCompletionRate`; rounds to 4dp; returns 0 when no tasks (Req 14.1–14.5)
      - `computeReminderAcknowledgementRate(userId)` — delegates to `ReminderService.getAcknowledgementRate`; rounds to 4dp; returns 0 when none due (Req 15.1–15.5); throws on out-of-bounds result (Req 15.5)
      - `computeHabitStreakConsistency(userId)` — delegates to `HabitService.getStreakConsistency`; returns 0 when no habits (Req 16.2)
      - `computeScore(userId)` — applies formula `(tcr×0.4 + rar×0.3 + hsc×0.3)×100`, clamps to `[0,100]`, rounds to 2dp (Req 13.1–13.8)
    - All methods have JSDoc
    - _Requirements: 13.1–13.8, 14.1–14.5, 15.1–15.5, 16.1–16.5_

  - [ ] 10.2 Implement score router
    - Create `packages/api/src/score/router.ts`: `GET /score` and `GET /score/breakdown`
    - Both routes use `authenticate` middleware; all responses use `{ data, error }` envelope
    - Register score router in `app.ts` under `/api/v1`
    - _Requirements: 13.1–13.8_

  - [ ]* 10.3 Write property tests for Score Engine (P20–P28)
    - **Property 20: Productivity score bounds** — for any `tcr`, `rar`, `hsc` in `[0,1]`, score is in `[0,100]`
    - **Property 21: Score formula correctness** — score equals `round((tcr×0.4 + rar×0.3 + hsc×0.3)×100, 2)`
    - **Property 22: Score determinism** — same inputs always produce same score
    - **Property 23: Task completion rate bounds** — for any user with ≥1 task, rate is in `[0,1]`
    - **Property 24: Task completion rate monotonicity** — marking one more task Done never decreases rate
    - **Property 25: Acknowledgement rate bounds** — for any user with ≥1 due reminder, rate is in `[0,1]`
    - **Property 26: Acknowledgement rate monotonicity** — acknowledging one more reminder never decreases rate
    - **Property 27: Habit streak consistency bounds** — for any user with ≥1 habit, consistency is in `[0,1]`
    - **Property 28: Habit streak consistency monotonicity** — increasing any habit's streak never decreases consistency
    - **Validates: Requirements 13.1–13.8, 14.1–14.5, 15.1–15.5, 16.1–16.5**
    - _File: `packages/api/src/score/score.property.test.ts`_

  - [ ]* 10.4 Write unit tests for score routes
    - Test `GET /score` with zero-data user (all rates 0, score 0)
    - Test `GET /score` with full-data user (all rates 1, score 100)
    - Test `GET /score/breakdown` returns all three component rates
    - _Requirements: 13.3–13.7_

- [ ] 11. Export Service module
  - [ ] 11.1 Implement ExportService
    - Create `packages/api/src/export/types.ts`: `ExportPayload` interface
    - Create `packages/api/src/export/service.ts`: `ExportService` class with `exportUserData(userId)`:
      - Calls `TaskService.getBoardForUser`, flattens to `Task[]`; calls `ReminderService.getRemindersForUser`; calls `HabitService.getHabitsForUser`; calls `ScoreEngine.computeScore`
      - Assembles payload in memory; if any step throws, rethrows so the router returns `{ data: null, error: "EXPORT_FAILED" }` (Req 17.4)
      - Returns `ExportPayload` with `exportedAt`, `userId`, `tasks`, `reminders`, `habits`, `productivityScore`
    - JSDoc on all methods
    - _Requirements: 17.1–17.5_

  - [ ] 11.2 Implement export router
    - Create `packages/api/src/export/router.ts`: `GET /export`
    - Uses `authenticate` middleware; sets `Content-Disposition: attachment; filename="dailyflow-export-{date}.json"`
    - On success: `{ data: ExportPayload, error: null }`; on failure: `{ data: null, error: "EXPORT_FAILED" }` with `500`
    - Register export router in `app.ts` under `/api/v1`
    - _Requirements: 17.1–17.5_

  - [ ]* 11.3 Write property tests for Export Service (P29–P30)
    - **Property 29: Export completeness** — counts of tasks, reminders, and habits in payload equal counts from their respective services
    - **Property 30: Export serialisation round trip** — `JSON.parse(JSON.stringify(payload))` produces a deeply equal object
    - **Validates: Requirements 17.1–17.5**
    - _File: `packages/api/src/export/export.property.test.ts`_

  - [ ]* 11.4 Write unit tests for export route
    - Test empty-data user: all three collections are empty arrays (not omitted) (Req 17.3)
    - Test serialisation failure path: service throws → router returns 500 with no partial data
    - _Requirements: 17.3, 17.4_

- [ ] 12. Checkpoint — API complete
  - Ensure all tests pass. Run `vitest --run` in `packages/api`. Ask the user if questions arise.

- [ ] 13. Web frontend — project setup and API client
  - [ ] 13.1 Configure Vite and global providers
    - Verify `vite.config.ts` proxies `/api/v1` to `http://localhost:3000` in dev mode
    - Configure `QueryClient` with sensible defaults (`staleTime`, `retry`) in `packages/web/src/queryClient.ts`
    - Set up `packages/web/src/api/client.ts`: typed `apiFetch<T>(url, options)` wrapper that reads the `{ data, error }` envelope and throws on non-null `error`
    - _Requirements: foundation for all web modules_

  - [ ] 13.2 Implement auth API hooks and pages
    - Create `packages/web/src/api/auth.ts`: `registerUser`, `loginUser` API functions
    - Create `packages/web/src/pages/LoginPage.tsx` and `RegisterPage.tsx` with CSS Modules
    - Create `packages/web/src/context/AuthContext.tsx` storing JWT token and `userId` in `localStorage`; exposes `useAuth` hook
    - Create `packages/web/src/components/PrivateRoute.tsx` that redirects unauthenticated users to `/login`
    - _Requirements: 1.1–1.6_

- [ ] 14. Web frontend — Task Board UI
  - [ ] 14.1 Implement task API hooks
    - Create `packages/web/src/api/tasks.ts`: `fetchBoard`, `createTask`, `updateTaskStatus` API functions
    - Create `packages/web/src/hooks/useTasks.ts`: `useTaskBoard`, `useCreateTask`, `useUpdateTaskStatus` hooks using TanStack Query with appropriate `invalidateQueries` on mutations
    - _Requirements: 2.1–2.7, 3.1–3.7, 4.1–4.5_

  - [ ] 14.2 Implement Kanban board components
    - Create `packages/web/src/pages/TaskBoardPage.tsx` with CSS Modules layout for three columns
    - Create `packages/web/src/components/tasks/KanbanColumn.tsx`: column header + task card list
    - Create `packages/web/src/components/tasks/TaskCard.tsx`: displays title, description, status badge; has a status-change dropdown
    - Create `packages/web/src/components/tasks/CreateTaskForm.tsx`: form to create a new task with title and optional description; client-side validation mirrors API rules
    - _Requirements: 2.1–2.7, 3.1–3.7, 4.1–4.5_

  - [ ]* 14.3 Write component tests for Task Board
    - Test `KanbanColumn` renders correct number of task cards
    - Test `CreateTaskForm` disables submit when title is empty
    - Test `TaskCard` status dropdown calls `updateTaskStatus` with correct value
    - _Requirements: 4.1–4.5_

- [ ] 15. Web frontend — Reminder UI
  - [ ] 15.1 Implement reminder API hooks
    - Create `packages/web/src/api/reminders.ts`: `fetchReminders`, `createReminder`, `acknowledgeReminder` API functions
    - Create `packages/web/src/hooks/useReminders.ts`: `useReminders`, `useCreateReminder`, `useAcknowledgeReminder` hooks
    - _Requirements: 5.1–5.7, 6.1–6.5, 7.1–7.5, 8.1–8.6, 9.1–9.5_

  - [ ] 15.2 Implement Reminder UI components
    - Create `packages/web/src/pages/RemindersPage.tsx` with CSS Modules
    - Create `packages/web/src/components/reminders/ReminderList.tsx`: lists reminders with state badge and acknowledge button for triggered ones
    - Create `packages/web/src/components/reminders/CreateReminderForm.tsx`: form with schedule type selector (one-time / daily / weekly) and conditional fields; validates lead time for one-time reminders client-side
    - _Requirements: 5.1–5.7, 9.1–9.5_

  - [ ]* 15.3 Write component tests for Reminder UI
    - Test `ReminderList` renders acknowledge button only for `triggered` state reminders
    - Test `CreateReminderForm` shows correct sub-fields for each schedule type
    - _Requirements: 5.1, 9.1_

- [ ] 16. Web frontend — Habit Tracker UI
  - [ ] 16.1 Implement habit API hooks
    - Create `packages/web/src/api/habits.ts`: `fetchHabits`, `createHabit`, `recordCompletion` API functions
    - Create `packages/web/src/hooks/useHabits.ts`: `useHabits`, `useCreateHabit`, `useRecordCompletion` hooks
    - _Requirements: 10.1–10.5, 11.1–11.4, 12.1–12.6_

  - [ ] 16.2 Implement Habit Tracker UI components
    - Create `packages/web/src/pages/HabitsPage.tsx` with CSS Modules
    - Create `packages/web/src/components/habits/HabitCard.tsx`: displays habit name, current streak, and "Mark Complete" button (disabled if already completed today)
    - Create `packages/web/src/components/habits/CreateHabitForm.tsx`: form to create habit with name validation
    - _Requirements: 10.1–10.5, 11.1–11.4, 12.1–12.6_

  - [ ]* 16.3 Write component tests for Habit Tracker UI
    - Test `HabitCard` displays streak value and disables "Mark Complete" after completion
    - Test `CreateHabitForm` rejects whitespace-only name
    - _Requirements: 12.1, 11.2_

- [ ] 17. Web frontend — Productivity Score and Export UI
  - [ ] 17.1 Implement score and export API hooks
    - Create `packages/web/src/api/score.ts`: `fetchScore`, `fetchScoreBreakdown` API functions
    - Create `packages/web/src/api/export.ts`: `downloadExport` API function (triggers file download)
    - Create `packages/web/src/hooks/useScore.ts` and `packages/web/src/hooks/useExport.ts`
    - _Requirements: 13.1–13.8, 17.1–17.5_

  - [ ] 17.2 Implement Score and Export UI components
    - Create `packages/web/src/pages/DashboardPage.tsx`: shows `ProductivityScoreCard` and `ExportButton` with CSS Modules
    - Create `packages/web/src/components/score/ProductivityScoreCard.tsx`: displays numeric score (0–100) and three component rate bars (task, reminder, habit)
    - Create `packages/web/src/components/export/ExportButton.tsx`: triggers `GET /export` and downloads the JSON file
    - _Requirements: 13.1–13.8, 17.1–17.5_

  - [ ]* 17.3 Write component tests for Score and Export UI
    - Test `ProductivityScoreCard` renders score value and three labelled rate bars
    - Test `ExportButton` calls export API and does not crash on success
    - _Requirements: 13.1–13.2, 17.2_

- [ ] 18. Web frontend — routing and navigation
  - [ ] 18.1 Configure application routes
    - Update `packages/web/src/main.tsx` with routes: `/login`, `/register`, `/` (dashboard), `/tasks`, `/reminders`, `/habits`
    - Wrap all routes except `/login` and `/register` with `PrivateRoute`
    - Create `packages/web/src/components/layout/AppLayout.tsx`: sidebar navigation linking to all main pages with CSS Modules
    - _Requirements: 4.1, 13.1, 17.1_

- [ ] 19. Checkpoint — Web frontend complete
  - Ensure all tests pass. Run `vitest --run` in `packages/web`. Ask the user if questions arise.

- [ ] 20. Integration tests
  - [ ] 20.1 Cross-user isolation integration tests
    - Create `packages/api/src/integration/cross-user.integration.test.ts`
    - Spin up an in-memory SQLite DB and full Express app; create two users; verify that user A cannot read or modify tasks/reminders/habits belonging to user B (Req 1.4, 1.5)
    - _Requirements: 1.4, 1.5_

  - [ ] 20.2 Task Board full-cycle integration tests
    - Create `packages/api/src/integration/task-board.integration.test.ts`
    - Test: create tasks → verify board groups correctly → update statuses → verify completion rate changes (Req 3.5, 4.2, 14.1)
    - _Requirements: 3.5, 4.2–4.4, 14.1_

  - [ ] 20.3 Reminder trigger-cycle integration tests
    - Create `packages/api/src/integration/reminder-trigger.integration.test.ts`
    - Insert a reminder with `next_trigger_at = now - 30s`; call `checkAndTriggerDue(now)` directly; verify notification inserted, state = `triggered`, `next_trigger_at` updated
    - Call again within same calendar day; verify no duplicate trigger (at-most-once guard) (Req 7.4, 8.3)
    - _Requirements: 6.2, 7.3–7.4, 8.2–8.3_

  - [ ] 20.4 Score recalculation integration tests
    - Create `packages/api/src/integration/score.integration.test.ts`
    - Verify score is 0 for a user with no data; add tasks/reminders/habits; verify score changes as expected (Req 13.6)
    - _Requirements: 13.3–13.6, 14.2, 15.2, 16.2_

  - [ ] 20.5 Export round-trip integration tests
    - Create `packages/api/src/integration/export.integration.test.ts`
    - Populate a user with tasks, reminders, and habits; call `GET /export`; verify counts match individual service queries; verify `JSON.parse(JSON.stringify(payload))` equals payload (Req 17.1–17.5)
    - _Requirements: 17.1–17.5_

- [ ] 21. Final checkpoint — all tests pass
  - Run `vitest --run` in both `packages/api` and `packages/web`. Ensure zero failures. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP development
- The tech stack uses **SQLite + better-sqlite3** (not PostgreSQL); schema DDL uses SQLite syntax (CHECK constraints instead of enums, `INTEGER` / `TEXT` types)
- All API responses use the `{ data, error }` envelope — never return raw objects from routes
- Business logic lives exclusively in `service.ts` files; routers only parse/validate input and format responses
- All `service.ts` and `repository.ts` functions must have JSDoc comments
- `calculateStreak` is extracted as a pure function in `streakCalculator.ts` to make it independently testable by property tests without a database
- Property tests use `fast-check` with a minimum of 100 iterations (`fc.configureGlobal({ numRuns: 100 })`)
- Integration tests use an in-memory SQLite database (`:memory:`) to avoid test pollution
- The CronRunner should not be started during test runs; export it so tests can call `checkAndTriggerDue` directly

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "13.1"] },
    { "id": 3, "tasks": ["2.2", "3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["3.3"] },
    { "id": 6, "tasks": ["3.4", "4.1"] },
    { "id": 7, "tasks": ["4.2"] },
    { "id": 8, "tasks": ["4.3"] },
    { "id": 9, "tasks": ["4.4", "4.5", "6.1"] },
    { "id": 10, "tasks": ["6.2", "13.2"] },
    { "id": 11, "tasks": ["6.3", "14.1"] },
    { "id": 12, "tasks": ["6.4", "14.2"] },
    { "id": 13, "tasks": ["6.5", "8.1", "14.3"] },
    { "id": 14, "tasks": ["6.6", "6.7", "8.2", "15.1"] },
    { "id": 15, "tasks": ["8.3", "15.2"] },
    { "id": 16, "tasks": ["8.4", "15.3"] },
    { "id": 17, "tasks": ["8.5", "8.6", "10.1", "16.1"] },
    { "id": 18, "tasks": ["10.2", "16.2"] },
    { "id": 19, "tasks": ["10.3", "10.4", "16.3", "11.1"] },
    { "id": 20, "tasks": ["11.2", "17.1"] },
    { "id": 21, "tasks": ["11.3", "11.4", "17.2"] },
    { "id": 22, "tasks": ["17.3", "18.1"] },
    { "id": 23, "tasks": ["20.1", "20.2", "20.3", "20.4", "20.5"] }
  ]
}
```
