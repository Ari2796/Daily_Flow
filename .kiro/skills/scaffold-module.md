# scaffold-module

## Description

Builds one complete DailyFlow module (backend + frontend) from the spec and steering files. Run once per module.

## Parameters

- MODULE_NAME: tasks | reminders | habits
- ENTITY_NAME: Task | Reminder | Habit

## Instructions

1. Read `.kiro/specs/dailyflow-app/design.md`.

2. Extract the TypeScript interface for `{{ENTITY_NAME}}`.

3. In `packages/api/src/modules/{{MODULE_NAME}}/`, create:

   - `types.ts` — Interface based on `design.md`
   - `repository.ts` — `better-sqlite3` CRUD operations with JSDoc on every function
   - `service.ts` — Business logic only, with no direct database calls and complete JSDoc
   - `router.ts` — Express router using the `{ data, error }` response envelope
   - `{{MODULE_NAME}}.test.ts` — Vitest tests for service functions

4. In `packages/web/src/features/{{MODULE_NAME}}/`, create:

   - `types.ts` — Mirrors the API types
   - `api.ts` — Fetch wrappers for all endpoints
   - `{{MODULE_NAME}}Context.tsx` — Context and `useReducer`
   - `components/` containing:
     - `List.tsx`
     - `Card.tsx`
     - `Form.tsx`

5. Register the router in `packages/api/src/app.ts`.

6. Mark the relevant completed tasks in `.kiro/specs/dailyflow-app/tasks.md`.

7. Follow all instructions in the steering files, especially `coding-standards.md` and `tech-stack.md`.

8. Before completing, ensure TypeScript strict mode compatibility and do not modify unrelated modules.