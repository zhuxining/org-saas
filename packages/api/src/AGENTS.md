# API Package

## OVERVIEW

Type-safe oRPC server with middleware-based authentication, isomorphic handlers (SSR + client).

## STRUCTURE

```
src/
├── index.ts              # Main router export
├── context.ts            # oRPC context with session extraction
└── routers/              # API endpoint definitions
    └── *.ts              # Individual routers
```

## WHERE TO LOOK

| Task           | Location                        |
| -------------- | ------------------------------- |
| Router entry   | index.ts                        |
| Auth context   | context.ts                      |
| Route handlers | routers/\*.ts                   |
| Middleware     | context.ts (session extraction) |

## CONVENTIONS

### Procedure Composition

Two base procedures with different auth requirements:

```typescript
// No authentication required
publicProcedure.handler(() => "OK");

// Requires authenticated session
protectedProcedure.handler(({ context }) => {
  return { user: context.session?.user };
});
```

### Context Pattern

Session always available via `context.session`:

```typescript
protectedProcedure.handler(({ context }) => {
  if (!context.session?.user) throw new Error("Unauthorized");
  // Access: context.session.user.id, context.session.user.role
});
```

### Isomorphic Handlers

Same handler code runs on server (SSR) and client (API calls) - no separate server/client implementations needed.

## ANTI-PATTERNS

- **Don't skip session checks** in protected procedures - always verify `context.session`
- **Don't create custom procedures** - use `publicProcedure` or `protectedProcedure` only
- **Don't mix auth patterns** - rely on Better-Auth session, don't implement custom auth

## UNIQUE STYLES

- **Type-safe RPC**: Endpoints defined once, types flow to frontend via @orpc/client
- **Middleware-based auth**: Session extracted once in context, not per-handler
- **Zod validation**: All inputs validated via @orpc/zod

## NOTES

- Changes to routers automatically update frontend types via oRPC
- Context session is from Better-Auth, checked in context.ts
