# 文档应用约定

## 职责与入口

独立的 Fumadocs / TanStack Start 文档应用。

- `content/docs/`：MDX 文档内容。
- `source.config.ts`：文档集合配置。
- `src/lib/source.ts`：文档加载与导航来源。
- `src/routes/docs/$.tsx`：文档页面；`src/routes/api/search.ts`：搜索入口。
- `src/lib/layout.shared.tsx`：布局配置；`src/styles/app.css`：样式入口。

## 内容与实现

- 内容修改优先在 `content/docs/` 完成；调整导航、集合或路径时，同时检查文档链接和搜索。
- 页面使用 Fumadocs 的布局与组件体系；不套用主站业务 UI 的 shadcn 组件要求。样式沿用本应用的 Tailwind / Fumadocs 主题，图标使用现有 Lucide 集成。
- 修改路由源文件，不手工编辑 `src/routeTree.gen.ts`；MDX 集合产物通过现有 Fumadocs 插件和生成流程更新。
- 保持 SSR 兼容；浏览器 API 仅在客户端生命周期或事件中使用。路由和 Server Functions 分别参考 `tanstack-router`、`tanstack-start` 技能。

## 验证

从仓库根运行 `vp run dev:fumadocs` 预览。文档、集合或路由变更后运行 `vp run --filter fumadocs build`，验证 MDX 编译与预渲染；同时检查改动页面及其链接。
