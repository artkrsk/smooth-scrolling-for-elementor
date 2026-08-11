/**
 * WordPress plugin entry (side-effect boot). The library surface stays in
 * index.ts; this file wires the page: discovery global, options intake,
 * init, and the Elementor editor live-preview bridge.
 *
 * Discovery contract: `window.artsSmoothScrolling` exists from parse time
 * (installed by gate.ts) with a pending `ready` promise, so consumer code
 * that loads first can await it race-free. Without a gate (direct bundle
 * import, inline print stripped) this file creates the same contract itself.
 */

import Lenis from 'lenis'
import { createSmoothScrolling } from './core/controller'
import type { IGateGlobal, ISmoothScrolling } from './interfaces'
import { mapKitSettings } from './kitSettings'

// Window typings live in global.d.ts (the consumer-facing contract).

// Idempotence: a global that exists and lacks __resolveReady is already the
// final, engine-backed object from a prior boot.ts run — mirrors gate.ts's
// own guard. Prevents a leaked Lenis instance/ticker if the bundle is ever
// re-executed (e.g. by an AJAX-navigation framework replaying the script).
const existingGlobal = window.artsSmoothScrolling as IGateGlobal | undefined
if (!existingGlobal || '__resolveReady' in existingGlobal) {
  let controller: ISmoothScrolling | null = null

  // When the wp_head gate printed, it installed the global at parse time with
  // a pending `ready`; claim its resolver so consumers holding that promise
  // see it resolve. Without a gate, self-create — the pre-gate contract.
  const gate = existingGlobal
  let resolveReady: (controller: ISmoothScrolling) => void
  const ready = gate?.__resolveReady
    ? gate.ready
    : new Promise<ISmoothScrolling>((resolve) => {
        resolveReady = resolve
      })
  if (gate?.__resolveReady) {
    resolveReady = gate.__resolveReady
  }

  window.artsSmoothScrolling = {
    ready,
    get: () => controller,
    get lenis() {
      return controller?.lenis ?? null
    },
    version: __ARTS_SMOOTH_SCROLLING_VERSION__,
    load: () => Promise.resolve(Lenis)
  }

  // Settles any load() promise the gate handed out (and hands the class to a
  // consumer still holding the gate object after the global above replaces it).
  gate?.__resolveLoad?.(Lenis)

  // Elementor editor live preview: the PHP-printed bridge in the editor window
  // forwards kit-setting changes into this (preview) window. Inert elsewhere —
  // the event never originates outside the editor.
  window.addEventListener('arts-smooth-scrolling:kit-change', (e) => {
    const settings = e.detail?.settings
    if (!settings) {
      return
    }
    controller?.reinit(mapKitSettings(settings))
  })

  const boot = () => {
    const options = window.artsSmoothScrollingOptions
    if (!options) {
      return
    }
    controller = createSmoothScrolling(options)
    controller.init()
    resolveReady(controller)
  }

  if (document.body) {
    boot()
  } else {
    document.addEventListener('DOMContentLoaded', boot, { once: true })
  }
}
