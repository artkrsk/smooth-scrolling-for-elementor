import type { IArtsSmoothScrollingGlobal } from './IArtsSmoothScrollingGlobal'

export interface ISmoothScrollingApp extends IArtsSmoothScrollingGlobal {
  /** Publish the provider and initialize when the document body is available. */
  init(): void
  /** Permanently release this owner, including pending document-ready work. */
  destroy(): void
  readonly signal: AbortSignal
}
