# DB 包约定

## 职责与入口

Drizzle ORM / PostgreSQL 数据模型与共享数据访问。

- `src/index.ts`：数据库实例与公开导出。
- `src/schema/auth.ts`：Better Auth 及组织插件所需表。
- `src/schema/relations.ts`：关系定义，当前使用 `defineRelations`。
- `drizzle.config.ts`：schema、迁移目录和连接配置；执行数据库命令前检查实际连接目标。

## Schema 与查询

- 业务查询使用 Drizzle query builder；数据库内置函数和必要的 SQL 表达式可使用 Drizzle `sql`，不以裸 SQL 绕开业务数据访问层。
- 新增或修改模型时同步检查关系、索引、约束和调用方。关系沿用 `src/schema/relations.ts` 的模式。
- 认证表属于仓库中的 schema 定义；adapter 使用这些表，不负责自动修改它们。变更前核对 [Auth 配置](../auth/AGENTS.md) 与 Better Auth 所需模型。
- 如使用生成工具更新认证 schema，先检查生成命令及 diff，保留现有关系和必要约束；当前包未提供专用认证 schema 生成脚本。
- 主键与默认值遵循现有模型及调用方约定；不假定数据库具有 `uuidv7()`，也不批量替换认证主键生成方式。
- DB 约束保证存储完整性；API 输入校验表达业务边界，两者分别维护并保持一致。

## 数据库变更与验证

以下命令从仓库根执行；连接目标与持久化数据操作需按根约定确认。

| 命令                 | 用途                                   |
| -------------------- | -------------------------------------- |
| `vp run db:push`     | 将 schema 直接同步到已确认的开发数据库 |
| `vp run db:generate` | 生成迁移文件                           |
| `vp run db:migrate`  | 执行已有迁移                           |
| `vp run db:studio`   | 打开数据库浏览工具                     |

- 开发环境使用 `db:push`，不手工编写迁移文件；需要迁移交付时使用生成流程并检查结果。
- 先核对 schema、关系与类型检查；执行数据库命令前确认目标环境，不能以连接成功作为数据变更验收。
