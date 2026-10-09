# 项目开发约定

## 项目与边界

多组织 SaaS Monorepo，使用 Bun Workspaces。主站采用 TanStack Start / Router、React、oRPC、Better Auth 和 Drizzle / PostgreSQL；共享 UI 使用 shadcn / Base UI。

- `apps/web`：公开页面、认证流程、个人中心和组织业务页面。
- `apps/fumadocs`：独立文档应用，使用 Fumadocs。
- `apps/mini`：微信小程序，使用 TDesign、WXML 和 WXSS。
- `packages/api`、`auth`、`db`、`ui`：共享业务 API、认证、数据访问和 Web UI。
- `packages/env`：环境变量校验；`packages/config`：共享 TypeScript 配置。

本文件适用于整个仓库。子目录文件补充局部约定；React、shadcn、Tailwind 和 Lucide 约定仅适用于对应的 Web 应用及组件库。

## 按任务读取

开始修改前，读取涉及目录的 `AGENTS.md`；跨包任务组合读取相关文件。

| 任务                           | 必读文件                                           |
| ------------------------------ | -------------------------------------------------- |
| 主站页面、路由、SSR、数据交互  | [apps/web/AGENTS.md](apps/web/AGENTS.md)           |
| 业务 RPC、服务端校验和错误处理 | [packages/api/AGENTS.md](packages/api/AGENTS.md)   |
| 认证、会话、组织插件和权限配置 | [packages/auth/AGENTS.md](packages/auth/AGENTS.md) |
| 数据模型、关系和数据库变更     | [packages/db/AGENTS.md](packages/db/AGENTS.md)     |
| 共享组件、Base UI 和主题       | [packages/ui/AGENTS.md](packages/ui/AGENTS.md)     |
| 文档内容、文档路由和搜索       | [apps/fumadocs/AGENTS.md](apps/fumadocs/AGENTS.md) |
| 微信小程序页面、组件和样式     | [apps/mini/AGENTS.md](apps/mini/AGENTS.md)         |

框架细节按任务读取已提供的技能：路由用 `tanstack-router`，SSR / Server Functions 用 `tanstack-start`，查询、表单、表格分别用 `tanstack-query`、`tanstack-form`、`tanstack-table`；组件用 `shadcn`，认证用对应 Better Auth 技能。技能不可用时查官方文档，不依赖未提供的技能名称。

## 跨包约定

- 业务 RPC 使用 oRPC，遵循契约优先，具体要求见 [API 约定](packages/api/AGENTS.md)；认证和组织插件接口使用 Better Auth；数据库访问使用 Drizzle。HTTP 入口仅承担协议接入，不承载业务逻辑。
- 外部输入在对应服务端入口校验，业务 RPC 使用 Zod；页面校验用于反馈，不能替代服务端校验。
- 跨包通过 `@org-saas/*` 的公开 exports 导入；应用内别名以本应用配置为准，不直接引用其他包的内部文件。
- 保持现有 TypeScript 严格检查，不通过放宽配置、`any` 或 lint ignore / disable 注释规避问题。误报需说明证据后讨论处理方式。
- 保留生成文件的生成流程；具体编辑边界见对应子目录约定。
- 格式、导入排序和 lint 以根 `vite.config.ts` 为准；编译选项以共享及各包 `tsconfig` 为准，不在文档中复制配置清单。
- 提交使用 Conventional Commits，例如 `feat:`、`fix:`、`refactor:`；暂存检查配置见根 `vite.config.ts`。

## 工作流程与决策边界

- 目标明确且处于已授权范围的常规改动，说明计划后直接推进。澄清会改变结果的歧义，并给出选项与影响。
- 架构方向、依赖引入或升级、破坏性操作及影响持久化数据的操作，执行前确认具体方案；已有授权不重复确认，出现新的实质性取舍再讨论。
- 新依赖说明必要性、体积、维护状态和许可证；复用现有能力优先。
- 改动只覆盖任务需要的内容；清理本次改动产生的孤儿导入和变量，无关问题记录并告知，不顺手扩大范围。
- 注释解释不明显的设计原因。说明和交付先给结论，再给改动、影响和验证结果。

## 验证与交付

命令从仓库根执行；完整脚本以根及目标包 `package.json` 为准。

- 主站开发：`vp run dev:web`；文档开发：`vp run dev:fumadocs`。
- 修改代码后运行 `vpr check`，检查并自动修复。
- 不默认新增单元或集成测试；仅在用户明确要求或能验证具体业务风险、复现已知缺陷时编写。测试断言可观察的业务行为，避免重复实现、验证框架自身或仅检查 mock 调用；按需运行相关测试（`vp test`）。

- 涉及构建、SSR 或生成流程的改动，运行目标应用的构建或对应生成检查；数据库操作遵循 DB 文件的确认边界。
- 交付说明实际改动、已执行检查及未完成项。检查失败时区分本次引入的问题与既有问题，不将未执行的检查报告为通过。
