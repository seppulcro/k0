import { load } from "js-yaml";

export interface KeyLabel {
	tap: string;
	hold?: string;
	shifted?: string;
}

export interface ParsedKeymap {
	layerNames: string[];
	defaultLayer: string;
	tappingTermMs: number;
	/** keypos → tap label (base layer) */
	posToLabel: Map<number, string>;
	/** tap label (lowercase) → keypos */
	labelToPos: Map<string, number>;
	/** keypos → layer name (hold binding, layer activators only) */
	posToLayer: Map<number, string>;
	/** layer name → keypos → labels */
	layerLabels: Map<string, Map<number, KeyLabel>>;
}

// biome-ignore lint/suspicious/noExplicitAny: YAML is untyped
function entryToKeyLabel(entry: any): KeyLabel {
	if (typeof entry === "string") return { tap: entry };
	if (!entry || typeof entry !== "object") return { tap: "" };
	if (entry.type) return { tap: "" };
	return {
		tap: String(entry.t ?? entry.tap ?? ""),
		hold: entry.h != null ? String(entry.h) : undefined,
		shifted: entry.s != null ? String(entry.s) : undefined,
	};
}

export function parseKeymapYaml(yamlText: string): ParsedKeymap {
	// biome-ignore lint/suspicious/noExplicitAny: YAML is untyped
	const doc = load(yamlText) as any;
	const layers: Record<string, unknown[][]> = doc?.layers ?? {};
	const layerNames = Object.keys(layers);
	const defaultLayer = layerNames[0] ?? "Base";
	const tappingTermMs: number = doc?.draw_config?.tap_dance_wait_ms ?? 200;

	const labelToPos = new Map<string, number>();
	const posToLabel = new Map<number, string>();
	const posToLayer = new Map<number, string>();
	const layerLabels = new Map<string, Map<number, KeyLabel>>();

	for (const [layerName, rows] of Object.entries(layers)) {
		const posMap = new Map<number, KeyLabel>();
		let pos = 0;
		for (const row of rows as unknown[][]) {
			for (const rawEntry of row) {
				const label = entryToKeyLabel(rawEntry);
				posMap.set(pos, label);
				if (layerName === defaultLayer) {
					if (label.tap) {
						posToLabel.set(pos, label.tap);
						labelToPos.set(label.tap.toLowerCase(), pos);
					}
					if (label.hold && layerNames.includes(label.hold)) {
						posToLayer.set(pos, label.hold);
					}
				}
				pos++;
			}
		}
		layerLabels.set(layerName, posMap);
	}

	return {
		layerNames,
		defaultLayer,
		tappingTermMs,
		posToLabel,
		labelToPos,
		posToLayer,
		layerLabels,
	};
}
