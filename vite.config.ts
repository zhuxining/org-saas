import { defineConfig } from "vite-plus";

const ignorePatterns = ["**/routeTree.gen.ts", ".agents/skills"];
export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: { ignorePatterns, sortImports: true, sortTailwindcss: true },
  lint: {
    ignorePatterns,
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    plugins: ["react", "import", "promise", "vitest", "promise", "node"],
  },
  resolve: { tsconfigPaths: true },
});
