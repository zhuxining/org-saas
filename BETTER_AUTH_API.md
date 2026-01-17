# Better-Auth Based API Implementation

## 概述

基于 Better-Auth 的 admin 和 organization 插件实现的 API 结构。

## API 结构

```
/api/rpc/
├── admin/
│   ├── user.*              # 用户管理 (系统管理员)
│   └── organization.*      # 组织管理 (系统管理员)
└── org/
    ├── organization.*      # 组织操作 (认证用户)
    ├── member.*            # 成员管理 (组织管理员)
    └── invitation.*        # 邀请管理 (组织管理员)
```

## Admin APIs (系统管理员)

### User Management (`/api/rpc/admin/user.*`)

**需要权限:** 系统管理员 (`user.role === "admin"`)

#### `admin.user.listUsers`
列出所有用户
```typescript
input: {
  limit?: number (1-100, default: 20)
  offset?: number (default: 0)
}
```

#### `admin.user.setRole`
设置用户角色
```typescript
input: {
  userId: string
  role: "user" | "admin"
}
```

#### `admin.user.banUser`
封禁用户
```typescript
input: {
  userId: string
  reason?: string
  banExpiresIn?: number  // 秒数
}
```

#### `admin.user.unbanUser`
解除封禁
```typescript
input: {
  userId: string
}
```

#### `admin.user.impersonateUser`
模拟用户登录
```typescript
input: {
  userId: string
}
```

#### `admin.user.stopImpersonating`
停止模拟登录
```typescript
// 无需参数
```

### Organization Management (`/api/rpc/admin/organization.*`)

**需要权限:** 系统管理员

#### `admin.organization.listOrganizations`
列出所有组织及成员
```typescript
input: {
  limit?: number (1-100, default: 20)
  offset?: number (default: 0)
}
```

#### `admin.organization.getOrganization`
获取组织详情
```typescript
input: {
  organizationId: string
}
```

#### `admin.organization.deleteOrganization`
删除组织
```typescript
input: {
  organizationId: string
}
```

## Organization APIs (认证用户)

### Organization Operations (`/api/rpc/org/organization.*`)

**需要权限:** 认证用户

#### `org.organization.createOrganization`
创建组织（创建者自动成为 owner）
```typescript
input: {
  name: string (1-100 chars)
  slug: string (1-50 chars)
  logo?: string (URL)
  metadata?: Record<string, unknown>
}
```

#### `org.organization.updateOrganization`
更新组织信息（需要管理员权限）
```typescript
input: {
  organizationId: string
  name?: string (1-100 chars)
  slug?: string (1-50 chars)
  logo?: string (URL)
  metadata?: Record<string, unknown>
}
```

#### `org.organization.deleteOrganization`
删除组织（需要 owner 权限）
```typescript
input: {
  organizationId: string
}
```

#### `org.organization.getFullOrganization`
获取组织完整信息
```typescript
input: {
  organizationId: string
}
```

#### `org.organization.listOrganizations`
列出当前用户的所有组织
```typescript
// 无需参数
```

#### `org.organization.setActiveOrganization`
设置活跃组织
```typescript
input: {
  organizationId: string
}
```

### Member Management (`/api/rpc/org/member.*`)

**需要权限:** 组织管理员

#### `org.member.addMember`
添加成员
```typescript
input: {
  organizationId: string
  userId: string
  role?: string (default: "member")
}
```

#### `org.member.removeMember`
移除成员
```typescript
input: {
  organizationId: string
  userId: string
}
```

#### `org.member.updateMemberRole`
更新成员角色
```typescript
input: {
  organizationId: string
  userId: string
  role: string
}
```

#### `org.member.listMembers`
列出组织成员
```typescript
input: {
  organizationId: string
}
```

### Invitation Management (`/api/rpc/org/invitation.*`)

**需要权限:** 组织管理员（邀请）/ 认证用户（接受/拒绝）

#### `org.invitation.inviteMember`
邀请成员
```typescript
input: {
  organizationId: string
  email: string
  role?: string (default: "member")
  resend?: boolean
}
```

#### `org.invitation.acceptInvitation`
接受邀请
```typescript
input: {
  invitationId: string
}
```

#### `org.invitation.rejectInvitation`
拒绝邀请
```typescript
input: {
  invitationId: string
}
```

#### `org.invitation.cancelInvitation`
取消邀请
```typescript
input: {
  invitationId: string
}
```

#### `org.invitation.getInvitation`
获取邀请信息
```typescript
input: {
  invitationId: string
}
```

## 权限说明

### 系统管理员 (System Admin)
- `user.role === "admin"`
- 可以管理所有用户和组织
- 可以封禁/解封用户
- 可以模拟任何用户登录
- 可以删除任何组织

### 组织 Owner
- `member.role === "owner"`
- 每个组织只有一个 owner
- 拥有组织的完全控制权
- 可以删除组织
- 可以管理所有成员和权限

### 组织管理员
- `member.role === "admin"`
- 可以管理组织设置
- 可以邀请/移除成员
- 可以修改成员角色（除 owner 外）
- 一个组织可以有多个管理员

### 组织成员
- `member.role === "member"`
- 可以查看组织信息
- 可以查看其他成员
- 基础组织操作权限

## Better-Auth 插件功能

### Admin Plugin
文档: https://www.better-auth.com/docs/plugins/admin

提供的功能:
- 用户角色管理
- 用户封禁/解封
- 用户模拟登录
- 完整的用户管理 API

### Organization Plugin
文档: https://www.better-auth.com/docs/plugins/organization

提供的功能:
- 组织创建和管理
- 成员管理（添加、移除、角色更新）
- 邀请系统（发送、接受、拒绝邀请）
- 活跃组织切换
- 完整的组织管理 API

## 实现文件

```
packages/api/src/routers/
├── admin/
│   ├── index.ts           # Admin router 入口
│   ├── user.ts            # 用户管理 API
│   └── organization.ts    # 组织管理 API (admin)
└── org/
    ├── index.ts           # Org router 入口
    ├── organization.ts    # 组织操作 API
    ├── member.ts          # 成员管理 API
    └── invitation.ts      # 邀请管理 API
```

## 使用示例

### 前端调用

```typescript
// 创建组织
const org = await orpc.org.organization.createOrganization({
  name: "My Organization",
  slug: "my-org",
  logo: "https://example.com/logo.png"
});

// 邀请成员
await orpc.org.invitation.inviteMember({
  organizationId: org.id,
  email: "user@example.com",
  role: "member"
});

// 列出成员
const members = await orpc.org.member.listMembers({
  organizationId: org.id
});

// Admin: 封禁用户
await orpc.admin.user.banUser({
  userId: "user-id",
  reason: "违反服务条款",
  banExpiresIn: 86400 // 24小时
});
```

## 下一步

1. 添加内容管理 API (posts/content)
2. 添加公开访问的 index API
3. 实现 Web 端页面
