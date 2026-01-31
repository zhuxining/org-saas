# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

基于 Better-T-Stack 技术栈构建的多组织 SaaS 平台，采用 Turborepo 管理的 Monorepo 架构。

**核心定位**:

- **Org 端**: 组织成员管理团队、成员、邀请（Owner/Admin/Member 三级权限）
- **Public 端**: 公开访问页面（落地页、关于）

**技术栈**: TanStack Start + TanStack Router + React 19 | TailwindCSS 4 + shadcn/ui | oRPC + Better-Auth | PostgreSQL + Drizzle ORM | Turborepo + Bun

## 快速导航

**详细文档索引**:

| 主题 | 详细文档 | 内容 |
|------|---------|------|
| **Web App 开发** | [apps/web/CLAUDE.md](apps/web/CLAUDE.md) | 路由架构、组件开发、数据获取、代码规范 |
| **API 开发** | [api/CLAUDE.md](packages/api/CLAUDE.md) | 权限模式、错误处理、Zod 验证、端点目录 |
| **认证流程** | [auth/CLAUDE.md](packages/auth/CLAUDE.md) | Session 结构、Better-Auth 配置、组织切换 |
| **数据库** | [db/CLAUDE.md](packages/db/CLAUDE.md) | 数据模型、表结构、业务规则、关系定义 |

**快速开始**:

- 新功能开发 → 从对应的包文档开始
- 修复 bug → 查看 API/数据库/路由相关文档
- 添加页面 → 先读 `routes/CLAUDE.md` 了解权限规则

## 项目结构

```text
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

**关键目录**:

- `apps/web/src/routes/` - 文件系统路由 (public/org/admin)
- `packages/api/src/routers/` - oRPC 路由定义 (admin/organization)
- `packages/db/src/schema/` - 数据库表定义

## 常用开发命令

### 开发和构建

```bash
bun run dev              # 启动所有应用
bun run dev:web          # 仅启动 Web 应用 (端口 3001)
bun run build            # 构建所有应用
```

### 数据库操作

```bash
bun run db:push          # 推送 schema (开发环境)
bun run db:studio        # 打开 Drizzle Studio
bun run db:generate      # 生成 schema 类型
bun run db:migrate       # 创建迁移文件 (生产环境)
```

### 代码质量

```bash
bun run check            # 格式化和 lint (Biome)
bun run check-types      # 类型检查  
```

## 架构概览

本项目采用分层架构，各层职责清晰:

| 层级 | 技术 | 详细文档 |
|------|------|---------|
| **Web App** | TanStack Start (SSR) + React 19 | [apps/web/CLAUDE.md](apps/web/CLAUDE.md) |
| **API** | oRPC (端到端类型安全) | [packages/api/src/CLAUDE.md](packages/api/CLAUDE.md) |
| **认证** | Better-Auth (Admin + Organization 插件) | [packages/auth/src/CLAUDE.md](packages/auth/CLAUDE.md) |
| **数据库** | PostgreSQL + Drizzle ORM | [packages/db/src/CLAUDE.md](packages/db/CLAUDE.md) |

**关键概念**:

- **类型安全**: oRPC 提供端到端类型安全，无需手动定义 API 类型
- **同构处理**: 相同代码在 SSR 和客户端运行
- **多租户**: 用户可属于多个组织，通过 `activeOrganizationId` 切换

## 代码规范

### 格式化 (Biome)

- **缩进**: Tab
- **引号**: 双引号
- **自动导入排序**: 保存时自动执行
- **Tailwind 类名排序**: 启用

### 导入规范

```typescript
import { orpc } from "@/utils/orpc";  // 内部导入
import { db } from "@org-sass/db";     // 跨包导入
```

## 反模式和注意事项

### 不要做

1. **不要编辑 `routeTree.gen.ts`** - 自动生成
2. **不要编辑 `apps/web/src/components/ui/*`** - 通过 shadcn CLI 管理
3. **不要在 protectedProcedure 中跳过 session 检查** - 中间件已自动处理
4. **不要在开发环境手动创建迁移文件** - 使用 `db:push` 代替
5. **不要修改 Better-Auth 生成的表结构** - 认证表自动管理

### 常见陷阱

1. **路由未识别**: 运行 `bun run dev` 触发路由树生成

## Git 工作流

- **Pre-commit hook**: 自动运行 Biome 格式化和 lint
- **提交规范**: 建议使用 conventional commits（`feat:`, `fix:`, `refactor:` 等）

## 开发提示

- **端口**: Web 应用运行在 `http://localhost:3001`
- **HMR**: Vite 提供热模块替换，代码更改自动刷新
- **数据库 Studio**: 运行 `bun run db:studio` 打开可视化数据库管理界面

## 相关资源

- [TanStack Start 文档](https://tanstack.com/start/latest)
- [TanStack Router 文档](https://tanstack.com/router/latest)
- [TanStack Query 文档](https://tanstack.com/query/latest)
- [TanStack Table 文档](https://tanstack.com/table/latest)
- [TanStack Form 文档](https://tanstack.com/form/latest)
- [oRPC 文档](https://orpc.unnoq.com/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [Better-Auth 文档](https://www.better-auth.com/docs)
- [Shadcn/ui 文档(使用Base UI)](https://ui.shadcn.com/llms.txt)
