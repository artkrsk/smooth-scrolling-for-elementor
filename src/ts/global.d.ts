import type {
  IArtsSmoothScrollingGlobal,
  IElementorFrontend,
  IGsap,
  IJQueryStatic,
  IScrollTrigger
} from './interfaces'
import type { TGateBoot, TKitSettings, TOptions } from './types'

/**
 * Consumer-facing discovery contract. Consumers with an npm reference to this
 * package type their own Window declaration via
 * `import type { IArtsSmoothScrollingGlobal } from '@arts/smooth-scrolling'`.
 */
declare global {
  interface Window {
    artsSmoothScrolling?: IArtsSmoothScrollingGlobal
    /** Read once by boot.ts. */
    artsSmoothScrollingOptions?: TOptions
    /** Read by gate.ts at parse and at load time. Absent outside WordPress. */
    artsSmoothScrollingBoot?: TGateBoot
    /** Runtime-detected, never bundled — see core/rafDriver.ts. */
    gsap?: IGsap
    /** Runtime-detected, never bundled — see core/scrollTriggerSync.ts. */
    ScrollTrigger?: IScrollTrigger
    /** Runtime-detected, never bundled — see core/elementorCompat.ts. */
    elementorFrontend?: IElementorFrontend
    /** Runtime-detected, never bundled — see core/elementorCompat.ts. */
    jQuery?: IJQueryStatic
  }

  interface WindowEventMap {
    /** Elementor editor bridge: kit settings forwarded into the preview window. */
    'arts-smooth-scrolling:kit-change': CustomEvent<{ settings?: TKitSettings }>
  }
}
