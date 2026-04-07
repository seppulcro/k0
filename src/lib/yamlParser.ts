/**
 * Parses keymap-drawer YAML to derive all layout mappings.
 *
 * From the base layer's key entries:
 *   - t: (tap label) + position index → labelToPos map
 *   - h: (hold layer name) → posToLayer map
 *
 * The YAML is the single source of truth — no manual keymap-config.json needed.
 *
 * keymap-drawer YAML base layer entry shapes:
 *   "Q"                      → tap: "Q"
 *   {t: "Esc", h: "Media"}  → tap: "Esc", hold layer: "Media"
 *   {t: "A", h: "Meta"}     → tap: "A", hold: not a layer name (modifier)
 */

import { load } from "js-yaml";

export interface LayerEntry {
	tap: string;
	holdLayer?: string; // only set when h: is a known layer name
}

export interface ParsedKeymap {
	layerNames: string[];
	/** keypos-N → tap label (from base layer) */
	posToLabel: Map<number, string>;
	/** tap label (lowercase) → keypos-N */
	labelToPos: Map<string, number>;
	/** keypos-N → layer name (hold binding) */
	posToLayer: Map<number, string>;
	defaultLayer: string;
	/** tapping term in ms — from yaml draw_config.tap_dance_wait_ms or default 200 */
	tappingTermMs: number;
}

// biome-ignore lint/suspicious/noExplicitAny: YAML is untyped
function entryToLayerEntry(entry: any): LayerEntry {
	if (typeof entry === "string") {
		return { tap: entry };
	}
	if (entry && typeof entry === "object") {
		const tap = String(entry.t ?? entry.tap ?? "");
		const hold = entry.h ?? entry.hold;
		return { tap, holdLayer: hold ? String(hold) : undefined };
	}
	return { tap: "" };
}

export function parseKeymapYaml(yamlText: string): ParsedKeymap {
	// biome-ignore lint/suspicious/noExplicitAny: YAML is untyped
	const doc = load(yamlText) as any;
	const layers: Record<string, unknown[][]> = doc?.layers ?? {};
	const layerNames = Object.keys(layers);
	const defaultLayer = layerNames[0] ?? "Base";
	// keymap-drawer uses tap_dance_wait_ms; QMK default tapping term is 200ms
	const tappingTermMs: number = doc?.draw_config?.tap_dance_wait_ms ?? 200;

	const baseRows: unknown[][] = layers[defaultLayer] ?? [];

	const posToLabel = new Map<number, string>();
	const labelToPos = new Map<string, number>();
	const posToLayer = new Map<number, string>();

	// keymap-drawer flattens rows into sequential keypos-N order
	let pos = 0;
	for (const row of baseRows) {
		for (const rawEntry of row) {
			const entry = entryToLayerEntry(rawEntry);
			const label = entry.tap.trim();
			if (label) {
				posToLabel.set(pos, label);
				labelToPos.set(label.toLowerCase(), pos);
			}
			// Hold layer: only treat as a layer activator if the name matches a known layer
			if (entry.holdLayer && layerNames.includes(entry.holdLayer)) {
				posToLayer.set(pos, entry.holdLayer);
			}
			pos++;
		}
	}

	return {
		layerNames,
		posToLabel,
		labelToPos,
		posToLayer,
		defaultLayer,
		tappingTermMs,
	};
}
