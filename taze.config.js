import { defineConfig } from "taze";

export default defineConfig({
  recursive: true,
  // 保留 ^ ~ 版本前缀【对catalog至关重要】
  preserveRange: true,
  // 禁止自动写入，统一手动执行 -w
  write: false,
  install: false,

  // 依赖字段控制
  depFields: {
    dependencies: true,
    devDependencies: true,
    peerDependencies: false,
  },

  // 更新策略：patch | minor | major | ignore | latest
  packageMode: {
    "*": "minor",
    typescript: "minor",
    "/^@types\\//": "minor",
  },
  // 忽略升级的包
  exclude: [],
  // 忽略目录（含 fumadocs 生成目录）
  ignorePaths: [
    "**/dist",
    "**/.turbo",
    "**/node_modules",
    "**/.source",
    "**/.tanstack",
    "**/.output",
  ],
});
