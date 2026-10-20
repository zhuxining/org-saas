# SaaS 技能实践、定价与架构核查

> 调查日期：2026-10-20。审阅基线为仓库 HEAD `dd4b89ced0d0e243219f7380654edb9eedd8eb2c`；开始检查时 `git status --short` 为空。本报告记录基线审查和随后落地的低风险修正；价格结构仍是未批准的讨论候选，不构成商业规则。
>
> 来源边界：逐项阅读仓库技能并对照项目代码。参考了 Better Auth、TanStack Start、oRPC 官方文档片段，并直接获取 TanStack Router 的 head 管理文档和 Stripe 官方定价模型说明。滚动文档不固定版本；行为以锁定依赖和本地代码为准。Drizzle 官方文档链接作为后续核对入口，连接文档 URL 返回 404，本报告不声称已直接核实该页面。基线页面文案可用 `git show dd4b89c:apps/web/src/routes/_public/pricing/index.tsx`、`git show dd4b89c:apps/web/src/routes/_public/about/index.tsx` 和 `git show dd4b89c:apps/web/src/routes/_public/-components/footer.tsx` 复现；报告中的工作树文件链接指向修正后的当前版本。

## 结论摘要

1. **审阅基线中的 `/pricing` 金额和功能承诺没有对应的计费、套餐或服务等级实现依据。** 基线页面展示 Free `$0/月`、Pro `$29/月`、Enterprise `$99/月`，并列出邮件支持、优先支持、定制品牌、全天候专属支持、定制集成与 SLA。页面按钮都只是导向登录，没有购买或联系销售流程（基线源码可用 `git show dd4b89c:apps/web/src/routes/_public/pricing/index.tsx` 核验）。全仓未找到 Stripe、Paddle、订阅、付款、发票、试用或币种处理；`bts.jsonc` 的 payments 选项为 `none`（[bts.jsonc](../../bts.jsonc#L16)）。后续修正已移除这些未经证实的金额和承诺，当前页面列出已有组织功能并说明价格与配额尚未设定。
2. **组织授权文档明确保留商业规则的决定空间。** 权限架构写明“组织配额与套餐规则后续独立设计”（[权限架构](../architecture/authorization.md#L9-L21)）；当前权限模型规定角色、成员与数据访问，不定义商业套餐。`organization.teams.maximumTeams: 10` 是当前 Better Auth 插件的实际限制配置（[auth 配置](../../packages/auth/src/index.ts#L16-L48)），但不能据此推导任一公开套餐的团队上限或定价；其商业归属也未在文档中说明。
3. **授权架构总体落实良好，商业授权尚未进入架构。** 目前使用 Better Auth 处理身份与组织、平台/组织角色分离、服务端组织资格和操作权限校验、oRPC 契约输入输出校验、Drizzle 组织范围查询与事务（[API 约定](../../packages/api/AGENTS.md#L14-L40)、[权限架构](../architecture/authorization.md#L65-L114)）。尚无“订阅状态 → 功能/配额资格 → 每次受保护写操作”的服务端授权路径。
4. **可以立即做的工作主要是纠正文案事实和收敛技术决策准备。** 商业负责人需先确认计费主体、支付服务商、币种/地区税务、计费周期、试用、取消退款降级及服务承诺；这些选择会决定订阅数据模型、webhook 与对账、账单周期边界、升级/降级行为和权限检查位置。报告列出候选结构，但不填入价格、数值上限或 SLA。

## 1. Better Auth 技能逐项核对（6 项）

| 仓库技能                                                                                                                    | 项目采用情况                                                                                                                 | 符合项与可复现改进点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`better-auth-best-practices`](../../.agents/skills/better-auth-best-practices/SKILL.md#L56-L184)                           | **已采用。** Better Auth 负责服务端身份、会话、Admin、Organization 和 Teams；Drizzle Adapter 使用 PostgreSQL。               | 会话采用按请求提取，服务端和客户端插件对齐，符合插件/adapter 边界（[服务端配置](../../packages/auth/src/index.ts#L1-L84)、[请求数据流](../architecture/request-data-flow.md#L100-L123)）。可复现的核对点：实际使用 1.7.11（[bun.lock](../../bun.lock#L1200)），技能文件按自己的说明维护；涉及 API 默认值应以锁定版本而非技能示例或滚动文档为准。                                                                                                                                                                     |
| [`better-auth-security-best-practices`](../../.agents/skills/better-auth-security-best-practices/SKILL.md#L6-L150)          | **部分采用。** 配置唯一可信来源 `CORS_ORIGIN`、凭据过滤、平台角色限制；使用 auth 插件默认安全能力。                          | 符合：可信来源明确（[auth 配置](../../packages/auth/src/index.ts#L50-L80)）；Session token 不向客户端返回（同上 60–68 行）；平台 Admin 权限独立。改进/核对：当前 auth 配置没有显式写出 Better Auth rate-limit 配置；这本身不证明未限流，因为默认行为依版本/环境而定。应对锁定版本和部署环境确认登录/注册限流及共享存储，不要把 oRPC 的内存 limiter 当成 auth endpoint 限流（[oRPC limiter](../../packages/api/src/index.ts#L20-L28)、[HTTP 入口](../../apps/web/src/routes/api/rpc.$.ts#L1-L44)）。                  |
| [`create-auth`](../../.agents/skills/create-auth/SKILL.md#L14-L151)                                                         | **已用于初始接入；本任务不适用重新脚手架。** 项目已有 auth 服务端、客户端、Better Auth HTTP handler、Drizzle schema 和表单。 | 符合：复用已建立的 Better Auth 标准接口，不重复实现 session 解析（[Auth 约定](../../packages/auth/AGENTS.md#L5-L18)）。本技能的“新项目 planning/scaffold”流程不能作为当前需要重建 auth 的理由；任何新插件仍需同步服务端、客户端、schema 和调用方。                                                                                                                                                                                                                                                                   |
| [`organization-best-practices`](../../.agents/skills/organization-best-practices/SKILL.md#L34-L70)                          | **已采用。** 使用组织、团队、动态访问控制及 organization access control。                                                    | 符合：最小权限 owner/admin/member、自定义权限授予边界、服务端组织成员检查与团队关系管理；团队不是通用 RBAC（[权限定义](../../packages/auth/src/permissions.ts#L1-L30)、[授权架构](../architecture/authorization.md#L46-L99)）。待设计：组织配额与套餐明确独立；虽然插件当前设置 `maximumTeams: 10`，项目没有将它映射为套餐、配置界面或可售额度（[auth 配置](../../packages/auth/src/index.ts#L38-L42)）。不应把插件可配置的资源上限包装成已批准商业方案。                                                            |
| [`email-and-password-best-practices`](../../.agents/skills/email-and-password-best-practices/SKILL.md#L6-L69)               | **部分采用。** 邮箱密码认证和前端校验已启用；邮件验证与密码重置未在当前 auth 配置中实现。                                    | 符合：Better Auth 执行凭据认证；表单 Zod 校验只用于交互（[auth 配置](../../packages/auth/src/index.ts#L50-L60)、[注册表单](../../apps/web/src/components/sign-up-form.tsx#L24-L57)）。改进点：`emailVerification.sendVerificationEmail`、`sendResetPassword` 及配套页面/邮件发件能力均未见于该配置与登录注册代码；这是可复现的能力缺口，但是否要求邮箱验证、是否上线重置流是产品/运营与安全决策，需先明确邮箱基础设施和策略（[技能说明](../../.agents/skills/email-and-password-best-practices/SKILL.md#L16-L93)）。 |
| [`two-factor-authentication-best-practices`](../../.agents/skills/two-factor-authentication-best-practices/SKILL.md#L6-L63) | **未采用；未发现产品需求。** 服务端、客户端插件列表没有 twoFactor。                                                          | 项目没有声称支持 MFA，所以属于尚未选择的能力，不构成对现有承诺的违约。若产品决定支持，再同步 twoFactor 服务端/客户端、恢复码与验证 UX、schema 生成及账号恢复策略；技能中的插件配置不能独立证明安全流程完整。                                                                                                                                                                                                                                                                                                         |

## 2. TanStack 技能逐项核对（14 项）

| 仓库技能                                                                      | 项目采用情况                                                                                           | 符合项与可复现改进点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tanstack-ai`](../../.agents/skills/tanstack-ai/SKILL.md#L7-L44)             | **未采用。** 未找到 TanStack AI 使用或 AI 服务端实现。                                                 | 当前没有 AI 产品能力或页面承诺，因此不需要加包。若将来规划 AI，再设计模型/供应商、费用、数据处理与请求限制；技能不是可直接推断的产品需求。                                                                                                                                                                                                                                                                                                                                                                            |
| [`tanstack-cli`](../../.agents/skills/tanstack-cli/SKILL.md#L7-L53)           | **未用作项目脚手架。** 现项目通过 workspace 与 Vite Plus 配置运行。                                    | 这是项目创建/集成的工具技能，不是运行时能力。没有证据要求替换当前脚手架；新增集成按现有包和项目约定维护。                                                                                                                                                                                                                                                                                                                                                                                                             |
| [`tanstack-config`](../../.agents/skills/tanstack-config/SKILL.md#L7-L22)     | **未采用其配置包。** 仓库用 Vite Plus 与共享 `packages/config`。                                       | 相关方向是共享配置和可重复构建；项目已有集中 TypeScript/Vite 配置。没有证据表明另加 TanStack Config 包可改善此处。                                                                                                                                                                                                                                                                                                                                                                                                    |
| [`tanstack-db`](../../.agents/skills/tanstack-db/SKILL.md#L7-L28)             | **未采用。** 客户端数据通过 TanStack Query 和 Better Auth 客户端管理。                                 | 当前读写是服务端 oRPC/Better Auth 请求；没有 TanStack DB collection/sync。不要仅因技能存在而迁移缓存或增加第二个数据同步层。                                                                                                                                                                                                                                                                                                                                                                                          |
| [`tanstack-devtools`](../../.agents/skills/tanstack-devtools/SKILL.md#L7-L40) | **已采用。** Vite 插件和根布局注册 Query、Router、Form Devtools。                                      | 符合按需组合调试插件（[Vite 配置](../../apps/web/vite.config.ts#L1-L16)、[root](../../apps/web/src/routes/__root.tsx#L73-L88)）。审查后已用 `import.meta.env.DEV` 限制根布局只在开发环境渲染；生产构建验证见“落地优化”。                                                                                                                                                                                                                                                                                              |     |
| [`tanstack-form`](../../.agents/skills/tanstack-form/SKILL.md#L7-L24)         | **已采用。** 登录、注册、组织设置等使用 `@tanstack/react-form`。                                       | 符合：提交 handler 阻止浏览器默认提交，Zod schema 做即时输入反馈（[登录表单](../../apps/web/src/components/sign-in-form.tsx#L24-L55)、[注册表单](../../apps/web/src/components/sign-up-form.tsx#L24-L57)）。业务安全边界仍由 Better Auth/oRPC 服务端校验；页面 validator 不替代服务端校验（[API 约定](../../packages/api/AGENTS.md#L30-L40)）。                                                                                                                                                                       |
| [`tanstack-pacer`](../../.agents/skills/tanstack-pacer/SKILL.md#L7-L24)       | **未采用。** 未发现 `@tanstack/pacer` 调用。                                                           | 目前没有基于其 hook 的 debounce/queue 场景需要；服务端请求限流由 oRPC limiter 负责。高频搜索等出现可观察交互需求时再按具体场景评估。                                                                                                                                                                                                                                                                                                                                                                                  |
| [`tanstack-query`](../../.agents/skills/tanstack-query/SKILL.md#L7-L14)       | **已采用。** TanStack Query 与 oRPC 集成用于查询、SSR 预取、失效和权限缓存。                           | 符合：共享 `queryOptions`、loader `ensureQueryData`、组件复用相同 query key，组织键按用户及组织分区；变更后失效（[query options](../../apps/web/src/lib/query-options.ts#L64-L99)、[数据流](../architecture/request-data-flow.md#L127-L166)）。缓存中的权限结果只改善 UI；文档和 API 仍要求每次服务端操作按当前授权重新检查。                                                                                                                                                                                         |
| [`tanstack-ranger`](../../.agents/skills/tanstack-ranger/SKILL.md#L7-L21)     | **未采用。** 未发现 Ranger 包或范围控件。                                                              | 当前价格页没有可配置计量、用量滑块或连续数值输入，不适用。没有依据引入滑块展示未确认配额。                                                                                                                                                                                                                                                                                                                                                                                                                            |
| [`tanstack-router`](../../.agents/skills/tanstack-router/SKILL.md#L7-L25)     | **已采用。** 文件路由和生成 route tree。                                                               | 符合：页面源码定义路由，生成文件由工具维护；公开价格路由简洁注册（[pricing route](../../apps/web/src/routes/_public/pricing/index.tsx#L13-L15)、[Web 约定](../../apps/web/AGENTS.md#L9-L18)）。审查后已设置全站 `Org SaaS` 默认标题，并为价格页增加独立标题和描述；Router 会采用嵌套路由中最后出现的 title/meta（[官方 head 文档](https://tanstack.com/router/latest/docs/framework/react/guide/document-head-management)）。权限仍在 `beforeLoad` 与服务端，不依赖隐藏菜单。价格页面没有 loader 是合理的纯静态页面。 |
| [`tanstack-start`](../../.agents/skills/tanstack-start/SKILL.md#L70-L113)     | **已采用。** Start 用于 SSR、Server Functions 和 middleware；价格页继承公开 SSR。                      | 符合：公开页面 SSR 策略明确，Server Function 用于会话/组织解析，业务 API 留在 oRPC（[请求数据流](../architecture/request-data-flow.md#L9-L43)、[调用通道](../architecture/request-data-flow.md#L114-L125)）。本次 Web 生产构建通过；没有执行真实 HTTP SSR 页面冒烟检查。                                                                                                                                                                                                                                              |
| [`tanstack-store`](../../.agents/skills/tanstack-store/SKILL.md#L7-L20)       | **未直接采用。** 锁定 Router 的依赖图内出现 `@tanstack/react-store`，但应用代码未直接导入/维护 Store。 | 将 Router 的内部依赖误判为项目 Store 状态管理不准确；当前业务服务器状态由 Query 管理。没有需要新增模块级单例 store 的证据。                                                                                                                                                                                                                                                                                                                                                                                           |
| [`tanstack-table`](../../.agents/skills/tanstack-table/SKILL.md#L7-L44)       | **未在当前 UI 使用。** Web package 声明该依赖，但源码未找到 `useReactTable` 调用。                     | 不能由依赖声明推断已经有数据表格实现。当前成员、角色和平台列表若未来改用 Table，应遵循稳定 data/columns 与 server-side 分页约束；当前没有具体缺陷要修复。                                                                                                                                                                                                                                                                                                                                                             |
| [`tanstack-virtual`](../../.agents/skills/tanstack-virtual/SKILL.md#L7-L33)   | **未采用。** 未发现 Virtualizer 调用。                                                                 | 没有证据显示需渲染超大列表；不应为尚未测量的数据规模预先加虚拟化。                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## 3. oRPC 与 Drizzle 的关键实践

### 已符合或有直接证据

- **oRPC 契约优先：** 领域 contract 定义输入/输出和类型，统一 contract 汇总后由 `implement(apiContract)` 实现；认证、错误边界集中定义（[contracts index](../../packages/api/src/contracts/index.ts#L1-L21)、[implementer](../../packages/api/src/index.ts#L35-L89)）。契约使用 Zod，输出 DTO 不直接暴露整个数据库模型（[organization contract](../../packages/api/src/contracts/organization.ts#L1-L80)、[API 约定](../../packages/api/AGENTS.md#L30-L40)）。
- **oRPC 共用 HTTP 与 SSR 处理器：** 请求上下文按请求提取会话，受保护 middleware 注入 session；SSR 直接处理仍执行同一 contract/handler（[API context 与约定](../../packages/api/AGENTS.md#L5-L27)、[请求数据流](../architecture/request-data-flow.md#L72-L110)）。
- **Drizzle 查询显式投影、组织范围及分页：** 组织查询从可信 session ID 获取用户，再以明确 organization ID 做成员检查；列表输入带有上限分页。仪表盘只投影 count，并先检查组织访问（[organization access](../../packages/api/src/organization-access.ts#L64-L128)、[dashboard](../../packages/api/src/routers/dashboard.ts#L7-L35)、[platform contract](../../packages/api/src/contracts/platform.ts#L1-L68)）。
- **持久化写入使用事务：** owner 转让、归档/恢复、成员和角色写入使用显式事务/锁定机制；Drizzle adapter 也启用事务支持（[auth adapter](../../packages/auth/src/index.ts#L50-L56)、[organization router](../../packages/api/src/routers/organization.ts#L109-L200)、[权限架构](../architecture/authorization.md#L77-L89)）。
- **预期业务错误与未知异常分层：** 已知低于 500 的 oRPC 错误保留；意外异常记录 request ID 并返回通用错误，不将内部原因直接发给客户端（[API 错误边界](../../packages/api/src/index.ts#L37-L59)）。

### 可复现的改进/决策前置项

- **计费会成为新的服务端授权事实。** 组织角色权限回答“用户能否做某操作”，而订阅/额度回答“该组织是否购买此能力或仍有剩余额度”。两者应分别校验并组合，不能把价格卡片、客户端状态或一个角色名当作购买凭证。权限架构已经要求服务端显式验证组织资格、操作权限与数据范围（[权限架构](../architecture/authorization.md#L97-L114)）；将来是否将 entitlement 放在 API middleware、领域服务或配额服务，需要结合产品模型确定。
- **目前固定 `maximumTeams: 10` 是实际行为配置但不是商业层。** 若未来团队数量属于可售额度，必须由已确认的套餐 entitlement 驱动服务端限制，并定义并发创建时的原子性、已有超额组织、降级后读写/删除行为；不能只将数字动态塞进 UI。套餐没决定前不要把这个 `10` 复制进价格卡片。
- **oRPC 内存 limiter 是进程内实现。** 当前为 `MemoryRateLimiter`（[API index](../../packages/api/src/index.ts#L20-L28)），多实例环境不等于全局统一配额。部署拓扑/滥用风险确认后，可选择共享存储实现并设置错误策略。它是工程限流，不应与套餐业务用量计量混用。
- **Prisma/Drizzle 等 ORM 不是支付状态可信源。** 若引入支付服务，需要验证签名 webhook、幂等事件处理、状态回查/对账、可审计的状态变更，以及 webhook 丢失和乱序策略；不能只依赖支付跳转成功页面。这是后续架构检查清单，不是仓库已有支付实现。
- **Drizzle schema 与订阅实体暂不存在。** DB 包使用 node-postgres Drizzle（[DB 初始化](../../packages/db/src/index.ts#L1-L14)），没有 payment/subscription 表。数据模型必须等待计费主体、价格对象、币种和周期等领域决策，不应先造通用表后再倒推规则。

## 4. 价格页金额和承诺与能力/权限文档的对照

| 审查基线中的页面文案                                                                                    | 仓库可验证事实                                                                                                                                                                                                                          | 判断                                                                                                                      |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Free：`$0/month`、Basic features、Email support                                                         | 只有 `$0/month` 和描述文本；未见产品定义的 Free 权益、邮件支持团队或响应时间规则（审阅基线 commit `dd4b89c` 的价格页源码）。                                                                                                            | `$0` 是审阅基线的页面文案，不能视为批准价格。`Email support` 是服务承诺，仓库没有能力或服务流程证据。                     |
| Pro：`$29/month`、Advanced features、Priority support、Custom branding                                  | 代码实现组织/成员/团队/动态角色与审计等已有能力；未发现套餐字段、品牌自定义设置、支持优先级或付款处理（审阅基线 commit `dd4b89c` 的价格页源码、[权限范围](../architecture/authorization.md#L46-L63)）。                                 | 金额、所含功能、支持等级无法与当前代码/授权规格一一对应；页面没有购买按钮行为。                                           |
| Enterprise：`$99/month`、Advanced analytics、24/7 dedicated support、Custom integrations、SLA guarantee | 当前可见平台/组织审计和基础统计，不等同于“高级分析”；未发现专属客服、全天候值守、定制集成产品或 SLA 文本/监测/补偿流程（审阅基线 commit `dd4b89c` 的价格页源码、[dashboard API](../../packages/api/src/routers/dashboard.ts#L7-L35)）。 | $99/月及以上所有服务/服务等级文字缺少项目证据；不能作为已批准承诺发布。按钮和 Contact Us 均跳到登录（同一审阅基线文件）。 |
| 组织与团队额度                                                                                          | 自助创建组织已开启；团队插件写有 `maximumTeams: 10`；权限架构写配额与套餐后续独立设计（[auth 配置](../../packages/auth/src/index.ts#L16-L42)、[权限架构](../architecture/authorization.md#L9-L21)）。                                   | 文档只明确“不已定案”，不表示产品永远不需要配额。插件的 10 是当前技术配置，不等于 Free/Pro/Enterprise 分档权益。           |
| 套餐订购/支付/周期、试用、退款和降级                                                                    | 未找到支付 provider、价格 ID、subscription/billing 实体、webhook、账单周期或政策实现；payments 配置为 `none`（[bts.jsonc](../../bts.jsonc#L1-L20)）。                                                                                   | 目前是静态价格说明 UI，而不是可成交或可执行的定价系统。                                                                   |

**后续处理：** 价格页已删除未确认的金额、支持等级及 SLA 文案，改为展示已实现的组织成员与角色、团队、审计记录功能，并明确说明价格和配额尚未设定。Enterprise 与自定义套餐 CTA 改为当前可用的注册入口；页面现有 route metadata 描述也已补齐。确切价格、套餐权益和服务承诺仍待产品规则确认。

## 5. 为什么必须由产品负责人决定计费政策

授权架构写“组织配额与套餐规则后续独立设计”，因为它首先确立平台身份、组织角色、团队分组和授权边界，并特意不把尚未定义的业务规则埋入 RBAC（[权限架构](../architecture/authorization.md#L3-L21)、[实施计划范围](../implementation/permissions.md#L14-L28)）。价格不是从角色代码或 Better Auth 的插件参数自动推导出来的。缺少以下决策时，技术团队无法安全地建立数据库模型或在服务端执行套餐判断：

1. **支付 provider 与交易主体：** provider 决定价格对象、webhook 事件与退款 API；交易主体/销售流程影响税务和合同。必须先选 provider、merchant of record 或人工开票路径，以及谁能创建/更换付款方式。
2. **计价单位和币种：** 是按组织、席位、活跃用户、团队还是用量计费？单币种还是多币种、价格固定还是地区化？这会决定 entitlement 主键、用量归属、汇率/价格快照及账单显示。不得从现有一组织可有成员/团队推导应按席位或团队收费。
3. **销售地区与税费：** 服务地区、含税/未税展示、税率与税务计算责任必须由负责商业/财务/法律流程的人确认。技术实现会涉及结账地址、发票明细、税务 provider 和数据保留；不能假设页面美元就代表服务地区或税务处理已定。
4. **计费周期、续费与试用：** 预付/后付、月/年、按比例折算、试用天数、试用是否需付款方式、试用结束行为会改变状态机和授权生效/终止时点。页面的 `/month` 单独不足以定义这些行为。
5. **取消、退款、争议与降级：** 取消立即生效还是周期末、退款资格、付款失败宽限期、争议/拒付处理、降级后超额数据如何处理（只读、禁止新增、保留或删除）、升级是否按比例计费。这些会影响客户承诺、合规和不可逆数据处理；代码不能替产品选择。
6. **服务等级承诺：** 24/7 支持的渠道、响应目标、适用地区与节假日覆盖，SLA 的可用性定义、测量区间、排除项、服务抵扣与索赔流程都必须定义。仅有页面标签并不能形成监控或履约能力。
7. **计量和额度语义：** “成员”“团队”“存储”“请求”等计数定义、删除/禁用是否释放、峰值还是周期累计、超限告警/阻断、并发竞态、既有组织过渡都需要业务决策，再由服务端可靠执行。

这些决定必须先于 schema/provider 选择：例如按组织订阅与按席位计费的数据库基数不同；按月用量与固定功能 entitlement 的计量/聚合边界不同；周期末取消与立即取消的权限截止时间不同。价格模型会决定订阅、价格快照、用量、支付事件与授权缓存的关系。过早实现会把假设固化成迁移、API 和用户数据转换。

## 6. 仅供讨论的候选价格结构（未批准）

> **状态：未批准/未报价/不构成商业规则。** 本节没有确认价格、地区、货币、功能权益、容量上限、试用或 SLA。名称只用于帮助负责人比较计价结构；最终也可选择不同结构或暂不公开价格。
>
> **首轮建议讨论稿：** 以组织作为购买主体，按月/年固定订阅，并给每个组织一个待确认的成员额度；先不按 API 请求或团队使用量计费。组织是权限、成员、团队和审计数据的租户单位，Owner 转让后也能保持订阅归属；仓库没有可计费用量采集或成本归因，因此用量计费目前没有可信计量基础。若客户访谈显示按席位更符合采购习惯，可将“计费主体仍是组织、价格随活跃成员数分档”作为替代。该推荐仍须结合目标客户、地区、成本和现有客户数据确认，不能直接作为生产规则。

| 候选层级（临时标签）          | 价格字段                           | 可供产品讨论的边界                                                              | 代码/政策落地前提                                                                                           |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Free / 入门                   | **待产品决定**                     | 是否免费、免费层是否按组织计价及允许哪些已实现能力。                            | 先定义免费资格与组织创建/配额关系；不要把现有角色或 `maximumTeams: 10` 自动当权益。                         |
| Team / 付费自助               | **待产品决定**                     | 是否以组织订阅为主体；付费解锁哪些已实现能力；如按席位/用量计费则明确计量单位。 | 确认 provider、价格/周期、席位计数和付款失败/取消规则；服务端 entitlement 与每次写操作检查。                |
| Enterprise / 协商报价（可选） | **不公开固定金额，是否提供待决定** | 是否支持销售洽谈、合同价格、企业采购要求；只列出确有运营与工程能力履行的项目。  | 明确销售联系人/合同与发票流程；若承诺 SLA、定制集成或 24/7 支持，先定义运营覆盖与合同文本、监控及补救机制。 |

这是结构而非推荐的三个最终 SKU。若首发只需单一付费层级或人工报价，技术模型不应强制 Free/Team/Enterprise 三层；也不应在没有市场和成本证据的情况下补写数值价格。产品可先讨论“一个核心组织计划 + 按成员数分档 + Enterprise 协商”的简化结构；Free 是否长期保留、各档成员/团队/组织数以及金额都待决。

## 7. 下一步决策顺序

### 由产品/商业负责人拍板

1. 选择计费主体与价值计量单位（组织、席位、使用量、混合或非计量）。
2. 明确初始市场/销售地区、货币显示和税务责任；选 provider 与销售/商户主体。
3. 确认 SKU 数量、权益定义、是否公布金额，以及哪些是“包含功能”还是服务/支持承诺。
4. 定义计费周期、试用、付款失败、取消、退款、降级和超额后的规则。
5. 若保留 Enterprise、SLA 或全天候支持，确认联系人、响应级别、合同条款、监控和履约团队。
6. 确认现有 10-team 插件限制的去留和语义，以及已有组织切换规则；把商业上限与安全/产品硬性限制分开决定。

### 决策后再做架构设计

1. 选定 provider 与交易主体后，研究其官方 webhook、订阅状态、幂等和税务 API；产出 ADR/接口状态机。
2. 定义计划版本、价格快照、订阅主体、provider reference、支付事件、entitlement 与用量实体；迁移与历史数据策略需先可审阅再执行。
3. 规定续费/取消生效时刻、付款失败宽限及降级数据处置；webhook 更新应幂等，服务端在敏感操作处即时检查当前 entitlement。
4. 定义额度的原子强制路径，审查直接 Better Auth、oRPC、SSR 和异步/批量入口是否有旁路；读权限、已有记录访问与新增/扩容操作的行为分别定义。
5. 在产品政策批准前保持价格文本与业务逻辑分离；避免在授权角色、客户端查询缓存或单个 UI 常量中写入计价规则。

## 8. 落地优化与验证

审查后已直接修正不依赖商业规则的项目问题：

- `/pricing` 移除了原模板中的 `$0/$29/$99`、未实现的支持等级、品牌定制、分析、集成和 SLA 承诺；当前只展示代码支持的组织成员/角色、团队和审计功能，并明确价格和配额尚未设定。注册链接保留为自助入口，不再把“Contact Sales”伪装成实际联系流程。
- `/about` 移除了 `support@example.com`、旧金山地址、客服时间、招聘和社交媒体占位内容，改为描述当前已实现功能；Footer 的 Terms/Privacy 原本都返回首页，因没有真实法律页面而移除了失效入口。
- 根页面默认标题改为 `Org SaaS`，About/Pricing 增加独立标题和描述；嵌套路由覆盖行为依据 TanStack Router 官方 head 管理文档。
- `dashboard.orgStats` 改为复用组织契约的 `organizationIdSchema`，统一要求非空且最多 200 字符。
- 测试工作区的 `@better-auth/core` 从旧的独立 `1.7.7` 声明改为 workspace catalog，与 Better Auth 1.7.11 对齐；冻结锁文件安装验证通过。
- 根布局只在 `import.meta.env.DEV` 时渲染 TanStack Devtools。

验证结果：

- `vp install --frozen-lockfile`：914 个安装项核验通过，无锁文件变更。
- `vpr check`：210 个文件通过格式、lint 和 TypeScript 检查。
- `vp test`：49 项通过、11 项跳过；`PERMISSION_TEST_DATABASE_URL` 未设置，跳过的是 PostgreSQL 依赖场景。
- `vp run --filter web build`：成功；TanStack Vite 插件确认生产构建移除了根布局的 Devtools 代码，生成 bundle 中没有 Devtools 组件符号。主客户端 chunk 为 537.33 kB（gzip 165.65 kB），仍超过 500 kB 提示阈值。
- 没有添加支付依赖、订阅表或数据库迁移；实际价格、地区、币种、计费主体和服务条款尚未确认。

## 9. 参考的一手来源

### 仓库研究规范与项目实现

- 本次调查遵循会话提供的 research skill（位于仓库外的 agent 配置目录）；其要求是优先一手来源、逐项引证并写入单一 Markdown 报告。
- [Drizzle 最佳实践调查（文风参考）](drizzle-best-practices.md)：静态观察、建议、来源与边界说明。
- [权限架构](../architecture/authorization.md)、[权限实施计划](../implementation/permissions.md)、[请求与数据流](../architecture/request-data-flow.md)：已批准的授权事实与请求路径。
- [Web 应用约定](../../apps/web/AGENTS.md)、[API 约定](../../packages/api/AGENTS.md)、[Auth 约定](../../packages/auth/AGENTS.md)、[DB 约定](../../packages/db/AGENTS.md)：仓库本地工程约束。
- [当前价格页](../../apps/web/src/routes/_public/pricing/index.tsx)、[Better Auth 服务端配置](../../packages/auth/src/index.ts)、[oRPC implementer](../../packages/api/src/index.ts)、[Drizzle 实例](../../packages/db/src/index.ts)。

### Better Auth 官方文档

- [Better Auth — Organizations](https://www.better-auth.com/docs/plugins/organization)：组织、成员、团队、访问控制及插件选项。
- [Better Auth — Access Control](https://www.better-auth.com/docs/plugins/access)：资源/操作词表、静态和动态角色能力。
- [Better Auth — Admin plugin](https://www.better-auth.com/docs/plugins/admin)：平台级用户管理与角色插件。
- [Better Auth — Email & Password](https://www.better-auth.com/docs/authentication/email-password)：邮箱密码、验证与密码重置选项。
- [Better Auth — Rate limiting](https://www.better-auth.com/docs/concepts/rate-limit)：默认限流和存储行为；具体值需按 1.7.11 锁定版核实。
- [Better Auth — Security](https://www.better-auth.com/docs/reference/security)：trusted origins、CSRF、Cookie 与安全配置。
- [Better Auth — Two Factor](https://www.better-auth.com/docs/plugins/2fa)：TOTP、备份码及客户端配套能力。
- [Better Auth — Drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle)：Better Auth 与 Drizzle schema/adapter 关系。

### TanStack 官方文档

- [TanStack Router — React overview](https://tanstack.com/router/latest/docs/framework/react/overview)：文件路由、loader、导航与类型化路由。
- [TanStack Start — React overview](https://tanstack.com/start/latest/docs/framework/react/overview)：SSR、Server Functions、middleware 和应用边界。
- [TanStack Query — React overview](https://tanstack.com/query/latest/docs/framework/react/overview)、[SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)：query key、缓存、预取和 SSR。
- [TanStack Form — React overview](https://tanstack.com/form/latest/docs/framework/react/overview)、[Validation](https://tanstack.com/form/latest/docs/framework/react/guides/validation)：表单状态与验证集成。
- [TanStack Devtools](https://tanstack.com/devtools/latest)：开发调试面板及插件。
- [TanStack Table](https://tanstack.com/table/latest/docs/introduction)：无头表格及手动服务端排序/分页。
- [TanStack Virtual](https://tanstack.com/virtual/latest/docs/introduction)：虚拟列表与测量 API。
- [TanStack Store](https://tanstack.com/store/latest/docs/overview)：底层响应式 store。
- [TanStack AI](https://tanstack.com/ai/latest/docs/overview)、[TanStack DB](https://tanstack.com/db/latest/docs/overview)、[TanStack Pacer](https://tanstack.com/pacer/latest/docs/overview)、[TanStack Ranger](https://tanstack.com/ranger/latest/docs/overview)：各库官方边界与功能介绍。
- [TanStack CLI](https://tanstack.com/cli/latest/docs)、[TanStack Config](https://tanstack.com/config/latest/docs)：脚手架与配置工具资料。

### oRPC 与 Drizzle 官方文档/源码

- [oRPC — Contract First](https://orpc.dev/docs/contract-first)：契约优先的输入/输出定义与 handler 实现。
- [oRPC — Error Handling](https://orpc.dev/docs/error-handling)：类型化错误传播与处理。
- [oRPC — TanStack Query Integration](https://orpc.dev/docs/integrations/tanstack-query)：Query options、缓存与 oRPC 客户端集成。
- [Drizzle — PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg)、[Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints)：schema 类型、约束和索引。
- [Drizzle — Transactions](https://orm.drizzle.team/docs/transactions)、[node-postgres connection](https://orm.drizzle.team/docs/connect-node-postgres)：事务和驱动用法。
- [Stripe — Per-seat pricing](https://docs.stripe.com/subscriptions/pricing-models/per-seat-pricing)、[Tiered pricing](https://docs.stripe.com/subscriptions/pricing-models/tiered-pricing)：列出可实现的计价形式；不构成对本产品应采用哪种形式的建议。
- [Drizzle ORM 官方 GitHub](https://github.com/drizzle-team/drizzle-orm)：如需核实 RC 行为，应查看与 lockfile 精确匹配的 tag/包源码；当前调查没有读取该版本安装包源码。

---

**验证与限制：** 静态研究阶段没有连接数据库或执行迁移。随后代码修正和验证记录见“落地优化”；价格条款和支付实现仍取决于尚未确认的商业规则。
