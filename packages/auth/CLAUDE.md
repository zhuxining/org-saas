# Auth Package

## 概述

Better-Auth configuration with Admin and Organization plugins, providing authentication and multi-tenant management for the SaaS platform.

---

## 结构

```
src/
├── index.ts              # Main auth export with plugin configuration
└── permissions.ts        # Permission statements and role definitions
docs/
└── permission-design.md  # Complete permission system documentation
```

---

## 快速查找

| Task | Location |
|------|----------|
| Auth config | index.ts |
| Permission definitions | permissions.ts |
| Plugin setup | index.ts |
| Session schema | Auto-generated |
| Permission system design | docs/permission-design.md |

---

## 规范

### Better-Auth 配置

核心配置位于 [index.ts](src/index.ts)，包含 Admin 和 Organization 插件。

**关键设置**:
- `allowUserToCreateOrganization: false` - 仅系统管理员可创建组织
- `dynamicAccessControl.enabled: true` - 启用自定义角色功能
- `maximumRolesPerOrganization: 10` - 每个组织最多 10 个自定义角色

### Auth 表

所有 auth 相关表由 Better-Auth **自动生成**，定义在 `packages/db/src/schema/auth.ts`。**不要手动修改**。

---

## 核心概念

### 多租户结构

- 一个用户可以属于多个组织
- 每个组织有独立的成员、团队、邀请
- 通过 `activeOrganizationId` 切换当前活动组织

### 角色层级

**系统角色**:

- `admin` (user.role): 系统管理员，全局权限
- `user` (user.role): 普通用户

**组织角色** (member.role):

- `owner`: 组织所有者，完全控制权
- `moderator`: 组织管理员（避免使用 "admin" 以区分系统管理员）
- `member`: 普通成员，只读访问

**重要**: 组织角色使用 `moderator` 而非 `admin`，以避免与系统管理员混淆。

### 团队系统

- 团队是组织的子集
- 一个用户可以属于多个团队
- 团队用于更精细的权限管理

### 自定义角色

- 组织可以创建自定义角色（Owner 权限）
- 每个组织最多 10 个自定义角色
- 使用 Dynamic Access Control 实现细粒度权限
- 系统角色（owner/moderator/member）不能被修改或删除

---

## 权限系统

详细权限设计请参考: [docs/permission-design.md](./docs/permission-design.md)

**权限资源**:

- `organization`: 组织管理（update, delete, manage-settings, view-analytics）
- `member`: 成员管理（create, update, delete, update-role, view）
- `invitation`: 邀请管理（create, cancel, resend, view）
- `team`: 团队管理（create, update, delete, view, manage-members）
- `project`, `billing`, `tickets`: 业务领域（可扩展）
- `ac`: 访问控制管理（create, update, delete, view）

**默认角色**:

- **Owner**: 完全控制，包括删除组织和管理角色
- **Moderator**: 管理成员和团队（除删除组织和管理角色外）
- **Member**: 只读访问

**自定义角色命名格式**: `<domain>-<scope>-<level>`（如 `project-manager-full`）

---

## 已知类型问题

### activeOrganizationId

运行时由 Better-Auth 动态添加，但 TypeScript 类型缺失。**始终使用可选链**: `session?.user?.activeOrganizationId`

### Better-Auth 类型不完整

部分 API 返回类型不完整，需要使用 `as any` 并添加 `// biome-ignore lint/suspicious/noExplicitAny: <better-auth>` 注释

---

## 反模式

- **不要修改自动生成的 auth 表** - Better-Auth 管理 schema/auth.ts
- **不要绕过插件权限** - 使用 Better-Auth API，不要手动修改表
- **不要硬编码角色检查** - 使用 `context.session?.user?.role?.includes("admin")`
- **不要忽略 activeOrganizationId 类型问题** - 始终使用可选链
- **不要混淆系统 admin 和组织 moderator** - 系统管理员不干预组织内部管理

---

## 独特风格

- **基于插件的架构**: Admin 和 Organization 插件提供完整的 auth 功能
- **自动生成的 schema**: Auth 表由 Better-Auth 创建和管理
- **TanStack Start 集成**: 使用 `tanstackStartCookies()` 进行 SSR 友好的 session 管理
- **Dynamic Access Control**: 使用 Better-Auth 的访问控制系统实现细粒度权限

---

## 注意事项

- Session 在 `packages/api/src/context.ts` 中提取用于 oRPC
- Admin plugin 启用跨组织用户管理
- Organization plugin 启用多租户 SaaS 架构
- `allowUserToCreateOrganization: false` - 只有系统管理员可以创建组织
- 系统管理员**不能**访问组织内部资源（设计要求）

---

## 相关文档

- **权限系统设计**: [docs/permission-design.md](./docs/permission-design.md)
- **Better-Auth 插件参考**: [docs/plugin-reference.md](./docs/plugin-reference.md)
- **认证流程详解**: [docs/authentication.md](../../docs/authentication.md)
- **组织数据模型**: [docs/organization-model.md](../../docs/organization-model.md)
- **API 权限工具**: [../../api/CLAUDE.md](../../api/CLAUDE.md)
- **前端路由守卫**: [../../../web/src/CLAUDE.md](../../../web/src/CLAUDE.md)
