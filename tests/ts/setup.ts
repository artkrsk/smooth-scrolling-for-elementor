import { vi } from 'vitest'

/**
 * Force the shipped code path. The plugin bundle defines import.meta.env.DEV
 * (false in production — @arts/wp-plugin-tooling's js.js), but Vite's `define`
 * matches the literal `import.meta.env.DEV` member expression only and never
 * reaches the optional `import.meta.env?.DEV` form env.d.ts types; under
 * Vitest the env is a real runtime object, so it is stubbed here instead. No
 * src/ts module reads DEV today — this keeps any future guard running the
 * production branch in tests by default.
 */
vi.stubEnv('DEV', false)
