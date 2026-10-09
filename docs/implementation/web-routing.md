# Web 路由重构实施计划

## 1. 状态与依据

状态：路由迁移阶段 0–5 已实施。组织身份外层按明确 slug 解析成员和状态，原有组织 URL 位于 `_active`，归档恢复使用兄弟分支；平台 Admin 与组织角色路由已接入独立权限检查。后台 `_active` 和 `admin` 使用 `data-only`，直接请求、刷新、客户端导航及浏览器返回已在隔离 PostgreSQL 数据和浏览器中验证。验证细节见第 11 节；GitHub issue #8–#10 跟踪分层、管理路由和生成树回归。

- [目标路由结构与布局职责](../architecture/code-organization.md#已确认的目标路由结构)
- [入口与导航规则](../architecture/request-data-flow.md#已确认的入口与导航规则)
- [权限架构](../architecture/authorization.md)
- [权限实施计划](permissions.md)
- [Web 开发约定](../../apps/web/AGENTS.md)

本计划复用现有 TanStack Start / Router、Query 与 Better Auth，不引入新的路由框架或全局 `features/`。阶段完成情况及当前运行验证按下文记录。

## 2. 范围与计划分工

本计划负责路由节点、URL 兼容、页面布局、登录导航、邀请流程及权限结果的页面接入。权限计划负责平台 Admin、动态角色策略、组织状态接口、归档／恢复及服务端访问限制。

| 内容           | 本计划职责                                          | 前置条件                               |
| -------------- | --------------------------------------------------- | -------------------------------------- |
| 公开与认证布局 | `_public`、`_auth`，公开首页不因登录改变            | 当前页面可迁移                         |
| 共享登录层     | `_authenticated`，提供用户上下文和登录返回地址      | 复用请求级 Session getter              |
| 个人中心       | `/dashboard` 迁移至 `/me`，资料、组织列表与创建入口 | 当前个人及组织能力                     |
| 组织布局       | 组织上下文外层、正常业务 `_active`、独立归档页      | 状态与权限结果由权限计划提供           |
| 平台布局       | `/admin` 平台守卫与导航                             | Admin 及最小平台权限已落实             |
| 角色页面       | 放置在正常组织分支，并接入相应操作检查              | 动态角色管理能力由权限计划提供         |
| 收藏与资源详情 | 保留目标位置和布局边界                              | 实际业务模型另行确定，不在本重构中实现 |
| API            | 保持直接 HTTP 接入，不纳入页面布局                  | 现有 handler 与独立服务端认证          |

不能为了完整画出目标树而提前开放没有服务端支持的管理页面。没有收藏业务时，不显示可误认为已经可用的收藏入口；不新增收藏表或资源接口。

## 3. 当前代码基线

下表保留实施前核对的迁移基线；已迁移文件的链接指向现有入口。后续开工仍需重新扫描 routes、生成树和所有链接，当前完成情况以第 6 节为准。

| 入口                                                                                | 当前状态                                  | 迁移方向                                   |
| ----------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| [根路由](../../apps/web/src/routes/__root.tsx)                                      | 全站 Provider、提示与错误处理             | 保留，不承担某个空间的导航                 |
| `(public)/route.tsx` 及页面                                                         | 公共布局，含首页、about、pricing、landing | 迁移 `_public`，保持全部已有公开 URL       |
| `(auth)/login.tsx`                                                                  | 登录直接挂根                              | 放 `_auth`，保持 `/login`                  |
| [现有邀请页面](../../apps/web/src/routes/invite/$token.tsx)                         | 独立页面，当前接受后前往 dashboard        | 移至根下 invite，接受后进入实际目标组织    |
| [现有个人布局](../../apps/web/src/routes/_authenticated/me/route.tsx)               | 自身 beforeLoad 读取登录态，带个人导航    | `/me` 布局，共享登录检查交父层             |
| dashboard 首页、profile、orgs/new                                                   | 组织列表、资料及组织创建                  | 拆到个人首页、组织列表、设置和创建页面     |
| [组织布局](../../apps/web/src/routes/_authenticated/org/$orgSlug/route.tsx)         | 同时组织解析、导航及会话 active 切换      | 组织身份与状态外层，正常导航拆到 `_active` |
| 组织概览、members、teams、settings                                                  | 现有组织页面及就近组件                    | 移到 `_active` 下，URL 保持原样            |
| [登录表单](../../apps/web/src/components/sign-in-form.tsx)                          | 成功后前往 `/dashboard`                   | 有效返回地址优先，否则 `/me`               |
| [组织切换器](../../apps/web/src/components/org-switcher.tsx)                        | 创建入口指向 `/dashboard/orgs/new`        | 使用新个人组织创建地址                     |
| [Router](../../apps/web/src/router.tsx)与[守卫](../../apps/web/src/utils/guards.ts) | QueryClient、默认 fallback、静态访问检查  | 配合新 route ID、登录跳转与页面权限        |

文件夹名不是访问策略。括号分组不增加 URL，也不自动创建布局；`_` 前缀布局不增加 URL，`route.tsx` 承载节点。`-components` 排除页面私有文件。生成 route ID 会变化，但不能因此改变对外 URL 或手工修改生成树。

## 4. URL 与文件迁移映射

下表只定义目标位置及地址，实际 `createFileRoute` 字面量和父子关系由当前生成工具确定并验证。

| 当前地址／入口                           | 目标地址                | 目标位置或处理                                          |
| ---------------------------------------- | ----------------------- | ------------------------------------------------------- |
| `/`                                      | `/`                     | `_public/index.tsx`                                     |
| `/about`                                 | `/about`                | `_public` 下对应页面，可保持目录式文件                  |
| `/pricing`                               | `/pricing`              | `_public` 下对应页面                                    |
| `/landing`                               | `/landing`              | 保留现有额外公开页，迁入 `_public`，不因简化目标树遗漏  |
| `/login`                                 | `/login`                | `_auth/login.tsx`                                       |
| `/invite/$token`                         | 原地址                  | `invite/$token.tsx`，在共享登录层外                     |
| `/dashboard`                             | `/me`                   | `_authenticated/me/index.tsx`，旧地址重定向             |
| `/dashboard/profile`                     | `/me/settings/profile`  | `_authenticated/me/settings/profile.tsx`，旧地址重定向  |
| `/dashboard/orgs/new`                    | `/me/organizations/new` | `_authenticated/me/organizations/new.tsx`，旧地址重定向 |
| 当前首页中的组织列表                     | `/me/organizations`     | 拆分独立列表，个人首页保留组织入口                      |
| `/org/$orgSlug`                          | 原地址                  | `_authenticated/org/$orgSlug/_active/index.tsx`         |
| 组织 members、teams、team 详情、settings | 原地址                  | `_active` 下对应路由及就近组件                          |
| `/org/$orgSlug/roles`                    | 新地址                  | `_active` 下角色页面，与权限计划协同                    |
| `/org/$orgSlug/archived`                 | 新地址                  | 组织外层的兄弟恢复页面，owner 专用                      |
| `/admin/users`、`/admin/organizations`   | 新地址                  | `_authenticated/admin`，平台权限完成后开放              |
| `/api/auth/*`、`/api/rpc/*`              | 原地址                  | 原协议入口，留在根 API 分支                             |

旧地址按实际页面逐项映射，不把未知 `/dashboard/*` 全部静默转到 `/me`。重定向保留目标页面认可的查询参数，客户端导航处理适用的 fragment，验证 trailing slash 行为。新增页面布局后更新所有 Link、navigate、回调地址、测试及 route ID 消费点，不能只移动文件。

## 5. 布局与上下文约定

| 节点             | 检查                       | 提供给子层的内容                                                    |
| ---------------- | -------------------------- | ------------------------------------------------------------------- |
| `__root`         | 全站基础行为               | Router／Query 与基础 Provider                                       |
| `_authenticated` | 是否登录，处理有效返回地址 | 适合页面使用的用户上下文，不携带凭证或服务端实例                    |
| `me`             | 继承登录检查               | 个人导航，不加载组织内部业务                                        |
| `org/$orgSlug`   | 目标组织成员身份、可见状态 | orgId、slug、成员身份及受限状态，不依赖正常业务查询才能建立恢复入口 |
| `_active`        | 正常组织状态               | 正常组织导航；具体页面继续检查操作权限                              |
| `archived`       | owner 身份及适用状态       | 受限状态与恢复结果，不加载正常业务数据                              |
| `admin`          | 平台访问资格               | 平台导航；各页面检查对应平台操作                                    |
| `api`            | 自身 Session／权限策略     | HTTP handler 的请求 context，失败保持协议错误                       |

组织外层和 `_active` 分工避免归档恢复死锁；不能通过在父层提前读取完整组织、团队或统计来阻断恢复页面。按权限计划提供的最小组织上下文实现。

保留 `@org-saas/auth/session` 的请求级 getter；共享页面登录检查不替代业务 API 的独立认证和组织检查。布局、loader 和 SSR 中的浏览器可见数据排除 Cookie、token、数据库或认证服务实例。

## 6. 分阶段实施

### 阶段 0：迁移清单与生成行为核对

- [x] 阅读 Web、Auth 及涉及的 API／UI 约定，重新核对生成工具版本与文件命名语义。
- [x] 列出现有 URL、route ID、布局、搜索参数、跳转及回调；盘点硬编码字符串和类型断言。
- [x] 记录首页、登录、邀请、个人设置、创建组织、组织成员／团队及 API 的现有行为。
- [x] 形成文件迁移与旧地址重定向清单：[web-routing-inventory.md](web-routing-inventory.md)。

完成条件：阶段 0 已完成；组织及管理路由的实现条件继续受权限计划约束。

### 阶段 1：公开、认证与共享登录节点

- [x] 迁移公共布局至 `_public`，保留公开 URL，登录页移至 `_auth`，邀请保持独立分支。
- [x] 建立 `_authenticated` 登录检查和安全返回地址校验；登录／注册成功使用有效目标，否则进入 `/me`。
- [x] 已登录无权限继续使用拒绝访问错误，API handler 保持协议入口。

完成条件：路由结构及构建验证通过；见下方交付检查与 GitHub issue #5。

### 阶段 2：个人空间与旧链接兼容

- [x] 将个人首页、组织列表、组织创建和资料设置迁至 `/me` 对应页面。
- [x] 更新组织切换器、公开用户菜单、个人导航和组织返回入口。
- [x] 为 `/dashboard`、`/dashboard/profile`、`/dashboard/orgs/new` 提供逐项重定向，保留搜索参数及 hash；未知子路径不兜底。
- [x] 不开放未实现的收藏或资源功能。

完成条件：已知个人功能迁移且 Web build 通过；见 GitHub issue #6。

### 阶段 3：组织布局分层

- [x] 组织外层按请求用户和显式 slug 解析成员资格及归档状态；不依赖 Better Auth 的 active-organization 状态。
- [x] 现有概览、成员、团队、团队详情及设置路由位于正常 `_active` 分支，URL 保持不变。
- [x] 归档 owner 状态与恢复页面是 `_active` 的兄弟分支，不预取普通组织业务数据。
- [x] 归档状态、恢复及成员／操作权限由服务端 API 检查；前端路由按返回状态分流。

### 阶段 4：邀请与平台管理接入

- [x] 邀请页保留在共享登录布局之外；未登录时返回邀请地址，接受成功后导航到服务端确认的目标组织（GitHub issue #7）。
- [x] 归档组织的邀请与普通组织操作由服务端拒绝，邀请页显示 Better Auth 返回的错误信息。
- [x] 平台 Admin 用户／组织页面和组织角色页面使用独立布局及相应平台／组织权限检查。
- [x] 浏览器验证组织 admin 即使可以管理组织，也不能访问 `/admin/users`。

### 阶段 5：生成、验证与交付

- [x] 通过现有工具生成 route tree；未手工编辑生成树。
- [x] 扫描旧 `/dashboard` 引用；仅具体兼容路由保留该前缀。
- [x] `vpr check` 与 Web build 已运行；当前完整检查受 Fumadocs 生成集合缺失影响，详见第 11 节。
- [x] SSR、浏览器直接请求／刷新／客户端导航／返回、组织访问与邀请流程已回归；记录在第 11 节。
- [x] 更新架构实现状态、权限前置条件和实际检查结果；issue #8–#10 是本次路由交付入口。

完成条件：阶段 0–5 均已实现，剩余检查只记录环境中实际存在的阻塞。

## 7. 与权限实施计划的执行关系

路由阶段 0–5 已落地。权限计划 issue #11 已提供组织访问上下文、归档生命周期、动态角色及平台管理 API；本计划负责将这些能力接入正确布局与导航，并验证页面访问结果。两计划共用页面，不重复实现业务契约。

本路由重构自身不需要改变持久化模型。若同时推进归档或 Admin，数据库生成、连接目标确认与应用变更仍按权限计划和 DB 约定执行，不归入“移动路由文件”自动处理。

## 8. 页面私有代码与加载方式

路由文件只承载参数、搜索验证、守卫、加载及页面接入。复杂页面的表格、表单和对话框就近放 `-components/`；只有实际跨页面复用才提取到 `src/components/`，多端业务保持共享 API。

查询复用既有 QueryClient 和 query options，loader 预取与组件消费保持一致。用户／组织切换清理或失效适用缓存，角色与组织状态变化更新 route context。SSR 凭证传递及缓存水合按实际集成验证，不能只通过客户端点击证明 SSR 可用。

编码细节由 Web 约定维护，本计划不复制表单、对话框及 UI 规则。

## 选择性 SSR 的实施与验收

策略见 [请求与数据流](../architecture/request-data-flow.md#已确认的选择性-ssr-策略)：公开、登录、邀请、个人空间、共享登录层、组织身份外层与归档页面保留完整 SSR；组织正常后台 `_active` 和平台 `admin` 设置 `ssr: 'data-only'`。

- [x] 全局 SSR 默认开启；根、`_authenticated` 和组织身份外层没有设置 `false`／`data-only`。
- [x] 仅在 `_active` 与 `admin` 子布局设置 `data-only`，归档恢复作为兄弟页面保留完整 SSR。
- [x] 对组织 overview 和平台用户页面检查首个 HTML：服务端守卫／loader 执行，输出 pending fallback，不包含统计卡片或用户表格数据；浏览器 hydration 后显示数据。
- [x] 对 owner 归档恢复页检查服务端响应和恢复交互；普通业务分支不加载归档组织数据。
- [x] 对组织 overview 完整刷新检查客户端 Query cache 含已完成的访问上下文与统计查询；性能记录未出现 `/api/rpc` 或 `/api/auth` 重复请求。
- [x] 对平台用户页面检查客户端 Query cache 成功并显示结果；平台接口仍独立进行服务端授权。
- [x] 验证登录返回、邀请接受、组织切换和访问拒绝均不因 SSR 模式改变。所有数据接口继续独立检查身份、组织和操作权限。

直接请求、刷新、客户端导航与浏览器返回均已验证。验证证据及完整检查状态见第 11 节。

## 9. 验收场景

| 场景                                           | 期望结果                                                  |
| ---------------------------------------------- | --------------------------------------------------------- |
| 未登录或已登录访问 `/`                         | 都是公开首页，不自动跳个人中心                            |
| 直接打开 `/about`、`/pricing`、`/landing`      | 页面与公开布局保留                                        |
| 未登录访问 `/me` 或组织／平台页面              | 跳登录并保留有效返回地址                                  |
| 登录成功无有效返回地址                         | 进入 `/me`                                                |
| 登录成功返回无访问资格的组织／平台页面         | 显示拒绝访问，不循环登录                                  |
| 外部 URL、协议相对地址、异常编码或循环登录目标 | 不产生外部或循环跳转，按默认目标处理                      |
| 旧 dashboard 首页、profile、创建组织地址       | 分别到对应新页面，查询与 trailing slash 行为正确          |
| 新链接、菜单及类型化 route ID                  | 不依赖旧地址，生成树无重复匹配                            |
| 在个人、组织、平台之间导航                     | 同一账号，各自布局与上下文正确，不重复套业务导航          |
| 个人中心查看组织入口                           | 仅展示获准的基础关联信息，不混入组织内部业务              |
| 正常组织成员访问既有组织页面                   | 地址保持不变，页面与私有组件可用                          |
| 组织非成员访问或切换其他 slug                  | 页面与服务端均拒绝，不复用旧组织上下文                    |
| 两个标签页／预加载进入不同组织                 | 请求数据及成员身份与明确目标组织一致                      |
| 归档组织 owner 直接刷新 archived 页面          | 能查看受限状态及恢复，不被 `_active` 父层阻断             |
| 非 owner 访问归档恢复或归档组织普通业务        | 拒绝，无普通业务预取及受限数据泄漏                        |
| owner 恢复后进入正常组织页面                   | 状态、缓存、布局与操作权限重新检查                        |
| 未登录访问邀请链接                             | 能进入最小邀请流程并引导登录                              |
| 不匹配账号、过期／撤销／归档邀请               | 明确反馈，服务端不允许接受                                |
| 有效邀请接受成功                               | 进入实际目标组织，不固定跳个人中心                        |
| 组织 admin 访问平台 admin 页面                 | 拒绝；平台权限独立判断                                    |
| 未认证直接访问 API                             | 保持协议错误，不返回页面登录跳转                          |
| 已认证 API、健康检查、认证 endpoint            | 不因页面布局迁移改变 URL 或协议                           |
| 客户端导航、SSR 直接请求、刷新和浏览器返回     | 同一权限语义，布局正确，无重定向循环                      |
| 公开内容、个人空间及归档页面首次请求           | 按 `true` 渲染，保持对应访问检查                          |
| `_active`／`admin` 后台首次请求                | 服务端执行 beforeLoad／loader，输出占位，组件在浏览器显示 |
| 后台未登录或无权限请求                         | 在数据传递前跳转／拒绝，不泄漏加载结果或上下文            |
| 后台 `data-only` 后的客户端导航及 Query 缓存   | 继续独立服务端授权，预取数据与缓存消费一致                |
| 父子 SSR 配置                                  | 共享父层保持 `true`，后台限制不影响兄弟归档页面           |
| 收藏等尚未实现的功能                           | 不出现误导性可用入口，资源地址不提前定型                  |

## 10. 开工与交付清单

- [x] 核对 URL、route ID、布局、所有跳转及生成行为。
- [x] 完成 `_public`、`_auth` 和共享登录节点。
- [x] 完成登录返回地址校验与登录／拒绝访问分流。
- [x] 迁移 `/me`、资料、组织列表及组织创建。
- [x] 完成已知 dashboard URL 的映射重定向和新引用更新。
- [x] 对接权限能力，拆分组织身份外层、`_active` 和归档分支（依赖 issue #11 已关闭）。
- [x] 完成邀请登录返回与目标组织导航；归档组织邀请由服务端拒绝并显示返回错误。
- [x] 接入独立 Admin 与角色布局；组织 admin 无平台管理资格。
- [x] 配置组织及平台后台 `data-only`，验证首次服务端检查、fallback、hydration、Query cache 和继承边界。
- [x] 完成生成树、Web build、浏览器路由回归及架构文档更新；全仓检查的 Fumadocs 阻塞准确记录。

## 11. 本次验证记录

### 路由与浏览器行为

- Web build 按工具流程生成 `routeTree.gen.ts`；检查到 28 个 fullPath 均唯一，组织 `_active`／`archived` 兄弟节点、`admin` 布局及成员、团队、团队详情、设置和角色地址均存在。旧 dashboard 路由仅保留三条明确兼容重定向，未知子路径显示 Not Found。
- 直接请求、刷新和客户端导航通过浏览器验证。旧 `/dashboard`、`/dashboard/profile`、`/dashboard/orgs/new` 的参数及 fragment 均保留；组织 overview、members、teams、team detail、settings 和 roles 路由可用；客户端进入成员页后浏览器返回恢复 overview。
- 未登录邀请流程覆盖注册后返回原 invitation URL、接受邀请后进入服务端确认的组织；登录流程也覆盖邀请返回。认证成功后清理 session 查询缓存，避免旧的匿名状态阻止邀请页加载。
- owner 直接访问归档恢复页可见完整归档状态；首个 HTML 有恢复入口且没有成员／邀请业务数据。访问归档组织的普通业务路由会回到归档页，恢复后进入正常 overview。
- 组织 `admin` 角色可访问自身组织管理页面，但直接请求 `/admin/users` 被平台守卫拒绝。平台管理员可访问 `/admin/users` 与 `/admin/organizations`；封禁原因必填，浏览器验证封禁及解封状态更新。
- `/api/auth/get-session` 直接返回 JSON 协议响应；API 请求不落入页面布局。

### SSR 与 Query

- 组织 overview 和平台用户页的完整刷新响应均为 HTTP 200，并以 SSR pending fallback 开始；组织统计卡片和平台用户表格数据不在首个 HTML 中。浏览器 hydration 后页面显示内容，客户端 Query cache 中相应查询状态为 success。
- owner 归档恢复页首个 HTML 含恢复内容，展示的是受限状态 DTO。组织 overview 的 Resource Timing 中没有 `/api/rpc` 或 `/api/auth` 重复请求。

### 构建与仓库检查

- Web build：`vp run --filter web build` 通过，并完成 route tree 生成。
- `vpr check`：格式化通过；全仓检查仍有 5 个 Fumadocs 生成集合类型错误（缺失 `fumadocs-mdx:collections/server`、`browser`，及其引发的 3 项隐式 `any`）。错误位于 `apps/fumadocs`，与本次 Web 路由改动无关。
- `git diff --check`：提交前审阅时运行。
