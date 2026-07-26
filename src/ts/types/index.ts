export type { TAnchorsOptions } from './TAnchorsOptions'
export type { TEasingFunction } from './TEasingFunction'
export type { TGateBoot } from './TGateBoot'
// TKitSettingKey stays out on purpose: it is internal to TKitSettings, which
// imports it directly — a barrel line with zero consumers would only trip the
// unused-export analyzers.
export type { TKitSettings } from './TKitSettings'
export type { TLenisOptions } from './TLenisOptions'
export type { TOptions } from './TOptions'
