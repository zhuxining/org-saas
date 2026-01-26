# 组织角色权限体系设计文档

本文档详细说明了基于 Better-Auth 的多租户 SaaS 平台的权限体系设计。

---

## 1. 权限架构概述

### 1.1 三层权限模型

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM LAYER (系统级)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  System Admin (user.role = "admin")                   │  │
│  │  - 管理所有组织和用户                                 │  │
│  │  - 创建组织并指定初始 Owner                          │  │
│  │  - ❌ 不能干预组织内部成员管理                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  ORGANIZATION LAYER (组织级)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Owner     │  │  Moderator   │  │   Member     │      │
│  │              │  │              │  │              │      │
│  │ 完全控制     │  │  部分管理    │  │  只读访问    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOM ROLE LAYER (自定义角色)              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Dynamic Roles (Per Organization)                     │  │
│  │  - Project Manager: projects.*                        │  │
│  │  - Billing Admin: billing.view, billing.update        │  │
│  │  - Support Agent: tickets.view, tickets.update        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 角色定义

#### 系统角色

| 角色 | 标识 | 权限范围 |
|------|------|----------|
| **System Admin** | `user.role = "admin"` | 全局系统管理 |
| **普通用户** | `user.role = "user"` 或 `[]` | 仅访问公开页面 |

#### 组织角色

| 角色 | 标识 | 权限范围 |
|------|------|----------|
| **Owner** | `member.role = "owner"` | 完全控制组织 |
| **Moderator** | `member.role = "moderator"` | 管理成员和团队（原 admin） |
| **Member** | `member.role = "member"` | 只读访问 |

**注意**: 组织角色使用 `moderator` 而非 `admin`，以避免与系统管理员混淆。

---

## 2. 权限声明 (Permission Statement)

### 2.1 资源和操作定义

文件位置: [packages/auth/src/permissions.ts](../src/permissions.ts)

```typescript
export const statement = {
  // 组织管理
  organization: ["update", "delete", "manage-settings", "view-analytics"],

  // 成员管理
  member: ["create", "update", "delete", "update-role", "view"],

  // 邀请管理
  invitation: ["create", "cancel", "resend", "view"],

  // 团队管理
  team: ["create", "update", "delete", "view", "manage-members"],

  // 业务领域（可扩展）
  project: ["create", "update", "delete", "view", "share", "archive"],
  billing: ["view", "update", "manage", "export"],
  tickets: ["create", "update", "delete", "view", "assign"],

  // 访问控制管理
  ac: ["create", "update", "delete", "view"],
} as const;
```

### 2.2 默认角色权限

#### Owner 权限

```typescript
owner: ac.newRole({
  organization: ["update", "delete", "manage-settings", "view-analytics"],
  member: ["create", "update", "delete", "update-role", "view"],
  invitation: ["create", "cancel", "resend", "view"],
  team: ["create", "update", "delete", "view", "manage-members"],
  project: ["create", "update", "delete", "view", "share", "archive"],
  billing: ["view", "update", "manage", "export"],
  tickets: ["create", "update", "delete", "view", "assign"],
  ac: ["create", "update", "delete", "view"], // 可创建自定义角色
})
```

#### Moderator 权限

```typescript
moderator: ac.newRole({
  organization: ["update", "manage-settings", "view-analytics"],
  member: ["create", "update", "delete", "view"],
  invitation: ["create", "cancel", "resend", "view"],
  team: ["create", "update", "delete", "view", "manage-members"],
  project: ["create", "update", "delete", "view", "share", "archive"],
  billing: ["view", "update", "export"],
  tickets: ["create", "update", "delete", "view", "assign"],
})
```

**注意**: Moderator **不能**删除组织、管理角色或更改 Owner 角色。

#### Member 权限

```typescript
member: ac.newRole({
  organization: ["view-analytics"],
  member: ["view"],
  team: ["view"],
  project: ["view"],
  billing: ["view"],
  tickets: ["create", "view"],
})
```

---

## 3. Better-Auth 配置

### 3.1 核心配置

文件位置: [packages/auth/src/index.ts](../src/index.ts)

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    tanstackStartCookies(),
    admin(),                    // 系统管理员插件
    organization({
      // ❌ 普通用户不能创建组织
      allowUserToCreateOrganization: false,

      teams: {
        enabled: true,            // 启用团队系统
      },

      // 启用动态访问控制
      dynamicAccessControl: {
        enabled: true,
        maximumRolesPerOrganization: 10,  // 每个组织最多 10 个自定义角色
      },

      // 传递访问控制实例和默认角色
      ac,
      roles: defaultRoles,

      // 自定义角色字段
      schema: {
        organizationRole: {
          additionalFields: {
            description: { type: "string", required: false },
            color: { type: "string", defaultValue: "#6366f1" },
            level: { type: "number", defaultValue: 0 },
            isSystemRole: { type: "boolean", defaultValue: false },
          },
        },
      },
    }),
  ],
});
```

### 3.2 关键配置说明

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `allowUserToCreateOrganization` | `false` | 只有系统管理员可以创建组织 |
| `dynamicAccessControl.enabled` | `true` | 启用自定义角色功能 |
| `maximumRolesPerOrganization` | `10` | 每个组织最多 10 个自定义角色 |
| `ac` | `createAccessControl(statement)` | 访问控制实例 |
| `roles` | `defaultRoles` | 默认角色定义 |

---

## 4. 数据库 Schema

### 4.1 组织角色表

文件位置: [packages/db/src/schema/auth.ts](../../db/src/schema/auth.ts)

```typescript
export const organizationRole = pgTable("organization_role", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  permission: text("permission").notNull(),

  // 自定义字段
  description: text("description"),           // 角色描述
  color: text("color").default("#6366f1"),   // UI 显示颜色
  level: integer("level").default(0),         // 排序级别
  isSystemRole: boolean("is_system_role")     // 系统角色保护
    .default(false)
    .notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("organization_role_organization_id_idx").on(table.organizationId),
]);
```

### 4.2 系统角色保护

- `isSystemRole = true` 的角色不能被修改或删除
- 默认角色（owner, moderator, member）自动标记为系统角色
- 只有 Owner 可以创建自定义角色

---

## 5. API 权限检查

### 5.1 权限工具函数

文件位置: [packages/api/src/lib/permissions.ts](../../api/src/lib/permissions.ts)

#### 核心函数

```typescript
// 检查是否为系统管理员
export function isAdmin(context: Context): boolean

// 要求系统管理员权限
export function requireAdmin(context: Context): void

// 检查组织权限
export async function checkPermission<R extends Resource>(
  context: Context,
  resource: R,
  actions: Action<R>[],
  organizationId?: string,
): Promise<PermissionCheckResult>

// 要求组织权限
export async function requirePermission<R extends Resource>(
  context: Context,
  resource: R,
  actions: Action<R>[],
  organizationId?: string,
): Promise<void>

// 检查是否为组织所有者
export async function isOrganizationOwner(
  context: Context,
  organizationId: string,
): Promise<boolean>

// 要求组织所有者权限
export async function requireOrganizationOwner(
  context: Context,
  organizationId: string,
): Promise<void>
```

### 5.2 使用示例

```typescript
// 在 API 端点中使用
deleteOrganization: protectedProcedure
  .input(z.object({ organizationId: z.string() }))
  .handler(async ({ input, context }) => {
    // 要求组织所有者权限
    await requireOrganizationOwner(context, input.organizationId);

    // 或者要求特定权限
    await requirePermission(context, "organization", ["delete"], input.organizationId);

    // 业务逻辑...
  })
```

---

## 6. 前端权限守卫

### 6.1 路由守卫

文件位置: [apps/web/src/utils/permission-guards.ts](../../../web/src/utils/permission-guards.ts)

```typescript
// 要求权限访问路由
export async function requirePermission(
  ctx: BeforeLoadContext,
  resource: string,
  actions: string[],
  redirectTo = "/org/dashboard",
): Promise<void>

// 要求所有者访问路由
export async function requireOwner(
  ctx: BeforeLoadContext,
  redirectTo = "/org/dashboard",
): Promise<void>
```

### 6.2 使用示例

```typescript
// 在路由中使用
export const Route = createFileRoute("/org/settings")({
  beforeLoad: async (ctx) => {
    const session = await requireActiveOrg(ctx);

    // 要求 organization:update 权限
    await requirePermission(ctx, "organization", ["update"]);
  },
  component: OrgSettings,
});
```

---

## 7. 角色管理 API

### 7.1 端点列表

文件位置: [packages/api/src/routers/roles.ts](../../api/src/routers/roles.ts)

| 端点 | 权限要求 | 说明 |
|------|----------|------|
| `createRole` | `ac.create` | 创建自定义角色 |
| `listRoles` | - | 列出组织角色 |
| `updateRole` | `ac.update` | 更新角色 |
| `deleteRole` | `ac.delete` | 删除角色 |
| `getRole` | - | 获取角色详情 |

### 7.2 自定义角色命名规范

**格式**: `<domain>-<scope>-<level>`

示例:

- `project-manager-full` - 完整项目管理权限
- `billing-admin-restricted` - 限制性账单管理
- `support-agent-tier1` - 一级支持代理
- `content-editor-basic` - 基础内容编辑
- `analytics-viewer` - 只读分析访问

---

## 8. 权限矩阵

### 8.1 组织权限矩阵

| 操作 | Owner | Moderator | Member |
|------|-------|-----------|--------|
| 删除组织 | ✅ | ❌ | ❌ |
| 更新组织设置 | ✅ | ✅ | ❌ |
| 查看分析数据 | ✅ | ✅ | ✅ |
| 添加成员 | ✅ | ✅ | ❌ |
| 移除成员 | ✅ | ✅ | ❌ |
| 更新成员角色 | ✅ | ❌ | ❌ |
| 创建邀请 | ✅ | ✅ | ❌ |
| 取消邀请 | ✅ | ✅ | ❌ |
| 创建团队 | ✅ | ✅ | ❌ |
| 删除团队 | ✅ | ✅ | ❌ |
| 管理团队成员 | ✅ | ✅ | ❌ |
| 创建自定义角色 | ✅ | ❌ | ❌ |
| 查看数据 | ✅ | ✅ | ✅ |

### 8.2 系统权限矩阵

| 操作 | System Admin | Org Owner | Org Moderator | Org Member |
|------|-------------|----------|---------------|------------|
| 创建组织 | ✅ | ❌ | ❌ | ❌ |
| 管理所有用户 | ✅ | ❌ | ❌ | ❌ |
| 管理组织成员 | ❌ | ✅ | ✅ | ❌ |
| 删除组织 | ❌ | ✅ | ❌ | ❌ |

---

## 9. 安全考虑

### 9.1 关键安全规则

1. **系统管理员隔离**: 系统管理员不能干预组织内部成员管理
2. **权限检查顺序**: 权限检查必须在数据库查询之前进行
3. **自我修改保护**: 用户不能修改自己的角色
4. **最后所有者保护**: 不能移除或降级组织的最后一个 Owner
5. **系统角色保护**: 默认角色（owner/moderator/member）不能被修改或删除

### 9.2 权限检查流程

```
请求 → API 路由
        ↓
   protectedProcedure (认证检查)
        ↓
   requirePermission (权限检查)
        ↓
   Better-Auth hasPermission
        ↓
   业务逻辑
```

---

## 10. 类型定义

### 10.1 核心类型

```typescript
// 权限资源类型
export type Resource = keyof PermissionStatement;

// 操作类型
export type Action<R extends Resource> = PermissionStatement[R][number];

// 角色名称
export type RoleName = keyof typeof defaultRoles;

// 权限检查结果
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
}
```

### 10.2 OrgRole 类型

```typescript
// 组织角色类型（API 层）
type OrgRole = "member" | "moderator" | "owner";
```

---

## 11. 迁移指南

### 11.1 从旧系统迁移

如果你之前使用了 `admin` 作为组织角色，需要：

1. **更新数据库**:

   ```sql
   UPDATE member SET role = 'moderator' WHERE role = 'admin';
   ```

2. **更新代码**:
   - 将 `OrgRole` 类型中的 `"admin"` 改为 `"moderator"`
   - 更新所有相关的权限检查

3. **测试验证**:
   - 确认所有权限检查正常工作
   - 验证系统管理员权限隔离

---

## 12. 故障排查

### 12.1 常见问题

**Q: 系统管理员无法访问组织资源？**

A: 这是设计行为。系统管理员只能执行系统级操作（创建组织、管理所有用户），不能干预组织内部管理。

**Q: 如何添加新的权限资源？**

A: 在 `packages/auth/src/permissions.ts` 的 `statement` 中添加新资源和操作，然后在 `defaultRoles` 中配置相应权限。

**Q: 自定义角色数量限制？**

A: 每个组织最多 10 个自定义角色（可通过 `maximumRolesPerOrganization` 配置调整）。

**Q: 如何检查用户权限？**

A: 使用 `checkPermission` 或 `requirePermission` 函数，前端可使用 `requirePermission` 路由守卫。

---

## 13. 相关文档

- **Better-Auth 文档**: [packages/auth/docs/plugin-reference.md](./plugin-reference.md)
- **认证配置**: [packages/auth/CLAUDE.md](../CLAUDE.md)
- **API 权限工具**: [packages/api/CLAUDE.md](../../api/CLAUDE.md)
- **前端路由守卫**: [apps/web/CLAUDE.md](../../../web/src/CLAUDE.md)
