export type { IArtsSmoothScrollingGlobal } from './IArtsSmoothScrollingGlobal'
export type { IGateGlobal } from './IGateGlobal'
export type { IGsap } from './IGsap'
// IGsapTicker stays out on purpose: it is internal to IGsap, which imports it
// directly — a barrel line with zero consumers would only trip knip.
// IJQueryObject stays out on purpose: it is internal to IJQueryStatic, which imports it directly — a barrel line with zero consumers would only trip knip.
export type { IJQueryStatic } from './IJQueryStatic'
export type { IRafDriver } from './IRafDriver'
export type { IScrollTrigger } from './IScrollTrigger'
export type { ISmoothScrolling } from './ISmoothScrolling'
