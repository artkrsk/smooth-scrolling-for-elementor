import Lenis from 'lenis'
import { createSmoothScrolling } from './core/controller'
import type { IGateGlobal } from './interfaces/IGateGlobal'
import type { ISmoothScrolling } from './interfaces/ISmoothScrolling'
import type { ISmoothScrollingApp } from './interfaces/ISmoothScrollingApp'
import type { ISmoothScrollingAppArgs } from './interfaces/ISmoothScrollingAppArgs'
import { VERSION } from './version'

export function createSmoothScrollingApp(args: ISmoothScrollingAppArgs = {}): ISmoothScrollingApp {
  const lifetime = new AbortController()
  let initialized = false
  let disposed = false
  let controller: ISmoothScrolling | null = null
  let resolveReady!: (controller: ISmoothScrolling) => void
  let ready = new Promise<ISmoothScrolling>((resolve) => {
    resolveReady = resolve
  })
  let resolveGate: ((controller: ISmoothScrolling) => void) | undefined
  let releaseGate: (() => void) | undefined
  const boot = () => {
    if (disposed || !args.options) {
      return
    }
    controller = createSmoothScrolling(args.options)
    controller.init()
    resolveReady(controller)
    resolveGate?.(controller)
  }
  const app: ISmoothScrollingApp = {
    get ready() {
      return ready
    },
    get: () => controller,
    get lenis() {
      return controller?.lenis ?? null
    },
    version: VERSION,
    load: () => Promise.resolve(Lenis),
    signal: lifetime.signal,
    init() {
      if (initialized || disposed || args.signal?.aborted) {
        return
      }
      initialized = true
      const host = window as unknown as { artsSmoothScrolling?: ISmoothScrollingApp | IGateGlobal }
      const previous = host.artsSmoothScrolling
      host.artsSmoothScrolling = app
      if (previous && '__resolveReady' in previous) {
        ready = previous.ready
        resolveGate = previous.__resolveReady
        releaseGate = previous.destroy
      } else if (previous && 'destroy' in previous) {
        previous.destroy?.()
      }
      if (disposed || host.artsSmoothScrolling !== app || args.signal?.aborted) {
        app.destroy()
        return
      }
      args.signal?.addEventListener('abort', app.destroy, { once: true })
      if (previous && '__resolveLoad' in previous) {
        previous.__resolveLoad(Lenis)
      }
      if (document.body) {
        boot()
      } else {
        document.addEventListener('DOMContentLoaded', boot, { once: true })
      }
    },
    destroy() {
      if (disposed) {
        return
      }
      disposed = true
      args.signal?.removeEventListener('abort', app.destroy)
      if (initialized) {
        document.removeEventListener('DOMContentLoaded', boot)
        controller?.destroy()
        controller = null
        const host = window as unknown as {
          artsSmoothScrolling?: ISmoothScrollingApp | IGateGlobal
        }
        if (host.artsSmoothScrolling === app) {
          delete host.artsSmoothScrolling
        }
      }
      releaseGate?.()
      lifetime.abort()
    }
  }
  return app
}
