import { useSignal, useSignalEffect } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";

import keymapSvgRaw from "@assets/keymap.svg?raw";
import keymapYamlRaw from "@assets/my_keymap.yaml?raw";

import { KeyButton } from "../../components/KeyButton";
import { Settings } from "../../components/Settings";
import { activeLayer, pressedPositions } from "../../lib/keyState";
import { buildPosMaps } from "../../lib/labelTable";
import { parseLayout } from "../../lib/svgParser";
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
	const layout = useSignal(parseLayout(keymapSvgRaw));
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [activeDevices, setActiveDevices] = useState<string[]>(getSavedDevices);
	const [tappingTermMs, setTappingTermMs] = useState<number>(() => {
		const saved =
			typeof localStorage !== "undefined"
				? localStorage.getItem("k0-tapping-term")
				: null;
		return saved ? Number(saved) : keymap.tappingTermMs;
	});
	const layerLabels = useSignal(keymap.layerLabels.get(keymap.defaultLayer));

	useEffect(() => {
		const { themeId, transitionId } = loadSavedTheme();
		void themeId;
		void transitionId;
	}, []);

	useEffect(() => {
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

		return () => {
			unlistenKey.then((fn) => fn());
			unlistenLayer.then((fn) => fn());
		};
	}, []);

	useSignalEffect(() => {
		layerLabels.value =
			keymap.layerLabels.get(activeLayer.value) ??
			keymap.layerLabels.get(keymap.defaultLayer);
	});

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

	const parsed = layout.value;

	return (
		<div class="home-root">
			<div class="top-row">
				<svg
					class={`cog-key ${settingsOpen ? "cog-active" : ""}`}
					viewBox="-26 -26 52 52"
					onClick={() => setSettingsOpen((v) => !v)}
					onKeyDown={(e) => {
						if (e.key === "Enter") setSettingsOpen((v) => !v);
					}}
					aria-label="Toggle settings panel"
					role="button"
					tabIndex={0}
				>
					<KeyButton pos={-1} x={0} y={0} tap="⚙" />
				</svg>
			</div>
			{parsed && (
				<svg
					class="keymap-svg"
					viewBox={parsed.viewBox}
					xmlns="http://www.w3.org/2000/svg"
				>
					{parsed.keys.map(({ pos, x, y }) => {
						const labels = layerLabels.value?.get(pos);
						return (
							<KeyButton
								key={pos}
								pos={pos}
								x={x}
								y={y}
								tap={labels?.tap ?? ""}
								hold={labels?.hold}
								shifted={labels?.shifted}
								pressed={pressedPositions.value.has(pos)}
								layerHeld={
									keymap.posToLayer.has(pos) &&
									pressedPositions.value.has(pos)
								}
							/>
						);
					})}
				</svg>
			)}
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
