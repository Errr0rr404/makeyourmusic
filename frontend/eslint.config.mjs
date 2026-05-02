import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      ".netlify/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "generated/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Relax rules for initial upgrade - can be tightened later
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // User/media URLs can come from provider or creator-uploaded origins.
      // Keep Next's server-side image optimizer allowlist tight instead of
      // forcing every dynamic <img> through next/image.
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
