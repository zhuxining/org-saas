# 数据加载模式详解

## 概述

本文档详细说明了使用 TanStack Query 进行数据获取、缓存和状态管理的最佳实践。

---

## 基础查询

### 获取 Session

#### 客户端（推荐）

```typescript
import { useSuspenseQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'

function MyComponent() {
  const { data: session } = useSuspenseQuery(orpc.privateData.queryOptions())

  if (!session) return <div>Not authenticated</div>

  const user = session.user
  const orgId = (user as { activeOrganizationId?: string | null })
    ?.activeOrganizationId || ''

  return <div>Welcome {user.name}</div>
}
```

#### 服务端

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

### 组织相关查询

```typescript
import { authClient } from '@/lib/auth-client'
import { useSuspenseQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'

function TeamsList() {
  const { data: session } = useSuspenseQuery(orpc.privateData.queryOptions())

  const organizationId = (session?.user as {
    activeOrganizationId?: string | null
  })?.activeOrganizationId

  // 列出团队
  const { data: teamsData } = useSuspenseQuery({
    queryKey: ['organization', 'teams', organizationId],
    queryFn: async () => {
      if (!organizationId) return { teams: [] }
      return authClient.organization.listTeams({
        query: { organizationId },
      })
    },
  })

  // 列出成员
  const { data: membersData } = useQuery({
    queryKey: ['organization', 'members', organizationId],
    queryFn: async () => {
      if (!organizationId) return { members: [] }
      return authClient.organization.listMembers({
        query: { organizationId },
      })
    },
    enabled: !!organizationId,
  })

  // 类型断言处理 Better-Auth 返回类型
  const teams = (teamsData as unknown as { teams?: unknown[] } | null)
    ?.teams ?? []
  const members = (membersData as unknown as { members?: unknown[] } | null)
    ?.members ?? []

  return <div>...</div>
}
```

---

## SSR 数据预加载

### 在路由 loader 中预加载数据

```typescript
import { createFileRoute, defer } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/org/dashboard/')({
  loader: async ({ context }) => {
    // 获取 session
    const session = await queryClient.fetchQuery(
      orpc.privateData.queryOptions()
    )

    const organizationId = (session?.user as {
      activeOrganizationId?: string | null
    })?.activeOrganizationId

    // 预加载团队成员数据
    const members = queryClient.ensureQueryData({
      queryKey: ['organization', 'members', organizationId],
      queryFn: async () => {
        if (!organizationId) return { members: [] }
        return authClient.organization.listMembers({
          query: { organizationId },
        })
      },
    })

    return defer({
      members,
    })
  },
  component: OrgDashboard,
})
```

---

## 加载状态处理

### Skeleton 模式 (推荐)

```typescript
import { Skeleton } from '@/components/ui/skeleton'

function TeamsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-62.5" />
            <Skeleton className="h-4 w-50" />
          </div>
        </div>
      ))}
    </div>
  )
}

// 使用
if (isLoading) {
  return <TeamsSkeleton />
}
```

### 使用 useSuspenseQuery（推荐用于已知数据）

```typescript
import { useSuspenseQuery } from '@tanstack/react-query'

function TeamsList() {
  const { data: teamsData } = useSuspenseQuery({
    queryKey: ['organization', 'teams', organizationId],
    queryFn: async () => {
      if (!organizationId) return { teams: [] }
      return authClient.organization.listTeams({
        query: { organizationId },
      })
    },
  })

  const teams = (teamsData as unknown as { teams?: unknown[] } | null)
    ?.teams ?? []

  return <div>{teams.map(...)}</div>
}
```

---

## 错误处理

### 错误状态显示

```typescript
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle from 'lucide-react'

function ErrorDisplay({ error, onRetry }: {
  error: Error
  onRetry: () => void
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{error.message}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  )
}

// 使用
if (error) {
  return <ErrorDisplay error={error} onRetry={() => refetch()} />
}
```

---

## 数据刷新

### 手动刷新

```typescript
const { data, refetch } = useQuery(queryOptions)

// 手动触发刷新
const handleRefresh = () => {
  refetch()
}

return (
  <div>
    <Button onClick={handleRefresh}>Refresh</Button>
  </div>
)
```

### 自动刷新

```typescript
const { data } = useQuery({
  ...queryOptions,
  refetchInterval: 5000,              // 每 5 秒自动刷新
  refetchIntervalInBackground: true,  // 后台也刷新
})
```

---

## 变更操作

### 创建数据

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { orpc } from '@/utils/orpc'
import { toast } from 'sonner'

function CreateTeamForm() {
  const queryClient = useQueryClient()
  const { data: session } = useSuspenseQuery(orpc.privateData.queryOptions())

  const organizationId = (session?.user as {
    activeOrganizationId?: string | null
  })?.activeOrganizationId

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!organizationId) throw new Error('No active organization')
      return authClient.organization.createTeam({
        name,
        organizationId,
      })
    },
    onSuccess: () => {
      toast.success('Team created successfully')
      queryClient.invalidateQueries({
        queryKey: ['organization', 'teams', organizationId],
      })
    },
    onError: (error) => {
      toast.error(error.error.message || 'Failed to create team')
    },
  })

  const handleSubmit = (name: string) => {
    createMutation.mutate(name)
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### 更新数据

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'

const updateMutation = useMutation({
  mutationFn: async ({ teamId, name }: { teamId: string; name: string }) => {
    return authClient.organization.updateTeam({
      teamId,
      data: { name },
    })
  },
  onSuccess: () => {
    toast.success('Team updated successfully')
    queryClient.invalidateQueries({
      queryKey: ['organization', 'teams'],
    })
  },
  onError: (error) => {
    toast.error(error.error.message || 'Failed to update team')
  },
})
```

### 删除数据

```typescript
const deleteMutation = useMutation({
  mutationFn: async (teamId: string) => {
    return fetch('/api/organization/delete-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId }),
    })
  },
  onSuccess: () => {
    toast.success('Team deleted successfully')
    queryClient.invalidateQueries({
      queryKey: ['organization', 'teams'],
    })
  },
})

const handleDelete = (teamId: string) => {
  if (confirm('Are you sure?')) {
    deleteMutation.mutate(teamId)
  }
}
```

---

## 数据缓存策略

### 缓存配置

```typescript
const { data } = useQuery({
  queryKey: ['organization', 'teams', organizationId],
  queryFn: async () => {
    return authClient.organization.listTeams({
      query: { organizationId },
    })
  },
  staleTime: 5 * 60 * 1000,      // 5 分钟内认为数据是新的
  gcTime: 10 * 60 * 1000,        // 10 分钟后垃圾回收
})
```

### 缓存失效

```typescript
import { orpc } from '@/utils/orpc'

// 失效特定查询
queryClient.invalidateQueries({
  queryKey: ['organization', 'teams', organizationId],
})

// 失效相关前缀查询
queryClient.invalidateQueries({
  queryKey: ['organization'],
})

// 失效 Session 相关查询
queryClient.invalidateQueries({
  queryKey: orpc.privateData.queryOptions().queryKey,
})
```

### 设置查询数据

```typescript
// 直接设置数据
queryClient.setQueryData(
  ['organization', 'teams', organizationId],
  { teams: newTeams }
)
```

---

## 类型断言说明

由于 Better-Auth 返回类型为 `Data<T>` 包装器，需要进行类型断言：

```typescript
import { authClient } from '@/lib/auth-client'

// 列出成员（带类型断言）
const { data: membersData } = useQuery({
  queryKey: ['organization', 'members', organizationId],
  queryFn: async () => {
    if (!organizationId) return { members: [] }
    return authClient.organization.listMembers({
      query: { organizationId },
    })
  },
})

// 类型断言
const members = (membersData as unknown as
  { members?: unknown[] } | null
)?.members ?? []

const orgs = (orgsData as unknown as
  { id: string; name: string }[] | null
) ?? null
```

---

## 分页和无限滚动

### 分页查询

```typescript
function MembersList() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data } = useQuery({
    queryKey: ['organization', 'members', organizationId, page, limit],
    queryFn: async () => {
      if (!organizationId) return { members: [] }
      return authClient.organization.listMembers({
        query: { organizationId, limit, offset: (page - 1) * limit },
      })
    },
  })

  const members = (data as unknown as { members?: unknown[] } | null)?.members ?? []

  return (
    <div>
      {members.map((member: unknown) => {
        const m = member as { id: string; user: { name: string } }
        return <div key={m.id}>{m.user.name}</div>
      })}
      <Pagination
        currentPage={page}
        totalPages={Math.ceil((data?.total || 0) / limit)}
        onPageChange={setPage}
      />
    </div>
  )
}
```

---

## Session 获取（完整模式）

### 客户端（Client）- 推荐用于组件

```typescript
import { useSuspenseQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'

function MyComponent() {
  const { data: session } = useSuspenseQuery(
    orpc.privateData.queryOptions()
  )

  if (!session) return <div>Not authenticated</div>

  const organizationId = (session?.user as {
    activeOrganizationId?: string | null
  })?.activeOrganizationId

  return <div>Welcome {session.user.name}</div>
}
```

### 服务端（Server）- 推荐用于 loader

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

---

## 反模式

- **不要使用 `authClient.useSession()`** - 此方法不存在，应使用 `orpc.privateData.queryOptions()`
- **不要忽略类型断言** - Better-Auth 返回 `Data<T>` 类型，需要使用类型断言访问数据
- **不要在查询参数中忽略 `query` 包装** - 使用 `{ query: { organizationId } }` 而不是 `{ organizationId }`
- **不要手动调用 `auth.api.*`** - 服务端 API 只能在服务端使用

---

## 相关文档

- **路由系统详解**: [docs/routing.md](./routing.md)
- **认证流程详解**: [docs/authentication.md](./authentication.md)
- **CRUD 模式**: [docs/crud-patterns.md](./crud-patterns.md)
- **UI 交互模式**: [docs/ui-patterns.md](./ui-patterns.md)
- [TanStack Query 文档](https://tanstack.com/query/latest)
- [@orpc/tanstack-query 文档](https://orpc.unnoq.com/docs/integrations/tanstack-query)
