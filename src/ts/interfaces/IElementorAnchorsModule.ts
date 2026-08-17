/** Minimal shape of Elementor's classic JS anchor animator
    (`elementorFrontend.utils.anchors`) — only what elementorCompat.ts needs
    to unbind it. Elementor is never a dependency of this package; this types
    the runtime-detected `window.elementorFrontend` global. */
export interface IElementorAnchorsModule {
  getSettings(key: string): string
  handleAnchorLinks: (...args: unknown[]) => void
}
