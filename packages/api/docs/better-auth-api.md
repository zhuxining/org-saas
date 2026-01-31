# Better-Auth API 端点文档

**Better-Auth 版本**: 1.1.0
**OpenAPI 规范**: 3.1.1
**基础路径**: `/api/auth`

---

## 获取 OpenAPI Schema

### oRPC 端点

```typescript
// 获取完整的 Better-Auth OpenAPI Schema
const { data: schema } = await orpc.betterAuthOpenAPIDocs.getOpenAPISchema();
```

### 直接访问

**OpenAPI 文档**: `http://localhost:3001/api/auth/reference`

---

## 端点分类

### 核心认证 (13 个)

| 端点 | 方法 | 功能 | 权限 |
|------|------|------|------|
| `/sign-in/email` | POST | 邮箱密码登录 | 公开 |
| `/sign-up/email` | POST | 邮箱密码注册 | 公开 |
| `/sign-in/social` | POST | 社交提供商登录 | 公开 |
| `/sign-out` | POST | 登出 | 认证 |
| `/get-session` | GET | 获取当前会话 | 认证 |
| `/verify-email` | GET | 验证邮箱 | 公开 (token) |
| `/send-verification-email` | POST | 发送验证邮件 | 公开 |
| `/verify-password` | POST | 验证密码 | 认证 |
| `/reset-password` | POST | 重置密码 | 公开 |
| `/request-password-reset` | POST | 请求密码重置 | 公开 |
| `/change-email` | POST | 修改邮箱 | 认证 |
| `/change-password` | POST | 修改密码 | 认证 |
| `/update-user` | POST | 更新用户信息 | 认证 |
| `/delete-user` | POST | 删除账户 | 认证 |

---

### 会话管理 (4 个)

| 端点 | 方法 | 功能 | 权限 |
|------|------|------|------|
| `/list-sessions` | GET | 列出所有活动会话 | 认证 |
| `/revoke-session` | POST | 撤销指定会话 | 认证 |
| `/revoke-sessions` | POST | 撤销所有会话 | 认证 |
| `/revoke-other-sessions` | POST | 撤销其他会话 | 认证 |

---

### 账户管理 (6 个)

| 端点 | 方法 | 功能 | 权限 |
|------|------|------|------|
| `/list-accounts` | GET | 列出关联账户 | 认证 |
| `/link-social` | POST | 关联社交账户 | 认证 |
| `/unlink-account` | POST | 取消关联账户 | 认证 |
| `/account-info` | GET | 获取提供商账户信息 | 认证 |
| `/get-access-token` | POST | 获取访问令牌 | 认证 |
| `/refresh-token` | POST | 刷新令牌 | 认证 |

---

### 组织管理 (8 个)

| 端点 | 方法 | 功能 | 权限 |
|------|------|------|------|
| `/organization/create` | POST | 创建组织 | 认证 |
| `/organization/update` | POST | 更新组织 | 组织成员 |
| `/organization/delete` | POST | 删除组织 | 组织所有者 |
| `/organization/set-active` | POST | 设置活动组织 | 认证 |
| `/organization/get-full-organization` | GET | 获取完整组织信息 | 组织成员 |
| `/organization/list` | GET | 列出用户组织 | 认证 |
| `/organization/check-slug` | POST | 检查 slug 可用性 | 认证 |
| `/organization/get-active-member` | GET | 获取当前成员信息 | 认证 |

---

### 邀请管理 (6 个)

| 端点 | 方法 | 功能 | 权限 |
|------|------|------|------|
| `/organization/invite-member` | POST | 邀请成员 | 组织管理员 |
| `/organization/cancel-invitation` | POST | 取消邀请 | 组织管理员 |
| `/organization/accept-invitation` | POST | 接受邀请 | 认证 |
| `/organization/reject-invitation` | POST | 拒绝邀请 | 认证 |
| `/organization/get-invitation` | GET | 获取邀请详情 | 公开 (token) |
| `/organization/list-invitations` | GET | 列出邀请 | 组织管理员 |

---

### 辅助端点 (2 个)

| 端点 | 方法 | 功能 |
|------|------|------|
| `/ok` | GET | API 健康检查 |
| `/error` | GET | 显示错误页面 |

---

## 示例 API 请求详情

### 邮箱登录 `/sign-in/email`

**请求**:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true,
  "callbackURL": "http://localhost:3000/dashboard"
}
```

**响应**:

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": false
  },
  "token": "session_token",
  "redirect": false
}
```

---

## 前端调用方式

### 使用 authClient (推荐用于核心认证)

```typescript
import { authClient } from "@/lib/auth-client";

// 登录
await authClient.signIn.email({
  email: "user@example.com",
  password: "password",
});

// 注册
await authClient.signUp.email({
  email: "user@example.com",
  password: "password",
  name: "User Name",
});

// 登出
await authClient.signOut();

// 获取 session
const { data: session } = await authClient.getSession();
```

### 直接调用 Better-Auth API (HTTP)

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

## 数据模型

[Better-Auth 数据模型](../../db/src/schema/auth.ts)

---

## 错误处理

所有端点遵循统一的错误响应格式：

```typescript
// 400 Bad Request
{ "message": "Invalid request data" }

// 401 Unauthorized
{ "message": "Missing or invalid authentication" }

// 403 Forbidden
{ "message": "Insufficient permissions" }

// 404 Not Found
{ "message": "Resource not found" }

// 429 Too Many Requests
{ "message": "Rate limit exceeded" }

// 500 Internal Server Error
{ "message": "An error occurred" }
```

---

## 相关链接

- **Better-Auth 文档**: <https://www.better-auth.com/docs>
- **OpenAPI 插件文档**: <https://www.better-auth.com/docs/plugins/open-api>
- **组织插件文档**: <https://www.better-auth.com/docs/plugins/organization>
