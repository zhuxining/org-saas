# AGENTS.md

## 项目概述

基于 Better-T-Stack 技术栈构建的多组织 SaaS 平台，采用 Bun Workspaces 管理的 Monorepo 架构。

**核心定位**:

- **Org 端**: 组织成员管理团队、成员、邀请（Owner/Admin/Member 三级权限）
- **Public 端**: 公开访问页面（落地页、关于）

**技术栈**: TanStack Start + TanStack Router + React 19 | TailwindCSS 4 + shadcn/ui (Base UI) | oRPC + Better-Auth | PostgreSQL + Drizzle ORM | Bun (Workspaces)

## 架构与文档索引

| 层级        | 技术                              | 文档                                               |
| ----------- | --------------------------------- | -------------------------------------------------- |
| **Web App** | TanStack Start (SSR) + React 19   | [apps/web/AGENTS.md](apps/web/AGENTS.md)           |
| **API**     | oRPC (端到端类型安全)             | [packages/api/AGENTS.md](packages/api/AGENTS.md)   |
| **认证**    | Better-Auth (Organization + RBAC) | [packages/auth/AGENTS.md](packages/auth/AGENTS.md) |
| **数据库**  | PostgreSQL + Drizzle ORM          | [packages/db/AGENTS.md](packages/db/AGENTS.md)     |
| **UI**      | shadcn/ui (Base UI，非 Radix)     | [packages/ui/AGENTS.md](packages/ui/AGENTS.md)     |

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
bun run check            # 代码检查 lint/格式化/类型检查 (vp check)
```

## 代码规范

**代码格式化 (vp check)**: Tab 缩进 | 双引号 | 自动导入排序 | Tailwind 类名排序

**导入规范**:

```typescript
import { orpc } from "@/utils/orpc"; // 内部导入
import { db } from "@org-sass/db"; // 跨包导入
```

## 反模式

各包专属的反模式规则见对应 AGENTS.md。全局规则：

- **不要在开发环境手动创建迁移文件** - 使用 `db:push`

## Git 工作流

- **Pre-commit hook** (vite-plus): 自动运行 vp check --fix（lint/格式化/类型检查）
- **提交规范**: conventional commits（`feat:`, `fix:`, `refactor:` 等）

## 项目约束

跨包通用红线与编码规范，违反将导致构建失败、安全漏洞或架构腐化。各包专属约束见对应 `AGENTS.md` 的「反模式」段。

### TypeScript

- 已启用 `strict` / `noUnusedLocals` / `noUnusedParameters` / `verbatimModuleSyntax` / `erasableSyntaxOnly` / `noUncheckedIndexedAccess` / `noImplicitOverride`，不要放宽。
- 禁 `enum` / `namespace`（`erasableSyntaxOnly` 会拒绝）→ 用 `const` 对象 + 类型推导 / ES 模块。
- 路径别名：应用内 `@/*` → `src/*`，跨包用 `@org-sass/*`（如 `@org-sass/db`）。

### Lint / 格式化 / 类型检查（vite-plus）

- `vp check` 是统一入口，一次性完成格式化 + lint + 类型检查；`--fix` 自动修复可修复项。提交前 pre-commit hook 已自动运行。
- 禁止用 ignore / disable 注释绕过 lint 规则（oxlint / vite-plus 的禁用注释）。遇告警应正面修复（改写代码、调整依赖、拆分逻辑），不得用 ignore 压制；确属误报时再单独说明，不得默认靠 ignore 过关。

### 外部依赖红线

- 禁止绕过 oRPC 手写业务 RPC（API 路由仅做 oRPC / better-auth 的 HTTP 入口）。
- 禁止绕过 better-auth 自行实现认证 / Session。
- 禁止绕过 Drizzle 裸写业务 SQL（数据库内置函数例外）。
- 禁止绕过 Zod 在 oRPC 合约外做输入校验（所有外部输入经合约 `input(zod)` + `implement` 自动校验）。
- 引入新依赖前评估必要性、体积、维护活跃度、许可证。

### 样式红线

- 视觉样式（颜色 / 背景 / 边框 / 阴影 / 字号）统一用 shadcn 组件 + Tailwind Token，禁止自定义 CSS class 加视觉属性。
- 自定义 CSS class 仅用于结构布局（flex / grid / 间距 / 定位 / 尺寸）。

### 图标红线

- 统一 `lucide-react`（如 `<X />`），禁止内联 `<svg>`、导入 SVG 文件或用其他图标库。

### 代码风格（TypeScript / React）

行级编码规范（通用最佳实践，框架标准用法见对应 skill）：

- **类型安全**：显式标注函数参数 / 返回值类型（提升清晰度时）；未知类型用 `unknown` 而非 `any`；用 `as const` 标识不可变值；用类型收窄代替类型断言；避免魔法数字，提取为具名常量。
- **现代语法**：`const` 优先，`let` 仅在需重赋值时，禁用 `var`；回调用箭头函数；`for...of` 优于 `.forEach()` / 索引 `for`；用 `?.` / `??`、模板字符串、解构。
- **异步**：async 函数内务必 `await` 并消费返回值；用 `async/await` 优于 promise 链；用 `try-catch` 妥善处理错误。
- **React / JSX**：只用函数组件；hooks 仅在顶层调用且依赖数组写全；列表元素用唯一 `key`（非数组下标）；不在组件内定义组件；语义化 HTML + ARIA（图片 `alt`、标题层级、表单 `label`、键盘事件配鼠标事件）；React 19 用 `ref` 作 prop 替代 `forwardRef`。
- **错误处理**：生产代码移除 `console.log` / `debugger` / `alert`；抛 `Error` 对象（带描述）而非字符串；`try-catch` 须有意义（不空 catch 后原样重抛）；错误分支用 early return 减少嵌套。
- **安全**：链接 `target="_blank"` 加 `rel="noopener"`；避免 `dangerouslySetInnerHTML`；禁用 `eval()` 与直接写 `document.cookie`；校验 / 清洗用户输入。
- **性能**：循环累加器内避免 spread；正则提到顶层；优先具名导入而非命名空间导入；图片用 shadcn/ui 组件而非原生 `<img>`。
- **测试纪律**：断言写在 `it()` / `test()` 内；异步测试用 `async/await` 而非 `done` 回调；提交代码禁用 `.only` / `.skip`；测试套件保持扁平，避免过度 `describe` 嵌套。

### 工作规范

- 遇歧义列出几种理解让用户选择，不替用户做假设。当用户指令与最佳实践冲突时，主动提醒并说明取舍建议。
- 涉及**架构级决策、破坏性变更、数据安全、依赖引入或升级**须确认后再执行。
- 修改代码后运行 `vp check --fix` 确保无问题；改动触及关键业务逻辑或测试用例本身时再跑 `bun run test`，提交前完整跑一次。
- Bug 修复优先写能复现的最小测试（失败 → 通过验证修复有效并防回归）；显而易见或复现成本过高的 bug 可直接修复，但修复后应补测试覆盖该场景。
- 极简精准：每行 diff 对应具体需求条目，不扩展改动范围，不顺手改无关代码；孤儿导入 / 变量顺手清干净；撞见无关死代码只提醒不删。仅对复杂逻辑或非显而易见的设计意图添加注释；避免显而易见的注释或过度注释。

### 沟通原则

- 遵循金字塔原理：先结论后论据，先全局后细节，先结果后过程。
- 结构化表达时，按互斥且穷尽（MECE）的方式分组，避免内容交叉、重复和跳跃。
- 撰写 Issue、PR 等说明性内容时，按如下顺序组织：目的 / 结论 → 背景 → 方案或改动点 → 影响与风险 → 验收或验证结果。
- 如果当前讨论的原始内容结构混乱，主动按金字塔原理重组后再输出。
- 先输出分析计划，列出关键假设、不确定性和风险点，获得确认后再动手编码。

## 相关资源

TanStack / Better-Auth / shadcn 等技术文档可通过对应 skill 或 `find-docs` skill 即时查询。

- [oRPC](https://orpc.unnoq.com/) | [Drizzle ORM](https://orm.drizzle.team/)
