import { defineConfig } from "vite-plus";

const ignorePatterns = ["**/routeTree.gen.ts", ".agents/skills"];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns,
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "shadcn", specifier: "@shadcn/lint" },
    ],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    plugins: ["eslint", "typescript", "react", "import", "promise", "node", "vitest"],
  },
  fmt: {
    ignorePatterns,
    sortPackageJson: true,
    sortScripts: true,
    sortImports: true,
    sortTailwindcss: true,
  },
  resolve: { tsconfigPaths: true },
});
