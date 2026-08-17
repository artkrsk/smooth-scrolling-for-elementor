/** Minimal shape of a jQuery-wrapped object — only the methods
    elementorCompat.ts calls (`$document.off(...)`, `jQuery(window).on(...)`).
    jQuery is never a dependency of this package; not the real jQuery types. */
export interface IJQueryObject {
  on(event: string, handler: (...args: unknown[]) => void): void
  off(event: string, selector: string, handler: (...args: unknown[]) => void): void
}
