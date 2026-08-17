// The esbuild plugin bundle substitutes import.meta.env.DEV via `define`
// (true in the dev channel, false in production). Optional access keeps any
// such check safe when no define is set; no src/ts module reads DEV today.
interface ImportMeta {
  env?: { DEV?: boolean }
}

/** Stamped from composer.json by the esbuild define — plugin bundle only. */
declare const __ARTS_SMOOTH_SCROLLING_VERSION__: string
