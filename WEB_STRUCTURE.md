# Web Pages Structure

## 概述

在 `apps/web` 中建立了相应的 admin 和 org 功能页面。

## 文件结构

```
apps/web/src/routes/
├── admin/
│   ├── _layout.tsx              # Admin 布局页面（需要 admin 权限）
│   └── _layout/
│       ├── index.tsx            # Admin 概览页面
│       ├── users.tsx            # 用户管理页面
│       └── organizations.tsx    # 组织管理页面
└── org/
    ├── _layout.tsx              # Organization 布局页面（需要登录）
    └── _layout/
        ├── index.tsx            # 我的组织列表
        └── create.tsx           # 创建组织页面
```

## Admin 页面

### 路由权限控制
所有 admin 路由都在 `admin/_layout.tsx` 中检查权限：
- 用户必须已登录
- 用户角色必须是 `admin`
- 否则重定向到首页

### 功能页面

#### 1. Admin Overview (`/admin`)
- 显示系统统计信息
- 总用户数、总组织数、活跃会话数
- 最近活动记录

#### 2. Users Management (`/admin/users`)
功能：
- ✅ 列出所有用户（分页）
- ✅ 封禁/解封用户
- ✅ 设置用户角色（user/admin）
- ✅ 实时更新和 Toast 提示

使用的 API：
- `orpc.admin.user.listUsers` - 获取用户列表
- `orpc.admin.user.banUser` - 封禁用户
- `orpc.admin.user.unbanUser` - 解封用户
- `orpc.admin.user.setRole` - 设置角色

#### 3. Organizations Management (`/admin/organizations`)
功能：
- ✅ 列出所有组织（分页）
- ✅ 查看组织成员数量
- ✅ 删除组织（带确认）
- ✅ 实时更新和 Toast 提示

使用的 API：
- `orpc.admin.organization.listOrganizations` - 获取组织列表
- `orpc.admin.organization.deleteOrganization` - 删除组织

## Organization 页面

### 路由权限控制
所有 org 路由都在 `org/_layout.tsx` 中检查权限：
- 用户必须已登录
- 否则重定向到登录页面

### 功能页面

#### 1. My Organizations (`/org`)
功能：
- ✅ 显示当前用户的所有组织
- ✅ 卡片式布局展示组织
- ✅ 快速访问组织详情和设置
- ✅ 空状态引导创建首个组织

使用的 API：
- `orpc.org.organization.listOrganizations` - 获取我的组织列表

#### 2. Create Organization (`/org/create`)
功能：
- ✅ 创建新组织表单
- ✅ 验证组织名称和 slug
- ✅ 可选上传 logo
- ✅ 创建后自动成为 owner
- ✅ 创建成功后跳转回组织列表

使用的 API：
- `orpc.org.organization.createOrganization` - 创建组织

表单字段：
- **Organization Name** (必填): 组织名称，1-100 字符
- **Slug** (必填): 组织 slug，小写字母、数字和连字符
- **Logo URL** (可选): 组织 logo 的 URL

## UI 组件

使用的 shadcn/ui 组件：
- `Button` - 按钮
- `Card` - 卡片容器
- `Table` - 数据表格
- `Input` - 输入框
- `Label` - 表单标签
- `toast` (sonner) - 提示消息

## 数据流

### Admin 用户管理流程
```
1. 页面加载 → useQuery 获取用户列表
2. 点击操作按钮 → useMutation 执行操作
3. 操作成功 → invalidateQueries 刷新数据 + toast 提示
4. 自动重新获取最新数据
```

### Organization 创建流程
```
1. 填写表单 → 验证输入
2. 提交表单 → useMutation 创建组织
3. 创建成功 → invalidateQueries 刷新组织列表
4. navigate 跳转到组织列表页面
5. 显示成功 toast
```

## 待实现功能

### Admin 页面
- [ ] 用户详情页面
- [ ] 组织详情页面
- [ ] 批量操作
- [ ] 高级搜索和过滤
- [ ] 数据导出

### Organization 页面
- [ ] 组织详情页面 (`/org/:id`)
- [ ] 组织设置页面 (`/org/:id/settings`)
- [ ] 成员管理页面 (`/org/:id/members`)
- [ ] 邀请管理页面 (`/org/invitations`)
- [ ] 更新组织信息
- [ ] 删除组织
- [ ] 成员邀请和管理

## 路由示例

### Admin 路由
- `/admin` - Admin 概览
- `/admin/users` - 用户管理
- `/admin/organizations` - 组织管理

### Organization 路由
- `/org` - 我的组织
- `/org/create` - 创建组织
- `/org/invitations` - 邀请管理 (待实现)
- `/org/:id` - 组织详情 (待实现)
- `/org/:id/settings` - 组织设置 (待实现)
- `/org/:id/members` - 成员管理 (待实现)

## 技术栈

- **Router**: TanStack Router (文件路由)
- **State**: TanStack Query (服务器状态)
- **API**: oRPC (类型安全的 RPC)
- **UI**: shadcn/ui + TailwindCSS
- **Forms**: React hooks
- **Toast**: sonner

## 开发建议

### 添加新页面
1. 在对应文件夹下创建 `.tsx` 文件
2. 使用 `createFileRoute` 创建路由
3. 添加权限检查（如需要）
4. 使用 oRPC 调用 API
5. 处理加载、错误和成功状态

### 调用 API
```typescript
// Query (获取数据)
const data = useQuery(orpc.admin.user.listUsers.queryOptions({
  limit: 50,
  offset: 0,
}));

// Mutation (修改数据)
const mutation = useMutation({
  mutationFn: async (params) => {
    return orpc.admin.user.banUser(params);
  },
  onSuccess: () => {
    queryClient.invalidateQueries(orpc.admin.user.listUsers.queryKey());
    toast.success("Success!");
  },
});
```

## 下一步

1. 实现组织详情和设置页面
2. 添加成员管理功能
3. 实现邀请系统界面
4. 添加内容管理功能
5. 优化 UI/UX
6. 添加加载骨架屏
7. 添加错误边界
