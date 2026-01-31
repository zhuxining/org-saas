# 认证流程详解

## 概述

本文档详细说明了 Better-Auth 的使用方法，包括 Session 管理、组织切换、权限检查、登录/登出流程和邀请流程。

---

## Session 管理

### 获取 Session

#### 客户端（Client）

**项目推荐**: 使用 `orpc.privateData.queryOptions()` 配合 TanStack Query

```typescript
import { useSuspenseQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'

function MyComponent() {
  const { data: session } = useSuspenseQuery(orpc.privateData.queryOptions())

  if (!session) return <div>Not authenticated</div>

  return <div>Welcome {session.user.name}</div>
}
```

**Better-Auth 原生方式**: 使用 `authClient.getSession()`

```typescript
import { authClient } from '@/lib/auth-client'
import { useQuery } from '@tanstack/react-query'

function MyComponent() {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: () => authClient.getSession(),
  })

  if (!session) return <div>Not authenticated</div>

  return <div>Welcome {session.user.name}</div>
}
```

**说明**: 项目选择 `orpc.privateData.queryOptions()` 是因为它与 TanStack Query 的缓存、Suspense 和 SSR 预加载更紧密集成。如果使用 `authClient.getSession()`，需要手动管理缓存和刷新策略。

#### 服务端（Server）

**方法 1**: 使用 `auth.api.getSession()`

```typescript
import { auth } from '@org-sass/auth'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const loader = async () => {
  const session = await auth.api.getSession({
    headers: (await getRequestHeaders()) as Headers,
  })

  return { session }
}
```

**方法 2**: 使用 `getSession()` server function

```typescript
import { getSession } from '@/functions/get-session'

export const loader = async () => {
  const session = await getSession()

  return { session }
}
```

### Session 结构

```typescript
interface Session {
  user: {
    id: string
    name: string
    email: string
    image?: string
    activeOrganizationId?: string  // 当前活动组织
    activeTeamId?: string           // 当前活动团队
  }
}
```

**注意**: `activeOrganizationId` 属性在运行时由 Better-Auth 动态添加，始终使用可选链：

```typescript
// ✅ 正确
const orgId = session?.user?.activeOrganizationId || ''

// ❌ TypeScript 报错
const orgId = session.user.activeOrganizationId
```

---

## 登录/登出流程

### 登录

```typescript
import { authClient } from '@/lib/auth-client'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'

function SignInForm() {
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        { email: value.email, password: value.password },
        {
          onSuccess: () => {
            toast.success('Signed in successfully')
            navigate({ to: '/org/dashboard' })
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText)
          },
        },
      )
    },
  })

  return <Form onSubmit={form.handleSubmit} />
}
```

### 登出

```typescript
import { authClient } from '@/lib/auth-client'
import { useNavigate } from '@tanstack/react-router'

function SignOutButton() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: '/' })
        },
      },
    })
  }

  return <Button onClick={handleSignOut}>Sign Out</Button>
}
```

### 登录后重定向优先级

1. `redirect` 查询参数
2. 默认: `/org/dashboard` (如果有组织) 或 `/org/select` (如果需要创建/选择组织)

---

## 组织切换

### 列出组织

```typescript
import { useQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'

function OrganizationSwitcher() {
  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => authClient.organization.list(),
  })

  const orgs = (orgsData as unknown as
    { id: string; name: string; slug: string }[] | null) ?? null

  if (!orgs) return <div>Loading organizations...</div>

  return (
    <Select>
      {orgs.map((org) => (
        <SelectItem key={org.id} value={org.id}>
          {org.name}
        </SelectItem>
      ))}
    </Select>
  )
}
```

### 切换活跃组织

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { orpc } from '@/utils/orpc'

function OrganizationSwitcher() {
  const queryClient = useQueryClient()

  const { data: session } = useSuspenseQuery(orpc.privateData.queryOptions())
  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => authClient.organization.list(),
  })

  const setActiveOrg = useMutation({
    mutationFn: async (organizationId: string) => {
      return authClient.organization.setActive({ organizationId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.privateData.queryOptions().queryKey,
      })
      toast.success('Organization switched')
    },
  })

  const orgs = (orgsData as unknown as
    { id: string; name: string }[] | null) ?? null

  return (
    <Select
      value={session?.user?.activeOrganizationId}
      onValueChange={(orgId) => orgId && setActiveOrg.mutate(orgId)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {orgs?.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

---

## 权限检查

### 路由级权限守卫

```typescript
// utils/guards.ts
import { auth } from '@org-sass/auth'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { ForbiddenError, UnauthorizedError } from '@/utils/errors'

export async function requireAdmin({
  context,
  location,
}: {
  context: RouterAppContext
  location?: { href: string }
}) {
  // 获取活跃成员信息
  const member = await auth.api.getActiveMember({
    headers: (await getRequestHeaders()) as Headers,
  })

  if (!member) {
    throw new UnauthorizedError('您需要登录才能访问此页面')
  }

  if (member.role !== 'admin' && member.role !== 'owner') {
    throw new ForbiddenError('您没有权限访问此资源')
  }

  return { member }
}
```

### 在路由中使用守卫

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { requireAdmin } from '@/utils/guards'

export const Route = createFileRoute('/org/members/')({
  beforeLoad: async ({ context, location }) => {
    await requireAdmin({ context, location })
  },
  component: MembersPage,
})
```

---

## 邀请流程

### 接受邀请

```typescript
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'

function InvitationAcceptPage({ invitationId }: { invitationId: string }) {
  const navigate = useNavigate()

  const acceptInvitation = useMutation({
    mutationFn: async () => {
      return authClient.organization.acceptInvitation({
        invitationId,
      })
    },
    onSuccess: () => {
      toast.success('Invitation accepted successfully')
      navigate({ to: '/org/dashboard' })
    },
    onError: (error) => {
      toast.error(error.error.message || 'Failed to accept invitation')
    },
  })

  const rejectInvitation = useMutation({
    mutationFn: async () => {
      return authClient.organization.rejectInvitation({
        invitationId,
      })
    },
    onSuccess: () => {
      toast.success('Invitation rejected')
      navigate({ to: '/' })
    },
  })

  return (
    <div>
      <Button onClick={() => acceptInvitation.mutate()}>
        Accept Invitation
      </Button>
      <Button variant="outline" onClick={() => rejectInvitation.mutate()}>
        Decline
      </Button>
    </div>
  )
}
```

---

## 角色层级

### 组织角色

| 角色 | 权限 |
|------|------|
| `owner` | 组织所有者，完全控制权 |
| `admin` | 组织管理员，可以管理成员、团队、邀请 |
| `member` | 普通成员，只读访问 |

---

## 团队系统

### 列出团队

```typescript
import { useSuspenseQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'

function TeamsList() {
  const organizationId = session?.user?.activeOrganizationId

  const { data: teamsData } = useSuspenseQuery({
    queryKey: ['organization', 'teams', organizationId],
    queryFn: async () => {
      if (!organizationId) return { teams: [] }
      return authClient.organization.listTeams({
        query: { organizationId },
      })
    },
  })

  const teams = (teamsData as unknown as { teams?: unknown[] } | null)?.teams ?? []

  return (
    <div>
      {teams.map((team: unknown) => {
        const t = team as { id: string; name: string }
        return <div key={t.id}>{t.name}</div>
      })}
    </div>
  )
}
```

### 切换活跃团队

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'

const setActiveTeam = useMutation({
  mutationFn: async (teamId: string) => {
    return authClient.organization.setActiveTeam({ teamId })
  },
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: orpc.privateData.queryOptions().queryKey,
    })
    toast.success('Active team updated')
  },
})
```

### 团队权限

- 团队是组织的子集
- 一个用户可以属于多个团队
- 团队用于更精细的权限管理
- 每个用户有一个活跃团队（`activeTeamId`）

---

## 反模式

- **不要混用多种 Session 获取方式** - 在项目中统一使用 `orpc.privateData.queryOptions()`，保持一致性
- **不要绕过 Better-Auth API** - 使用 `authClient`，不要手动修改 auth 表或直接调用数据库
- **不要忽略 activeOrganizationId 类型问题** - 始终使用可选链和类型断言
- **不要在客户端直接检查密码** - 所有认证逻辑通过 Better-Auth
- **不要在 loader 中使用 `authClient.getSession()`** - 服务端应使用 `auth.api.getSession()` 或 `getSession()` server function

---

## 相关文档

- **Auth Package**: [packages/auth/CLAUDE.md](../../../packages/auth/CLAUDE.md)
- **路由系统详解**: [docs/routing.md](./routing.md)
- **数据获取详解**: [docs/data-loading.md](./data-loading.md)
- **CRUD 模式**: [docs/crud-patterns.md](./crud-patterns.md)
- [Better-Auth 文档](https://www.better-auth.com/docs)
