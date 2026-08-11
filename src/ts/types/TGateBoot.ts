/** PHP-printed boot descriptor the gate reads
    (`window.artsSmoothScrollingBoot`): filemtime-versioned asset URLs plus
    the editor-preview flag that forces immediate injection instead of
    waiting on the matchMedia gate. */
export type TGateBoot = {
  js: string
  css: string
  editor: boolean
}
