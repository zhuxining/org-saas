# API 包

类型安全的 oRPC 服务器，基于中间件的认证，同构处理器（SSR + 客户端）。

## 结构

```
src/
├── index.ts                         # Procedure 导出（publicProcedure、protectedProcedure）
├── context.ts                       # oRPC 上下文（session 提取）
└── routers/
    ├── index.ts                     # 根路由导出
    └── better-auth-openapi-docs.ts  # Better-Auth OpenAPI Schema 端点
```

## 核心用法

```typescript
// 无需认证
publicProcedure.handler(() => "OK");

// 需要认证 - context.session 由中间件保证非空
protectedProcedure.handler(({ context }) => {
  return { userId: context.session.user.id };
});

// 路由定义（输入 Schema 推荐从 DB schema 派生，见「oRPC 约定」；以下为最小示意）
const memberListInput = z.object({ orgId: z.string() });

export const memberRouter = router({
  list: protectedProcedure.input(memberListInput).handler(async ({ context, input }) => {
    /* ... */
  }),
});
```

## oRPC 约定

- **契约优先**：`input` 用 `z` 定义 Schema，经 `implement(contract)` 实现；类型自动从合约推导，无需重复声明。DB schema **应**作为校验唯一权威，合约**宜**经 `drizzle-orm/zod` 派生，避免定义漂移。
- **校验三层**：
  1. DB 层：表约束（`notNull` / `unique` / 默认值）兜底。
  2. API 合约层：`createSelectSchema` / `createInsertSchema` / `createUpdateSchema` 派生 + `refine` 补业务规则。INSERT `.omit({ id, createdAt, updatedAt })`；UPDATE 须 `.extend({ id: z.string() })` 还原主键必填（否则推导为可选，`eq(example.id, id)` 推断 `never`）。
  3. 页面层：表单复用合约 input schema（见 `apps/web` 的 TanStack Form 用法）。
- **错误处理**：抛 `ORPCError`（`BAD_REQUEST` / `UNAUTHORIZED` / `NOT_FOUND`），非 `ORPCError` 自动转 500。**`ORPCError.data` 原样返回客户端，严禁放敏感信息**。

## API 端点

| API             | 访问方式                                   |
| --------------- | ------------------------------------------ |
| Better-Auth API | `http://localhost:3001/api/auth/*`         |
| OpenAPI 文档    | `http://localhost:3001/api/auth/reference` |
| oRPC 端点       | `http://localhost:3001/api/rpc/*`          |

## 反模式

- **不要跳过 session 检查** - `protectedProcedure` 已保证 `context.session` 非空
- **不要创建自定义 procedure** - 仅使用 `publicProcedure` 或 `protectedProcedure`
- **不要混合认证模式** - 统一依赖 Better-Auth session
- **不要在组件裸写 `fetch` 调 RPC** - 统一用 `orpc`（由 `apps/web` 的 oRPC 客户端提供）
