import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },
  plugins: ["react", "typescript", "import", "nextjs"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "typescript/no-explicit-any": "off", // CLI framework has extensive generic type plumbing
    "no-empty": "error",
    "no-shadow": "off", // Too noisy in callback-heavy CLI code
    "no-unassigned-import": "off", // CSS side-effect imports
  },
  ignorePatterns: [
    "node_modules",
    "dist",
    "build",
    ".next",
    ".turbo",
    ".bunli",
    "**/commands.gen.ts",
  ],
});
