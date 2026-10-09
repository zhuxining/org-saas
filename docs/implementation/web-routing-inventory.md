# Web 路由迁移清单（Issue #4）

扫描基线：集成分支 `feat/web-routing-refactor`，HEAD `d31ce6d3f51b4b88156f11288e942ed0a0e44451`。本文记录当前代码行为，供后续迁移回归；目标位置来自 [web-routing.md](web-routing.md) 和 [code-organization.md](../architecture/code-organization.md#已确认的目标路由结构)。本票只做清点，不代表目标结构或权限能力已实现。

## 路由源文件、URL 与 route ID

TanStack 生成树位于 `apps/web/src/routeTree.gen.ts`，以下 ID 为生成器当前产物；ID 是内部路由身份，URL 是对外地址。括号目录不增加 URL，但保留在部分 ID 中；`route.tsx` 建立布局节点，目录 `index.tsx` 的生成 fullPath/ID 含尾斜杠，而 Link 的 `to` 通常不含尾斜杠。`$` 表示参数，`.$` 表示 splat。应改路由源文件并重新生成，不能手改生成树。

| 路由源文件                               | 当前 URL                      | 当前 route ID                 | 布局／行为                                                                            |
| ---------------------------------------- | ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `routes/__root.tsx`                      | 根                            | `__root__`                    | Theme、Tooltip、Toaster、Outlet、全局错误页                                           |
| `routes/(public)/route.tsx`              | 无路径                        | `/(public)`                   | 公开布局，包裹公开页面                                                                |
| `routes/(public)/index.tsx`              | `/`                           | `/(public)/`                  | 公开首页                                                                              |
| `routes/(public)/about/index.tsx`        | `/about`                      | `/(public)/about/`            | 关于页                                                                                |
| `routes/(public)/pricing/index.tsx`      | `/pricing`                    | `/(public)/pricing/`          | 定价页                                                                                |
| `routes/(public)/landing/index.tsx`      | `/landing`                    | `/(public)/landing/`          | 落地页                                                                                |
| `routes/(auth)/login.tsx`                | `/login`                      | `/(auth)/login`               | 根下登录/注册切换；当前无认证布局                                                     |
| `routes/(auth)/invite/$token.tsx`        | `/invite/$token`              | `/(auth)/invite/$token`       | 根下独立邀请页；没有会话守卫或邀请信息预取                                            |
| `routes/dashboard/route.tsx`             | `/dashboard`（布局节点）      | `/dashboard`                  | `requireSession`；个人导航及 OrgSwitcher                                              |
| `routes/dashboard/index.tsx`             | `/dashboard`                  | `/dashboard/`                 | 查询组织列表，提供创建入口与组织卡片                                                  |
| `routes/dashboard/profile/index.tsx`     | `/dashboard/profile`          | `/dashboard/profile/`         | 从父布局 context 读取 user，更新个人资料                                              |
| `routes/dashboard/orgs/new.tsx`          | `/dashboard/orgs/new`         | `/dashboard/orgs/new`         | 创建组织，成功去新组织；取消回 dashboard                                              |
| `routes/org/$orgSlug/route.tsx`          | `/org/$orgSlug`（布局节点）   | `/org/$orgSlug`               | resolveOrgBySlug；成员资格失败 Forbidden；同时承载组织导航和 OrgContext               |
| `routes/org/$orgSlug/index.tsx`          | `/org/$orgSlug`               | `/org/$orgSlug/`              | 组织概览                                                                              |
| `routes/org/$orgSlug/members/index.tsx`  | `/org/$orgSlug/members`       | `/org/$orgSlug/members/`      | 成员管理页                                                                            |
| `routes/org/$orgSlug/teams/index.tsx`    | `/org/$orgSlug/teams`         | `/org/$orgSlug/teams/`        | 团队列表                                                                              |
| `routes/org/$orgSlug/teams/$teamId.tsx`  | `/org/$orgSlug/teams/$teamId` | `/org/$orgSlug/teams/$teamId` | 团队详情                                                                              |
| `routes/org/$orgSlug/settings/index.tsx` | `/org/$orgSlug/settings`      | `/org/$orgSlug/settings/`     | 组织设置                                                                              |
| `routes/api/auth.$.ts`                   | `/api/auth/$`                 | `/api/auth/$`                 | GET/POST 原样交给 `auth.handler(request)`                                             |
| `routes/api/rpc.$.ts`                    | `/api/rpc/$`                  | `/api/rpc/$`                  | HEAD/GET/POST/PUT/PATCH/DELETE；oRPC 与 OpenAPI handler，共用 request headers context |

Router 在 `src/router.tsx` 开启 scroll restoration、intent preload，预加载 stale time 为 0；QueryClient 查询 stale time 为 1 分钟。`__root` 和 Router 分别提供路由级与默认错误处理。公开布局文件是显式 layout，不会因 `(public)` 目录本身产生。

## 搜索参数、认证和页面行为

- 路由源文件没有 `validateSearch`、`Route.useSearch` 或自定义搜索 schema。唯一被明确传递的搜索键是 `redirect`：`UnauthorizedError.toRedirect()` 与 `UnauthorizedPage` 将 `window.location.href` 放入 `/login?redirect=...`。登录路由未读取该参数，登录、注册成功均固定导航 `/dashboard`，所以当前返回地址尚未闭环；`window` 读取还需在 SSR 边界核对。
- 公开页 `/`、`/about`、`/pricing`、`/landing` 无登录守卫。公开页和用户菜单的多处登录链接传 `search={{ redirect: undefined }}`，显式清空返回目标。
- `/dashboard` 布局调用 `requireSession`；未登录抛 `UnauthorizedError`，默认目标 `/login`。组织父路由通过 `resolveOrgBySlug` 查目标 slug，无法解析时抛 Forbidden；函数会通过 Better Auth 设置 active organization 并取 active member。成员/团队/设置页面本身没有另外的 route guard。
- Dashboard 首页调用 `authClient.organization.list()` 展示组织列表；创建页使用 `authClient.organization.create()`；资料页通过 `orpc.user.updateProfile` 更新资料。现代码没有页面 loader/search 参数。
- 邀请接受使用 token 调 `authClient.organization.acceptInvitation`。成功 toast 后固定去 `/dashboard`，没有按响应解析并导航到目标组织；拒绝成功去 `/`。当前页面无显式未登录引导、账号匹配提示或邀请状态预取。
- `/api/auth/*` 是 Better Auth 的 HTTP 入口；`/api/rpc/*` 建立带请求 headers 的 API context，oRPC handler 前缀 `/api/rpc`，OpenAPI 文档前缀 `/api/rpc/api-docs`，未匹配返回 404。API 作为协议 handler 独立运行，不应被页面登录重定向替代；业务认证授权由共享 handler/context 负责。

## 导航和硬编码 URL 引用

迁移时除 route 文件外，应逐项更新这些消费者；完整命中由在本基线执行的 `rg` 扫描（`apps/web/src`，排除生成树）记录：

| 引用位置                                                                                          | 当前目标／用途                                                                        |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `components/sign-in-form.tsx`、`components/sign-up-form.tsx`                                      | 成功固定去 `/dashboard`                                                               |
| `routes/(public)/-components/user-menu.tsx`                                                       | 用户菜单进入 `/dashboard`；未登录去 `/login`                                          |
| `routes/dashboard/route.tsx`                                                                      | 侧栏 `/dashboard`、`/dashboard/profile`；设置菜单去 profile；登出去 `/`               |
| `routes/dashboard/index.tsx`                                                                      | 创建入口 `/dashboard/orgs/new`；组织卡片动态去 `/org/${slug}`                         |
| `routes/dashboard/orgs/new.tsx`                                                                   | 成功去 `/org/${slug}`；取消去 `/dashboard`；页面文案展示 `/org/{slug}`                |
| `components/org-switcher.tsx`                                                                     | 动态切组织 `/org/${slug}`；创建入口 `/dashboard/orgs/new`                             |
| `routes/org/$orgSlug/route.tsx`                                                                   | 动态组织概览/members/teams/settings 导航；返回和个人中心入口 `/dashboard`；登出去 `/` |
| `routes/org/$orgSlug/settings/index.tsx`                                                          | 设置更新导航使用 `/org/$orgSlug/settings`，离开组织去 `/dashboard`                    |
| `routes/org/$orgSlug/teams/index.tsx`、`teams/$teamId.tsx`                                        | 团队列表与详情互链，使用参数化 route `to`                                             |
| `routes/(public)/about/index.tsx`、`landing/index.tsx`、`pricing/index.tsx`、公开 `user-menu.tsx` | 页面内部公开导航和 `/login` 链接；登录链接清空 `redirect`                             |
| `routes/api/rpc.$.ts`、`utils/orpc.ts`                                                            | HTTP RPC prefix `/api/rpc`、API docs 子路径                                           |
| `utils/errors.ts`、`components/fallback/unauthorized.tsx`                                         | 默认 `/login` 与带 `redirect` 的登录跳转                                              |

源码中没有 admin、roles、archived 页面或对应现有 URL；它们属于目标结构/后续票据，不能写成当前已存在能力。扫描范围是 `apps/web/src`，包外部署配置或外部调用方不由该清单声称已覆盖。

## Dashboard 兼容重定向映射

目标个人空间 URL 及旧地址逐项映射如下。重定向应在服务器直接请求和客户端导航都生效；保留目标页面支持的 search 参数，fragment 按客户端场景保留。当前页面没有自定义搜索参数 schema，通用 `redirect` 是导航意图，不是这些页面的数据筛选条件。未知 `/dashboard/*` 不应兜底静默跳转。

| 旧地址                                      | 目标地址                | 原页面职责／注意事项                                                         |
| ------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `/dashboard`、`/dashboard/`                 | `/me`                   | 个人首页；现有组织列表行为迁到 `/me/organizations`，新个人首页应保留组织入口 |
| `/dashboard/profile`、`/dashboard/profile/` | `/me/settings/profile`  | 个人资料编辑                                                                 |
| `/dashboard/orgs/new`                       | `/me/organizations/new` | 创建组织                                                                     |

同一导航迁移需更新登录和注册成功默认目标、用户菜单、组织布局返回入口、OrgSwitcher 创建入口、创建页取消入口、组织列表创建入口。新页面使用新地址；旧地址只保留明确重定向及兼容验证引用。

## 路由生成器与迁移前置

仓库 catalog 锁定 `@tanstack/react-router` `^1.170.41`、`@tanstack/router-plugin` `^1.168.42`、`@tanstack/react-start` `^1.168.60`；实际安装解析版本及 vite 插件配置应在实施阶段复核。生成树已证实无路径 layout、括号目录、动态段、splat 与 index 路由的上述命名结果。迁移后依赖新生成树检查 route ID，不能把内部 ID 变动误判为 URL 变更。

权限依赖按 [permissions.md](permissions.md) 执行：平台 Admin、动态角色策略、组织状态字段/API、归档/恢复及服务端访问限制尚属待实施计划。组织外层、`_active` 与 archived 分支依赖服务端组织状态及授权结果；Admin/roles 页面须等权限能力具备后接入，不在本票推定其可用。API handler 保持协议独立。

## 文档核对方式

本清单对应 TDD 技能中的行为基线：每条映射和行为均来自规范说明或当前公开路由/导航边界，文档变更没有可执行代码 seam；因此本票不新增测试、不改路由实现。后续路由实现需用实际路由生成结果及直接请求、客户端导航回归核对这些行为。

核对命令：`rg -n "createFileRoute|createRootRoute|createRoute" apps/web/src/routes apps/web/src/routeTree.gen.ts`；对 `apps/web/src` 扫描 `to`、`navigate`、`href`、`redirect`、`returnTo`、`callbackURL` 和 `/dashboard`、`/org/`、`/invite/`、`/login`、`/api/auth`、`/api/rpc`。本票未运行构建或测试，因为没有代码变化。
