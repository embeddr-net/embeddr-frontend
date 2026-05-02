// @ts-check
import { tanstackConfig } from "@tanstack/eslint-config";

export default [
  ...tanstackConfig,
  {
    ignores: [
      "dist/**",
      "dev-dist/**",
      "build/**",
      ".vite/**",
      ".tanstack/**",
      "coverage/**",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/test/**",
      "*.config.{js,ts,mjs,cjs}",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // pending eslint-plugin-react-hooks v7 + tanstack-config compatibility
      "react-hooks/exhaustive-deps": "off",
      // Too aggressive for code that handles localStorage / untyped JSON
      // (e.g. version-checking parsed values where TS narrows to a literal).
      "@typescript-eslint/no-unnecessary-condition": "off",
      // Allow @ts-ignore without descriptions for plugin/global integration
      // points where the suppression reason is obvious from context.
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
];
