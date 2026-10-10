# 权限验证结果

更新时间：2026-10-09

本文记录权限实施计划第 9 节中已执行的关键检查。所有 PostgreSQL 验证均使用本地隔离临时容器；未连接或修改开发、预发、生产数据库。

## 已验证

| 边界                                  | 验证方式                                                                       | 结果                                                                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Better Auth 直接 HTTP 与 `auth.api.*` | `packages/auth/src/organization-policy.test.ts`                                | 成员、邀请、动态角色、归档阻断、owner 保护和权限不足均按预期拒绝或允许；覆盖 HTTP handler 与服务端 API 调用。                                                                                      |
| owner 原子转让及并发保留              | `packages/auth/src/organization-owner.postgres.test.ts`，临时 PostgreSQL       | 转让与移除、退出、账号操作并发时保持唯一 owner；失败回滚；异常存量状态 fail closed。                                                                                                               |
| oRPC HTTP 与 SSR/server 直接处理      | `packages/api/src/routers/organization.postgres.test.ts`                       | `RPCHandler` HTTP 请求与 `createRouterClient` 服务端直调共用 handler；覆盖跨组织、归档、权限授予边界及平台／组织身份分离。                                                                         |
| 平台管理员权限边界                    | API 集成测试中的 Better Auth HTTP 与 `auth.api.*`                              | `set-role` 通过 HTTP 和服务端 API 均被拒绝，用户角色没有变化；普通用户无法读取会话。                                                                                                               |
| 会话凭证输出                          | `/admin/list-user-sessions` HTTP 响应及 `auth.api.listUserSessions`            | 返回会话元数据，不包含 `token`；授权撤销后会话列表为空。                                                                                                                                           |
| 平台用户操作                          | `auth.api.banUser`／`unbanUser`                                                | 管理员可封禁和解封普通用户；实际数据库标记符合预期。管理员用户列表排除平台管理员。                                                                                                                 |
| 已撤销权限的下一次服务端请求          | oRPC 集成测试                                                                  | 自定义角色收回 `member.update` 后，随后读取的权限上下文立即变为 false，授予角色接口拒绝；旧浏览器缓存不能延长服务端权限。                                                                          |
| 管理员 bootstrap                      | 临时 PostgreSQL `org_saas_issue17_bootstrap` 上运行 `bootstrap:platform-admin` | 首次成功、串行重跑幂等；两个并发调用分别报告初始化成功／已初始化；目标第二用户被拒绝。直接查询确认角色分别为 `platform-admin` 和 `user`。目标用户必须以 ID、邮箱、已验证邮箱和未封禁状态共同确认。 |
| Web 构建与路由生成                    | `vp run --filter web build`                                                    | 通过；TanStack 根据路由源文件生成 `routeTree.gen.ts`。                                                                                                                                             |

集成测试汇总命令：

```sh
PERMISSION_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55440/org_saas_issue15 \
  vp test \
  packages/auth/src/permissions.test.ts \
  packages/auth/src/organization-policy.test.ts \
  packages/auth/src/organization-owner.postgres.test.ts \
  packages/api/src/routers/organization.postgres.test.ts
```

最后一次完整运行：4 个测试文件、28 项通过。bootstrap 使用另一个新建的临时数据库，先以 `vp run --filter @org-saas/db db:push` 建立测试 schema。

## 尚未验证／受阻

- 未指定迁移目标数据库和持久化数据处置范围，因此尚未对任何目标环境应用迁移。生产／预发的现有 owner 异常、旧角色、孤立关系仍需在目标确认后只读盘点；不能把临时库结果当作目标环境证明。
- 未进行浏览器端到端操作或多标签页测试。账号切换清理、组织切换清理和管理界面的交互已实现，当前证据是类型／lint 检查、Web 构建及服务端行为测试。
- `vpr check` 当前仍报告 5 个 Fumadocs 生成 collection 类型错误：`fumadocs-mdx:collections/server`、`fumadocs-mdx:collections/browser` 未解析及其引发的 3 个隐式 `any`。本次变更的 Web、API、Auth 文件没有额外类型或 lint 问题。
- 当前没有剩余的 Better Auth 1.7.7 owner 事务能力阻塞：已用组织行版本锁及事务包装，并由临时 PostgreSQL 并发／回滚用例验证。数据库目标未确认是仍待处理的部署边界。

数据库生成、审阅及应用的顺序继续遵循 [权限实施计划第 8 节](permissions.md#8-数据库与验证执行顺序)和 [DB 约定](../../packages/db/AGENTS.md)。
