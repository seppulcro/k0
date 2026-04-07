import { useComputed, useSignalEffect } from "@preact/signals";
import { invoke } from "@tauri-apps/api/core";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "preact/hooks";
import { consoleLogs } from "../../lib/consoleCapture";
import { THEMES, TRANSITIONS, applyTheme } from "../../lib/themes";
import "./style.css";

interface DeviceInfo {
	path: string;
	name: string;
	uniq: string;
}

interface Props {
	open: boolean;
	onClose: () => void;
	onDevicesSelect: (paths: string[]) => void;
	activeDevices: string[];
	tappingTermMs: number;
	onTappingTermChange: (ms: number) => void;
}

const PANEL_H = 300;
const TABS = ["Devices", "Theme", "Input", "Console"] as const;
type Tab = (typeof TABS)[number];

export function Settings({
	open,
	onClose,
	onDevicesSelect,
	activeDevices,
	tappingTermMs,
	onTappingTermChange,
}: Props) {
	const [tab, setTab] = useState<Tab>("Devices");
	const [devices, setDevices] = useState<DeviceInfo[]>([]);
	const [theme, setTheme] = useState(
		() => localStorage.getItem("k0-theme") ?? "catppuccin-mocha",
	);
	const [transition, setTransition] = useState(
		() => localStorage.getItem("k0-transition") ?? "snappy",
	);
	const consoleEndRef = useRef<HTMLDivElement>(null);
	const logs = useComputed(() => consoleLogs.value);

	// Resize Tauri window: grow by PANEL_H when open, shrink back when closed
	useEffect(() => {
		const win = getCurrentWindow();
		const baseH = window.innerHeight;
		const h = open ? baseH + PANEL_H : baseH - PANEL_H;
		win
			.setSize(new LogicalSize(window.innerWidth, Math.max(h, 200)))
			.catch(() => {});
	}, [open]);

	// Fetch devices when panel opens
	useEffect(() => {
		if (!open) return;
		invoke<DeviceInfo[]>("list_devices")
			.then(setDevices)
			.catch((e) => console.error("list_devices:", e));
	}, [open]);

	// Auto-scroll console on new log entries (signal-reactive)
	useSignalEffect(() => {
		void consoleLogs.value; // subscribe to signal
		if (tab === "Console") {
			consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	});

	function handleTheme(id: string) {
		setTheme(id);
		applyTheme(id, transition);
	}
	function handleTransition(id: string) {
		setTransition(id);
		applyTheme(theme, id);
	}
	function toggleDevice(path: string) {
		const next = activeDevices.includes(path)
			? activeDevices.filter((p) => p !== path)
			: [...activeDevices, path];
		onDevicesSelect(next);
	}

	const groups = new Map<string, DeviceInfo[]>();
	for (const d of devices) {
		const key = d.uniq || d.name || d.path;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)?.push(d);
	}

	return (
		<div class={`panel-overlay ${open ? "open" : ""}`}>
			{/* Tab bar — drag handle + tabs + close */}
			<div class="panel-tabbar">
				<div class="panel-drag" />
				<menu>
					{TABS.map((t) => (
						<li key={t} class={tab === t ? "selected" : ""}>
							<button type="button" onClick={() => setTab(t)}>
								{t}
								{t === "Console" && logs.value.length > 0 && (
									<sup>{Math.min(logs.value.length, 99)}</sup>
								)}
							</button>
						</li>
					))}
				</menu>
				<div class="panel-spacer" />
				<button
					type="button"
					class="panel-close"
					onClick={onClose}
					aria-label="Close panel"
				>
					✕
				</button>
			</div>

			{/* Panel body */}
			<div class="panel-body">
				{tab === "Devices" && (
					<div class="panel-section">
						<p class="muted">
							Select which /dev/input/event* nodes to capture. Interfaces
							sharing a uniq ID are grouped.
						</p>
						<div class="device-list">
							{devices.length === 0 ? (
								<p class="muted">No keyboard devices found</p>
							) : (
								[...groups.entries()].map(([key, group]) => {
									const allPaths = group.map((d) => d.path);
									const checked = allPaths.filter((p) =>
										activeDevices.includes(p),
									).length;
									const allChecked = checked === allPaths.length;
									const someChecked = checked > 0 && !allChecked;
									const rootName =
										group[0].name.replace(
											/\s+(Mouse|System Control|Consumer Control|Keyboard)$/i,
											"",
										) || key;

									function toggleGroup(e: Event) {
										e.preventDefault();
										const others = activeDevices.filter(
											(p) => !allPaths.includes(p),
										);
										onDevicesSelect(
											allChecked ? others : [...others, ...allPaths],
										);
									}

									return (
										<details
											key={key}
											class={`device-group ${allChecked ? "active" : someChecked ? "partial" : ""}`}
										>
											<summary>
												<input
													type="checkbox"
													checked={allChecked}
													onChange={toggleGroup}
													onClick={(e) => e.stopPropagation()}
												/>
												{rootName}
												<span class="device-root-count">
													{checked}/{allPaths.length}
												</span>
											</summary>
											<div class="device-children">
												{group.map((d) => {
													const isChecked = activeDevices.includes(d.path);
													const suffix =
														d.name.match(
															/(Mouse|System Control|Consumer Control|Keyboard)$/i,
														)?.[1] ?? d.path.replace(/.*\//, "");
													return (
														<label
															key={d.path}
															class={isChecked ? "active" : ""}
														>
															<input
																type="checkbox"
																checked={isChecked}
																onChange={() => toggleDevice(d.path)}
															/>
															<span>
																<span class="device-suffix">{suffix}</span>
																<code class="device-path">{d.path}</code>
															</span>
														</label>
													);
												})}
											</div>
										</details>
									);
								})
							)}
						</div>
					</div>
				)}

				{tab === "Theme" && (
					<div class="panel-section panel-section--row">
						<div class="panel-col">
							<span class="panel-col-label">Theme</span>
							<div class="theme-grid">
								{Object.entries(THEMES).map(([id, t]) => (
									<button
										type="button"
										key={id}
										class={`theme-swatch ${theme === id ? "active" : ""}`}
										style={{
											background: t.vars["--k0-bg"],
											color: t.vars["--k0-text"],
											borderColor:
												theme === id
													? t.vars["--k0-key-pressed-fill"]
													: t.vars["--k0-key-stroke"],
										}}
										onClick={() => handleTheme(id)}
									>
										<span
											class="theme-dot"
											style={{ background: t.vars["--k0-key-pressed-fill"] }}
										/>
										{t.label}
									</button>
								))}
							</div>
						</div>
						<div class="panel-divider" />
						<div class="panel-col">
							<span class="panel-col-label">Transition</span>
							<div class="transition-grid">
								{Object.entries(TRANSITIONS).map(([id, t]) => (
									<button
										type="button"
										key={id}
										class={`transition-btn ${transition === id ? "active" : ""}`}
										onClick={() => handleTransition(id)}
									>
										{t.label}
										<span class="transition-speed">{t.duration}</span>
									</button>
								))}
							</div>
						</div>
					</div>
				)}

				{tab === "Input" && (
					<div class="panel-section">
						<fieldset class="input-row">
							<legend>Hold–tap threshold</legend>
							<p class="muted">
								ms before held key activates a layer — QMK / ZMK / VIAL default:
								200 ms
							</p>
							<div class="tapping-control">
								<input
									type="range"
									min="100"
									max="500"
									step="10"
									value={tappingTermMs}
									onInput={(e) =>
										onTappingTermChange(
											Number((e.target as HTMLInputElement).value),
										)
									}
									class="tapping-slider"
								/>
								<input
									type="number"
									min="100"
									max="500"
									step="10"
									value={tappingTermMs}
									onInput={(e) => {
										const v = Number((e.target as HTMLInputElement).value);
										if (v >= 100 && v <= 500) onTappingTermChange(v);
									}}
									class="tapping-number"
								/>
								<span class="tapping-unit">ms</span>
							</div>
						</fieldset>
					</div>
				)}

				{tab === "Console" && (
					<div class="console-pane">
						<div class="console-toolbar">
							<small class="muted">{logs.value.length} entries</small>
							<button
								type="button"
								class="console-clear"
								onClick={() => {
									consoleLogs.value = [];
								}}
							>
								Clear
							</button>
						</div>
						<div class="console-log-list">
							{logs.value.map((entry) => (
								<div
									key={entry.id}
									class={`console-entry console-entry--${entry.level}`}
								>
									<span class="console-ts">{entry.ts}</span>
									<span class={`console-level console-level--${entry.level}`}>
										{entry.level.toUpperCase()}
									</span>
									<span class="console-msg">{entry.msg}</span>
								</div>
							))}
							<div ref={consoleEndRef} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
