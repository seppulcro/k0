/**
 * Browser mock mode — load with ?mock query param (no Tauri runtime needed).
 *
 * Stubs `invoke` and `listen` so the full app renders and reacts in a plain
 * browser or Playwright session. Key sequences are simulated from the YAML
 * keymap — the same source of truth used by the real evdev backend.
 *
 * Usage:
 *   pnpm dev          → open http://localhost:5173?mock
 *   Playwright MCP    → navigate to http://localhost:5173?mock
 *
 * Simulator API (window.__k0mock):
 *   pressKey(label: string)   — press a key by its tap label (e.g. "a", "esc")
 *   releaseKey(label: string) — release a key
 *   typeSequence(labels: string[], intervalMs?: number) — press+release each in order
 *   holdLayer(label: string)  — press a hold-layer key (activates layer)
 *   releaseLayer(label: string)
 */

import keymapYamlRaw from "@assets/my_keymap.yaml?raw";
import { buildPosMaps } from "./labelTable";
import { parseKeymapYaml } from "./yamlParser";

const keymap = parseKeymapYaml(keymapYamlRaw);
const { evdevToPos } = buildPosMaps(keymap.labelToPos);

// Reverse map: pos → evdev code (string)
const posToEvdev: Record<number, string> = {};
for (const [code, pos] of Object.entries(evdevToPos)) {
	posToEvdev[pos] = code;
}

// Registered event listeners
type Handler = (event: { payload: unknown }) => void;
const listeners: Record<string, Handler[]> = {};

function emit(event: string, payload: unknown) {
	for (const fn of listeners[event] ?? []) {
		fn({ payload });
	}
}

// --- Tauri API stubs ---

export async function invoke(cmd: string, _args?: unknown): Promise<unknown> {
	if (cmd === "list_devices") {
		return [{ path: "/dev/input/mock0", name: "Mock Keyboard", uniq: "mock" }];
	}
	if (cmd === "start_capture") return null;
	if (cmd === "update_layout") return null;
	console.debug(`[mock] invoke("${cmd}")`, _args);
	return null;
}

export async function listen(
	event: string,
	handler: Handler,
): Promise<() => void> {
	if (!listeners[event]) listeners[event] = [];
	listeners[event].push(handler);
	return () => {
		listeners[event] = listeners[event].filter((h) => h !== handler);
	};
}

// --- Simulator ---

function labelToPos(label: string): number | undefined {
	return keymap.labelToPos.get(label.toLowerCase());
}

function pressPos(pos: number) {
	emit("key-event", { pos, pressed: true });
}

function releasePos(pos: number) {
	emit("key-event", { pos, pressed: false });
}

const heldLayers = new Map<number, string>();

const simulator = {
	pressKey(label: string) {
		const pos = labelToPos(label);
		if (pos === undefined) {
			console.warn(`[mock] unknown key label: "${label}"`);
			return;
		}
		pressPos(pos);
	},

	releaseKey(label: string) {
		const pos = labelToPos(label);
		if (pos === undefined) return;
		releasePos(pos);
	},

	async typeSequence(labels: string[], intervalMs = 120) {
		for (const label of labels) {
			simulator.pressKey(label);
			await delay(intervalMs * 0.4);
			simulator.releaseKey(label);
			await delay(intervalMs * 0.6);
		}
	},

	holdLayer(label: string) {
		const pos = labelToPos(label);
		if (pos === undefined) return;
		const layerName = keymap.posToLayer.get(pos);
		if (!layerName) {
			console.warn(`[mock] "${label}" is not a layer key`);
			return;
		}
		heldLayers.set(pos, layerName);
		pressPos(pos);
		emit("layer-event", { layer: layerName });
	},

	releaseLayer(label: string) {
		const pos = labelToPos(label);
		if (pos === undefined) return;
		heldLayers.delete(pos);
		releasePos(pos);
		// revert to base layer if no other layers held
		if (heldLayers.size === 0) {
			emit("layer-event", { layer: keymap.defaultLayer });
		} else {
			const last = [...heldLayers.values()].at(-1) ?? keymap.defaultLayer;
			emit("layer-event", { layer: last });
		}
	},

	/** Run a demo sequence: types every base layer key in order */
	async demo(intervalMs = 100) {
		const labels = [...keymap.posToLabel.values()];
		await simulator.typeSequence(labels, intervalMs);
	},

	/** Layer tour: hold each layer key briefly, then release */
	async layerTour(holdMs = 600) {
		for (const [pos, layerName] of keymap.posToLayer) {
			const label = keymap.posToLabel.get(pos);
			if (!label) continue;
			console.info(`[mock] touring layer: ${layerName}`);
			simulator.holdLayer(label);
			await delay(holdMs);
			simulator.releaseLayer(label);
			await delay(200);
		}
	},
};

function delay(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

// Expose simulator globally for Playwright / devtools
(window as unknown as Record<string, unknown>).__k0mock = simulator;

console.info(
	"[k0 mock] browser mode active — window.__k0mock available\n" +
		"  .pressKey(label)       press a key\n" +
		"  .releaseKey(label)     release a key\n" +
		"  .typeSequence([...])   type a sequence\n" +
		"  .holdLayer(label)      activate a layer\n" +
		"  .releaseLayer(label)   deactivate a layer\n" +
		"  .demo()                run full key demo\n" +
		"  .layerTour()           tour all layers",
);
