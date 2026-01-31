# API 包

## 概述

类型安全的 oRPC 服务器，基于中间件的认证，同构处理器（SSR + 客户端）。

---

## 结构

```
src/
├── index.ts                         # 主路由导出
├── context.ts                       # oRPC 上下文，包含 session 提取
└── routers/                         # API 端点定义
    ├── index.ts                     # 根路由导出
    └── better-auth-openapi-docs.ts  # Better-Auth OpenAPI Schema 端点
```

---

## 规范

### 过程组合

```typescript
// 无需认证
publicProcedure.handler(() => "OK");

// 需要认证的 session
protectedProcedure.handler(({ context }) => {
  return { user: context.session?.user };
});
```

### 上下文模式

Session 始终可通过 `context.session` 访问：

```typescript
protectedProcedure.handler(({ context }) => {
  if (!context.session?.user) throw new Error("Unauthorized");
  // 访问: context.session.user.id, context.session.user.role
});
```

### 同构处理器

相同的处理程序代码在服务端（SSR）和客户端（API 调用）上运行。

---

## API 端点文档

| API | 文档 |
|-----|------|
| Better-Auth API | [better-auth-api.md](./docs/better-auth-api.md) ,OpenAPI 文档访问 <http://localhost:3001/api/auth/reference> |

---

## 反模式

- **不要跳过 session 检查** - 在受保护的过程中始终验证 `context.session`
- **不要创建自定义过程** - 仅使用 `publicProcedure` 或 `protectedProcedure`
- **不要混合认证模式** - 依赖 Better-Auth session

---

## 独特风格

- **类型安全的 RPC**: 端点定义一次，类型通过 @orpc/client 流向前端
- **基于中间件的认证**: Session 在上下文中提取一次
- **Zod 验证**: 所有输入通过 @orpc/zod 验证

---

## 相关文档

- **权限检查详解**: [docs/authentication.md#权限检查模式](../../docs/authentication.md#权限检查模式)
- **错误处理模式**: [docs/authentication.md#错误处理模式](../../docs/authentication.md#错误处理模式)
