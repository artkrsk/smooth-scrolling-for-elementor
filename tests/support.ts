import { vi } from 'vitest'

/**
 * Shared mechanical fakes for the test suites — the pieces that would
 * otherwise be hand-copied across files and carry no per-test meaning.
 * Everything here is a FACTORY that builds a fresh object per call. The
 * filename deliberately does not end in `.test.ts`, so Vitest never collects
 * it as a suite; coverage never sees it since it only instruments `src/ts`.
 */

/**
 * A minimal Lenis double exposing just the surface the engine's core modules
 * touch (`raf`, `on('scroll', ...)`, `scrollTo`, `destroy`). `emit` lets a
 * test fire a registered event callback without a real Lenis instance, which
 * needs a live DOM to construct.
 */
export const createFakeLenis = () => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  return {
    raf: vi.fn(),
    scrollTo: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      const set = listeners.get(event) ?? new Set()
      set.add(cb)
      listeners.set(event, set)
      return () => listeners.get(event)?.delete(cb)
    }),
    emit(event: string, ...args: unknown[]) {
      for (const cb of listeners.get(event) ?? []) {
        cb(...args)
      }
    }
  }
}

/**
 * Stub `matchMedia` with a single controllable MediaQueryList. `flip()`
 * toggles `matches` and fires every registered 'change' listener — the shape
 * the engine's media gate needs for attach/detach tests. Honors the
 * `{ signal }` option (the controller's own cleanup mechanism), unlike a bare
 * two-arg addEventListener stub, so a test can verify a listener was actually
 * removed on destroy.
 */
export const fakeMedia = (matches: boolean) => {
  let current = matches
  const listeners = new Set<(e: { matches: boolean }) => void>()
  const mql = {
    get matches() {
      return current
    },
    addEventListener: (
      _type: string,
      cb: (e: { matches: boolean }) => void,
      opts?: { signal?: AbortSignal }
    ) => {
      listeners.add(cb)
      opts?.signal?.addEventListener('abort', () => listeners.delete(cb))
    },
    removeEventListener: (_type: string, cb: (e: { matches: boolean }) => void) => {
      listeners.delete(cb)
    }
  }
  vi.stubGlobal('matchMedia', () => mql)
  return {
    mql,
    flip() {
      current = !current
      for (const cb of [...listeners]) {
        cb({ matches: current })
      }
    },
    // Fires a 'change' event with an explicit value rather than toggling —
    // needed to simulate a redundant/spurious event (e.g. a no-match event
    // received while already at no-match) without relying on flip()'s
    // always-toggle semantics.
    set(matches: boolean) {
      current = matches
      for (const cb of [...listeners]) {
        cb({ matches: current })
      }
    },
    get listenerCount() {
      return listeners.size
    }
  }
}
