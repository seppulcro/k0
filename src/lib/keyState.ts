import { signal } from "@preact/signals";

/** Currently physically pressed keypos indices */
export const pressedPositions = signal<ReadonlySet<number>>(new Set());

/** Active layer name — updated by layer-event from any backend tier */
export const activeLayer = signal<string>("Base");
