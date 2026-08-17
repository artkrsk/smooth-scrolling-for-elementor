import type Lenis from 'lenis'
import type { IArtsSmoothScrollingGlobal } from './IArtsSmoothScrollingGlobal'
import type { ISmoothScrolling } from './ISmoothScrolling'

/** The gate-era shape of `window.artsSmoothScrolling`: the public contract
    plus the pending-`ready` resolver. boot.ts claims the resolver and
    replaces the global with the engine-backed object, so this shape exists
    only between gate parse and engine init. */
export interface IGateGlobal extends IArtsSmoothScrollingGlobal {
  /** Claimed (and thereby retired) by boot.ts. */
  __resolveReady: (controller: ISmoothScrolling) => void
  /** Called by boot.ts once the engine class is available, so a load()
      promise handed out by this gate settles — including for a consumer
      still holding this object after boot replaces the global. */
  __resolveLoad: (lenis: typeof Lenis) => void
}
