import type { TKitSettingKey } from './TKitSettingKey'

/** Raw Elementor kit-settings bag forwarded from the editor bridge. Values
    stay unknown — the shapes are Elementor's controls to define, not ours to
    assert. */
export type TKitSettings = { [K in TKitSettingKey]?: unknown }
