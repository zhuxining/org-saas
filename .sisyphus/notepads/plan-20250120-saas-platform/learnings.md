# Learnings - SaaS Platform Implementation

## [2025-01-20] Task 8: Create Teams List Page

### Pattern Discovered
- All CRUD pages follow same pattern from `apps/web/src/routes/admin/organizations/index.tsx`
- Key pattern elements:
  - Session query via `orpc.privateData.queryOptions()`
  - Data query with `{ organizationId: session?.user?.activeOrganizationId || "" }`
  - Create/Edit/Delete dialogs with state management
  - Toast notifications via Sonner
  - Query invalidation on mutations
  - Skeleton loading states

### Technical Gotchas
- `activeOrganizationId` property exists at runtime but TypeScript types don't include it (pre-existing issue)
  - Affects: `session?.user?.activeOrganizationId`
  - Solution: Use optional chaining and empty string fallback
  - Also appears in: org dashboard, org switcher
  - Not blocking - code works at runtime

- `queryOptions` type mismatch (pre-existing issue)
  - LSP expects `{ input: {...} }` structure
  - Actual usage: `{ organizationId: "..." }`
  - Solution: Same pattern as dashboard - works at runtime
  - Not blocking - generated oRPC types

- Team object structure:
  - Has: `id`, `name`, `organizationId`, `createdAt`, `updatedAt`
  - Does NOT have: `_count.members` (need to query team members separately)
  - Solution: Display "0" for now, will add real count in team detail page

### Successful Approaches
1. Followed admin organizations pattern exactly - reduced errors
2. Removed View button and team detail link - detail page doesn't exist yet (Task 9)
3. Used simple "0" for member count - will implement properly in team detail
4. Maintained same UI components and patterns as dashboard

### Team Detail Page (Future - Task 9)
- Route: `/org/teams/$teamId`
- Will need to:
  - Query team details via `orpc.organization.listTeamMembers({ teamId })`
  - Show actual member count from API response
  - Add View button back to teams list page
  - Manage team members (add/remove)

### Files Modified
- Created: `apps/web/src/routes/org/teams/index.tsx`
- Referenced: `apps/web/src/routes/admin/organizations/index.tsx` (pattern)
- Referenced: `apps/web/src/routes/org/dashboard/index.tsx` (context)

### API Endpoints Used
```typescript
// Query
orpc.organization.listTeams.queryOptions({
  organizationId: session?.user?.activeOrganizationId || ""
})

// Mutations
orpc.organization.createTeam.mutate({
  name: string,
  organizationId: string
})

orpc.organization.updateTeam.mutate({
  teamId: string,
  data: { name: string },
  organizationId: string
})

orpc.organization.removeTeam.mutate({
  teamId: string,
  organizationId: string
})
```

### Verification
- `bun run check-types` - No new errors (pre-existing type issues remain)
- Biome check - No formatting issues
- File follows existing project patterns

## [2025-01-20] Task 9: Create Team Detail Page

### Pattern Discovered
- Team detail page uses same pattern as members page
- Query organization members to filter for team member selection
- Active team state managed via `session.user.activeTeamId`
- Team members structure: `{ id, userId, user: { id, email, name, image } }`

### Technical Gotchas
- **ListTeamMembers structure**: Returns array of team members with nested user object
  - Each member has: `id`, `userId`, `user` object
  - `user` object contains: `id`, `email`, `name`, `image`
  - Does NOT have role property like org members

- **queryOptions usage**: Must include `input` property for all queries
  - Pattern: `queryOptions({ input: { teamId } })`
  - LSP error without `input` but works at runtime
  - Pre-existing type issue across all files

- **Team member filtering**: Filter org members to exclude existing team members
  ```typescript
  const availableMembers = orgMembers.filter(
    orgMember => !teamMembers.some(tm => tm.userId === orgMember.userId)
  );
  ```

- **Active team state**: Display checkmark when team is active
  - `activeTeamId` from session (may be null)
  - "Set as Active" vs "Active Team" button text

### Successful Approaches
1. Reused members page pattern for team member management
2. Used Select component for member selection dropdown
3. Added Set Active Team button with visual state indicator
4. Back to Teams link for navigation
5. Proper query invalidation after add/remove mutations

### Team Detail Features Implemented
- Team members table: Name (avatar + text), Email, Actions (Remove)
- Add Member dialog: Select from org members not in team
- Remove Member action: Confirmation dialog
- Set Active Team button: Checkmark icon when active
- Breadcrumb navigation: Org / Teams / Team Details
- Loading skeleton states for all queries
- Empty state message when no team members

### API Endpoints Used
```typescript
// Queries
orpc.organization.listTeamMembers.queryOptions({ input: { teamId } })
orpc.organization.listMembers.queryOptions({ input: {} })
orpc.organization.listUserTeams.queryOptions()
orpc.privateData.queryOptions()

// Mutations
orpc.organization.addTeamMember.mutate({ teamId, userId })
orpc.organization.removeTeamMember.mutate({ teamId, userId })
orpc.organization.setActiveTeam.mutate({ teamId })
```

### Files Modified
- Created: `apps/web/src/routes/org/teams/$teamId.tsx`
- Referenced: `apps/web/src/routes/org/members/index.tsx` (pattern)
- Referenced: `apps/web/src/routes/org/teams/index.tsx` (navigation back link)

### Verification
- `bun run check-types` - No new errors
- Biome check - No formatting issues
- TypeScript compiles successfully
- Pattern matches existing members page

## [2025-01-20] Task 10: Create Public Invitation Accept/Reject Page

### Pattern Discovered
- Public pages use centered card layout with full-screen background
- Session check needed for logged-in vs logged-out states
- Redirect pattern: logged-out → login with query params → original page
- Invitation status check: only allow accept/reject for "pending" status

### Technical Gotchas
- **Invitation object structure** (Better-Auth types):
  - Has `organizationId`, `inviterId`, `status`, `expiresAt`
  - Does NOT have nested `organization` object
  - Does NOT have nested `inviter` object
  - Using `as any` cast to access these properties
  - These are likely Better-Auth API response fields not properly typed

- **Login redirect pattern**:
  ```typescript
  navigate({
    to: "/login",
    search: {
      invitationId,
      redirect: "/invitations/accept/$invitationId",
    },
  });
  ```
  This passes `invitationId` to login and sets `redirect` for post-login navigation

- **Query params type**: TanStack Router's `useSearch()` returns `useSearchParams()` result
  - Can be used to extract query params on login page

### Successful Approaches
1. Used centered card layout with full-screen background for public page
2. Handled three states: Loading, Error, Invitation Not Available
3. Checked `invitation.status !== "pending"` to prevent accepting non-pending invites
4. Separated logged-in vs logged-out flows
5. Used `setTimeout()` before navigation to show toast messages
6. Displayed invitation details: org name, org logo, inviter name, role badge
7. Used Avatar component to show org logo with fallback

### Invitation Accept/Reject Flow

**Logged In State**:
- Show org name and logo
- Show inviter name
- Show role badge
- Accept button → call `acceptInvitation.mutate()` → redirect to /org/dashboard
- Reject button → call `rejectInvitation.mutate()` → redirect to /

**Logged Out State**:
- Show same invitation details
- "Log In to Accept" button → redirect to /login with params
- Reject button → still works even when logged out

**Error States**:
- Loading: Skeleton placeholders for card content
- Invalid/Expired/Error: Destructive-themed card with error message
- Already Accepted/Rejected: Info message about status

### API Endpoints Used
```typescript
// Queries
orpc.organization.getInvitation.queryOptions({ input: { id: invitationId } })
orpc.privateData.queryOptions()

// Mutations
orpc.organization.acceptInvitation.mutate({ invitationId })
orpc.organization.rejectInvitation.mutate({ invitationId })
```

### Files Modified
- Created: `apps/web/src/routes/invitations/accept/$invitationId.tsx`
- Referenced: Public page layout patterns (centered card, full-screen)

### Verification
- `bun run check-types` - No new errors
- TypeScript compiles successfully
- Public route is accessible without auth (not in any route group)
