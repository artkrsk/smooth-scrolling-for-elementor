import type Lenis from 'lenis'
import type { TOptions } from '../types'

/** Lifecycle contract returned by createSmoothScrolling(). */
export interface ISmoothScrolling {
  init(): void
  destroy(): void
  /** Tears down and re-initializes with a new options object — used by the
      Elementor editor's live-preview bridge on every kit-setting change. */
  reinit(options: TOptions): void
  /** The live Lenis instance while the engine is running; null when
      disabled, torn down, or idling on a media-query mismatch. */
  readonly lenis: Lenis | null
}
