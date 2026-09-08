# Requirements Document

## Introduction

DailyFlow is a personal productivity application that unifies task management, reminder scheduling, habit tracking, and productivity analytics into a single experience. Users interact with four core modules — Task Board, Reminder Engine, Habit Tracker, and Productivity Score — all anchored to a shared User entity. The application also supports full data export so users can access and back up their information.

---

## Glossary

- **User**: An authenticated individual who owns and interacts with all DailyFlow data. Every piece of data belongs to exactly one User.
- **Task**: A discrete unit of work created by a User, carrying a title, optional description, and a status.
- **Task_Status**: One of three enumerated values: `Todo`, `In_Progress`, or `Done`.
- **Task_Board**: The module responsible for creating, storing, updating, and displaying Tasks as a Kanban board.
- **Reminder**: A scheduled notification item created by a User, consisting of a title, a schedule, and an acknowledgement state.
- **Reminder_Schedule**: The timing configuration attached to a Reminder. May be one-time, daily-recurring, or weekly-recurring.
- **Reminder_Engine**: The module responsible for creating, scheduling, triggering, and acknowledging Reminders.
- **Habit**: A recurring behaviour a User wants to build, tracked by daily completion records and a consecutive streak count.
- **Completion_Record**: A dated log entry that marks a Habit as completed on a specific calendar day.
- **Streak**: The count of consecutive calendar days on which a Habit has a Completion_Record, ending on the most recent Completion_Record date.
- **Habit_Tracker**: The module responsible for creating Habits, recording completions, and calculating Streaks.
- **Productivity_Score**: A single numeric value in the range [0, 100] derived from Task, Reminder, and Habit data for a given User.
- **Task_Completion_Rate**: The ratio of Tasks with status `Done` to total Tasks owned by the User, expressed as a decimal in [0, 1].
- **Reminder_Acknowledgement_Rate**: The ratio of acknowledged Reminders to total due Reminders for the User within the current scoring window, expressed as a decimal in [0, 1].
- **Habit_Streak_Consistency**: A normalised measure of the User's average active Streak length relative to the total days tracked, expressed as a decimal in [0, 1].
- **Score_Engine**: The module responsible for computing the Productivity_Score.
- **Export_Service**: The module responsible for serialising all User data into a portable format and delivering it to the User.
- **Export_Payload**: The complete, serialised representation of a User's data, including all Tasks, Reminders, Habits, and the current Productivity_Score.

---

## Requirements

### Requirement 1: User Identity and Data Ownership

**User Story:** As a user, I want all my tasks, reminders, habits, and productivity data to be associated with my account, so that my data is private and retrievable across sessions.

#### Acceptance Criteria

1. THE Task_Board SHALL associate every Task with exactly one User identifier at creation time.
2. THE Reminder_Engine SHALL associate every Reminder with exactly one User identifier at creation time.
3. THE Habit_Tracker SHALL associate every Habit with exactly one User identifier at creation time.
4. WHEN a User requests their data, THE System SHALL return only Tasks, Reminders, Habits, and productivity score records where the stored User identifier matches the requesting User's identifier.
5. IF a request is made for data belonging to a different User, THEN THE System SHALL reject the request with an error indicating unauthorised access and return no data from the target User's records.
6. IF a request is made without a valid User identifier, THEN THE System SHALL reject the request with an error indicating missing or invalid identity and return no data.

---

### Requirement 2: Task Creation

**User Story:** As a user, I want to create tasks with a title and optional description, so that I can capture work I need to do.

#### Acceptance Criteria

1. WHEN a User submits a task creation request with a non-empty title that is between 1 and 255 characters, THE Task_Board SHALL create a Task with status `Todo` and persist it.
2. WHEN a User submits a task creation request that includes a description of up to 2000 characters, THE Task_Board SHALL store the description alongside the Task.
3. IF a User submits a task creation request with an empty or whitespace-only title, THEN THE Task_Board SHALL reject the request with a validation error indicating the title is required, without creating a Task.
4. IF a User submits a task creation request with a title exceeding 255 characters, THEN THE Task_Board SHALL reject the request with a validation error indicating the title length limit, without creating a Task.
5. IF a User submits a task creation request with a description exceeding 2000 characters, THEN THE Task_Board SHALL reject the request with a validation error indicating the description length limit, without creating a Task.
6. THE Task_Board SHALL assign a unique identifier to each Task at creation time.
7. THE Task_Board SHALL record the creation timestamp in UTC on each Task.

**Correctness Properties:**

- FOR ALL valid task creation requests, the resulting Task identifier SHALL be unique across all Tasks owned by that User (uniqueness invariant).
- FOR ALL valid task creation requests, the Task returned by a subsequent fetch by identifier SHALL contain the same title and description as the creation request (round-trip property).

---

### Requirement 3: Task Status Transitions

**User Story:** As a user, I want to move tasks between Todo, In Progress, and Done columns on a Kanban board, so that I can track the progress of my work.

#### Acceptance Criteria

1. WHEN a User updates a Task's status to `In_Progress`, THE Task_Board SHALL persist the new status.
2. WHEN a User updates a Task's status to `Done`, THE Task_Board SHALL persist the new status.
3. WHEN a User updates a Task's status to `Todo`, THE Task_Board SHALL persist the new status.
4. IF a User submits a status update with a value that is not one of `Todo`, `In_Progress`, or `Done`, THEN THE Task_Board SHALL reject the request with a validation error and preserve the Task's existing status unchanged.
5. WHILE a Task has status `Done`, THE Task_Board SHALL count that Task toward the Task_Completion_Rate.
6. WHEN a Task is first created, THE Task_Board SHALL assign it a status of `Todo` as its initial state.
7. A User SHALL be permitted to transition a Task between any two statuses in any direction (e.g., `Done` to `Todo`, `In_Progress` to `Todo`).

**Correctness Properties:**

- FOR ALL Tasks, THE Task_Board SHALL only persist a status value that is a member of the set {`Todo`, `In_Progress`, `Done`} (invariant).
- FOR ALL status update operations, applying the same status update twice SHALL produce the same final Task state as applying it once (idempotence).

---

### Requirement 4: Task Board Display

**User Story:** As a user, I want to view all my tasks on a Kanban board grouped by status, so that I can see where each task stands at a glance.

#### Acceptance Criteria

1. WHEN a User requests the Task Board, THE Task_Board SHALL return all Tasks owned by that User within 2 seconds.
2. THE Task_Board SHALL group returned Tasks by their current status into exactly three columns: `Todo`, `In_Progress`, and `Done`.
3. THE Task_Board SHALL include all three status columns in the board response even when a column contains zero Tasks.
4. IF a User has no Tasks, THEN THE Task_Board SHALL return a board with all three status columns each containing zero Tasks.
5. IF the requesting User is not authenticated, THEN THE Task_Board SHALL return an error response and return no Task data.

**Correctness Properties:**

- FOR ALL Users, the total count of Tasks across all three columns in the board response SHALL equal the total count of Tasks stored for that User (completeness invariant).

---

### Requirement 5: Reminder Creation

**User Story:** As a user, I want to create reminders with a title and a schedule, so that I am notified about important activities at the right time.

#### Acceptance Criteria

1. WHEN a User submits a reminder creation request with a title of 1–200 characters (excluding leading and trailing whitespace) and a valid Reminder_Schedule, THE Reminder_Engine SHALL create a Reminder and persist it.
2. WHEN a User submits a reminder creation request with an empty or whitespace-only title, THE Reminder_Engine SHALL reject the request with a validation error indicating the title is required.
3. IF a User submits a reminder creation request with a title exceeding 200 characters, THEN THE Reminder_Engine SHALL reject the request with a validation error indicating the title length limit.
4. IF a User submits a reminder creation request with a missing or malformed Reminder_Schedule, THEN THE Reminder_Engine SHALL reject the request with a validation error indicating the schedule is invalid.
5. THE Reminder_Engine SHALL assign a unique identifier to each Reminder at creation time.
6. THE Reminder_Engine SHALL initialise every new Reminder with an unacknowledged state.
7. THE Reminder_Engine SHALL record the creation timestamp in UTC on each Reminder.

**Correctness Properties:**

- FOR ALL valid reminder creation requests, the Reminder returned by a subsequent fetch by identifier SHALL contain the same title, schedule, and unacknowledged state as immediately after creation (round-trip property).

---

### Requirement 6: Reminder Scheduling — One-Time

**User Story:** As a user, I want to set a reminder for a specific date and time, so that I am notified exactly once at that moment.

#### Acceptance Criteria

1. WHEN a User creates a Reminder with a one-time schedule specifying a future date and time, THE Reminder_Engine SHALL store the target date-time with a precision of one minute.
2. WHEN the system clock reaches the stored target date-time of a one-time Reminder, THE Reminder_Engine SHALL trigger the Reminder exactly once and mark it as triggered.
3. IF a User creates a Reminder with a one-time schedule specifying a date-time in the past, THEN THE Reminder_Engine SHALL reject the request with a validation error indicating the date-time must be in the future, and SHALL NOT create the Reminder.
4. IF a User creates a Reminder with a one-time schedule specifying a date-time within one minute of the current system time, THEN THE Reminder_Engine SHALL reject the request with a validation error indicating insufficient lead time, and SHALL NOT create the Reminder.
5. WHEN the Reminder_Engine triggers a one-time Reminder, THE Reminder_Engine SHALL display a notification to the User containing the Reminder title and the scheduled date-time.

---

### Requirement 7: Reminder Scheduling — Daily Recurring

**User Story:** As a user, I want to create a reminder that repeats every day at a specified time, so that I am notified daily about recurring activities.

#### Acceptance Criteria

1. WHEN a User creates a Reminder with a daily-recurring schedule specifying a time of day, THE Reminder_Engine SHALL store the recurrence rule with the specified time of day in hours and minutes (00:00–23:59).
2. IF the User specifies a time of day outside the range 00:00–23:59 or omits the time field, THEN THE Reminder_Engine SHALL reject the creation request and return an error indicating the time of day is invalid or missing, without persisting the Reminder.
3. WHEN the system clock reaches the specified time of day (within a 60-second window) on any calendar day, THE Reminder_Engine SHALL trigger the Reminder for that day.
4. THE Reminder_Engine SHALL trigger a daily-recurring Reminder no more than once per calendar day, regardless of system restarts or clock corrections occurring within that day.
5. IF a daily-recurring Reminder's scheduled trigger time is missed on a given calendar day due to system downtime, THEN THE Reminder_Engine SHALL skip that day's trigger and resume on the next calendar day at the specified time.

**Correctness Properties:**

- FOR ALL daily-recurring Reminders, the count of triggers over N consecutive calendar days of uninterrupted system availability SHALL equal N (frequency invariant).

---

### Requirement 8: Reminder Scheduling — Weekly Recurring

**User Story:** As a user, I want to create a reminder that repeats every week on specified days and at a specified time, so that I am notified on my chosen weekly schedule.

#### Acceptance Criteria

1. WHEN a User creates a Reminder with a weekly-recurring schedule specifying one or more days of the week (Monday through Sunday) and a time of day (00:00–23:59 in 24-hour format), THE Reminder_Engine SHALL store the recurrence rule with the selected days and time preserved exactly as specified.
2. WHEN the system clock reaches the specified time (within a ±60-second window) on a specified day of the week, THE Reminder_Engine SHALL trigger the Reminder for that occurrence and mark that occurrence as pending acknowledgement.
3. THE Reminder_Engine SHALL trigger a weekly-recurring Reminder no more than once per specified weekday per calendar week, where a calendar week is defined as Monday 00:00 through Sunday 23:59 in the User's configured timezone.
4. IF a User creates a weekly-recurring Reminder with no days of the week selected, THEN THE Reminder_Engine SHALL reject the request with a validation error indicating that at least one day of the week is required, and SHALL NOT persist any part of the Reminder.
5. IF a User creates a weekly-recurring Reminder with a time of day value outside the range 00:00–23:59, THEN THE Reminder_Engine SHALL reject the request with a validation error indicating an invalid time value, and SHALL NOT persist any part of the Reminder.
6. WHEN a weekly-recurring Reminder is triggered, THE Reminder_Engine SHALL make the Reminder visible to the User until the User acknowledges it or until the next occurrence of that Reminder triggers, whichever comes first.

**Correctness Properties:**

- FOR ALL weekly-recurring Reminders configured for K days per week, the count of triggers over N complete calendar weeks SHALL equal N × K (frequency invariant).

---

### Requirement 9: Reminder Acknowledgement

**User Story:** As a user, I want to acknowledge a reminder after I have acted on it, so that I can mark it as handled and keep my reminder list accurate.

#### Acceptance Criteria

1. WHEN a User acknowledges a triggered Reminder, THE Reminder_Engine SHALL update the Reminder's state from triggered to acknowledged within 2 seconds.
2. WHEN a User acknowledges an already-acknowledged Reminder, THE Reminder_Engine SHALL accept the request without error and the Reminder state SHALL remain acknowledged.
3. THE Reminder_Engine SHALL include all Reminders with an acknowledged state in the Reminder_Acknowledgement_Rate calculation, where the rate is computed as the count of acknowledged Reminders divided by the total count of triggered Reminders for the User.
4. IF a User attempts to acknowledge a Reminder that does not belong to them, THEN THE Reminder_Engine SHALL reject the request with an authorisation error and leave the Reminder's state unchanged.
5. IF a User attempts to acknowledge a Reminder that does not exist, THEN THE Reminder_Engine SHALL reject the request with a not-found error.

**Correctness Properties:**

- FOR ALL Reminders, applying an acknowledgement operation twice SHALL produce the same acknowledged state as applying it once (idempotence).

---

### Requirement 10: Habit Creation

**User Story:** As a user, I want to create a habit with a name, so that I can start tracking a behaviour I want to build.

#### Acceptance Criteria

1. WHEN a User submits a habit creation request with a non-empty name that is not whitespace-only and does not exceed 200 characters, THE Habit_Tracker SHALL create a Habit with zero Completion_Records and a Streak of 0 and persist it.
2. WHEN a User submits a habit creation request with an empty or whitespace-only name, THE Habit_Tracker SHALL reject the request with a validation error indicating that the name is required.
3. IF a User submits a habit creation request with a name exceeding 200 characters, THEN THE Habit_Tracker SHALL reject the request with a validation error indicating the name length limit.
4. THE Habit_Tracker SHALL assign a unique identifier to each Habit at creation time.
5. THE Habit_Tracker SHALL record the creation timestamp in UTC on each Habit.

**Correctness Properties:**

- FOR ALL newly created Habits, the initial Streak SHALL be 0 (invariant).
- FOR ALL valid habit creation requests, the Habit returned by a subsequent fetch by identifier SHALL contain the same name and a Streak of 0 (round-trip property).

---

### Requirement 11: Daily Habit Completion Recording

**User Story:** As a user, I want to mark a habit as completed for today, so that I can log my progress and maintain my streak.

#### Acceptance Criteria

1. WHEN a User marks a Habit as completed for the current calendar day, THE Habit_Tracker SHALL create a Completion_Record containing the Habit identifier, the User identifier, and the calendar date of the completion.
2. WHEN a User marks a Habit as completed for a calendar day on which a Completion_Record already exists for that Habit and User, THE Habit_Tracker SHALL accept the request without error and SHALL NOT create a duplicate Completion_Record, returning the same response as a successful first-time completion.
3. IF a User attempts to record a completion for a Habit that does not belong to them, THEN THE Habit_Tracker SHALL reject the request with an authorisation error and SHALL NOT create a Completion_Record.
4. IF a User attempts to record a completion for a Habit identifier that does not exist, THEN THE Habit_Tracker SHALL reject the request with a not-found error and SHALL NOT create a Completion_Record.

**Correctness Properties:**

- FOR ALL Habits, the set of Completion_Records SHALL contain at most one entry per calendar day per User (uniqueness invariant).
- FOR ALL Habits, recording a completion for the same day twice SHALL result in the same Completion_Record count as recording it once (idempotence).

---

### Requirement 12: Streak Calculation

**User Story:** As a user, I want to see my current consecutive completion streak for each habit, so that I am motivated to maintain my daily commitment.

#### Acceptance Criteria

1. WHEN a User requests a Habit, THE Habit_Tracker SHALL return the current Streak value calculated from the Habit's Completion_Records.
2. THE Habit_Tracker SHALL calculate the Streak as the number of consecutive calendar days, using the server's configured timezone to determine calendar day boundaries, ending on the most recent Completion_Record date, provided that the most recent Completion_Record date is either the current calendar day or the immediately preceding calendar day.
3. WHEN a Habit has no Completion_Records, THE Habit_Tracker SHALL return a Streak of 0.
4. IF the most recent Completion_Record date is earlier than the immediately preceding calendar day, THEN THE Habit_Tracker SHALL return a Streak of 0.
5. WHEN multiple Completion_Records exist for the same calendar day, THE Habit_Tracker SHALL count that calendar day as a single completed day when calculating the Streak.
6. WHEN a gap of one or more calendar days without a Completion_Record exists before the most recent Completion_Record, THE Habit_Tracker SHALL count only the consecutive run ending on the most recent Completion_Record date.

**Correctness Properties:**

- FOR ALL Habits, adding a Completion_Record for a day immediately following the current most recent Completion_Record date SHALL increase the Streak by exactly 1 (increment invariant).
- FOR ALL Habits, adding a Completion_Record for a day that is not immediately consecutive SHALL leave the Streak equal to 1 (reset invariant).
- FOR ALL Habits, adding a Completion_Record for the same day as the most recent Completion_Record SHALL leave the Streak unchanged (idempotence).

---

### Requirement 13: Productivity Score Calculation

**User Story:** As a user, I want to see a single productivity score, so that I can understand my overall performance at a glance.

#### Acceptance Criteria

1. WHEN a User requests their Productivity_Score, THE Score_Engine SHALL compute a value using the formula: `(Task_Completion_Rate × 0.4) + (Reminder_Acknowledgement_Rate × 0.3) + (Habit_Streak_Consistency × 0.3)`, where each component rate is a value in [0, 1].
2. THE Score_Engine SHALL express the Productivity_Score as a numeric value in the range [0, 100], rounded to two decimal places.
3. WHEN a User has no Tasks, THE Score_Engine SHALL treat the Task_Completion_Rate as 0.
4. WHEN a User has no due Reminders in the scoring window, THE Score_Engine SHALL treat the Reminder_Acknowledgement_Rate as 0.
5. WHEN a User has no Habits, THE Score_Engine SHALL treat the Habit_Streak_Consistency as 0.
6. WHEN a User requests their Productivity_Score, THE Score_Engine SHALL recalculate using the latest data at the time of the request.
7. THE Score_Engine SHALL define the scoring window as the current calendar day in the user's local time for all component rate calculations.
8. THE Score_Engine SHALL clamp the final Productivity_Score to the closed interval [0, 100] before returning it to the User.

**Correctness Properties:**

- FOR ALL Users, the Productivity_Score SHALL be in the closed interval [0, 100] regardless of the values of the three component rates (bounds invariant).
- FOR ALL Users, if Task_Completion_Rate = 1, Reminder_Acknowledgement_Rate = 1, and Habit_Streak_Consistency = 1, THEN the Productivity_Score SHALL equal 100 (maximum value invariant).
- FOR ALL Users, if Task_Completion_Rate = 0, Reminder_Acknowledgement_Rate = 0, and Habit_Streak_Consistency = 0, THEN the Productivity_Score SHALL equal 0 (minimum value invariant).
- FOR ALL Users, given fixed component rates, calling the score calculation multiple times SHALL return the same Productivity_Score (determinism / idempotence).

---

### Requirement 14: Task Completion Rate Calculation

**User Story:** As a user, I want my productivity score to accurately reflect the proportion of my tasks I have completed, so that finishing tasks improves my score.

#### Acceptance Criteria

1. THE Score_Engine SHALL calculate the Task_Completion_Rate as the count of Tasks with status `Done` divided by the total count of Tasks owned by the User, rounded to four decimal places.
2. WHEN the total count of Tasks owned by the User is zero, THE Score_Engine SHALL return a Task_Completion_Rate of 0.
3. THE Score_Engine SHALL use only Tasks belonging to the requesting User in the calculation.
4. IF a Task's status is not one of `Todo`, `In_Progress`, or `Done`, THEN THE Score_Engine SHALL exclude that Task from both the numerator and denominator of the Task_Completion_Rate calculation.
5. WHEN the Task_Completion_Rate is requested, THE Score_Engine SHALL return the result within 2 seconds.

**Correctness Properties:**

- FOR ALL Users with at least one Task, the Task_Completion_Rate SHALL be in the closed interval [0, 1] (bounds invariant).
- FOR ALL Users, marking one additional Task as `Done` SHALL not decrease the Task_Completion_Rate (monotonicity property).

---

### Requirement 15: Reminder Acknowledgement Rate Calculation

**User Story:** As a user, I want my productivity score to reflect how reliably I acknowledge my reminders, so that staying on top of reminders improves my score.

#### Acceptance Criteria

1. THE Score_Engine SHALL calculate the Reminder_Acknowledgement_Rate as the count of acknowledged Reminders divided by the total count of due Reminders within the scoring window for the User, expressed as a decimal value rounded to 4 decimal places.
2. WHEN the total count of due Reminders within the scoring window is zero, THE Score_Engine SHALL return a Reminder_Acknowledgement_Rate of 0.
3. THE Score_Engine SHALL use only Reminders belonging to the requesting User in the Reminder_Acknowledgement_Rate calculation.
4. WHEN a Reminder's scheduled time falls on or before the end of the scoring window, THE Score_Engine SHALL classify that Reminder as due regardless of its acknowledgement status.
5. IF the calculated Reminder_Acknowledgement_Rate falls outside the closed interval [0, 1], THEN THE Score_Engine SHALL reject the result and return an error indicating an invalid rate calculation.

**Correctness Properties:**

- FOR ALL Users with at least one due Reminder, the Reminder_Acknowledgement_Rate SHALL be in the closed interval [0, 1] (bounds invariant).
- FOR ALL Users, acknowledging one additional Reminder SHALL not decrease the Reminder_Acknowledgement_Rate (monotonicity property).

---

### Requirement 16: Habit Streak Consistency Calculation

**User Story:** As a user, I want my productivity score to reflect the consistency of my habit streaks, so that maintaining habits improves my score.

#### Acceptance Criteria

1. THE Score_Engine SHALL calculate the Habit_Streak_Consistency as the arithmetic mean of individual Habit Streak lengths across all Habits owned by the User, normalised by dividing by the scoring window length in days (maximum 30 days), yielding a value in the closed interval [0, 1], where a Streak length exceeding the scoring window is capped at the scoring window length before normalisation.
2. WHEN the User has no Habits, THE Score_Engine SHALL return a Habit_Streak_Consistency of 0.
3. THE Score_Engine SHALL use only Habits belonging to the requesting User in the calculation.
4. IF a Habit's current Streak length exceeds the scoring window length in days, THEN THE Score_Engine SHALL cap that Habit's Streak length at the scoring window length for the purpose of the Habit_Streak_Consistency calculation.
5. IF the User has at least one Habit and all Habits have a Streak length of 0, THEN THE Score_Engine SHALL return a Habit_Streak_Consistency of 0.

**Correctness Properties:**

- FOR ALL Users with at least one Habit, the Habit_Streak_Consistency SHALL be in the closed interval [0, 1] (bounds invariant).
- FOR ALL Users, increasing any individual Habit's Streak SHALL not decrease the Habit_Streak_Consistency (monotonicity property).

---

### Requirement 17: Data Export

**User Story:** As a user, I want to export all of my data, so that I can back up my information and use it outside of DailyFlow.

#### Acceptance Criteria

1. WHEN a User requests a data export, THE Export_Service SHALL produce an Export_Payload that contains all Tasks, all Reminders, all Habits, and the Productivity_Score calculated at the time of the export request belonging to that User.
2. WHEN a User requests a data export, THE Export_Service SHALL serialise the Export_Payload as a valid JSON document.
3. WHEN a User has no data in a given category (Tasks, Reminders, or Habits), THE Export_Service SHALL include an empty collection for that category in the Export_Payload rather than omitting the category.
4. IF a User requests an export and an error occurs during serialisation, THEN THE Export_Service SHALL return an error response indicating the reason for the failure and SHALL NOT return a partially serialised payload.
5. THE Export_Service SHALL include only data belonging to the requesting User in the Export_Payload.

**Correctness Properties:**

- FOR ALL Users, the count of Tasks in the Export_Payload SHALL equal the count of Tasks returned by the Task_Board for that User (completeness invariant).
- FOR ALL Users, the count of Reminders in the Export_Payload SHALL equal the count of Reminders stored for that User (completeness invariant).
- FOR ALL Users, the count of Habits in the Export_Payload SHALL equal the count of Habits stored for that User (completeness invariant).
- FOR ALL valid Export_Payloads, parsing the serialised payload and then re-serialising it SHALL produce an equivalent Export_Payload (round-trip property — essential for serialisation correctness).
