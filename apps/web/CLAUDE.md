# Web App 开发指南

## 目录结构

```
apps/web/src/
├── routes/              # 文件系统路由（自动生成 routeTree.gen.ts）
│   ├── (public)/        # 公开页面（落地页、定价、关于）
│   │   └── -components/ # 公开页共享组件（header、footer、user-menu）
│   ├── (auth)/          # 认证流程（login）
│   ├── api/             # API 路由（auth/$.ts、rpc/$.ts）
│   └── __root.tsx       # 根布局
├── components/          # 全局共享组件
│   └── fallback/        # 错误边界页面
├── lib/auth-client.ts   # Better-Auth 客户端实例
├── middleware/auth.ts   # 认证中间件
├── functions/           # Server Functions
├── utils/
│   ├── orpc.ts          # oRPC 客户端 + TanStack Query 集成
│   └── guards.ts        # 路由守卫
└── types/orpc.d.ts      # oRPC 类型扩展
```

> UI 组件（shadcn）位于 `packages/ui/`，通过 `@org-sass/ui` 导入。
> 权限系统（RBAC）见 [packages/auth/CLAUDE.md](../../packages/auth/CLAUDE.md)。

## 路由系统

基于 TanStack Router 的文件系统路由，运行 `bun run dev` 触发路由树生成。

> 数据加载（loader + useSuspenseQuery）和 Mutation 模式详见 `tanstack-integration-best-practices` skill。

**权限守卫**（`src/utils/guards.ts`）：`requireSession` | `requireActiveOrganization` | `requireRole(role)` | `requireAdmin` | `requireOwner`

## 反模式

- 不要修改 `routeTree.gen.ts` - 自动生成
- 不要在 `src/routes/` 中创建顶级组件 - 使用 `-components/` 子目录
- 所有 mutation 必须有 Toast 反馈

## 文件命名

- 路由文件: `route.tsx`, `index.tsx`, `$param.tsx`
- 组件文件: kebab-case (`user-profile.tsx`)，与 shadcn/ui 保持一致
- 组件目录: `-components/`（dash 前缀）
- 组件导出名保持 PascalCase（`export function UserProfile`）
