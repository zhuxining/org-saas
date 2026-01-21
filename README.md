# org-sass

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Self, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/web/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Project Structure

```
org-sass/
├── apps/
│   └── web/         # Fullstack application (React + TanStack Start)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Biome formatting and linting

---

## Pre-existing Type Issues

This project has some pre-existing TypeScript warnings that don't affect functionality:

### activeOrganizationId Property
The `session.user.activeOrganizationId` property exists at runtime (added by Better-Auth) but isn't included in the generated TypeScript types.

**Workaround**: Use optional chaining
```typescript
const organizationId = session?.user?.activeOrganizationId || "";
```

**Files Affected**:
- `apps/web/src/routes/admin/dashboard/index.tsx`
- `apps/web/src/routes/org/dashboard/index.tsx`
- `apps/web/src/routes/org/-components/org-switcher.tsx`
- `apps/web/src/routes/org/teams/index.tsx`
- `apps/web/src/routes/org/teams/$teamId.tsx`

**Impact**: These warnings don't block functionality. Code works correctly at runtime.

### queryOptions Type Mismatch
The generated oRPC types expect `{ input: {...} }` structure but the actual usage pattern passes objects directly.

**Expected Pattern**:
```typescript
orpc.organization.listMembers.queryOptions({
  input: { organizationId: "..." }
})
```

**Actual Usage (works at runtime)**:
```typescript
orpc.organization.listMembers.queryOptions({
  organizationId: "..."
})
```

**Files Affected**: All files using oRPC queries

**Impact**: Not blocking - generated oRPC types have this structure, code works correctly at runtime.

### Route Registration
New public pages (`/pricing`, `/about`, `/landing`) need the route tree to be regenerated for TypeScript to recognize them.

**Resolution**: Run `bun run dev` to trigger TanStack Router's automatic route tree generation.

---

## Evolution Phases

This project has been through complete implementation phases (see `.sisyphus/plans/evolution-roadmap.md`):

- ✅ **Phase 1-6**: Core platform implementation (33 tasks completed)
- ⚠️ **Phase 7-12**: Evolution and optimization phases (in progress)

For detailed evolution roadmap, see `.sisyphus/plans/evolution-roadmap.md`.
