# Better-Auth 插件配置参考

## 概述

本文档详细说明了 Better-Auth 的插件配置、核心功能和 API 使用方法。

**文件**: `packages/auth/src/index.ts`

---

## 核心配置

### 完整配置

```typescript
import { db } from "@org-sass/db";
import * as schema from "@org-sass/db/schema/auth";
import { env } from "@org-sass/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export const auth = betterAuth({
  // 1. 数据库适配器
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),

  // 2. CORS 配置
  trustedOrigins: [env.CORS_ORIGIN],

  // 3. 邮箱密码认证
  emailAndPassword: {
    enabled: true,
  },

  // 4. 插件
  plugins: [
    tanstackStartCookies(),
    organization({
      allowUserToCreateOrganization: false,
      teams: { enabled: true },
    }),
  ],
});
```

---

## 数据库适配器

### Drizzle Adapter

```typescript
database: drizzleAdapter(db, {
  provider: "pg",              // PostgreSQL
  schema: schema,              // Drizzle schema
}),
```

**支持的提供者**:

- `pg` - PostgreSQL
- `mysql` - MySQL
- `sqlite` - SQLite

**Schema 要求**:

- 必须包含 Better-Auth 自动生成的表 (user, session, account, verification)
- Organization 插件会自动添加组织相关表

---

## 认证方法

### 邮箱密码认证

```typescript
emailAndPassword: {
  enabled: true,
  // 可选配置
  requireEmailVerification: false,  // 是否需要邮箱验证
  sendResetPassword: async (url) => {
    // 自定义密码重置邮件发送逻辑
    await sendEmail(url);
  },
  sendVerificationEmail: async (url) => {
    // 自定义验证邮件发送逻辑
    await sendEmail(url);
  },
},
```

**默认启用**: 邮箱密码登录

**API 端点**:

- `signIn.email` - 邮箱密码登录
- `signUp.email` - 邮箱密码注册
- `resetPassword` - 重置密码
- `verifyEmail` - 验证邮箱

---

## 插件系统

### 1. TanStack Start Cookies 插件

**导入**: `import { tanstackStartCookies } from "better-auth/tanstack-start"`

**作用**: 为 TanStack Start SSR 提供优化的 cookie 管理

**功能**:

- 自动处理 SSR 环境下的 cookie 读写
- 支持 HTTP-only session cookie
- 与 TanStack Start 的请求上下文集成

**无需配置**，直接添加到 plugins 数组即可。

---

### 2. Organization 插件

**导入**: `import { organization } from "better-auth/plugins/organization"`

**配置**:

```typescript
organization({
  // 只有系统管理员可以创建组织
  allowUserToCreateOrganization: false,

  // 启用团队功能
  teams: {
    enabled: true,
  },
})
```

**功能**:

| 功能 | 说明 |
|------|------|
| **多租户架构** | 用户可以属于多个组织，通过 `activeOrganizationId` 切换 |
| **角色层级** | owner > admin > member |
| **团队系统** | 组织可以创建团队，成员可以属于多个团队 |
| **邀请系统** | 通过邮箱邀请用户加入组织 |

**添加的 Schema 字段** (`session` 表):

```typescript
{
  activeOrganizationId: text("active_organization_id"),
  activeTeamId: text("active_team_id"),
}
```

**添加的表**:

| 表名 | 说明 |
|------|------|
| `organization` | 组织表 |
| `member` | 组织成员关系表 |
| `invitation` | 邀请表 |
| `team` | 团队表 |
| `teamMember` | 团队成员关系表 |

**API 端点**:

| 分类 | 端点 |
|------|------|
| 组织管理 | `createOrganization`, `listOrganizations`, `getFullOrganization`, `updateOrganization`, `deleteOrganization`, `setActiveOrganization` |
| 成员管理 | `addMember`, `removeMember`, `listMembers`, `updateMemberRole`, `getActiveMember` |
| 邀请管理 | `createInvitation`, `acceptInvitation`, `rejectInvitation`, `cancelInvitation`, `getInvitation`, `listInvitations` |
| 团队管理 | `createTeam`, `updateTeam`, `removeTeam`, `listTeams`, `addTeamMember`, `removeTeamMember` |

**详细文档**: [packages/api/docs/org-api.md](../../api/docs/better-auth-api.md)

---

### 3. OpenAPI 插件

**导入**: `import { openAPI } from "better-auth/plugins"`

**作用**: 自动生成 OpenAPI 3.1.1 规范文档，提供交互式 API 文档

**配置**:

```typescript
export const auth = betterAuth({
  plugins: [
    openAPI(),  // 默认配置即可
  ],
});
```

**可选配置**:

```typescript
openAPI({
  path: "/api/auth",              // API 基础路径 (默认: "/api/auth")
  disableDefaultReference: false, // 是否禁用默认文档 (默认: false)
  theme: "default",               // 主题: "default" | "moon" | "forest"
})
```

**功能特性**:

| 功能 | 说明 |
|------|------|
| **自动生成 OpenAPI 3.1.1 规范** | 包含所有插件端点的完整文档 (39 个端点) |
| **Scalar UI 集成** | 美观的交互式 API 文档界面 |
| **Schema 导出** | 可导出 JSON 格式的 OpenAPI 规范 |

**可用端点**:

| 端点 | 功能 |
|------|------|
| `GET /api/auth/reference` | 交互式 API 文档（Scalar UI） |
| `GET /api/auth/open-api/generate-schema` | 获取 OpenAPI Schema JSON |

**使用方式**:

| 方式 | 适用场景 | 示例 |
|------|---------|------|
| **Web App - authClient** | 前端组件中的认证操作 | `authClient.signIn.email()` |
| **OpenAPI Schema** | 查看所有端点、集成第三方工具 | `orpc.betterAuthOpenAPIDocs.getOpenAPISchema()` |

**相关文档**:

- [Better-Auth API 端点文档](../../../api/docs/better-auth-api.md) - 完整的 39 个端点参考
- [Better-Auth 官方文档](https://www.better-auth.com/docs/plugins/open-api)

---

## 核心 API

### Session 管理

**获取 Session**:

```typescript
// 服务端
const session = await auth.api.getSession({
  headers: request.headers,
});

// 检查是否登录
if (!session) {
  throw redirect({ to: "/login" });
}
```

**Session 结构**:

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    activeOrganizationId: string; // ⚠️ 运行时存在，类型定义缺失
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress: string | null;
    userAgent: string | null;
  };
}
```

---

### 认证 API

**登录**:

```typescript
await auth.api.signIn.email({
  body: {
    email: "user@example.com",
    password: "password",
  },
});
```

**注册**:

```typescript
await auth.api.signUp.email({
  body: {
    email: "user@example.com",
    password: "password",
    name: "John Doe",
  },
});
```

**登出**:

```typescript
await auth.api.signOut({
  headers: request.headers,
});
```

---

### 组织 API

**创建组织**:

```typescript
await auth.api.createOrganization({
  body: {
    name: "Acme Corp",
    slug: "acme-corp",
    logo: "https://example.com/logo.png",
  },
  headers: request.headers,
});
```

**切换活动组织**:

```typescript
await auth.api.setActiveOrganization({
  body: {
    organizationId: "org-123",
  },
  headers: request.headers,
});
```

**列出成员**:

```typescript
const members = await auth.api.listMembers({
  query: {
    organizationId: "org-123",
  },
  headers: request.headers,
});
```

---

## 环境变量

**文件**: `.env` 或 `packages/env/src/env.ts`

```typescript
CORS_ORIGIN: string;  // CORS 允许的源
DATABASE_URL: string; // PostgreSQL 连接字符串
```

**示例**:

```env
CORS_ORIGIN=http://localhost:3001
DATABASE_URL=postgresql://localhost:5432/org_saas
```

---

## 类型问题处理

### activeOrganizationId 类型缺失

**问题**: `session.user.activeOrganizationId` 在运行时存在，但 TypeScript 类型定义中缺失。

**解决方案**: 始终使用可选链

```typescript
// ❌ TypeScript 报错
const orgId = session.user.activeOrganizationId;

// ✅ 正确方式
const orgId = session?.user?.activeOrganizationId || "";

// ✅ 类型断言 (不推荐，但在某些场景有用)
const orgId = (session.user as any).activeOrganizationId || "";
```

---

## 中间件集成

### TanStack Start 集成

**文件**: `apps/web/src/server/auth.ts`

```typescript
import { auth } from "@org-sass/auth";
import { redirect } from "@tanstack/react-router";

export async function requireAuth({ context }: { context: RouterAppContext }) {
  const session = await auth.api.getSession({
    headers: context.req.headers,
  });

  if (!session) {
    throw redirect({
      to: "/login",
      search: { redirect: window.location.href },
    });
  }

  return session;
}

}

---

## 相关文档

- **认证流程详解**: [docs/authentication.md](../../../docs/authentication.md)
- **组织数据模型**: [docs/organization-model.md](../../../docs/organization-model.md)
- **Better-Auth 官方文档**: [https://www.better-auth.com/docs](https://www.better-auth.com/docs)
