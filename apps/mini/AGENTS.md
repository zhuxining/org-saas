# 微信小程序约定

## 职责与入口

微信原生小程序，使用 TDesign Miniprogram；页面由 JS、JSON、WXML 和 WXSS 组成。

- `app.js`、`app.json`、`app.wxss`：应用逻辑、注册与全局样式。
- `pages/`：页面；`custom-tab-bar/`：自定义 TabBar。
- `style/`：共享样式；`utils/`：工具函数。
- `project.config.json`：开发者工具项目配置；本机配置在 `project.private.config.json`。

## 页面与组件

- 新增或调整页面时同步检查 `app.json` 的页面注册和 TabBar 配置；不要只更新其中一处。
- 使用 TDesign Miniprogram 与微信原生组件，组件声明放对应 JSON 的 `usingComponents`。
- 沿用现有 WXSS 主题与共享样式。主站的 React、shadcn、Tailwind、Lucide 规则不适用于本应用；图标沿用 TDesign 或现有小程序图标方案。
- 保持现有渲染与组件框架配置兼容；变更 Skyline / glass-easel 等应用级配置前确认方案。
- 凭证放服务端；不将密钥写入小程序代码或提交本机专属配置改动。

## 验证

本应用没有 CLI 开发、构建或测试脚本。依赖变更后，在微信开发者工具中执行「工具 → 构建 npm」；页面和组件变更通过开发者工具编译与预览，检查页面跳转、TabBar 和相关交互。需要开发者工具或真机验证而当前环境无法执行时，交付中明确未验证项目。
