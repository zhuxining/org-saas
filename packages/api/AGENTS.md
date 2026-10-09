# API 包约定

## 职责与入口

提供业务 oRPC 路由，支持 HTTP 客户端调用与 SSR 服务端直接调用。

- `src/context.ts`：从请求 headers 提取 Better Auth 会话。
- `src/index.ts`：公共 procedure、认证中间件、限流和日志能力。
- `src/routers/index.ts`：组合业务路由；各子路由实现具体业务。
- HTTP 接入位于 `apps/web/src/routes/api/rpc.$.ts`；同构客户端位于 `apps/web/src/utils/orpc.ts`。

认证配置遵循 [Auth 约定](../auth/AGENTS.md)，数据库访问遵循 [DB 约定](../db/AGENTS.md)。

## Procedure 与访问边界

- 无需登录的接口使用 `publicProcedure`；需要登录的接口使用 `protectedProcedure`；需要用户级限流时使用 `rateLimitedProcedure`。
- 复用现有 procedure 和中间件。新增公共访问策略时集中定义，不在路由内复制会话解析或绕过 Better Auth。
- `protectedProcedure` 仅保证会话存在。涉及组织的数据，仍需在服务端验证目标组织的访问资格，并将查询限制在该组织范围内；参考 `src/routers/dashboard.ts`。
- SSR 与 HTTP 调用使用同一业务处理器，保留相同的输入校验和访问检查。

## 输入与错误

- 当前使用 router-first：通过 `.input(zodSchema).handler()` 定义接口，类型由路由推导；参考 `src/routers/user.ts`。
- 契约优先和从 DB schema 派生输入校验是待确认的设计方向。日常维护和新增接口沿用现有模式；切换为 `implement(contract)` 或统一派生校验前确认架构方案。
- 输入 schema 表达接口允许的字段和业务限制，不能直接把完整数据库模型作为可写输入。共享 schema 时保持浏览器可用，避免引入服务端依赖。
- 页面可以复用可共享的输入 schema，但服务端 `.input()` 校验始终保留。
- 预期业务错误抛 `ORPCError`，使用准确的错误码；未知异常按服务端错误处理。
- `ORPCError.data` 会返回客户端，仅包含可公开信息，不放 token、凭证、内部查询或敏感数据。

## 验证

新增或修改接口时，检查有效输入、无效输入、未登录及适用的跨组织访问场景；关键逻辑按根约定补充相关测试。
