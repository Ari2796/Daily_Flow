---
inclusion: always
---

# DailyFlow Technology Stack

## Language

- TypeScript
- Strict TypeScript mode must be enabled.
- Do not use JavaScript for application source files.

## Backend

- Node.js
- Express
- REST API architecture
- API responses should use the format:

{
  "data": {},
  "error": null
}

## Database

- SQLite
- better-sqlite3

## Frontend

- React
- Vite
- TypeScript
- CSS Modules for component styling

## Testing

- Vitest for unit testing.

## Project Structure

The project uses an npm workspace monorepo:

- packages/api — Express backend
- packages/web — React frontend

## Development Rules

- All application files must use `.ts` or `.tsx`.
- TypeScript strict mode must remain enabled.
- Business logic should not be placed directly inside API route handlers.