# API Structure Documentation

## Overview

The API is organized into three main routers with role-based access control:

1. **Index Router** (`/api/rpc/index.*`) - Public access for all visitors
2. **Admin Router** (`/api/rpc/admin.*`) - System admin only
3. **Organization Router** (`/api/rpc/organization.*`) - Organization members with specific permissions

## User Roles

### System Admin (`role: "admin"`)
- Full system access
- Can manage all users and organizations
- Can ban/unban users
- Can delete any organization

### Organization Owner (`member.role: "owner"`)
- Full control over their organization
- Can delete organization
- Can manage all members and content
- **Only one owner per organization**

### Organization Admin (`member.role: "admin"`)
- Can update organization settings
- Can manage members (except owner)
- Can manage all posts in the organization
- **Multiple admins allowed per organization**

### Organization Member (`member.role: "member"`)
- Can view organization data
- Can create and manage their own posts
- Cannot manage other members

### Ordinary Visitor (unauthenticated)
- Can view all published content
- Can browse organizations
- No authentication required

## API Routes

### Public Routes (`/api/rpc/index.*`)

**No authentication required** - accessible to all visitors

#### `index.listOrganizations`
List all organizations
```typescript
input: {
  limit?: number (1-100, default: 20)
  offset?: number (default: 0)
}
```

#### `index.getOrganization`
Get organization details by slug
```typescript
input: {
  slug: string
}
```

#### `index.listPublishedPosts`
List all published posts (optionally filtered by organization)
```typescript
input: {
  limit?: number (1-100, default: 20)
  offset?: number (default: 0)
  organizationId?: string
}
```

#### `index.getPublishedPost`
Get a single published post by slug
```typescript
input: {
  slug: string
}
```

### Admin Routes (`/api/rpc/admin.*`)

**Requires:** System admin role (`user.role === "admin"`)

#### `admin.listUsers`
List all users in the system
```typescript
input: {
  limit?: number (1-100, default: 20)
  offset?: number (default: 0)
}
```

#### `admin.updateUserRole`
Change user's system role
```typescript
input: {
  userId: string
  role: "user" | "admin"
}
```

#### `admin.banUser`
Ban a user from the system
```typescript
input: {
  userId: string
  reason: string
  expiresAt?: Date
}
```

#### `admin.unbanUser`
Unban a previously banned user
```typescript
input: {
  userId: string
}
```

#### `admin.listOrganizations`
List all organizations with member details
```typescript
input: {
  limit?: number (1-100, default: 20)
  offset?: number (default: 0)
}
```

#### `admin.deleteOrganization`
Delete any organization
```typescript
input: {
  organizationId: string
}
```

### Organization Routes (`/api/rpc/organization.*`)

#### `organization.createOrganization`
**Requires:** Authenticated user

Create a new organization (creator becomes owner)
```typescript
input: {
  name: string (1-100 chars)
  slug: string (1-50 chars)
  logo?: string (URL)
}
```

#### `organization.updateOrganization`
**Requires:** Organization admin or owner

Update organization settings
```typescript
input: {
  organizationId: string
  name?: string (1-100 chars)
  slug?: string (1-50 chars)
  logo?: string (URL)
}
```

#### `organization.deleteOrganization`
**Requires:** Organization owner only

Delete the organization
```typescript
input: {
  organizationId: string
}
```

#### `organization.listMembers`
**Requires:** Organization member

List all members of the organization
```typescript
input: {
  organizationId: string
}
```

#### `organization.updateMemberRole`
**Requires:** Organization admin or owner

Change a member's role (cannot change owner or your own role)
```typescript
input: {
  organizationId: string
  userId: string
  role: "member" | "admin"
}
```

#### `organization.removeMember`
**Requires:** Organization admin or owner

Remove a member (cannot remove owner or yourself)
```typescript
input: {
  organizationId: string
  userId: string
}
```

#### `organization.createPost`
**Requires:** Organization member

Create a new post
```typescript
input: {
  organizationId: string
  title: string (1-200 chars)
  slug: string (1-100 chars)
  content: string
  excerpt?: string
  coverImage?: string (URL)
  status?: "draft" | "published" (default: "draft")
}
```

#### `organization.updatePost`
**Requires:** Post author OR organization admin/owner

Update a post
```typescript
input: {
  organizationId: string
  postId: string
  title?: string (1-200 chars)
  slug?: string (1-100 chars)
  content?: string
  excerpt?: string
  coverImage?: string (URL)
  status?: "draft" | "published"
}
```

#### `organization.deletePost`
**Requires:** Post author OR organization admin/owner

Delete a post
```typescript
input: {
  organizationId: string
  postId: string
}
```

#### `organization.listPosts`
**Requires:** Organization member

List all posts in the organization (including drafts)
```typescript
input: {
  organizationId: string
  limit?: number (1-100, default: 20)
  offset?: number (default: 0)
}
```

## Content Publishing Flow

1. **Organization members create posts** - can be draft or published immediately
2. **No admin approval required** - org content is published directly
3. **Published posts are visible to all visitors** via public index routes
4. **Draft posts are only visible to organization members**

## Permission Matrix

| Action | Visitor | User | Org Member | Org Admin | Org Owner | System Admin |
|--------|---------|------|------------|-----------|-----------|--------------|
| View published posts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View organizations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create organization | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create post | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Update own post | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Update any org post | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete own post | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Delete any org post | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage org members | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Update org settings | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete organization | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage all users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ban users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete any org | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## Database Schema

### New Tables

#### `post` table
```typescript
{
  id: string (primary key)
  title: string
  slug: string (indexed)
  content: string
  excerpt?: string
  coverImage?: string
  status: "draft" | "published" (indexed)
  organizationId: string (foreign key, indexed)
  authorId: string (foreign key, indexed)
  publishedAt?: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Modified Tables

No modifications to existing Better-Auth tables. The `user.role` and `member.role` fields are already present from Better-Auth plugins.

## Implementation Files

- `packages/api/src/middlewares.ts` - Role-based middleware
- `packages/api/src/routers/index-router.ts` - Public routes
- `packages/api/src/routers/admin-router.ts` - Admin routes
- `packages/api/src/routers/organization-router.ts` - Organization routes
- `packages/db/src/schema/content.ts` - Post schema

## Next Steps

1. Copy `.env.example` to `.env` and configure `DATABASE_URL`
2. Run `bun run db:push` to apply schema changes
3. Start development server with `bun run dev`
4. Test API routes via frontend or API client
