# CLAUDE.md

## 项目概述

基于 Better-T-Stack 技术栈构建的多组织 SaaS 平台，采用 Turborepo 管理的 Monorepo 架构。

**核心定位**:

- **Org 端**: 组织成员管理团队、成员、邀请（Owner/Admin/Member 三级权限）
- **Public 端**: 公开访问页面（落地页、关于）

**技术栈**: TanStack Start + TanStack Router + React 19 | TailwindCSS 4 + shadcn/ui (Base UI) | oRPC + Better-Auth | PostgreSQL + Drizzle ORM | Turborepo + Bun

## 架构与文档索引

| 层级 | 技术 | 文档 |
|------|------|------|
| **Web App** | TanStack Start (SSR) + React 19 | [apps/web/CLAUDE.md](apps/web/CLAUDE.md) |
| **API** | oRPC (端到端类型安全) | [packages/api/CLAUDE.md](packages/api/CLAUDE.md) |
| **认证** | Better-Auth (Organization + RBAC) | [packages/auth/CLAUDE.md](packages/auth/CLAUDE.md) |
| **数据库** | PostgreSQL + Drizzle ORM | [packages/db/CLAUDE.md](packages/db/CLAUDE.md) |
| **UI** | shadcn/ui (Base UI，非 Radix) | [packages/ui/CLAUDE.md](packages/ui/CLAUDE.md) |

**关键概念**: oRPC 端到端类型安全 | SSR/客户端同构 | 多租户通过 `activeOrganizationId` 切换

## 项目结构

```text
org-saas/
├── apps/
│   ├── web/              # 主站应用 (TanStack Start SSR, 端口 3001)
│   ├── fumadocs/         # 文档应用 (Fumadocs)
│   └── mini/             # 微信小程序 (tdesign-miniprogram)
├── packages/
│   ├── api/              # oRPC API 层
│   ├── auth/             # Better-Auth 配置
│   ├── db/               # 数据库模型和 Drizzle ORM
│   ├── ui/               # 共享 UI 组件库 (shadcn/Base UI)
│   ├── config/           # 共享配置
│   └── env/              # 环境变量类型
└── .agents/skills/       # AI Agent 技能包（自动加载，无需手动引用）
```

## 常用开发命令

```bash
# 开发
bun run dev              # 启动所有应用
bun run dev:web          # 仅启动 Web 应用 (端口 3001)
bun run build            # 构建所有应用

# 数据库
bun run db:push          # 推送 schema (开发环境)
bun run db:studio        # 打开 Drizzle Studio (端口 5555)
bun run db:generate      # 生成 schema 类型
bun run db:migrate       # 创建迁移文件 (生产环境)

# 代码质量
bun run check            # 格式化和 lint (Biome)
bun run check-types      # 类型检查
```

## 代码规范

**Biome 格式化**: Tab 缩进 | 双引号 | 自动导入排序 | Tailwind 类名排序

**导入规范**:

```typescript
import { orpc } from "@/utils/orpc";  // 内部导入
import { db } from "@org-sass/db";     // 跨包导入
```

## 反模式

各包专属的反模式规则见对应 CLAUDE.md。全局规则：

- **不要在开发环境手动创建迁移文件** - 使用 `db:push`

## Git 工作流

- **Pre-commit hook** (Lefthook): 自动运行 Biome 格式化和 lint
- **提交规范**: conventional commits（`feat:`, `fix:`, `refactor:` 等）

## 相关资源

TanStack / Better-Auth / shadcn 等技术文档可通过对应 skill 或 `find-docs` skill 即时查询。

- [oRPC](https://orpc.unnoq.com/) | [Drizzle ORM](https://orm.drizzle.team/)
