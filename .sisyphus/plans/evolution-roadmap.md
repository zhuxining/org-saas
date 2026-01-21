# SaaS Platform - Evolution Roadmap

## Current Status (2025-01-20)

### ✅ Completed: All Development Tasks (13/13)

**Phase 1**: Security & Session Integration ✅
- Task 1: Auth guards library
- Task 2: Route guards on admin/org routes
- Task 3: Post-login redirect logic
- Task 4: Session integration in sidebars

**Phase 2**: Core Experience ✅
- Task 5: Real Org Switcher component

**Phase 3**: Dashboards ✅
- Task 6: Admin dashboard with stats
- Task 7: Org dashboard with stats

**Phase 4**: Team Management ✅
- Task 8: Teams list page with CRUD
- Task 9: Team detail page with member management

**Phase 5**: Invitation Flow ✅
- Task 10: Public invitation accept/reject page

**Phase 6**: Public Pages ✅
- Task 11: Landing page with hero and features
- Task 12: Pricing page with tier cards
- Task 13: About page with company information

---

## 🔴 Current Issues Requiring Attention

### 1. Route Registration & Layout Issues

**Problem**: New public pages (landing, pricing, about) are standalone with their own header/footer
**Conflict**: Existing `(public)/route.tsx` has shared layout with `<Outlet />` for child routes

**Impact**:
- Landing page at `/` may conflict with existing homepage
- TypeScript errors about missing routes (`/landing`, `/pricing`, `/about`)
- Inconsistent navigation (some pages use shared layout, some don't)

**Files Affected**:
- `apps/web/src/routes/(public)/landing/index.tsx` - Standalone page
- `apps/web/src/routes/(public)/pricing/index.tsx` - Standalone page
- `apps/web/src/routes/(public)/about/index.tsx` - Standalone page
- `apps/web/src/routes/(public)/route.tsx` - Shared layout

### 2. TypeScript Type Warnings (Pre-existing)

**Pre-existing issues across the project**:
- `session.user.activeOrganizationId` - Property exists at runtime but not in TypeScript types
- `queryOptions()` - Type mismatch between expected `{ input: {...} }` and actual usage
- These affect: admin dashboard, org dashboard, org switcher, auth guards

**Impact**: No blocking - code works at runtime, but IDE shows warnings

### 3. Login Page Integration Missing

**Problem**: Invitation accept page expects login page to handle `invitationId` and `redirect` query params
**Status**: Login page not updated to accept invitation flow
**Missing**: Logic to handle post-login redirect after invitation acceptance

### 4. Route Tree Not Regenerated

**Problem**: New routes (`/landing`, `/pricing`, `/about`) not showing in TypeScript route tree
**Required**: Route tree regeneration via TanStack Router
**Command needed**: `bun run dev` to trigger route tree regeneration

---

## 🎯 Evolution Phases

### Phase 7: Route Registration & Layout Consistency (IN PROGRESS)

**Priority**: 🚨 HIGH
**Estimated Time**: 30-60 minutes

**Analysis Complete**: Agent analysis received for navigation components

**Current State**:
- Header Component (`header.tsx`): Links array has only `[{ to: "/", label: "Home" }]`
- Footer Component (`footer.tsx`): Has Terms/Privacy/Contact links, missing public pages
- Individual pages (landing/pricing/about): Have their own inline navigation, don't use shared layout

**Critical Discovery**:
- Navigation inconsistency: Individual pages don't use shared Header/Footer from `(public)/route.tsx`
- Missing routes: TypeScript errors about `/pricing` and `/about` routes

**Implementation Plan**:
1. **Update Header Component** - Add Pricing/About links to links array
2. **Update Footer Component** - Replace placeholder links with Home/Pricing/About + Terms
3. **Regenerate Route Tree** - Run `bun run dev` to register new routes
4. **Verify TypeScript** - Run `bun run check-types` after regeneration

**Acceptance Criteria**:
- [ ] All public pages accessible without errors
- [ ] Consistent header/footer across all public pages
- [ ] No TypeScript errors about missing routes
- [ ] Navigation works correctly between all public pages

---

### Phase 8: Login Page Integration (MEDIUM)

**Priority**: ⚠️ MEDIUM
**Estimated Time**: 30-45 minutes

**Tasks**:
1. **Update login page to handle invitation flow**
   - File: `apps/web/src/routes/(auth)/login.tsx`
   - Extract `invitationId` and `redirect` from `useSearch()`
   - On successful login:
     - If `invitationId` exists: Call `acceptInvitation.mutate({ invitationId })`
     - Navigate to `redirect` param (or `/org/dashboard` if not specified)
     - Handle errors for invalid/expired invitations

2. **Update sign-in form post-login redirect**
   - File: `apps/web/src/components/sign-in-form.tsx`
   - Current logic: Redirect based on role (admin → /admin, user → /org)
   - New logic: Check for `redirect` query param, use it if exists
   - Maintain role-based redirect as fallback

**Acceptance Criteria**:
- [ ] Login page accepts invitationId and redirect params
- [ ] Post-login handles invitation acceptance automatically
- [ ] Error handling for invalid/expired invitations
- [ ] Toast notifications for success/failure
- [ ] Redirect to correct page after login

---

### Phase 9: Manual QA & Testing (HIGH)

**Priority**: 🚨 HIGH
**Estimated Time**: 60-90 minutes

**Tasks**:

#### 9.1: Functional Testing

**Security & Auth**:
- [ ] Login as admin → redirects to `/admin/dashboard`
- [ ] Login as regular user → redirects to `/org/dashboard`
- [ ] Access `/admin/dashboard` without auth → redirects to `/login`
- [ ] Access `/admin/dashboard` with non-admin → redirects to `/org/dashboard`
- [ ] Access `/org/dashboard` without auth → redirects to `/login`
- [ ] Logout button in sidebar works → redirects to `/login`
- [ ] Sidebar displays correct user name, email, avatar

**Core Experience**:
- [ ] Org switcher displays all user organizations
- [ ] Clicking organization switches `activeOrganizationId`
- [ ] Page content updates after org switch
- [ ] Active org is highlighted in switcher

**Dashboards**:
- [ ] Admin dashboard shows correct stats (orgs, users, sessions)
- [ ] Org dashboard shows correct stats (members, teams, invitations)
- [ ] Stats match database (verify via `bun run db:studio`)

**Team Management**:
- [ ] Teams list displays all teams
- [ ] Create team dialog works → team created
- [ ] Edit team dialog works → name updated
- [ ] Delete team works → team removed (with confirmation)
- [ ] Team detail page shows members
- [ ] Add member to team works
- [ ] Remove member from team works
- [ ] Set as active team works → checkmark shows

**Invitation Flow**:
- [ ] Invitation page loads at `/invitations/accept/$invitationId`
- [ ] Shows org name, inviter, role
- [ ] Accept button works when logged in → redirects to `/org/dashboard`
- [ ] Accept button redirects to login when logged out
- [ ] Login page handles invitation after login
- [ ] Reject button works → redirects to `/`
- [ ] Error handling for expired/invalid invitations

**Public Pages**:
- [ ] Landing page displays hero and features
- [ ] Navigation links work (Pricing, About)
- [ ] Pricing page displays tiers
- [ ] About page displays company info
- [ ] All pages responsive on mobile (375px, 768px)
- [ ] All pages accessible without auth

#### 9.2: Visual & Responsive Testing

**Breakpoints**:
- Mobile: 375px
- Tablet: 768px
- Desktop: 1024px+
- Large Desktop: 1440px+

**Tests**:
- [ ] Landing page responsive on all breakpoints
- [ ] Pricing page responsive on all breakpoints
- [ ] About page responsive on all breakpoints
- [ ] Admin dashboard responsive
- [ ] Org dashboard responsive
- [ ] Teams list page responsive
- [ ] Team detail page responsive
- [ ] No horizontal scroll on mobile
- [ ] Touch targets large enough on mobile

#### 9.3: Browser Console & Network Testing

**Console**:
- [ ] No JavaScript errors on any page
- [ ] No React warnings in console
- [ ] No console.log statements in production code

**Network**:
- [ ] All API calls return 200 or expected status codes
- [ ] No failed API requests
- [ ] API response times acceptable (< 1s for most queries)
- [ ] No 401/403 errors for authorized operations

#### 9.4: Screenshot Evidence Collection

**Required Screenshots** (save to `.sisyphus/screenshots/`):
1. [ ] Admin dashboard with stats
2. [ ] Org dashboard with stats
3. [ ] Org switcher with multiple orgs
4. [ ] Teams list table
5. [ ] Teams list - Create dialog
6. [ ] Team detail page
7. [ ] Team detail - Add member dialog
8. [ ] Accept invitation page (logged out)
9. [ ] Accept invitation page (logged in)
10. [ ] Landing page - desktop
11. [ ] Landing page - mobile
12. [ ] Pricing page - desktop
13. [ ] Pricing page - mobile
14. [ ] About page - desktop
15. [ ] About page - mobile

**Acceptance Criteria**:
- [ ] All functional tests passed
- [ ] All visual tests passed
- [ ] Console clean on all pages
- [ ] All screenshots collected
- [ ] Manual QA checklist complete

---

### Phase 10: Code Quality & Type Safety (MEDIUM)

**Priority**: ⚠️ MEDIUM
**Estimated Time**: 30-45 minutes

**Tasks**:

1. **Fix or document TypeScript type warnings**
   - File: `apps/web/src/lib/auth-guards.ts`
   - Fix `session` possibly undefined checks
   - Document why `activeOrganizationId` exists at runtime but not in types

2. **Clean up unused imports**
   - Run `bunx eslint apps/web/src --fix`
   - Remove unused imports from all new files
   - Verify no imports marked as unused

3. **Fix oRPC queryOptions pattern**
   - Ensure all queries use `{ input: {...} }` pattern
   - Document why current pattern works despite type mismatch
   - Consider updating oRPC types if possible

4. **Run final code quality checks**
   - `bun run check` - Lint and format
   - `bun run check-types` - Type check
   - Verify no new warnings/errors

5. **Update documentation**
   - Add "Pre-existing Type Issues" section to README
   - Document workarounds for type mismatches
   - Note when to expect route regeneration

**Acceptance Criteria**:
- [ ] No unused imports in new files
- [ ] All type warnings documented or fixed
- [ ] `bun run check` passes
- [ ] Documentation updated with known issues

---

### Phase 11: Performance Optimization (LOW)

**Priority**: 💡 LOW (Nice to have)
**Estimated Time**: 30-45 minutes

**Tasks**:

1. **Optimize query caching**
   - Add `staleTime` to frequently accessed queries
   - Add `gcTime` to reduce memory usage
   - Prefetch data on route entry (TanStack Router `beforeLoad`)

2. **Reduce re-renders**
   - Use `React.memo()` for expensive components
   - Add `key` props to list items properly
   - Avoid inline function definitions in render

3. **Code splitting**
   - Lazy load heavy routes (dashboards with complex queries)
   - Use TanStack Router's lazy loading
   - Reduce initial bundle size

4. **Image optimization**
   - Add lazy loading for avatar images
   - Add error handling for broken images
   - Consider adding image CDN for static assets

**Acceptance Criteria**:
- [ ] Query caching configured
- [ ] Component re-renders reduced
- [ ] Initial bundle size measured
- [ ] Lazy loading implemented

---

### Phase 12: Documentation & Handoff (HIGH)

**Priority**: 🚨 HIGH
**Estimated Time**: 30-45 minutes

**Tasks**:

1. **Update project documentation**
   - File: `README.md`
   - Add "Public Pages" section describing new pages
   - Add "Evolution" section documenting all phases
   - Include deployment instructions

2. **Create user guide**
   - File: `docs/USER_GUIDE.md`
   - How to use each role (Admin, Org, Public)
   - How to manage organizations
   - How to manage teams
   - How to invite members

3. **Create deployment checklist**
   - File: `docs/DEPLOYMENT_CHECKLIST.md`
   - Environment variables required
   - Database setup steps
   - Build and deployment commands
   - Post-deployment verification

4. **Clean up temporary files**
   - Remove `.sisyphus/notepads/` (if not needed)
   - Remove `.sisyphus/drafts/` (if not needed)
   - Keep only `.sisyphus/plans/` and `.sisyphus/screenshots/`

5. **Create feature summary**
   - File: `FEATURE_SUMMARY.md`
   - List all implemented features
   - Link to relevant documentation
   - Highlight technical decisions

**Acceptance Criteria**:
- [ ] README updated with new features
- [ ] User guide created
- [ ] Deployment checklist created
- [ ] Temporary files cleaned up
- [ ] Project ready for production use

---

## 📊 Prioritized Task Queue

### Immediate (Next 1-2 days)
1. **Phase 7**: Route Registration & Layout Consistency
2. **Phase 8**: Login Page Integration

### High Priority (Next 3-5 days)
3. **Phase 9**: Manual QA & Testing

### Medium Priority (Next 1 week)
4. **Phase 10**: Code Quality & Type Safety

### Low Priority (Next 2 weeks)
5. **Phase 11**: Performance Optimization

### Required Before Production
6. **Phase 12**: Documentation & Handoff

---

## 🎬 Success Criteria for Full Evolution

**Functional**:
- [ ] All routes registered and accessible
- [ ] Login flow handles invitations correctly
- [ ] All features tested and working
- [ ] Manual QA checklist complete

**Technical**:
- [ ] No critical bugs or errors
- [ ] All type warnings documented
- [ ] Code quality checks pass
- [ ] Performance optimizations in place

**Documentation**:
- [ ] README updated
- [ ] User guide available
- [ ] Deployment checklist ready
- [ ] Feature summary created

**Production Ready**:
- [ ] Environment configured
- [ ] Database schema pushed
- [ ] Build process verified
- [ ] Deployment tested

---

**Generated**: 2025-01-20
**Status**: Development complete, evolution phases defined
**Next Action**: Begin Phase 7 - Route Registration & Layout Consistency
