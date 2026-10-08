import type Lenis from 'lenis'
import type { IGateGlobal } from './interfaces/IGateGlobal'
import type { ISmoothScrolling } from './interfaces/ISmoothScrolling'
import type { ISmoothScrollingGate } from './interfaces/ISmoothScrollingGate'
import type { ISmoothScrollingGateArgs } from './interfaces/ISmoothScrollingGateArgs'
import { VERSION } from './version'

export type { ISmoothScrollingGate } from './interfaces/ISmoothScrollingGate'
export type { ISmoothScrollingGateArgs } from './interfaces/ISmoothScrollingGateArgs'

export function createSmoothScrollingGate(
  args: ISmoothScrollingGateArgs = {}
): ISmoothScrollingGate {
  const lifetime = new AbortController()
  let initialized = false
  let disposed = false
  let injected = false
  let link: HTMLLinkElement | undefined
  let script: HTMLScriptElement | undefined
  let media: MediaQueryList | undefined
  let lenisClass: typeof Lenis | undefined
  let loadPromise: Promise<typeof Lenis> | undefined
  let settleLoad: ((lenis: typeof Lenis) => void) | undefined
  let failLoad: ((error: Error) => void) | undefined
  let failure: Error | undefined
  let resolveReady!: (controller: ISmoothScrolling) => void
  const ready = new Promise<ISmoothScrolling>((resolve) => {
    resolveReady = resolve
  })
  const predict = (active: boolean) => {
    document.documentElement.classList.toggle('has-smooth-scroll', active)
    document.documentElement.classList.toggle('no-smooth-scroll', !active)
  }
  const fail = (message: string) => {
    if (disposed) {
      return
    }
    failure = new Error(`arts-smooth-scrolling: ${message}`)
    predict(false)
    failLoad?.(failure)
  }
  const inject = () => {
    if (injected || disposed || !args.css || (!args.js && !args.load)) {
      return
    }
    if (
      document.getElementById('smooth-scrolling-for-elementor-css') ||
      document.getElementById('smooth-scrolling-for-elementor-js')
    ) {
      return
    }
    injected = true
    link = document.createElement('link')
    link.id = 'smooth-scrolling-for-elementor-css'
    link.rel = 'stylesheet'
    link.href = args.css
    link.onload = () => {
      if (disposed || !link?.onload) {
        return
      }
      link.onload = null
      if (args.load) {
        void Promise.resolve()
          .then(() => {
            if (!disposed) {
              return args.load?.(lifetime.signal)
            }
          })
          .catch(() => fail('failed to load engine script'))
      } else if (args.js) {
        const ownedScript = document.createElement('script') as HTMLScriptElement & {
          __artsSmoothScrollingSignal?: AbortSignal
        }
        ownedScript.id = 'smooth-scrolling-for-elementor-js'
        ownedScript.src = args.js
        /** The original owner survives late classic-script execution after replacement. */
        ownedScript.__artsSmoothScrollingSignal = lifetime.signal
        ownedScript.onerror = () => fail('failed to load engine script')
        script = ownedScript
        document.head.appendChild(script)
      }
    }
    link.onerror = () => fail('failed to load stylesheet')
    document.head.appendChild(link)
  }
  const onChange = (event: MediaQueryListEvent) => {
    if (disposed) {
      return
    }
    predict(event.matches)
    if (event.matches) {
      media?.removeEventListener('change', onChange)
      inject()
    }
  }
  const gate: ISmoothScrollingGate & IGateGlobal = {
    ready,
    get: () => null,
    lenis: null,
    version: VERSION,
    signal: lifetime.signal,
    __resolveReady: (controller) => {
      if (!disposed) {
        resolveReady(controller)
      }
    },
    __resolveLoad: (LenisClass) => {
      if (!disposed) {
        media?.removeEventListener('change', onChange)
        lenisClass = LenisClass
        settleLoad?.(LenisClass)
      }
    },
    load() {
      if (disposed) {
        return Promise.reject(new Error('arts-smooth-scrolling: disposed'))
      }
      if (failure) {
        return Promise.reject(failure)
      }
      if (!initialized || !args.options || !args.css || (!args.js && !args.load)) {
        return Promise.reject(new Error('arts-smooth-scrolling: assets unavailable'))
      }
      if (lenisClass) {
        return Promise.resolve(lenisClass)
      }
      loadPromise ??= new Promise((resolve, reject) => {
        settleLoad = resolve
        failLoad = reject
      })
      inject()
      return loadPromise
    },
    init() {
      if (initialized || disposed) {
        return
      }
      initialized = true
      const host = window as unknown as { artsSmoothScrolling?: ISmoothScrollingGate }
      const previous = host.artsSmoothScrolling
      host.artsSmoothScrolling = gate
      previous?.destroy?.()
      if (disposed || host.artsSmoothScrolling !== gate) {
        gate.destroy()
        return
      }
      if (!args.options || !args.css || (!args.js && !args.load)) {
        predict(false)
        return
      }
      const query = args.options.matchMedia
      media = query ? window.matchMedia(query) : undefined
      const matches = media?.matches ?? true
      predict(matches)
      if (args.editor || matches) {
        inject()
      } else {
        media?.addEventListener('change', onChange)
      }
    },
    destroy() {
      if (disposed) {
        return
      }
      disposed = true
      media?.removeEventListener('change', onChange)
      if (link) {
        link.onload = null
        link.onerror = null
        link.remove()
      }
      if (script) {
        script.onerror = null
        script.remove()
      }
      failLoad?.(new Error('arts-smooth-scrolling: disposed'))
      if (initialized) {
        const host = window as unknown as { artsSmoothScrolling?: ISmoothScrollingGate }
        if (host.artsSmoothScrolling === gate) {
          predict(false)
          delete host.artsSmoothScrolling
        }
      }
      lifetime.abort()
    }
  }
  return gate
}
