# Auth Package

## 概述

Better-Auth configuration with Organization plugin, providing authentication and multi-tenant management for the SaaS platform.

---

## 结构

```
src/
└── index.ts              # Main auth export with plugin configuration
docs/
└── permission-design.md  # Complete permission system documentation
```

---

## 快速查找

| Task | Location |
|------|----------|
| Auth config | src/index.ts |
| Plugin setup | src/index.ts (plugins 数组) |
| Web App 使用 authClient | apps/web/src/lib/auth-client.ts |
| Better-Auth OpenAPI 文档访问 | <http://localhost:3001/api/auth/reference> |
| Better-Auth API 参考文档 | [packages/api/docs/better-auth-api.md](../api/docs/better-auth-api.md) |

---

## 规范

### Better-Auth 配置

核心配置位于 [index.ts](src/index.ts)，包含 Organization 插件。

**关键设置**:

- `allowUserToCreateOrganization: true` - 普通用户可以创建组织
- `teams.enabled: true` - 启用团队系统

### Auth 表

所有 auth 相关表由 Better-Auth **自动生成**，定义在 `packages/db/src/schema/auth.ts`。**不要手动修改**。

---

## Better-Auth 使用方式

### 方式 1: Web App - 使用 `authClient` (推荐)

**位置**: `apps/web/src/lib/auth-client.ts`

**适用场景**: 前端组件中的用户认证操作

```typescript
import { authClient } from "@/lib/auth-client";

// 登录
await authClient.signIn.email({
  email: "user@example.com",
  password: "password",
});

// 登出
await authClient.signOut();

// 获取 session
const { data: session } = await authClient.getSession();
```

### 方式 2: API 接口调用 - 使用 Better-Auth OpenAPI

**适用场景**:

- 通过 API 进行认证和组织管理
- 如mini不支持 `authClient`，则直接调用 Better-Auth API

**文档参考**:

- **基础路径**: `/api/auth`
- **OpenAPI 文档**: `http://localhost:3001/api/auth/reference`
- **文档参考**: [packages/api/docs/better-auth-api.md](../api/docs/better-auth-api.md)

### 调用示例

```typescript
// 直接 fetch 调用
const response = await fetch('/api/auth/change-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    newPassword: 'newPass123',
    currentPassword: 'currentPass123',
  }),
});

const result = await response.json();
```

---

## 核心概念

### 多租户结构

- 一个用户可以属于多个组织
- 每个组织有独立的成员、团队、邀请
- 通过 `activeOrganizationId` 切换当前活动组织

### 角色层级

**组织角色** (member.role):

- `owner`: 组织所有者，完全控制权
- `admin`: 组织管理员
- `member`: 普通成员，只读访问

### 团队系统

- 团队是组织的子集
- 一个用户可以属于多个团队
- 团队用于更精细的权限管理

---

## 插件系统

### 已启用的插件

| 插件 | 功能 |
|------|------|
| OpenAPI | 自动生成 OpenAPI 3.1.1 规范，并提供Better-Auth的 API 端点 |
| TanStack Start Cookies | SSR 友好的 cookie 管理 |
| Organization | 多租户组织管理 + 团队系统 |

#### OpenAPI 插件

**配置**: `src/index.ts`

- **API 调用基础路径**: `/api/auth`
- **OpenAPI 文档**: `http://localhost:3001/api/auth/reference`
- **文档参考**: [packages/api/docs/better-auth-api.md](../api/docs/better-auth-api.md)

---

## 权限系统

分为内置角色与动态自定义角色。

**默认内置角色**: [参考](src/permissions.ts)
**动态自定义角色**: [参考](https://www.better-auth.com/docs/plugins/organization#dynamic-access-control)

---

## 反模式

- **不要修改自动生成的 auth 表** - Better-Auth 管理 schema/auth.ts
- **不要绕过插件权限** - 使用 Better-Auth API，不要手动修改表

---

## 独特风格

- **基于插件的架构**: Organization 插件提供多租户 auth 功能
- **自动生成的 schema**: Auth 表由 Better-Auth 创建和管理
- **TanStack Start 集成**: 使用 `tanstackStartCookies()` 进行 SSR 友好的 session 管理

---

## 注意事项

- Session 在 `packages/api/src/context.ts` 中提取用于 oRPC
- Organization plugin 启用多租户 SaaS 架构

---

## 相关文档

- **Better-Auth 插件参考**: [docs/plugin-reference.md](./docs/plugin-reference.md)
- **API 权限工具**: [/packages/api/CLAUDE.md](/packages/api/CLAUDE.md)
- **前端路由守卫**: [/apps/web/src/CLAUDE.md](/apps/web/CLAUDE.md)
