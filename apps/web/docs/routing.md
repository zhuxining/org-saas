# 路由系统详解

## 概述

本文档详细说明了 TanStack Router 文件系统路由的使用方法、权限控制、数据获取模式以及数据处理的最佳实践。

---

## 文件系统路由

### 路由文件定义

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboard
})

function AdminDashboard() {
  return <div>Admin Dashboard</div>
}
```

### 文件组织规范

| 文件类型 | 命名 | 用途 |
|----------|------|------|
| `route.tsx` | - | 导出路由配置 |
| `index.tsx` | - | 目录的默认路由 |
| `$param.tsx` | `$` 前缀 | 动态路由参数 |
| `-components/` | `-` 前缀 | 路由特定的共享组件（非路由） |

### 目录结构示例

```
src/routes/
├── (public)/        # 公开页面
├── (auth)/          # 认证流程
├── admin/           # 管理端 (Admin 权限)
│   └── -components/ # 管理端共享组件
├── org/             # 组织端 (登录用户)
│   └── -components/ # 组织端共享组件
└── __root.tsx       # 根布局
```

---

## 路由分组与权限矩阵

### 权限矩阵

| 路由组 | 访问规则 | 守卫函数 | 未授权处理 |
|--------|----------|----------|------------|
| `(public)/` | 公开访问 | 无 | - |
| `(auth)/` | 登录后访问 | `requireSession` | → /sign-in |
| `admin/*` | 仅 Admin | `requireAdmin` | → /org/dashboard |
| `org/*` | 有活跃组织 | `requireActiveOrganization` | → /org |

### 路由分组说明

- **`(public)/`**: 公开页面 (`/`, `/landing`, `/pricing`, `/about`)
- **`(auth)/`**: 认证流程 (`/sign-in` - 支持 `invitationId` 和 `redirect` 参数)
- **`admin/`**: 管理员界面（仪表板、组织管理、用户管理）
- **`org/`**: 组织成员界面（仪表板、成员管理、团队管理、设置）

### 组织角色层级

| 角色 | 权限 | 权重 |
|------|------|------|
| `owner` | 组织所有者，完全控制权 | 3 |
| `admin` | 组织管理员，可以管理成员、团队、邀请 | 2 |
| `member` | 普通成员，只读访问 | 1 |

**注意**: `requireAdmin` 使用 `minimumRole: true`，所以 admin 和 owner 都可以访问。`requireOwner` 只允许 owner 访问。

### 登录后重定向优先级

1. `redirect` 查询参数
2. 用户角色: Admin → `/admin/dashboard`, User → `/org/dashboard`
3. 默认: `/org/dashboard`

---

## 路由守卫

### 守卫函数使用

```typescript
import { requireSession, requireActiveOrganization, requireAdmin, requireOwner } from '@/utils/guards'

// 要求已登录
export const Route = createFileRoute('/profile')({
  beforeLoad: async ({ context, location }) => {
    await requireSession({ context, location })
  },
  component: Profile,
})

// 要求有活跃组织
export const Route = createFileRoute('/org/dashboard/')({
  beforeLoad: async ({ context, location }) => {
    await requireActiveOrganization({ context, location })
  },
  component: OrgDashboard,
})

// 要求管理员权限（admin 或 owner）
export const Route = createFileRoute('/org/members/')({
  beforeLoad: async ({ context, location }) => {
    await requireAdmin({ context, location })
  },
  component: MembersPage,
})

// 要求 owner 权限
export const Route = createFileRoute('/org/settings/dangerous/')({
  beforeLoad: async ({ context, location }) => {
    await requireOwner({ context, location })
  },
  component: DangerousZone,
})
```

### 守卫行为

| 守卫函数 | 条件 | 行为 |
|----------|------|------|
| `requireSession` | 未登录 | 抛出 `UnauthorizedError` |
| `requireActiveOrganization` | 无活跃组织 | 重定向到 `/org` |
| `requireAdmin` | 非 admin/owner | 抛出 `ForbiddenError` |
| `requireOwner` | 非 owner | 抛出 `ForbiddenError` |

---

## 数据获取模式

### 推荐模式 (TanStack Router + Query 最佳实践)

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'
import { authClient } from '@/lib/auth-client'
import { requireActiveOrganization } from '@/utils/guards'

export const Route = createFileRoute('/org/dashboard/')({
  // 路由级权限守卫
  beforeLoad: async ({ context, location }) => {
    const { activeOrganizationId } = await requireActiveOrganization({
      context,
      location,
    })
    return { activeOrganizationId }
  },

  // 服务端预加载数据
  loader: async ({ context, preloadDate }) => {
    // 预加载 session
    await context.queryClient.ensureQueryData(
      orpc.privateData.queryOptions()
    )

    // 组织相关数据在客户端组件中按需获取
    //（避免在 loader 中调用 authClient，因为它依赖浏览器上下文）
  },

  component: OrgDashboard,
})

function OrgDashboard() {
  // Session 查询（使用 orpc.privateData）
  const { data: session } = useSuspenseQuery(
    orpc.privateData.queryOptions()
  )

  const organizationId = (session?.user as {
    activeOrganizationId?: string | null
  })?.activeOrganizationId

  // 组织成员查询（使用 authClient）
  const { data: membersData } = useSuspenseQuery({
    queryKey: ['organization', 'members', organizationId],
    queryFn: async () => {
      if (!organizationId) return { members: [] }
      return authClient.organization.listMembers({
        query: { organizationId },
      })
    },
  })

  const members = (membersData as unknown as
    { members?: unknown[] } | null
  )?.members ?? []

  return <div>...</div>
}
```

### 客户端 vs 服务端数据获取

| 数据类型 | 客户端 | 服务端 |
|----------|--------|--------|
| **Session** | `useSuspenseQuery(orpc.privateData.queryOptions())` | `await auth.api.getSession({ headers })` 或 `await getSession()` |
| **组织列表** | `authClient.organization.list()` | - |
| **成员列表** | `authClient.organization.listMembers({ query: { organizationId } })` | - |
| **团队列表** | `authClient.organization.listTeams({ query: { organizationId } })` | - |

**注意**: Better-Auth 的 `authClient` 主要用于客户端，组织相关数据应在组件内按需获取。

### 查询失效规范

```typescript
import { orpc } from '@/utils/orpc'

// ✅ 失效 Session 查询
queryClient.invalidateQueries({
  queryKey: orpc.privateData.queryOptions().queryKey,
})

// ✅ 失效组织成员查询
queryClient.invalidateQueries({
  queryKey: ['organization', 'members', organizationId],
})

// ✅ 失效所有组织相关查询
queryClient.invalidateQueries({
  queryKey: ['organization'],
})
```

---

## 组件共置

### 规范

- 路由特定的组件位于相邻的 `-components/` 中
- 命名: TS/JS 文件使用 PascalCase
- 防止跨路由组的命名空间污染

### 规则

- `-components/` 文件夹不会自动注册为路由（dash 前缀）
- 组件应该与使用它的路由放在同一目录下
- 跨路由组共享的组件 → `src/components/`

---

## 动态路由参数

### 基础动态路由

```typescript
// routes/org/teams/$teamId.tsx
export const Route = createFileRoute('/org/teams/$teamId')({
  component: TeamDetail,
})

function TeamDetail() {
  const { teamId } = Route.useParams()
  // 使用 teamId...
}
```

### 可选动态参数

```typescript
// routes/$lang/index.tsx
export const Route = createFileRoute('/$lang/')({
  component: Home,
})

function Home() {
  const { lang } = Route.useParams()
  // lang 可能为 undefined
}
```

### 路由搜索参数

```typescript
function TeamDetail() {
  const { teamId } = Route.useParams()
  const navigate = useNavigate()

  const handleTabChange = (tab: string) => {
    navigate({
      to: '/org/teams/$teamId',
      params: { teamId },
      search: { tab },
    })
  }
}
```

---

## 相关文档

- **数据加载详解**: [docs/data-loading.md](./data-loading.md)
- **CRUD 模式**: [docs/crud-patterns.md](./crud-patterns.md)
- **UI 交互模式**: [docs/ui-patterns.md](./ui-patterns.md)
- **表单模式**: [docs/form-patterns.md](./form-patterns.md)
- [TanStack Router 文档](https://tanstack.com/router/latest)
