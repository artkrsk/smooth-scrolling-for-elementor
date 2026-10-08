import type { IArtsSmoothScrollingGlobal } from './IArtsSmoothScrollingGlobal'

export interface ISmoothScrollingGate extends IArtsSmoothScrollingGlobal {
  /** Publish discovery and arm eligibility checks without eagerly loading Lenis. */
  init(): void
  /** Permanently release the loader and its app. */
  destroy(): void
  readonly signal: AbortSignal
}
