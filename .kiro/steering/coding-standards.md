---
inclusion: always
---

# DailyFlow Coding Standards

## General Rules

- Use TypeScript with strict typing.
- Avoid `any`.
- Keep functions focused on a single responsibility.
- Use meaningful and descriptive names.
- Do not place business logic inside React components or Express routers.

## Backend Module Structure

Each backend feature module should contain:

- `types.ts`
- `repository.ts`
- `service.ts`
- `router.ts`
- `*.test.ts`

### Responsibilities

**types.ts**
- Contains TypeScript interfaces and types.

**repository.ts**
- Handles database access and CRUD operations only.

**service.ts**
- Contains business logic.
- Must not directly contain database implementation details.

**router.ts**
- Contains Express routes.
- Uses the standard API response envelope.

**test files**
- Contain Vitest unit tests.

## Documentation

Every service and repository function must have JSDoc documentation.

## API Standards

All API responses should follow:

```ts
{
  data: ...,
  error: null
}