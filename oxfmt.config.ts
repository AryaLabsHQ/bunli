import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  sortImports: {},
  sortTailwindcss: {
    functions: ["cn", "cva", "clsx"],
  },
  sortPackageJson: {},
  ignorePatterns: ["**/dist"],
});
