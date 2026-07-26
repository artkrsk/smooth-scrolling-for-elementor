import type { IArtsSmoothScrollingGlobal } from './IArtsSmoothScrollingGlobal'
import type { ISmoothScrolling } from './ISmoothScrolling'

/** The gate-era shape of `window.artsSmoothScrolling`: the public contract
    plus the pending-`ready` resolver. boot.ts claims the resolver and
    replaces the global with the engine-backed object, so this shape exists
    only between gate parse and engine init. */
export interface IGateGlobal extends IArtsSmoothScrollingGlobal {
  /** Claimed (and thereby retired) by boot.ts. */
  __resolveReady: (controller: ISmoothScrolling) => void
}
