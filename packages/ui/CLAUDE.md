# UI 包

基于 shadcn/ui（**Base UI** 底层，非 Radix UI）的共享组件库，供所有 apps 使用。

> Base UI 组件规范（render prop、useRender、Field 等）详见 `shadcn` skill，会在相关开发时自动加载。

## 使用方式

```typescript
import { Button, Dialog, Input } from "@org-sass/ui";
import { cn } from "@org-sass/ui/lib/utils";
```

## 添加组件

```bash
bunx shadcn@latest add button
```

## 反模式

- **不要直接编辑 `src/components/` 中的文件** - 使用 shadcn CLI 重新生成
- **不要使用 `asChild`** - Base UI 不支持，改用 `render` prop
- **不要安装 `@radix-ui/*`** - 本包已使用 Base UI 替代
