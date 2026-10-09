# Auth 包约定

## 职责与入口

Better Auth 服务端配置，提供邮箱密码认证、会话、组织与团队插件。

- `src/index.ts`：数据库 adapter、插件和组织配置。
- `src/session.ts`：从 Better Auth 解析请求 session 的请求级 lazy getter，供 API 与 TanStack Start 认证入口复用。
- `src/permissions.ts`：资源、角色和访问控制定义。
- 客户端对应 `apps/web/src/lib/auth-client.ts`；HTTP 接入对应 `apps/web/src/routes/api/auth.$.ts`。

## 配置与维护边界

- 会话读取、认证和组织操作使用 Better Auth API，不自行解析 cookie / token 或实现替代 Session。
- session getter 按请求 headers 创建并缓存单次读取结果；不跨请求共享 getter 或 session。
- `src/session.ts` 中的 getter 供 server-only 入口复用；浏览器代码不得导入该模块。
- 修改服务端插件时核对客户端插件、[DB schema](../db/AGENTS.md) 及相关调用方，保持配置与数据模型一致。
- Server Functions 的会话入口见 `apps/web/src/middleware/auth.ts`；业务 RPC 的会话入口见 [API 约定](../api/AGENTS.md)。
- 组织与角色策略的变更需明确方案后实施；权限模型留待专门讨论，维护时以 `src/permissions.ts` 与 Better Auth 配置为准。

## 按需参考

配置、adapter 和插件维护使用 `better-auth-best-practices`；组织、团队和角色使用 `organization-best-practices`；邮箱密码流程使用 `email-and-password-best-practices`；认证安全配置使用 `better-auth-security-best-practices`。具体插件及参数以 `src/index.ts` 为准。
