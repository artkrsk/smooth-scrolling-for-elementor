/** PHP-printed boot descriptor the gate reads
    (`window.artsSmoothScrollingBoot`): the filemtime-versioned bundle URL
    plus the editor-preview flag that forces immediate injection instead of
    waiting on the matchMedia gate. */
export type TGateBoot = {
  js: string
  editor: boolean
}
