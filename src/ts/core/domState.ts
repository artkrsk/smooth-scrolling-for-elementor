/** Toggles the <html> state classes to match whether the engine is actively
    running. Anchors are always derived alongside the engine in this plugin
    (no independent toggle), so a single "active" flag covers both
    `has-smooth-scroll`/`no-smooth-scroll` and `has-smooth-anchors`. Applied
    on run, on destroy, and on a media-gate no-match. */
export function applyDomState(active: boolean): void {
  const html = document.documentElement
  html.classList.toggle('has-smooth-scroll', active)
  html.classList.toggle('no-smooth-scroll', !active)
  html.classList.toggle('has-smooth-anchors', active)
}
