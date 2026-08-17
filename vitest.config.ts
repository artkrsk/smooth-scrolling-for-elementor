import { createVitestConfig } from '@arts/wp-plugin-tooling/vitest'
import { defineConfig } from 'vitest/config'

// Shared shape (node env, @ts test-only alias, istanbul coverage) — see the
// tooling package for the rationale.
export default defineConfig(
  createVitestConfig({
    defineKey: '__ARTS_SMOOTH_SCROLLING_VERSION__',
    setupFiles: ['tests/ts/setup.ts']
  })
)
