import { suppressElementorAnchors } from './core/elementorCompat'
import { createSmoothScrollingApp } from './createSmoothScrollingApp'
import type { IGateGlobal } from './interfaces/IGateGlobal'
import { mapKitSettings } from './kitSettings'

const existing = window.artsSmoothScrolling as IGateGlobal | undefined
const script = document.currentScript as
  | (HTMLScriptElement & { __artsSmoothScrollingSignal?: AbortSignal })
  | null
const signal = script?.__artsSmoothScrollingSignal ?? existing?.signal

/** A delayed script must never claim a replacement gate's lifetime. */
if (!signal?.aborted && (!existing || '__resolveReady' in existing)) {
  const app = createSmoothScrollingApp({
    ...(window.artsSmoothScrollingOptions ? { options: window.artsSmoothScrollingOptions } : {}),
    ...(signal ? { signal } : {})
  })
  app.init()
  const releaseAnchors = suppressElementorAnchors()
  const onKitChange = (event: WindowEventMap['arts-smooth-scrolling:kit-change']) => {
    if (event.detail?.settings) {
      app.get()?.reinit(mapKitSettings(event.detail.settings))
    }
  }
  window.addEventListener('arts-smooth-scrolling:kit-change', onKitChange)
  app.signal.addEventListener(
    'abort',
    () => {
      window.removeEventListener('arts-smooth-scrolling:kit-change', onKitChange)
      releaseAnchors()
    },
    { once: true }
  )
}
