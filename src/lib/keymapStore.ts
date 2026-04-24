/**
 * Reactive keymap store — single source of truth for the loaded keymap.
 *
 * Initialises from the bundled assets, but can be hot-swapped at runtime
 * via drag-and-drop import (YAML, SVG, or ZIP).  Persists user imports to
 * localStorage so they survive reloads.
 */

import defaultSvgRaw from "@assets/keymap.svg?raw";
import defaultYamlRaw from "@assets/my_keymap.yaml?raw";
import { computed, signal } from "@preact/signals";

import { buildPosMaps } from "./labelTable";
import { parseLayout } from "./svgParser";
import { type ParsedKeymap, parseKeymapYaml } from "./yamlParser";
import { unzip, zip } from "./zip";

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const LS_YAML = "k0-import-yaml";
const LS_SVG = "k0-import-svg";
const LS_YAML_NAME = "k0-import-yaml-name";
const LS_SVG_NAME = "k0-import-svg-name";

function lsGet(key: string): string | null {
	try {
		return typeof localStorage !== "undefined"
			? localStorage.getItem(key)
			: null;
	} catch {
		return null;
	}
}

function lsSet(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch (e) {
		console.warn("[keymapStore] localStorage write failed:", e);
	}
}

function lsRemove(key: string) {
	try {
		localStorage.removeItem(key);
	} catch {}
}

// ---------------------------------------------------------------------------
// Raw content signals
// ---------------------------------------------------------------------------

export const yamlText = signal<string>(lsGet(LS_YAML) ?? defaultYamlRaw);
export const svgText = signal<string>(lsGet(LS_SVG) ?? defaultSvgRaw);
export const yamlFileName = signal<string>(
	lsGet(LS_YAML_NAME) ?? "keymap.yaml (bundled)",
);
export const svgFileName = signal<string>(
	lsGet(LS_SVG_NAME) ?? "keymap.svg (bundled)",
);
export const isCustomYaml = signal<boolean>(lsGet(LS_YAML) !== null);
export const isCustomSvg = signal<boolean>(lsGet(LS_SVG) !== null);

/** Last import error, displayed in the UI */
export const importError = signal<string>("");

// ---------------------------------------------------------------------------
// Derived / computed signals
// ---------------------------------------------------------------------------

export const parsedKeymap = computed<ParsedKeymap>(() => {
	return parseKeymapYaml(yamlText.value);
});

export const parsedLayout = computed(() => {
	return parseLayout(svgText.value);
});

export const evdevToPos = computed(() => {
	return buildPosMaps(parsedKeymap.value.labelToPos).evdevToPos;
});

export const posToLayerStrKeys = computed(() => {
	const out: Record<string, string> = {};
	for (const [pos, layer] of parsedKeymap.value.posToLayer) {
		out[String(pos)] = layer;
	}
	return out;
});

// ---------------------------------------------------------------------------
// Import functions (validate-then-commit)
// ---------------------------------------------------------------------------

/** Validate and load a YAML string. Throws on parse failure. */
function validateYaml(text: string): ParsedKeymap {
	return parseKeymapYaml(text);
}

/** Validate and load an SVG string. Throws if layout is unparseable. */
function validateSvg(text: string) {
	const layout = parseLayout(text);
	if (!layout || layout.keys.length === 0) {
		throw new Error(
			"SVG contains no keypos-* groups — is this a keymap-drawer SVG?",
		);
	}
	return layout;
}

export function loadYaml(text: string, fileName: string) {
	validateYaml(text); // throws on bad YAML
	yamlText.value = text;
	yamlFileName.value = fileName;
	isCustomYaml.value = true;
	lsSet(LS_YAML, text);
	lsSet(LS_YAML_NAME, fileName);
	importError.value = "";
}

export function loadSvg(text: string, fileName: string) {
	validateSvg(text); // throws on bad SVG
	svgText.value = text;
	svgFileName.value = fileName;
	isCustomSvg.value = true;
	lsSet(LS_SVG, text);
	lsSet(LS_SVG_NAME, fileName);
	importError.value = "";
}

/** Load a ZIP archive containing YAML + SVG. */
export function loadZip(buffer: ArrayBuffer, zipName: string) {
	const entries = unzip(buffer);
	const decoder = new TextDecoder();

	let yamlEntry: { name: string; text: string } | null = null;
	let svgEntry: { name: string; text: string } | null = null;

	for (const entry of entries) {
		const path = entry.name;
		// Skip directories and macOS resource forks
		if (path.endsWith("/") || path.startsWith("__MACOSX")) continue;

		const lower = path.toLowerCase();
		const baseName = path.split("/").pop() ?? path;

		if (lower.endsWith(".yaml") || lower.endsWith(".yml")) {
			if (yamlEntry)
				throw new Error(
					"ZIP contains multiple YAML files — expected exactly one.",
				);
			yamlEntry = { name: baseName, text: decoder.decode(entry.data) };
		} else if (lower.endsWith(".svg")) {
			if (svgEntry)
				throw new Error(
					"ZIP contains multiple SVG files — expected exactly one.",
				);
			svgEntry = { name: baseName, text: decoder.decode(entry.data) };
		}
	}

	if (!yamlEntry && !svgEntry) {
		throw new Error("ZIP contains no .yaml or .svg files.");
	}

	// Validate everything before committing
	if (yamlEntry) validateYaml(yamlEntry.text);
	if (svgEntry) validateSvg(svgEntry.text);

	// Commit atomically
	if (yamlEntry) {
		yamlText.value = yamlEntry.text;
		yamlFileName.value = `${yamlEntry.name} (from ${zipName})`;
		isCustomYaml.value = true;
		lsSet(LS_YAML, yamlEntry.text);
		lsSet(LS_YAML_NAME, yamlFileName.value);
	}
	if (svgEntry) {
		svgText.value = svgEntry.text;
		svgFileName.value = `${svgEntry.name} (from ${zipName})`;
		isCustomSvg.value = true;
		lsSet(LS_SVG, svgEntry.text);
		lsSet(LS_SVG_NAME, svgFileName.value);
	}
	importError.value = "";
}

/** Reset to bundled defaults. */
export function resetToDefaults() {
	yamlText.value = defaultYamlRaw;
	svgText.value = defaultSvgRaw;
	yamlFileName.value = "keymap.yaml (bundled)";
	svgFileName.value = "keymap.svg (bundled)";
	isCustomYaml.value = false;
	isCustomSvg.value = false;
	importError.value = "";
	lsRemove(LS_YAML);
	lsRemove(LS_SVG);
	lsRemove(LS_YAML_NAME);
	lsRemove(LS_SVG_NAME);
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

export function exportCurrentAsZip(): { blob: Blob; fileName: string } {
	const blob = zip({
		"keymap.yaml": yamlText.value,
		"keymap.svg": svgText.value,
	});
	return { blob, fileName: "k0-keymap.zip" };
}
