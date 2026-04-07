import { useSignal, useSignalEffect } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";

import keymapSvgRaw from "@assets/keymap.svg?raw";
import keymapYamlRaw from "@assets/my_keymap.yaml?raw";

import { Settings } from "../../components/Settings";
import { activeLayer, pressedPositions } from "../../lib/keyState";
import { buildPosMaps } from "../../lib/labelTable";
import { parseSVG, updateSVGLabels } from "../../lib/svgParser";
import type { AllLayerLabels } from "../../lib/svgParser";
import { invoke, listen } from "../../lib/tauri";
import { loadSavedTheme } from "../../lib/themes";
import { parseKeymapYaml } from "../../lib/yamlParser";

import "./style.css";

const keymap = parseKeymapYaml(keymapYamlRaw);
const { evdevToPos } = buildPosMaps(keymap.labelToPos);
const posToLayerStrKeys: Record<string, string> = {};
for (const [pos, layer] of keymap.posToLayer) {
	posToLayerStrKeys[String(pos)] = layer;
}

function getSavedDevices(): string[] {
	try {
		const raw = localStorage.getItem("k0-devices");
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function Home() {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const allLabelsRef = useRef<AllLayerLabels | null>(null);
	const baseLayerNameRef = useRef<string>(keymap.defaultLayer);
	const svgReady = useSignal(false);
	const svgReadyRef = useRef(svgReady);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [activeDevices, setActiveDevices] = useState<string[]>(getSavedDevices);
	const [tappingTermMs, setTappingTermMs] = useState<number>(() => {
		const saved =
			typeof localStorage !== "undefined"
				? localStorage.getItem("k0-tapping-term")
				: null;
		return saved ? Number(saved) : keymap.tappingTermMs;
	});

	useEffect(() => {
		const { themeId, transitionId } = loadSavedTheme();
		void themeId;
		void transitionId;
	}, []);

	// Mount-once: set up SVG, event listeners, initial layout.
	// tappingTermMs initial value is read inside the effect from localStorage
	// to avoid adding it as a dependency (updates handled by handleTappingTermChange).
	useEffect(() => {
		if (!containerRef.current) return;

		const parsed = parseSVG(keymapSvgRaw);
		if (!parsed) return;

		allLabelsRef.current = parsed.allLabels;
		baseLayerNameRef.current = parsed.layerNames[0] ?? keymap.defaultLayer;

		const liveEl = document.adoptNode(parsed.svgElement);
		containerRef.current.appendChild(liveEl);
		svgRef.current = liveEl as SVGSVGElement;

		const baseLabels = parsed.allLabels.get(baseLayerNameRef.current);
		if (baseLabels) updateSVGLabels(liveEl, baseLabels, baseLabels);

		invoke("update_layout", {
			evdevToPos,
			posToLayer: posToLayerStrKeys,
			defaultLayer: keymap.defaultLayer,
			tappingTermMs: Number(
				localStorage.getItem("k0-tapping-term") ?? keymap.tappingTermMs,
			),
		}).catch(console.error);

		const saved = getSavedDevices();
		if (saved.length > 0) {
			invoke("start_capture", { paths: saved }).catch((e) => {
				console.warn("start_capture failed:", e);
			});
		}

		const unlistenKey = listen<{ pos: number; pressed: boolean }>(
			"key-event",
			({ payload }) => {
				const next = new Set(pressedPositions.value);
				if (payload.pressed) next.add(payload.pos);
				else next.delete(payload.pos);
				pressedPositions.value = next;
			},
		);

		const unlistenLayer = listen<{ layer: string }>(
			"layer-event",
			({ payload }) => {
				activeLayer.value = payload.layer;
			},
		);

		svgReadyRef.current.value = true;

		return () => {
			unlistenKey.then((fn) => fn());
			unlistenLayer.then((fn) => fn());
			svgRef.current?.remove();
			svgRef.current = null;
			allLabelsRef.current = null;
			svgReadyRef.current.value = false;
		};
	}, []);

	function handleDevicesSelect(paths: string[]) {
		setActiveDevices(paths);
		localStorage.setItem("k0-devices", JSON.stringify(paths));
		invoke("start_capture", { paths }).catch(console.error);
	}

	function handleTappingTermChange(ms: number) {
		setTappingTermMs(ms);
		localStorage.setItem("k0-tapping-term", String(ms));
		invoke("update_layout", {
			evdevToPos,
			posToLayer: posToLayerStrKeys,
			defaultLayer: keymap.defaultLayer,
			tappingTermMs: ms,
		}).catch(console.error);
	}

	useSignalEffect(() => {
		const pressed = pressedPositions.value;
		const svg = svgRef.current;
		if (!svg) return;
		for (const keyGroup of svg.querySelectorAll("[class*='keypos-']")) {
			const m = (keyGroup.getAttribute("class") ?? "").match(/keypos-(\d+)/);
			if (!m) continue;
			const pos = Number.parseInt(m[1], 10);
			const isPressed = pressed.has(pos);
			keyGroup.classList.toggle("key-pressed", isPressed);
			keyGroup.classList.toggle(
				"key-layer-held",
				isPressed && keymap.posToLayer.has(pos),
			);
		}
	});

	useSignalEffect(() => {
		if (!svgReadyRef.current.value) return;
		const layer = activeLayer.value;
		const svg = svgRef.current;
		const allLabels = allLabelsRef.current;
		if (!svg || !allLabels) return;
		const layerLabels = allLabels.get(layer);
		const baseLabels = allLabels.get(baseLayerNameRef.current);
		if (layerLabels && baseLabels)
			updateSVGLabels(svg, layerLabels, baseLabels);
	});

	return (
		<div class="home-root">
			<div class="keymap-container">
				<button
					type="button"
					class="settings-btn"
					onClick={() => setSettingsOpen((v) => !v)}
					aria-label="Toggle settings panel"
				>
					⚙
				</button>
				<div ref={containerRef} className="keymap-svg-wrapper" />
			</div>
			<Settings
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				onDevicesSelect={handleDevicesSelect}
				activeDevices={activeDevices}
				tappingTermMs={tappingTermMs}
				onTappingTermChange={handleTappingTermChange}
			/>
		</div>
	);
}
