/**
 * Parses the layout-agnostic keymap config (keymap-config.json).
 *
 * The config maps OS-level keycodes (rdev Key Debug strings) to physical
 * keypos indices, and optionally declares which keypos activates which layer
 * on hold. This is the only firmware-specific knowledge in the whole app —
 * authors it once, works with any SVG layout file.
 */

export interface KeyMapping {
	pos: number;
	/** rdev Key Debug string, e.g. "KeyQ", "Escape", "Space", "Return" */
	code: string;
	/** Layer name activated when this key is held */
	hold?: string;
}

export interface KeymapConfigJSON {
	defaultLayer: string;
	keys: KeyMapping[];
}

export interface KeymapConfig {
	defaultLayer: string;
	codeToPos: Map<string, number>;
	posToLayer: Map<number, string>;
}

export function parseKeymapConfig(json: KeymapConfigJSON): KeymapConfig {
	const codeToPos = new Map<string, number>();
	const posToLayer = new Map<number, string>();

	for (const key of json.keys) {
		codeToPos.set(key.code, key.pos);
		if (key.hold) posToLayer.set(key.pos, key.hold);
	}

	return { defaultLayer: json.defaultLayer, codeToPos, posToLayer };
}
