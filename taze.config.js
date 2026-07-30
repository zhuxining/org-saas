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
    typescript: "patch",
    vue: "minor",
    // 正则匹配包名
    "/@types/": "patch",
    webpack: "ignore",
  },

  // 忽略目录
  ignorePaths: ["**/dist", "**/.turbo", "**/node_modules"],

  exclude: [
    // 写死不更新的包
  ],
});
