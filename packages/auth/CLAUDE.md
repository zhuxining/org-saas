# Auth 包

基于 Better-Auth 的认证配置，支持邮箱密码登录、多租户组织管理、团队、RBAC 权限控制。

配置详见 `src/index.ts`，插件：`openAPI` + `tanstackStartCookies` + `organization`（团队上限 10 个，动态访问控制）。

## 权限系统（RBAC）

**资源与操作**（`src/permissions.ts`）：

| 资源 | 操作 |
|------|------|
| `project` | `create` / `update` / `delete` / `share` |
| `organization` | `update`（来自 adminAc）|

**内置角色权限**：

| 角色 | project 权限 |
|------|-------------|
| `member` | `create` |
| `admin` | `create`、`update` |
| `owner` | `create`、`update`、`delete` |
| `myCustomRole` | `create`、`update`、`delete` + `organization.update` |

## 使用方式

```typescript
// 服务端
import { auth } from "@org-sass/auth";
const session = await auth.api.getSession({ headers: request.headers });

// 权限检查
const canUpdate = await authClient.organization.hasPermission({
  permission: { project: ["update"] },
});
```

**动态角色**: 可通过 API 动态创建自定义角色，无需修改代码。
