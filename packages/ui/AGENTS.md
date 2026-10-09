# UI 包约定

## 职责与入口

共享 Web 组件库，采用 shadcn / Base UI。组件配置见 `components.json`，主题入口见 `src/styles/globals.css`。

使用公开子路径导入，包没有根组件聚合导出：

```typescript
import { Button } from "@org-saas/ui/components/button";
import { cn } from "@org-saas/ui/lib/utils";
```

## 组件维护

- 新增组件前读取 `shadcn` 技能，并检查现有组件与 `components.json`；从 `packages/ui` 执行已安装的 CLI：`vpx shadcn add <组件名>`。
- 本地组件源码可以按需求定制。重新生成或覆盖已有组件前检查 diff，保留项目定制；不把整个 `src/components/` 视为不可编辑的生成目录。
- Base UI 的元素组合使用 `render` prop，不使用 Radix 的 `asChild`，不引入 `@radix-ui/*` 替代现有基础组件。
- 公共组件保持可复用，不引入应用内业务状态、路由或服务端依赖。新增导出路径遵循 `package.json` 的 exports。

## 样式与图标

- Web 业务 UI 优先组合共享组件；颜色、背景、边框和阴影使用 Tailwind 语义 token，主题值集中在 `src/styles/globals.css` 维护。
- 字号等视觉属性使用 Tailwind 工具类；自定义 CSS class 仅用于结构布局。新增主题 token 时核对明暗主题。
- 图标统一使用 `lucide-react`，不手写内联 SVG、导入 SVG 图标或添加其他图标库；图片内容不适用图标规则。
- 图片展示选择适合语义的组件，如头像使用 `Avatar`；没有适用组件时使用带 `alt` 的原生图片元素，不为满足组件规则滥用头像组件。

## 验证

修改共享组件时检查公开 props、相关使用方和键盘交互；基础组件或主题变更同时检查明暗主题及实际消费页面。
