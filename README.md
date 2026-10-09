# Org SaaS

基于 Better-T-Stack 技术栈构建的多组织 SaaS 平台，采用 Bun Workspaces 管理的 Monorepo 架构。

## 项目定位

多组织 SaaS 平台，支持三种用户角色和访问端点：

| 端点       | 说明                         | 权限                        |
| ---------- | ---------------------------- | --------------------------- |
| **Admin**  | 系统管理员管理所有组织和用户 | 全局权限                    |
| **Org**    | 组织成员管理团队、成员、邀请 | Owner/Admin/Member 三级权限 |
| **Public** | 公开访问页面（落地页、关于） | 无需认证                    |

## 技术栈

- **TanStack Start** - SSR 框架 + TanStack Router
- **React 19** - UI 框架
- **TailwindCSS 4** - 样式框架
- **shadcn/ui** - 可复用 UI 组件
- **oRPC** - 端到端类型安全 API
- **Better-Auth** - 认证系统（Admin + Organization 插件）
- **Drizzle ORM** - TypeScript-first ORM
- **PostgreSQL** - 数据库
- **vite-plus (vp check)** - 代码检查 (lint / 格式化 / 类型检查)
- **Bun Workspaces** - Monorepo 管理

## 快速开始

### 1. 安装依赖

```bash
vp install
```

### 2. 数据库设置

1. 确保 PostgreSQL 数据库已就绪
2. 在 `apps/web/.env` 中配置数据库连接字符串
3. 推送 schema 到数据库：

```bash
vp run db:push
```

### 3. 启动开发服务器

```bash
vp run dev
```

访问 [http://localhost:3001](http://localhost:3001) 查看应用。

## 项目结构

```
org-saas/
├── apps/
│   └── web/              # 主站应用 (TanStack Start SSR)
└── packages/
    ├── api/              # oRPC API 层
    ├── auth/             # Better-Auth 配置
    ├── db/               # 数据库模型和 Drizzle ORM
    ├── config/           # 共享配置
    └── env/              # 环境变量类型
```

## 详细文档

| 主题             | 文档                                                        |
| ---------------- | ----------------------------------------------------------- |
| **架构设计**     | [服务架构、数据通道与权限设计](docs/design/architecture.md) |
| **Web App 开发** | [apps/web/CLAUDE.md](apps/web/AGENTS.md)                    |
| **API 开发**     | [packages/api/CLAUDE.md](packages/api/AGENTS.md)            |
| **认证流程**     | [packages/auth/CLAUDE.md](packages/auth/AGENTS.md)          |
| **数据库**       | [packages/db/CLAUDE.md](packages/db/AGENTS.md)              |

## 常用命令

### 开发和构建

```bash
vp run dev              # 启动所有应用
vp run dev:web          # 仅启动 Web 应用
vp run build            # 构建所有应用
```

### 数据库操作

```bash
vp run db:push          # 推送 schema (开发环境)
vp run db:studio        # 打开 Drizzle Studio
vp run db:generate      # 生成迁移文件
vp run db:migrate       # 执行已有迁移
```

### 代码质量

```bash
vp run check            # 代码检查 lint/格式化/类型检查并修复
```

## 核心概念

- **类型安全**: oRPC 提供端到端类型安全
- **同构处理**: 相同代码在 SSR 和客户端运行
- **权限分层**: Admin (全局) → Organization (租户) → Member (用户)
- **多租户**: 用户可属于多个组织，通过 `activeOrganizationId` 切换

## 相关资源

- [Better-T-Stack 文档](https://github.com/AmanVarshney01/create-better-t-stack)
- [TanStack Router 文档](https://tanstack.com/router/latest)
- [oRPC 文档](https://orpc.unnoq.com/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [Better-Auth 文档](https://www.better-auth.com/docs)

## ToDo

- [ ] session 统一管理及缓存
- [ ] 表格增删改查示例
