import type { IJQueryObject } from './IJQueryObject'

/** Minimal shape of the global `jQuery` function — only the call signature
    elementorCompat.ts needs (`jQuery(window)`). */
export type IJQueryStatic = (target: unknown) => IJQueryObject
