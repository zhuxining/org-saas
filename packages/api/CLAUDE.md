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

// 路由定义
export const memberRouter = router({
  list: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .handler(async ({ context, input }) => { /* ... */ }),
});
```

## API 端点

| API | 访问方式 |
|-----|---------|
| Better-Auth API | `http://localhost:3001/api/auth/*` |
| OpenAPI 文档 | `http://localhost:3001/api/auth/reference` |
| oRPC 端点 | `http://localhost:3001/api/rpc/*` |

## 反模式

- **不要跳过 session 检查** - `protectedProcedure` 已保证 `context.session` 非空
- **不要创建自定义 procedure** - 仅使用 `publicProcedure` 或 `protectedProcedure`
- **不要混合认证模式** - 统一依赖 Better-Auth session
