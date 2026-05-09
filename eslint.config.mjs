import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// NOTE: We attempted to enable two stricter rules in this audit pass:
//   - `@typescript-eslint/no-floating-promises` (typed-linting)
//   - `import/order` with grouped imports
// Both surfaced real, legitimate issues across `src/components/modes/*`,
// `src/components/ui/*`, `src/app/*`, and `src/lib/crypto/*` — files that
// are out of scope for this commit. `import/order` reported ~55 violations
// (almost all auto-fixable with `--fix`) and `no-floating-promises` reported
// 3 unawaited promises in components. Rather than enabling the rules and
// silencing the violations (which the audit forbids), we leave the rules
// off here and track the cleanup as a follow-up PR that can touch source.
// `eslint-plugin-import` is now installed as a devDependency so re-enabling
// is a one-line change in this file.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code agent scratch space (worktrees, transient files):
    ".claude/**",
  ]),
]);

export default eslintConfig;
