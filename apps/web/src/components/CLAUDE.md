# Components Directory

## 概述

Shared React components for the web application, including custom business components and shadcn/ui design system components.

---

## 结构

```
src/components/
├── ui/                   # shadcn/ui components (auto-generated, DO NOT EDIT)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   └── ...
├── loader.tsx            # Loading spinner component
├── sign-in-form.tsx      # Login form with redirect logic
├── sign-up-form.tsx      # Registration form
├── user-menu.tsx         # User dropdown menu
├── nav-user.tsx          # User navigation component
└── nav-main.tsx          # Main navigation component
```

---

## 快速查找

| Task | Location |
|------|----------|
| UI components | ui/\*.tsx |
| Forms | sign-in-form.tsx, sign-up-form.tsx |
| Navigation | nav-main.tsx, nav-user.tsx, user-menu.tsx |

---

## 规范

### UI Components (shadcn/ui)

**不要编辑 `ui/` 目录中的文件** - 这些文件由 shadcn CLI 自动生成。

添加新 UI 组件：

```bash
bunx shadcn@latest add [component-name]
```

**已使用的 shadcn/ui 组件**:

- `button`, `card`, `input`, `label`, `select`
- `dialog`, `sheet`, `sidebar`, `collapsible`
- `table`, `breadcrumb`, `separator`
- `avatar`, `badge`, `tooltip`, `dropdown-menu`
- `skeleton` (for loading states)
- `sonner` (toast notifications)

---

## 组件模式概要

### CRUD 页面模式

**关键要点**:

- 使用 `useQuery` 获取数据，`queryOptions()` 提供类型安全
- 使用 `useMutation` 执行变更，`mutationOptions()` 处理成功/错误
- 成功后使用 `invalidateQueries` 刷新数据
- 使用 `toast` (Sonner) 显示操作结果
- 使用 `Skeleton` 组件显示加载状态

**详细示例**: [docs/component-patterns.md#crud-页面模式](../../../../docs/component-patterns.md#crud-页面模式)

### 表单模式

- 使用 `@tanstack/react-form` 管理表单状态
- 使用 `zod` 定义验证规则
- 使用 `form.Field` 渲染表单字段
- 使用 `form.Subscribe` 订阅表单状态
- 禁用提交按钮：`!state.canSubmit || state.isSubmitting`

**详细示例**: [docs/form-patterns.md](../../docs/form-patterns.md)

### 数据加载模式

- 定义可复用的 `queryOptions`
- 使用 `Skeleton` 组件显示加载状态
- 处理错误状态并提供重试功能

**详细示例**: [docs/data-loading.md](../../docs/data-loading.md)

### Toast 通知模式

- 使用 `toast.success()`, `toast.error()`, `toast.info()`
- 支持带操作的通知
- 支持 Promise 状态自动处理

**详细示例**: [docs/component-patterns.md#toast-通知模式](../../../../docs/component-patterns.md#toast-通知模式)

### 对话框模式

- 使用 `Dialog`, `DialogContent`, `DialogTrigger` 组件
- 支持创建/编辑对话框和删除确认对话框

**详细示例**: [docs/component-patterns.md#对话框模式](../../../../docs/component-patterns.md#对话框模式)

### Session 获取模式

- 使用 `authClient.useSession()` 在组件中获取 session
- 使用 `orpc.privateData.query()` 在路由 loader 中获取

**详细示例**: [docs/data-loading.md#session-获取](../../docs/data-loading.md#session-获取)

---

## 反模式

- **不要编辑 ui/\*.tsx 文件** - 使用 shadcn CLI 重新生成
- **不要混合加载状态** - 使用一致的 Skeleton 或 Loader 模式
- **不要跳过 toast 通知** - 始终为 mutations 提供反馈
- **不要忘记查询失效** - 在 mutations 后刷新数据
- **不要使用内联样式** - 使用 Tailwind 类或 shadcn 组件

---

## 独特风格

- **shadcn/ui 集成**: 设计系统组件由 CLI 自动生成
- **TanStack Form**: 类型安全的表单与 Zod 验证
- **TanStack Query**: 数据获取与自动刷新
- **Sonner**: 支持 Promise 处理的 Toast 通知

---

## 注意事项

- UI 组件使用 TailwindCSS 样式
- 所有组件支持暗色模式 (通过 shadcn/ui)
- 表单使用 Zod 进行客户端验证
- 查询通过 oRPC 类型安全

---

## 相关文档

- **组件模式详解**: [docs/component-patterns.md](../../../../docs/component-patterns.md)
- **表单模式详解**: [docs/form-patterns.md](../../docs/form-patterns.md)
- **数据加载详解**: [docs/data-loading.md](../../docs/data-loading.md)
- **shadcn/ui 组件**: [https://ui.shadcn.com/](https://ui.shadcn.com/)
