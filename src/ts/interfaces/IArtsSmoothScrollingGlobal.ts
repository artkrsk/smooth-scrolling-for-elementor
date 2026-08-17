import type Lenis from 'lenis'
import type { ISmoothScrolling } from './ISmoothScrolling'

/** The discovery global installed by the plugin boot script
    (`window.artsSmoothScrolling`) — importable so consumers type the window
    key from one source instead of copying structural shapes. */
export interface IArtsSmoothScrollingGlobal {
  /** Resolves once the boot script has created the engine. */
  ready: Promise<ISmoothScrolling>
  get(): ISmoothScrolling | null
  /** Direct access to the live Lenis instance while the engine is running;
      null otherwise. Shortcut for `get()?.lenis`. */
  readonly lenis: Lenis | null
  version: string
  /** Ensures the engine bundle is present and resolves with the bundled
      Lenis class, for building an independent instance (e.g. a horizontal
      rail) — never enables page-level smooth scrolling. Rejects when the
      boot descriptor is absent or either asset fails to load. */
  load(): Promise<typeof Lenis>
}
