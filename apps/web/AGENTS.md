# Web 应用约定

## 职责与入口

主站使用 TanStack Start / Router，承载公开页面、认证流程、个人中心和组织业务。

| 内容                       | 入口                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| 路由与根布局               | `src/routes/`、`src/routes/__root.tsx`                                         |
| Router 与 QueryClient 集成 | `src/router.tsx`、`src/utils/orpc.ts`                                          |
| 认证客户端与服务端会话     | `src/lib/auth-client.ts`、`src/functions/auth.fn.ts`、`src/middleware/auth.ts` |
| 页面守卫与组织上下文       | `src/utils/guards.ts`、`src/lib/org-context.ts`                                |
| 组织查询配置               | `src/lib/query-options.ts`                                                     |
| 共享业务组件与错误页面     | `src/components/`、`src/components/fallback/`                                  |

修改认证或权限相关代码前，读取 [Auth 约定](../../packages/auth/AGENTS.md)；修改共享 UI 前，读取 [UI 约定](../../packages/ui/AGENTS.md)。

## 路由与服务端边界

- 路由树由 TanStack 工具生成，修改路由源文件，不手工编辑 `src/routeTree.gen.ts`。
- 路由专属组件放在同级 `-components/`，避免被识别为路由；跨页面组件放 `src/components/`。组件文件用 kebab-case，导出名用 PascalCase。
- 保持 SSR / 客户端边界：客户端组件不直接导入数据库、服务端环境变量或认证服务端实现。
- 页面守卫使用现有 `requireSession`、`requireOrgRole`、`requireAdmin`、`requireOwner`；组织路由入口见 `src/routes/org/$orgSlug/route.tsx` 和 `resolveOrgBySlug`。页面守卫不能替代服务端访问检查。
- `src/routes/api/` 负责 oRPC / Better Auth 的 HTTP 接入，业务处理放对应共享包。

## 数据交互与表单

- 业务 RPC 使用 `src/utils/orpc.ts` 提供的 `orpc` / `client`，不在组件中手写 `fetch` 调 RPC；认证及组织插件调用使用 `authClient`。
- 查询与变更复用现有 query options 和查询键；变更成功后更新或失效对应缓存。涉及组织的数据，查询键应包含组织标识。
- 用户操作提供明确的等待、成功和失败反馈；适合即时提示的操作使用 `@org-saas/ui/components/toast`，避免重复提示。
- TanStack Form 的 `validators` 可直接接收 Zod schema。业务 RPC 表单复用可共享的服务端输入 schema；Better Auth 表单遵循对应接口约束。参考 `src/components/sign-in-form.tsx`。
- TanStack Table 的 `data` 和 `columns` 保持稳定引用，按来源使用组件外常量、缓存数据或 `useMemo`，避免每次渲染重新创建。

## UI 与验证

- 组件导入、组合、样式、主题和图标遵循 [UI 约定](../../packages/ui/AGENTS.md)。
- React 19 使用 `ref` prop；保持语义化元素、表单 label、列表稳定 key 和键盘可操作性。
- 完成页面改动后检查相关状态与交互；涉及路由、SSR 或客户端边界时，从仓库根运行 `vp run --filter web build`。
