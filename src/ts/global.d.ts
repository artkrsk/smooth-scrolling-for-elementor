import type { IArtsSmoothScrollingGlobal } from './interfaces'
import type { TGateBoot, TKitSettings, TOptions } from './types'

/**
 * Consumer-facing discovery contract. Consumers with an npm reference to this
 * package type their own Window declaration via
 * `import type { IArtsSmoothScrollingGlobal } from '@arts/smooth-scrolling'`.
 *
 * This file augments `Window` only for our own entries (gate.ts/boot.ts) —
 * consumers never compile or load it. `package.json`'s `types` field points
 * straight at `src/ts/index.ts` (no d.ts build step), so any module reachable
 * from that entry is compiled raw by consumers, who never pick up this
 * augmentation. Modules under `src/ts` (anything `index.ts` imports,
 * transitively) must therefore stay self-contained: foreign runtime globals
 * (gsap, ScrollTrigger, elementorFrontend, jQuery, …) are read through a
 * locally-typed cast at the read site instead of being declared here.
 */
declare global {
  interface Window {
    artsSmoothScrolling?: IArtsSmoothScrollingGlobal
    /** Read once by boot.ts. */
    artsSmoothScrollingOptions?: TOptions
    /** Read by gate.ts at parse and at load time. Absent outside WordPress. */
    artsSmoothScrollingBoot?: TGateBoot
  }

  interface WindowEventMap {
    /** Elementor editor bridge: kit settings forwarded into the preview window. */
    'arts-smooth-scrolling:kit-change': CustomEvent<{ settings?: TKitSettings }>
  }
}
