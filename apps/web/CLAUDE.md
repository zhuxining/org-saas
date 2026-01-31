# Web App 开发指南

## 1. 快速开始

### 1.1 目录结构

```
apps/web/src/
├── routes/              # 文件系统路由
│   ├── (public)/        # 公开页面
│   ├── (auth)/          # 认证流程
│   ├── org/             # 组织端 (登录用户)
│   │   └── -components/ # 组织端共享组件
│   └── __root.tsx       # 根布局
├── components/          # 全局共享组件
│   └── ui/              # shadcn/ui (DO NOT EDIT)
├── middleware/          # 全局中间件
│   └── auth.ts          # 认证中间件
├── functions/           # Server Functions
│   └── ...
├── utils/
│   ├── orpc.ts               # oRPC 客户端
│   └── route-guards.ts       # 路由守卫
└── ...
```

### 1.2 快速索引

| 任务 | 详细文档 |
|------|----------|
| 添加新路由 | → [docs/routing.md](docs/routing.md) |
| 路由守卫和权限 | → [docs/routing.md](docs/routing.md) |
| 数据获取模式 | → [docs/data-loading.md](docs/data-loading.md) |
| CRUD 页面 | → [docs/crud-patterns.md](docs/crud-patterns.md) |
| UI 交互模式 | → [docs/ui-patterns.md](docs/ui-patterns.md) |
| 表单开发 | → [docs/form-patterns.md](docs/form-patterns.md) |
| 添加 UI 组件 | → [docs/shadcn-usage.md](docs/shadcn-usage.md) |
| 认证流程 | → [docs/authentication.md](docs/authentication.md) |

---

## 2. 路由系统

基于 TanStack Router 的文件系统路由，支持权限守卫和数据预加载。

**核心功能**:

- 文件系统路由 - 通过文件结构自动生成路由,运行 `bun run dev` 触发
- 权限守卫 - `requireSession`, `requireActiveOrg`, `requireAdmin`, `requirePermission`, `requireOwner`
- 数据预加载 - `loader` + `useSuspenseQuery` 模式
- oRPC 集成 - 端到端类型安全的 API 调用

**权限守卫**:

文件位置: [src/utils/route-guards.ts](src/utils/route-guards.ts) 和 [src/utils/permission-guards.ts](src/utils/permission-guards.ts)
基础守卫: `requireSession`, `requireActiveOrg`, `requireAdmin`
权限守卫: `requirePermission(resource, actions, redirectTo?)`, `requireOwner(redirectTo?)`

**快速链接**:

- 完整文档 → [docs/routing.md](docs/routing.md)
- 数据加载 → [docs/data-loading.md](docs/data-loading.md)
- 认证流程 → [docs/authentication.md](docs/authentication.md)

---

## 2.1 权限系统

基于细粒度的权限控制系统，支持动态角色和自定义权限。

**权限层次**:

| 层级 | 角色 | 权限范围 |
|------|------|----------|
| **组织级** | Owner (`member.role = "owner"`) | 完全控制组织 |
| | Admin (`member.role = "admin"`) | 管理成员和团队 |
| | Member (`member.role = "member"`) | 只读访问 |

**前端权限守卫**:

文件位置: [src/utils/permission-guards.ts](src/utils/permission-guards.ts)

- `requirePermission(ctx, resource, actions, redirectTo?)` - 要求特定权限
- `requireOwner(ctx, redirectTo?)` - 要求所有者权限

**权限检查流程**: 访问路由 → `requirePermission` 调用 API → 权限不足则重定向

---

## 3. 组件开发

### 核心原则

**数据获取**: loader 预取 + `useSuspenseQuery`

- 在路由 `loader` 中预加载数据
- 组件中使用 `useSuspenseQuery` 获取（无需 loading 状态）

**状态管理**: TanStack Query 统一管理

- 使用 `useMutation` 执行变更操作
- 成功后使用 `invalidateQueries` 刷新数据

**用户反馈**: 每个操作都有反馈

- Toast 通知显示操作结果
- 按钮显示加载状态

**错误处理**: 多层防护

- 边界组件捕获全局错误
- 表单验证提示输入错误
- API 错误通过 Toast 显示

### 详细指南

| 任务 | 详细文档 |
|------|----------|
| CRUD 页面 | [docs/crud-patterns.md](docs/crud-patterns.md) |
| UI 交互 | [docs/ui-patterns.md](docs/ui-patterns.md) |
| 表单开发 | [docs/form-patterns.md](docs/form-patterns.md) |
| UI 组件 | [docs/shadcn-usage.md](docs/shadcn-usage.md) |

### 组件目录

```
src/components/
├── ui/                   # shadcn/ui (auto-generated, DO NOT EDIT)
├── loader.tsx            # Loading spinner
├── sign-in-form.tsx      # Login form
└── ...
```

### 常见陷阱

 **本项目使用 `@base-ui/react`**（非 Radix UI）

- 不支持 `asChild` prop，使用 `render` prop 替代 `asChild`
- 创建包装器时使用 `useRender` + `mergeProps`，`mergeProps` 第一个参数必须是 `{}`
- **重点关注组件**：`collapsible`、`sidebar`、`dropdown-menu`
- 参见 [shadcn-usage.md](docs/shadcn-usage.md#base-ui-组件使用规范)

---

## 4. 代码规范

### 4.1 反模式

**路由相关**:

- 不要在 `src/routes/` 中创建顶级组件 - 使用 `-components/` 子目录
- 不要修改 `routeTree.gen.ts` - 由 `bun run dev`自动生成

**组件相关**:

- 不要编辑 `src/components/ui/*.tsx` 文件 - 使用 shadcn CLI 重新生成
- 不要混合加载状态 - 使用一致的 Skeleton 或 Loader 模式
- 不要跳过 toast 通知 - 始终为 mutations 提供反馈
- 不要忘记查询失效 - 在 mutations 后刷新数据
- 不要使用内联样式 - 使用 Tailwind 类或 shadcn 组件

### 4.2 导入规范

内部导入: `import { orpc } from "@/utils/orpc"`
跨包导入: `import { db } from "@org-sass/db"`

### 4.3 文件命名

- 路由文件: `route.tsx`, `index.tsx`, `$param.tsx`
- 组件文件: PascalCase (`UserProfile.tsx`)
- 工具文件: camelCase (`route-guards.ts`)
- 组件目录: `-components/` (dash 前缀)

---

## 5. 相关文档

### 5.1 Web App 文档

- **路由系统详解**: [docs/routing.md](docs/routing.md)
- **数据加载详解**: [docs/data-loading.md](docs/data-loading.md)
- **CRUD 模式**: [docs/crud-patterns.md](docs/crud-patterns.md)
- **UI 交互模式**: [docs/ui-patterns.md](docs/ui-patterns.md)
- **表单模式**: [docs/form-patterns.md](docs/form-patterns.md)
- **认证流程**: [docs/authentication.md](docs/authentication.md)
- **shadcn/ui 使用**: [docs/shadcn-usage.md](docs/shadcn-usage.md)
- **文档导航**: [docs/README.md](docs/README.md)

### 5.2 包文档

- **API 开发**: [packages/api/CLAUDE.md](../../packages/api/CLAUDE.md)
- **认证流程**: [packages/auth/CLAUDE.md](../../packages/auth/CLAUDE.md)
- **数据库**: [packages/db/CLAUDE.md](../../packages/db/CLAUDE.md)

### 5.3 外部资源

- [Shadcn/ui 文档(使用Base UI)](https://ui.shadcn.com/llms.txt)
- [TanStack Start 文档](https://tanstack.com/start/latest)
- [TanStack Router 文档](https://tanstack.com/router/latest)
- [TanStack Query 文档](https://tanstack.com/query/latest)
- [TanStack Table 文档](https://tanstack.com/table/latest)
- [TanStack Form 文档](https://tanstack.com/form/latest)
